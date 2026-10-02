import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { CardImage } from "@/components/cards/CardImage";
import { formatUsdCents } from "@/lib/money";
import { cartCountLabel } from "@/lib/shop/cart";
import { readCartCookie } from "@/lib/shop/cart-cookie";
import { listingSummary } from "@/lib/shop/kinds";
import { getPublicShopSettings } from "@/lib/shop/owner";
import { CartLineControls } from "@/components/shop/CartLineControls";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { ShopFooterLinks } from "@/components/shop/ShopFooterLinks";
import { getCheckoutConfigurationError, getShopOwnerUserId } from "@/lib/shop/config";
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

  const ownerId = getShopOwnerUserId();
  const [listingResult, availabilityResult, pendingResult] = admin && cart.items.length
    ? await Promise.all([
      admin
      .from("shop_listings")
      .select(
        "id, title, kind, condition, price_cents, quantity_available, status, image_url, cards ( image_url )",
      )
      .eq("owner_user_id", ownerId ?? "")
      .in("id", cart.items.map((item) => item.listingId)),
      admin.rpc("shop_cart_available_quantities", {
        p_listing_ids: cart.items.map((item) => item.listingId), p_checkout_token: cart.checkoutToken ?? null,
      }),
      cart.checkoutToken ? admin.from("shop_orders")
        .select("id, shipping_cents")
        .eq("checkout_token", cart.checkoutToken).eq("owner_user_id", ownerId ?? "")
        .eq("status", "pending_payment").eq("payment_status", "unpaid").maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: null, error: null }];
  const pendingItemsResult = admin && pendingResult.data
    ? await admin.from("shop_order_items").select("listing_id, title, kind, condition, quantity, unit_price_cents")
      .eq("order_id", pendingResult.data.id).order("created_at", { ascending: true })
    : { data: [], error: null };
  const pendingItems = pendingItemsResult.data ?? [];
  const pendingCartMismatch = Boolean(pendingResult.data) && (
    pendingItems.length !== cart.items.length || cart.items.some((item) =>
      !pendingItems.some((reserved) => reserved.listing_id === item.listingId && reserved.quantity === item.quantity))
  );
  const availabilityError = !admin || Boolean(listingResult.error || availabilityResult.error || pendingResult.error || pendingItemsResult.error)
    || !Array.isArray(availabilityResult.data);
  const lines = cart.items.map((item) => {
    const currentListing = listingResult.data?.find((row) => row.id === item.listingId);
    const snapshot = pendingCartMismatch ? undefined : pendingItems.find((row) => row.listing_id === item.listingId);
    const listing = currentListing ? { ...currentListing,
      title: snapshot?.title ?? currentListing.title, kind: snapshot?.kind ?? currentListing.kind,
      condition: snapshot ? snapshot.condition : currentListing.condition,
      price_cents: snapshot?.unit_price_cents ?? currentListing.price_cents,
    } : { id: item.listingId, title: "No longer available", kind: "single", condition: null,
      price_cents: 0, quantity_available: 0, status: "archived", image_url: null, cards: null };
    const availability = availabilityResult.data?.find((row) => row.listing_id === item.listingId);
    const sellable = currentListing?.status === "active" && !availabilityError ? availability?.available_quantity ?? 0 : 0;
    const conflict = !currentListing || currentListing.status !== "active"
      ? "This listing is no longer available. Remove it to continue."
      : availabilityError ? "Availability could not be checked. Refresh your cart before checkout."
        : item.quantity > sellable ? `You requested ${item.quantity}, but only ${sellable} are available. Reduce the quantity or remove this item.` : null;
    const card = listing.cards as { image_url: string | null } | null;
    return {
      ...item,
      listing,
      sellable,
      conflict,
      unavailable: !currentListing || currentListing.status !== "active",
      image: listing.image_url || card?.image_url,
      lineTotal: listing.status === "active" ? listing.price_cents * item.quantity : 0,
    };
  });
  const hasCartConflict = availabilityError || pendingCartMismatch || lines.some((line) => line.conflict);

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemCountLabel = cartCountLabel({ items: lines });
  const shipping = !pendingCartMismatch && pendingResult.data ? pendingResult.data.shipping_cents : settings?.shipping_cents ?? null;
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
                  <p className="text-xs text-zinc-500">{listingSummary(line.listing.kind, line.listing.condition)}</p>
                  <p className="text-sm text-amber-300">
                    {formatUsdCents(line.listing.price_cents)}
                    <span className="ml-2 text-xs text-zinc-500">
                      · {line.sellable} in stock
                    </span>
                  </p>
                  <CartLineControls
                    listingId={line.listingId}
                    quantity={line.quantity}
                    maxQuantity={line.sellable}
                  />
                  {line.conflict ? <p role="alert" className="text-xs text-amber-200">{line.conflict}</p> : null}
                </div>
                <p className="text-sm font-medium text-white">
                  {line.unavailable ? "Unavailable" : formatUsdCents(line.lineTotal)}
                </p>
              </li>
            ))}
          </ul>

          <div className="space-y-4">
            <section aria-labelledby="order-summary-heading" className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
              <h2 id="order-summary-heading" className="font-semibold text-white">Order summary</h2>
              <p className="mt-1 text-xs text-zinc-500">{itemCountLabel} in your cart</p>
              <div className="mt-3 flex justify-between text-zinc-400">
                <span>{lines.some((line) => line.unavailable) ? "Subtotal (available listings)" : "Subtotal"}</span>
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
            {hasCartConflict ? (
              <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                {pendingCartMismatch ? "Your cart differs from its reserved checkout. Update the cart before continuing." : "Resolve the highlighted cart items before checkout."}
              </p>
            ) : !checkoutReady ? (
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
