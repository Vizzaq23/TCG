import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database";
import type { CartState } from "@/lib/shop/cart";
import { CHECKOUT_HOLD_MINUTES } from "@/lib/shop/config";
import { sellableQuantity } from "@/lib/shop/inventory";
import { generateOrderNumber } from "@/lib/shop/order-number";

type Admin = SupabaseClient<Database>;

export type CheckoutLine = {
  listingId: string;
  title: string;
  kind: string;
  condition: string | null;
  quantity: number;
  unitPriceCents: number;
  unitCostCents: number | null;
  cardId: string | null;
  collectionId: string | null;
  imageUrl: string | null;
};

export async function buildCheckoutLines(
  admin: Admin,
  cart: CartState,
): Promise<{ lines: CheckoutLine[]; error?: string }> {
  await admin.rpc("shop_release_expired_reservations");

  if (!cart.items.length) {
    return { lines: [], error: "Your cart is empty." };
  }

  const lines: CheckoutLine[] = [];
  for (const item of cart.items) {
    const { data: listing, error } = await admin
      .from("shop_listings")
      .select(
        "id, title, kind, condition, quantity_available, price_cents, unit_cost_cents, card_id, collection_id, status, image_url",
      )
      .eq("id", item.listingId)
      .maybeSingle();

    if (error || !listing || listing.status !== "active") {
      return { lines: [], error: "A listing in your cart is no longer available." };
    }

    const { data: held } = await admin.rpc("shop_held_quantity", {
      p_listing_id: listing.id,
    });
    const available = sellableQuantity(
      listing.quantity_available,
      typeof held === "number" ? held : 0,
    );
    if (item.quantity > available) {
      return {
        lines: [],
        error: `"${listing.title}" only has ${available} left.`,
      };
    }

    lines.push({
      listingId: listing.id,
      title: listing.title,
      kind: listing.kind,
      condition: listing.condition,
      quantity: item.quantity,
      unitPriceCents: listing.price_cents,
      unitCostCents: listing.unit_cost_cents,
      cardId: listing.card_id,
      collectionId: listing.collection_id,
      imageUrl: listing.image_url,
    });
  }

  return { lines };
}

export async function createPendingOrderWithHolds(input: {
  admin: Admin;
  ownerUserId: string;
  buyerEmail: string;
  buyerUserId: string | null;
  shippingCents: number;
  currency: string;
  lines: CheckoutLine[];
}): Promise<{ orderId: string; orderNumber: string; totalCents: number }> {
  const { admin, lines } = input;
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const total = subtotal + input.shippingCents;
  const orderNumber = generateOrderNumber();
  const expiresAt = new Date(
    Date.now() + CHECKOUT_HOLD_MINUTES * 60 * 1000,
  ).toISOString();

  const { data: order, error: orderError } = await admin
    .from("shop_orders")
    .insert({
      order_number: orderNumber,
      owner_user_id: input.ownerUserId,
      buyer_email: input.buyerEmail,
      buyer_user_id: input.buyerUserId,
      status: "pending_payment",
      currency: input.currency,
      subtotal_cents: subtotal,
      shipping_cents: input.shippingCents,
      total_cents: total,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Failed to create order.");
  }

  const orderItems = lines.map((line) => ({
    order_id: order.id,
    listing_id: line.listingId,
    title: line.title,
    kind: line.kind,
    condition: line.condition,
    quantity: line.quantity,
    unit_price_cents: line.unitPriceCents,
    unit_cost_cents: line.unitCostCents,
    card_id: line.cardId,
    collection_id: line.collectionId,
  }));

  const { error: itemsError } = await admin
    .from("shop_order_items")
    .insert(orderItems);
  if (itemsError) {
    await admin.from("shop_orders").delete().eq("id", order.id);
    throw new Error(itemsError.message);
  }

  const reservations = lines.map((line) => ({
    order_id: order.id,
    listing_id: line.listingId,
    quantity: line.quantity,
    status: "held",
    expires_at: expiresAt,
  }));

  const { error: holdError } = await admin
    .from("inventory_reservations")
    .insert(reservations);
  if (holdError) {
    await admin.from("shop_orders").delete().eq("id", order.id);
    throw new Error(holdError.message);
  }

  // Re-check sellable including this hold (detect races)
  for (const line of lines) {
    const { data: listing } = await admin
      .from("shop_listings")
      .select("quantity_available, title")
      .eq("id", line.listingId)
      .single();
    const { data: held } = await admin.rpc("shop_held_quantity", {
      p_listing_id: line.listingId,
    });
    const heldQty = typeof held === "number" ? held : line.quantity;
    if (!listing || heldQty > listing.quantity_available) {
      await admin.rpc("shop_cancel_pending_order", { p_order_id: order.id });
      throw new Error(
        `"${listing?.title ?? "Item"}" just sold out. Please refresh your cart.`,
      );
    }
  }

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    totalCents: total,
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
}) {
  const { error } = await input.admin.rpc("shop_finalize_paid_order", {
    p_order_id: input.orderId,
    p_stripe_checkout_session_id: input.stripeCheckoutSessionId,
    p_stripe_payment_intent_id: input.stripePaymentIntentId ?? "",
    p_buyer_email: input.buyerEmail,
    p_shipping_name: input.shippingName ?? "",
    p_shipping_address: input.shippingAddress ?? {},
  });
  if (error) throw error;
}
