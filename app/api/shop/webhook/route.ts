import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizePaidOrder } from "@/lib/shop/checkout";
import { getStripe } from "@/lib/shop/stripe";
import type { Json } from "@/lib/types/database";

export const runtime = "nodejs";

function shippingAddressToJson(
  addr: Stripe.Address | null | undefined,
): Json | null {
  if (!addr) return null;
  return {
    line1: addr.line1,
    line2: addr.line2,
    city: addr.city,
    state: addr.state,
    postal_code: addr.postal_code,
    country: addr.country,
  };
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Supabase admin unavailable" }, { status: 503 });
  }

  const { error: insertError } = await admin.from("stripe_webhook_events").insert({
    id: event.id,
    type: event.type,
  });

  if (insertError) {
    // Unique violation → already processed
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId =
        session.metadata?.order_id || session.client_reference_id || null;
      if (!orderId) {
        throw new Error("checkout.session.completed missing order_id");
      }

      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      const details = session.collected_information?.shipping_details ?? null;

      await finalizePaidOrder({
        admin,
        orderId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntent,
        buyerEmail: session.customer_details?.email || session.customer_email || "",
        shippingName: details?.name ?? session.customer_details?.name ?? null,
        shippingAddress: shippingAddressToJson(
          details?.address ?? session.customer_details?.address,
        ),
      });
    }

    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId =
        session.metadata?.order_id || session.client_reference_id || null;
      if (orderId) {
        await admin.rpc("shop_cancel_pending_order", { p_order_id: orderId });
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (paymentIntent) {
        const { data: order } = await admin
          .from("shop_orders")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntent)
          .maybeSingle();
        if (order) {
          await admin.rpc("shop_mark_order_refunded", { p_order_id: order.id });
        }
      }
    }
  } catch (e) {
    // Allow Stripe to retry: remove idempotency row on failure
    await admin.from("stripe_webhook_events").delete().eq("id", event.id);
    const message = e instanceof Error ? e.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
