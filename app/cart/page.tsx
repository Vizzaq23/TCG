import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { CardImage } from "@/components/cards/CardImage";
import { formatUsdCents } from "@/lib/money";
import { readCartCookie } from "@/lib/shop/cart-cookie";
import { sellableQuantity } from "@/lib/shop/inventory";
import { getPublicShopSettings } from "@/lib/shop/owner";
import { CartLineControls } from "@/components/shop/CartLineControls";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { ShopFooterLinks } from "@/components/shop/ShopFooterLinks";
import { isStripeConfigured } from "@/lib/shop/config";

export const metadata = { title: "Cart" };

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { cancelled } = await searchParams;
  const cart = await readCartCookie();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const settings = await getPublicShopSettings();

  const lines = [];
  for (const item of cart.items) {
    const { data: listing } = await supabase
      .from("shop_listings")
      .select(
        "id, title, price_cents, quantity_available, status, image_url, cards ( image_url )",
      )
      .eq("id", item.listingId)
      .maybeSingle();
    if (!listing || listing.status !== "active") continue;
    const { data: held } = await supabase.rpc("shop_held_quantity", {
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
  const shipping = settings?.shipping_cents ?? 500;
  const total = subtotal + (lines.length ? shipping : 0);

  return (
    <PageContainer as="main" className="space-y-8 py-8 sm:py-10">
      <SectionHeader
        title="Cart"
        description="Guest checkout is supported. Shipping address is collected on Stripe."
      />

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
            <div className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>{formatUsdCents(subtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between text-zinc-400">
                <span>Shipping (US flat)</span>
                <span>{formatUsdCents(shipping)}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-zinc-800 pt-3 font-semibold text-white">
                <span>Total</span>
                <span>{formatUsdCents(total)}</span>
              </div>
            </div>
            {!isStripeConfigured() ? (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                Stripe keys are not configured yet. Add STRIPE_SECRET_KEY and
                NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable checkout.
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
