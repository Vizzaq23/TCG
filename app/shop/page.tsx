import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CardImage } from "@/components/cards/CardImage";
import { formatUsdCents } from "@/lib/money";
import { emptyShopMessage, kindLabel } from "@/lib/shop/kinds";
import { getPublicShopSettings } from "@/lib/shop/owner";
import { readCartCookie } from "@/lib/shop/cart-cookie";
import { getShopOwnerUserId, isShopOwner } from "@/lib/shop/config";
import { ShopFooterLinks } from "@/components/shop/ShopFooterLinks";
import { sellableQuantity } from "@/lib/shop/inventory";
import { isVisibleCatalogCard } from "@/lib/catalog/don-scope";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getVerifiedServerUser } from "@/lib/supabase/server-user";
import {
  firstSearchParam,
  type SearchParamValue,
} from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Shop",
  description: "Buy One Piece TCG singles, playsets, and bulk lots.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: SearchParamValue; sort?: SearchParamValue }>;
}) {
  const { kind: rawKindFilter, sort: rawSort } = await searchParams;
  const kindFilter = firstSearchParam(rawKindFilter);
  const sort = firstSearchParam(rawSort);

  if (!isSupabaseConfigured()) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="text-sm text-amber-100">Configure Supabase to use the shop.</p>
      </PageContainer>
    );
  }

  const admin = tryCreateAdminClient();
  const settings = await getPublicShopSettings();
  const user = await getVerifiedServerUser();
  const owner = isShopOwner(user?.id);
  const cart = await readCartCookie();
  const cartQuantity = cart.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  let listings = null;
  let error: { message: string } | null = null;
  const ownerId = getShopOwnerUserId();
  if (admin && settings && ownerId) {
    let query = admin
      .from("shop_listings")
      .select(
        "id, title, kind, condition, quantity_available, price_cents, image_url, card_id, cards ( image_url, set_name, rarity, type )",
      )
      .eq("owner_user_id", ownerId)
      .eq("status", "active")
      .gt("quantity_available", 0);
    if (
      kindFilter &&
      ["single", "playset", "bulk_lot", "rarity_set"].includes(kindFilter)
    ) {
      query = query.eq("kind", kindFilter);
    }
    query =
      sort === "price_asc"
        ? query.order("price_cents", { ascending: true })
        : sort === "price_desc"
          ? query.order("price_cents", { ascending: false })
          : query.order("created_at", { ascending: false });
    const result = await query;
    listings = result.data;
    error = result.error;
  }

  const withStock = [];
  for (const listing of listings ?? []) {
    if (!admin) break;
    const card = Array.isArray(listing.cards) ? listing.cards[0] : listing.cards;
    if (card && !isVisibleCatalogCard(card)) continue;
    const { data: held } = await admin.rpc("shop_held_quantity", {
      p_listing_id: listing.id,
    });
    const available = sellableQuantity(
      listing.quantity_available,
      typeof held === "number" ? held : 0,
    );
    if (available > 0) {
      withStock.push({ ...listing, sellable: available });
    }
  }

  return (
    <PageContainer as="main" className="space-y-8 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          as="h1"
          title={settings?.store_name ?? "TCG Shop"}
          description="Singles, playsets, bulk lots, and complete common/uncommon sets. Secure checkout via Stripe."
        />
        <div className="flex flex-wrap gap-2">
          <Button href="/cart" size="sm" variant="secondary">
            {cartQuantity ? `Cart (${cartQuantity})` : "Cart"}
          </Button>
          {owner ? (
            <>
              <Button href="/shop/sell" size="sm" variant="secondary">
                Sell
              </Button>
              <Button href="/shop/orders" size="sm" variant="ghost">
                Orders
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { href: "/shop", label: "All" },
          { href: "/shop?kind=single", label: "Singles" },
          { href: "/shop?kind=playset", label: "Playsets" },
          { href: "/shop?kind=bulk_lot", label: "Bulk" },
          { href: "/shop?kind=rarity_set", label: "C/UC sets" },
        ].map((f) => (
          <Link
            key={f.href}
            href={f.href}
            prefetch={false}
            aria-current={
              (kindFilter ? f.href.endsWith(`=${kindFilter}`) : f.href === "/shop")
                ? "page"
                : undefined
            }
            className={`inline-flex min-h-10 items-center rounded-md border px-3 py-1.5 hover:border-amber-500/40 hover:text-white ${
              (kindFilter ? f.href.endsWith(`=${kindFilter}`) : f.href === "/shop")
                ? "border-amber-500/60 bg-amber-500/10 text-white"
                : "border-zinc-800 text-zinc-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <form action="/shop" className="flex flex-wrap items-center gap-2 text-sm">
        {kindFilter ? <input type="hidden" name="kind" value={kindFilter} /> : null}
        <label htmlFor="shop-sort" className="text-zinc-500">Sort</label>
        <select id="shop-sort" name="sort" defaultValue={sort ?? "newest"} className="min-h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-zinc-200">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
        <Button type="submit" size="sm" variant="ghost">Apply</Button>
        {kindFilter || sort ? (
          <Button href="/shop" size="sm" variant="ghost">
            Clear filters
          </Button>
        ) : null}
      </form>

      {withStock.length > 0 ? (
        <p className="text-sm text-zinc-500">
          {withStock.length} {withStock.length === 1 ? "listing" : "listings"} available
        </p>
      ) : null}

      {!settings ? (
        <div className="rounded-[16px] border border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center">
          <p className="text-sm text-zinc-400">
            The shop is not open for checkout yet. Please check back soon.
          </p>
        </div>
      ) : error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error.message}
        </p>
      ) : !withStock.length ? (
        <div className="rounded-[16px] border border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center">
          <p className="text-sm text-zinc-400">{emptyShopMessage(kindFilter, owner)}</p>
          {owner ? (
            <div className="mt-5 flex justify-center gap-2">
              <Button href="/collection">My collection</Button>
              <Button href="/shop/sell" variant="secondary">
                Sell desk
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withStock.map((listing) => {
            const card = listing.cards as {
              image_url: string | null;
              set_name: string | null;
              rarity: string | null;
            } | null;
            const image = listing.image_url || card?.image_url;
            return (
              <li key={listing.id}>
                <Link
                  href={`/shop/${listing.id}`}
                  prefetch={false}
                  className="flex h-full flex-col overflow-hidden rounded-[14px] border border-zinc-800 bg-zinc-900/40 transition hover:border-amber-500/40"
                >
                  <div className="relative aspect-[3/4] bg-zinc-950">
                    {image ? (
                      <CardImage
                        src={image}
                        className="absolute inset-0 h-full w-full object-contain p-3"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                        No art
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge>{kindLabel(listing.kind)}</Badge>
                      {listing.condition ? <Badge tone="accent">{listing.condition}</Badge> : null}
                    </div>
                    <p className="font-semibold text-white">{listing.title}</p>
                    {card?.set_name || card?.rarity ? (
                      <p className="text-xs text-zinc-500">
                        {[card.set_name, card.rarity].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    <p className="mt-auto text-sm text-amber-300">
                      {formatUsdCents(listing.price_cents)}
                      <span className="ml-2 text-xs text-zinc-500">
                        · {listing.sellable} left
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <ShopFooterLinks />
    </PageContainer>
  );
}
