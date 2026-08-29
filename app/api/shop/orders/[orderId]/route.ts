import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isShopOwner, isStripeConfigured } from "@/lib/shop/config";
import { getStripe } from "@/lib/shop/stripe";

export const runtime = "nodejs";

type Body = {
  status?: "packed" | "shipped" | "paid";
  tracking_number?: string | null;
  notes?: string | null;
  refund?: boolean;
  restock?: boolean;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;
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

  const { data: order, error: loadError } = await supabase
    .from("shop_orders")
    .select("*")
    .eq("id", orderId)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (loadError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (body.refund) {
    if (!isStripeConfigured() || !order.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: "Cannot refund: missing Stripe payment." },
        { status: 400 },
      );
    }
    if (!["paid", "packed", "shipped"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot refund order in status ${order.status}.` },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      metadata: { order_id: order.id, order_number: order.order_number },
    });

    // Webhook will mark refunded; also mark immediately for UX.
    const admin = createAdminClient();
    await admin.rpc("shop_mark_order_refunded", { p_order_id: order.id });

    if (body.restock) {
      const { data: items } = await admin
        .from("shop_order_items")
        .select("listing_id, quantity, collection_id, kind")
        .eq("order_id", order.id);

      for (const item of items ?? []) {
        if (!item.listing_id) continue;
        const { data: listing } = await admin
          .from("shop_listings")
          .select("id, quantity_available, status")
          .eq("id", item.listing_id)
          .maybeSingle();
        if (!listing) continue;
        await admin
          .from("shop_listings")
          .update({
            quantity_available: listing.quantity_available + item.quantity,
            status: listing.status === "archived" ? "active" : listing.status,
          })
          .eq("id", listing.id);
      }
    }

    return NextResponse.json({ ok: true, status: "refunded" });
  }

  const patch: {
    status?: string;
    tracking_number?: string | null;
    notes?: string | null;
    shipped_at?: string | null;
  } = {};

  if (body.tracking_number !== undefined) {
    patch.tracking_number = body.tracking_number?.trim() || null;
  }
  if (body.notes !== undefined) {
    patch.notes = body.notes?.trim() || null;
  }
  if (body.status) {
    if (!["packed", "shipped", "paid"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === "shipped") {
      patch.shipped_at = new Date().toISOString();
    }
  }

  const { data: updated, error } = await supabase
    .from("shop_orders")
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ order: updated });
}
