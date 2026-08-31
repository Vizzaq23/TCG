import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CartState } from "@/lib/shop/cart";
import type { Database, Json } from "@/lib/types/database";
import { generateOrderNumber } from "@/lib/shop/order-number";

type Admin = SupabaseClient<Database>;

export type CheckoutLine = {
  listingId: string;
  title: string;
  kind: string;
  condition: string | null;
  quantity: number;
  unitPriceCents: number;
};

export type PendingCheckout = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  stripeCheckoutSessionId: string | null;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  lines: CheckoutLine[];
};

export function isCheckoutPaymentConfirmed(paymentStatus: string | null): boolean {
  return paymentStatus === "paid" || paymentStatus === "no_payment_required";
}

export function getVerifiedCheckoutAmounts(
  session: Pick<
    Stripe.Checkout.Session,
    "payment_status" | "amount_subtotal" | "amount_total" | "currency" | "total_details"
  >,
): {
  currency: string;
  amountSubtotalCents: number;
  amountTotalCents: number;
  taxCents: number;
} {
  if (!isCheckoutPaymentConfirmed(session.payment_status)) {
    throw new Error("checkout_payment_not_confirmed");
  }
  if (
    typeof session.amount_subtotal !== "number" ||
    typeof session.amount_total !== "number" ||
    !session.currency
  ) {
    throw new Error("checkout_amounts_missing");
  }
  const taxCents =
    session.total_details?.amount_tax ??
    session.amount_total - session.amount_subtotal;
  if (
    taxCents < 0 ||
    (session.amount_total !== session.amount_subtotal &&
      session.amount_total !== session.amount_subtotal + taxCents)
  ) {
    throw new Error("checkout_amounts_invalid");
  }
  return {
    currency: session.currency.toLowerCase(),
    amountSubtotalCents: session.amount_subtotal,
    amountTotalCents: session.amount_total,
    taxCents,
  };
}

export function customerSafeCheckoutError(message: string): string {
  if (/insufficient_inventory|listing_unavailable/i.test(message)) {
    return "An item just sold out or is no longer available. Please refresh your cart.";
  }
  if (/shop_not_launch_ready/i.test(message)) {
    return "The shop is not open for checkout yet.";
  }
  if (/invalid_cart|invalid_checkout_input|invalid_cart_quantity/i.test(message)) {
    return "Your cart could not be validated. Please update it and try again.";
  }
  return "Checkout could not reserve inventory. Please try again.";
}

export async function createPendingOrderWithHolds(input: {
  admin: Admin;
  ownerUserId: string;
  buyerEmail: string;
  buyerUserId: string | null;
  checkoutToken: string;
  cart: CartState;
}): Promise<PendingCheckout> {
  const { data: pending, error } = await input.admin
    .rpc("shop_create_pending_order", {
      p_checkout_token: input.checkoutToken,
      p_order_number: generateOrderNumber(),
      p_owner_user_id: input.ownerUserId,
      p_buyer_email: input.buyerEmail,
      p_buyer_user_id: input.buyerUserId,
      p_items: input.cart.items as unknown as Json,
    })
    .single();

  if (error || !pending) {
    throw new Error(error?.message ?? "pending_order_failed");
  }

  const { data: items, error: itemsError } = await input.admin
    .from("shop_order_items")
    .select("listing_id, title, kind, condition, quantity, unit_price_cents")
    .eq("order_id", pending.order_id)
    .order("created_at", { ascending: true });
  if (itemsError || !items?.length) {
    throw new Error(itemsError?.message ?? "pending_order_items_missing");
  }

  return {
    orderId: pending.order_id,
    orderNumber: pending.order_number,
    orderStatus: pending.order_status,
    stripeCheckoutSessionId: pending.stripe_checkout_session_id,
    subtotalCents: pending.subtotal_cents,
    shippingCents: pending.shipping_cents,
    totalCents: pending.total_cents,
    currency: pending.currency,
    lines: items.map((item) => ({
      listingId: item.listing_id ?? "",
      title: item.title,
      kind: item.kind,
      condition: item.condition,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
    })),
  };
}

export async function finalizePaidOrder(input: {
  admin: Admin;
  orderId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  buyerEmail: string;
  shippingName: string | null;
  shippingAddress: Json | null;
  currency: string;
  amountSubtotalCents: number;
  amountTotalCents: number;
  taxCents: number;
}) {
  const { error } = await input.admin.rpc("shop_finalize_verified_order", {
    p_order_id: input.orderId,
    p_stripe_checkout_session_id: input.stripeCheckoutSessionId,
    p_stripe_payment_intent_id: input.stripePaymentIntentId ?? "",
    p_buyer_email: input.buyerEmail,
    p_shipping_name: input.shippingName ?? "",
    p_shipping_address: input.shippingAddress ?? {},
    p_currency: input.currency,
    p_amount_subtotal_cents: input.amountSubtotalCents,
    p_amount_total_cents: input.amountTotalCents,
    p_tax_cents: input.taxCents,
  });

  if (error) throw error;
}
