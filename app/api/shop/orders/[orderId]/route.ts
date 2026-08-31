import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isShopOwner, isStripeConfigured } from "@/lib/shop/config";
import { getStripe } from "@/lib/shop/stripe";

export const runtime = "nodejs";

type Body = {
  status?: "packed" | "shipped";
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
    const admin = createAdminClient();
    if (order.payment_status === "refunded") {
      if (body.restock) {
        const { error } = await admin.rpc("shop_restock_refunded_order", {
          p_order_id: order.id,
        });
        if (error) {
          return NextResponse.json({ error: "Restock failed." }, { status: 500 });
        }
      }
      return NextResponse.json({ ok: true, status: "refunded" });
    }
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
    try {
      await stripe.refunds.create(
        {
          payment_intent: order.stripe_payment_intent_id,
          metadata: { order_id: order.id, order_number: order.order_number },
        },
        { idempotencyKey: `full-refund-${order.id}` },
      );
    } catch (error) {
      console.error("Stripe refund failed:", order.id, error);
      return NextResponse.json(
        { error: "Stripe could not confirm the refund. No order state changed." },
        { status: 502 },
      );
    }

    // Webhook will mark refunded; also mark immediately for UX.
    const { error: refundStateError } = await admin.rpc(
      "shop_mark_order_refunded",
      { p_order_id: order.id },
    );
    if (refundStateError) {
      console.error("Refund succeeded but local state update failed:", order.id);
      return NextResponse.json(
        {
          error:
            "Refund succeeded in Stripe, but the local status update failed. Retry this action to reconcile the order.",
        },
        { status: 500 },
      );
    }

    if (body.restock) {
      const { error: restockError } = await admin.rpc(
        "shop_restock_refunded_order",
        { p_order_id: order.id },
      );
      if (restockError) {
        return NextResponse.json(
          { error: "Refund succeeded, but inventory was not restocked." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true, status: "refunded" });
  }

  const patch: {
    status?: string;
    fulfillment_status?: string;
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
    const validTransition =
      (order.status === "paid" && ["packed", "shipped"].includes(body.status)) ||
      (order.status === "packed" && body.status === "shipped");
    if (!validTransition) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
    patch.fulfillment_status = body.status;
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
