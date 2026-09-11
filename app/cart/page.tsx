import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { CardImage } from "@/components/cards/CardImage";
import { formatUsdCents } from "@/lib/money";
import { cartCountLabel } from "@/lib/shop/cart";
import { readCartCookie } from "@/lib/shop/cart-cookie";
import { sellableQuantity } from "@/lib/shop/inventory";
import { getPublicShopSettings } from "@/lib/shop/owner";
import { CartLineControls } from "@/components/shop/CartLineControls";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { ShopFooterLinks } from "@/components/shop/ShopFooterLinks";
import { getCheckoutConfigurationError } from "@/lib/shop/config";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getVerifiedServerUser } from "@/lib/supabase/server-user";
import {
  firstSearchParam,
  type SearchParamValue,
} from "@/lib/search-params";

export const metadata = { title: "Cart" };

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: SearchParamValue }>;
}) {
  const { cancelled: rawCancelled } = await searchParams;
  const cancelled = firstSearchParam(rawCancelled);
  const cart = await readCartCookie();
  const admin = tryCreateAdminClient();
  const user = await getVerifiedServerUser();
  const settings = await getPublicShopSettings();

  const lines = [];
  for (const item of cart.items) {
    if (!admin) break;
    const { data: listing } = await admin
      .from("shop_listings")
      .select(
        "id, title, price_cents, quantity_available, status, image_url, cards ( image_url )",
      )
      .eq("id", item.listingId)
      .maybeSingle();
    if (!listing || listing.status !== "active") continue;
    const { data: held } = await admin.rpc("shop_held_quantity", {
      p_listing_id: listing.id,
    });
    const sellable = sellableQuantity(
      listing.quantity_available,
      typeof held === "number" ? held : 0,
    );
    const card = listing.cards as { image_url: string | null } | null;
    lines.push({
      ...item,
      listing,
      sellable,
      image: listing.image_url || card?.image_url,
      lineTotal: listing.price_cents * item.quantity,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemCountLabel = cartCountLabel({ items: lines });
  const shipping = settings?.shipping_cents ?? null;
  const total = subtotal + (lines.length ? shipping ?? 0 : 0);
  const checkoutConfigurationError = getCheckoutConfigurationError();
  const checkoutReady =
    Boolean(
      settings?.is_live &&
        settings.launch_ready_at &&
        settings.support_email &&
        shipping != null,
    ) &&
    !checkoutConfigurationError;

  return (
    <PageContainer as="main" className="space-y-8 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          as="h1"
          title="Cart"
          description="Review your items and totals before secure checkout."
        />
        {lines.length ? (
          <Button href="/shop" size="sm" variant="ghost">
            ← Continue shopping
          </Button>
        ) : null}
      </div>

      {cancelled ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          Checkout was cancelled. Your cart is still here if inventory remains.
        </p>
      ) : null}

      {!lines.length ? (
        <div className="rounded-[16px] border border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center">
          <p className="text-sm text-zinc-400">Your cart is empty.</p>
          <div className="mt-5">
            <Button href="/shop">Browse shop</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,320px)]">
          <ul className="space-y-4">
            {lines.map((line) => (
              <li
                key={line.listingId}
                className="flex gap-4 rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-[10px] border border-zinc-800 bg-zinc-950">
                  {line.image ? (
                    <CardImage
                      src={line.image}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-medium text-white">{line.listing.title}</p>
                  <p className="text-sm text-amber-300">
                    {formatUsdCents(line.listing.price_cents)}
                    <span className="ml-2 text-xs text-zinc-500">
                      · {line.sellable} in stock
                    </span>
                  </p>
                  <CartLineControls
                    listingId={line.listingId}
                    quantity={Math.min(line.quantity, line.sellable)}
                    maxQuantity={line.sellable}
                  />
                </div>
                <p className="text-sm font-medium text-white">
                  {formatUsdCents(line.lineTotal)}
                </p>
              </li>
            ))}
          </ul>

          <div className="space-y-4">
            <section aria-labelledby="order-summary-heading" className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
              <h2 id="order-summary-heading" className="font-semibold text-white">Order summary</h2>
              <p className="mt-1 text-xs text-zinc-500">{itemCountLabel} in your cart</p>
              <div className="mt-3 flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>{formatUsdCents(subtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between text-zinc-400">
                <span>Shipping (US flat)</span>
                <span>
                  {shipping == null ? "Not configured" : formatUsdCents(shipping)}
                </span>
              </div>
              <div className="mt-3 flex justify-between border-t border-zinc-800 pt-3 font-semibold text-white">
                <span>Total</span>
                <span>{formatUsdCents(total)}</span>
              </div>
              <p className="mt-4 rounded-lg bg-zinc-950/70 p-3 text-xs text-zinc-400">Guest checkout — no account required. Applicable taxes are calculated at checkout.</p>
            </section>
            {!checkoutReady ? (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                Checkout is not open yet. Store payment, shipping, and tax settings
                must be completed before orders can be accepted.
              </p>
            ) : (
              <CheckoutForm defaultEmail={user?.email ?? ""} />
            )}
            <ShopFooterLinks />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
