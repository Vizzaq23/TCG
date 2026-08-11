import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isShopOwner } from "@/lib/shop/config";
import { ensureShopSettings } from "@/lib/shop/owner";
import {
  collectionUnitsForSale,
  maxListableUnits,
} from "@/lib/shop/inventory";
import {
  isShopListingKind,
  type ShopListingKind,
} from "@/lib/shop/kinds";

export const runtime = "nodejs";

type Body = {
  kind?: string;
  title?: string;
  description?: string | null;
  condition?: string | null;
  quantity?: number;
  price_cents?: number;
  unit_cost_cents?: number | null;
  collection_id?: string | null;
  card_id?: string | null;
  status?: "draft" | "active";
  image_url?: string | null;
  items?: Array<{ card_id: string; quantity: number; condition?: string | null }>;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isShopOwner(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.kind || !isShopListingKind(body.kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  const kind: ShopListingKind = body.kind;
  const title = body.title?.trim();
  const quantity = Math.floor(Number(body.quantity ?? 0));
  const priceCents = Math.floor(Number(body.price_cents ?? -1));
  if (!title || quantity < 1 || priceCents < 0) {
    return NextResponse.json(
      { error: "title, quantity (>=1), and price_cents (>=0) are required." },
      { status: 400 },
    );
  }

  await ensureShopSettings(user.id);

  let cardId = body.card_id ?? null;
  let collectionId = body.collection_id ?? null;
  let imageUrl = body.image_url ?? null;
  let condition = body.condition ?? null;

  if (kind === "single" || kind === "playset") {
    if (!collectionId) {
      return NextResponse.json(
        { error: "collection_id is required for singles and playsets." },
        { status: 400 },
      );
    }
    const { data: row, error } = await supabase
      .from("user_collections")
      .select("id, user_id, card_id, quantity, condition")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "Collection row not found." }, { status: 404 });
    }

    const { data: allocated } = await supabase.rpc("shop_collection_allocated_units", {
      p_collection_id: collectionId,
    });
    const already = typeof allocated === "number" ? allocated : 0;
    const max = maxListableUnits({
      collectionQuantity: row.quantity,
      kind,
      alreadyListedCollectionUnits: already,
    });
    if (quantity > max) {
      return NextResponse.json(
        {
          error: `Only ${max} ${kind === "playset" ? "playset(s)" : "copy(ies)"} available to list from this collection row.`,
        },
        { status: 400 },
      );
    }

    cardId = row.card_id;
    condition = condition || row.condition;
    if (!imageUrl && row.card_id) {
      const { data: card } = await supabase
        .from("cards")
        .select("image_url")
        .eq("id", row.card_id)
        .maybeSingle();
      imageUrl = card?.image_url ?? null;
    }
  } else {
    // bulk / rarity set — stock is manual; collection link optional
    void collectionUnitsForSale;
  }

  const status = body.status === "draft" ? "draft" : "active";

  const { data: listing, error: insertError } = await supabase
    .from("shop_listings")
    .insert({
      owner_user_id: user.id,
      kind,
      title,
      description: body.description?.trim() || null,
      condition,
      quantity_available: quantity,
      price_cents: priceCents,
      unit_cost_cents:
        body.unit_cost_cents == null ? null : Math.floor(body.unit_cost_cents),
      card_id: cardId,
      collection_id: collectionId,
      status,
      image_url: imageUrl,
    })
    .select("*")
    .single();

  if (insertError || !listing) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create listing." },
      { status: 400 },
    );
  }

  if (body.items?.length) {
    const rows = body.items
      .filter((i) => i.card_id && i.quantity >= 1)
      .map((i) => ({
        listing_id: listing.id,
        card_id: i.card_id,
        quantity: Math.floor(i.quantity),
        condition: i.condition ?? null,
      }));
    if (rows.length) {
      const { error: itemsError } = await supabase
        .from("shop_listing_items")
        .insert(rows);
      if (itemsError) {
        return NextResponse.json(
          { error: itemsError.message, listing },
          { status: 400 },
        );
      }
    }
  }

  return NextResponse.json({ listing });
}
