import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isShopOwner } from "@/lib/shop/config";
import { maxListableUnits } from "@/lib/shop/inventory";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const collectionId = new URL(request.url).searchParams.get("collectionId");
  if (!collectionId) {
    return NextResponse.json({ error: "collectionId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isShopOwner(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row } = await supabase
    .from("user_collections")
    .select("id, quantity")
    .eq("id", collectionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: allocated } = await admin.rpc("shop_collection_allocated_units", {
    p_collection_id: collectionId,
  });
  const already = typeof allocated === "number" ? allocated : 0;

  return NextResponse.json({
    collectionQuantity: row.quantity,
    allocatedUnits: already,
    maxSingles: maxListableUnits({
      collectionQuantity: row.quantity,
      kind: "single",
      alreadyListedCollectionUnits: already,
    }),
    maxPlaysets: maxListableUnits({
      collectionQuantity: row.quantity,
      kind: "playset",
      alreadyListedCollectionUnits: already,
    }),
  });
}
