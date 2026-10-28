import { notFound } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardImage } from "@/components/cards/CardImage";
import { formatUsdCents } from "@/lib/money";
import { kindLabel, listingItemCountLabel, listingItemSummary, listingReturnHref } from "@/lib/shop/kinds";
import { sellableQuantity, stockLabel } from "@/lib/shop/inventory";
import { readCartCookie } from "@/lib/shop/cart-cookie";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { ShopFooterLinks } from "@/components/shop/ShopFooterLinks";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getShopOwnerUserId, isShopOwner } from "@/lib/shop/config";
import { getVerifiedServerUser } from "@/lib/supabase/server-user";
import {
  firstSearchParam,
  type SearchParamValue,
} from "@/lib/search-params";

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ returnTo?: SearchParamValue }>;
}) {
  const [{ listingId }, { returnTo: rawReturnTo }] = await Promise.all([params, searchParams]);
  const returnTo = listingReturnHref(firstSearchParam(rawReturnTo));
  const [user, cart] = await Promise.all([getVerifiedServerUser(), readCartCookie()]);
  const owner = isShopOwner(user?.id);
  const ownerId = getShopOwnerUserId();
  const admin = tryCreateAdminClient();
  if (!admin || !ownerId) notFound();

  const { data: listing } = await admin
    .from("shop_listings")
    .select(
      "id, owner_user_id, kind, title, description, condition, quantity_available, price_cents, status, image_url, card_id, cards ( name, set_name, card_number, rarity, color, type, image_url ), shop_listing_items ( id, quantity, condition, cards ( name, card_number, set_name ) )",
    )
    .eq("id", listingId)
    .eq("owner_user_id", ownerId)
    .maybeSingle();

  if (
    !listing ||
    (listing.status !== "active" && !(owner && listing.status === "draft"))
  ) {
    notFound();
  }

  // Draft only visible to owner via RLS; if we got a draft here, owner is viewing.
  const { data: held } = await admin.rpc("shop_held_quantity", {
    p_listing_id: listing.id,
  });
  const sellable = sellableQuantity(
    listing.quantity_available,
    typeof held === "number" ? held : 0,
  );
  const existingQuantity = cart.items.find((item) => item.listingId === listing.id)?.quantity ?? 0;

  const card = listing.cards as {
    name: string;
    set_name: string | null;
    card_number: string | null;
    rarity: string | null;
    color: string | null;
    type: string | null;
    image_url: string | null;
  } | null;
  const image = listing.image_url || card?.image_url;
  const items = (listing.shop_listing_items ?? []) as Array<{
    id: string;
    quantity: number;
    condition: string | null;
    cards: {
      name: string;
      card_number: string | null;
      set_name: string | null;
    } | null;
  }>;
  const includedCardCountLabel = listingItemCountLabel(items.map((item) => item.quantity));

  return (
    <PageContainer as="main" className="py-8 sm:py-10">
      <div className="mb-6">
        <Button href={returnTo} size="sm" variant="ghost">
          ← Back to shop
        </Button>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[16px] border border-zinc-800 bg-zinc-950">
          {image ? (
            <CardImage
              src={image}
              className="absolute inset-0 h-full w-full object-contain p-4"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-600">
              No art
            </div>
          )}
        </div>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge>{kindLabel(listing.kind)}</Badge>
              {listing.condition ? <Badge tone="accent">{listing.condition}</Badge> : null}
              {listing.status === "draft" ? <Badge>Draft</Badge> : null}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {listing.title}
            </h1>
            {card ? (
              <p className="text-sm text-zinc-500">
                {[
                  card.set_name,
                  card.card_number,
                  card.rarity,
                  card.color,
                  card.type,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          <p className="text-2xl font-semibold text-amber-300">
            {formatUsdCents(listing.price_cents)}
          </p>
          <p className="text-sm text-zinc-400">
            {stockLabel(sellable)}
          </p>
          {listing.description ? (
            <p className="whitespace-pre-wrap text-sm text-zinc-300">
              {listing.description}
            </p>
          ) : null}

          {items.length ? (
            <div className="rounded-[12px] border border-zinc-800 bg-zinc-900/40 p-4">
              <p id="included-cards-heading" className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Includes
                <span className="ml-2 normal-case tracking-normal text-zinc-600">
                  · {includedCardCountLabel}
                </span>
              </p>
              <ul aria-labelledby="included-cards-heading" className="space-y-2 text-sm text-zinc-300">
                {items.map((item) => {
                  const details = listingItemSummary(item.cards?.set_name ?? null, item.cards?.card_number ?? null, item.condition);
                  return (
                    <li key={item.id} className="flex items-start justify-between gap-4">
                      <span>{item.quantity}× {item.cards?.name ?? "Card"}</span>
                      <span className="text-right text-xs text-zinc-500">{details}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {listing.status === "active" ? (
            <div className="max-w-xs">
              <AddToCartButton listingId={listing.id} maxQuantity={sellable} existingQuantity={existingQuantity} />
            </div>
          ) : null}

          <ShopFooterLinks />
        </div>
      </div>
    </PageContainer>
  );
}
