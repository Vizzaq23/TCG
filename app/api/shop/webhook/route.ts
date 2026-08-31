import { NextResponse } from "next/server";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  finalizePaidOrder,
  getVerifiedCheckoutAmounts,
} from "@/lib/shop/checkout";
import {
  getOrderNotificationConfigurationError,
  getStripeConfigurationError,
  getStripeTaxMode,
  isStripeEventModeAllowed,
} from "@/lib/shop/config";
import { sendPaidOrderNotifications } from "@/lib/shop/notifications";
import { getStripe } from "@/lib/shop/stripe";
import type { Json } from "@/lib/types/database";

export const runtime = "nodejs";

function shippingAddressToJson(
  address: Stripe.Address | null | undefined,
): Json | null {
  if (!address) return null;
  return {
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country: address.country,
  };
}

function orderIdFromSession(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.order_id || session.client_reference_id || null;
}

export async function POST(request: Request) {
  const configurationError =
    getStripeConfigurationError() ?? getOrderNotificationConfigurationError();
  if (configurationError) {
    console.error("Stripe webhook configuration blocked:", configurationError);
    return NextResponse.json({ error: "Webhook unavailable" }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Webhook unavailable" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (!isStripeEventModeAllowed(event.livemode)) {
    console.error("Rejected Stripe event from the wrong live/test mode", event.id);
    return NextResponse.json({ error: "Wrong Stripe mode" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Webhook unavailable" }, { status: 503 });
  }

  const { data: claimed, error: claimError } = await admin.rpc(
    "shop_claim_stripe_event",
    { p_event_id: event.id, p_event_type: event.type },
  );
  if (claimError) {
    console.error("Could not claim Stripe webhook event:", claimError);
    Sentry.captureException(claimError, {
      tags: { area: "stripe_webhook", operation: "claim_event" },
      extra: { eventId: event.id, eventType: event.type },
    });
    return NextResponse.json({ error: "Webhook persistence failed" }, { status: 500 });
  }
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (
        event.type === "checkout.session.async_payment_succeeded" ||
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required"
      ) {
        const orderId = orderIdFromSession(session);
        if (!orderId) throw new Error("checkout_session_missing_order_id");

        const { data: order, error: orderError } = await admin
          .from("shop_orders")
          .select(
            "id, currency, subtotal_cents, shipping_cents, stripe_checkout_session_id",
          )
          .eq("id", orderId)
          .maybeSingle();
        if (orderError || !order) throw new Error("checkout_order_not_found");
        if (
          order.stripe_checkout_session_id &&
          order.stripe_checkout_session_id !== session.id
        ) {
          throw new Error("checkout_session_mismatch");
        }

        const amounts = getVerifiedCheckoutAmounts(session);
        if (
          amounts.currency !== order.currency.toLowerCase() ||
          amounts.amountSubtotalCents !==
            order.subtotal_cents + order.shipping_cents
        ) {
          throw new Error("checkout_amount_mismatch");
        }
        if (getStripeTaxMode() === "none" && amounts.taxCents !== 0) {
          throw new Error("unexpected_checkout_tax");
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
          buyerEmail:
            session.customer_details?.email || session.customer_email || "",
          shippingName: details?.name ?? session.customer_details?.name ?? null,
          shippingAddress: shippingAddressToJson(
            details?.address ?? session.customer_details?.address,
          ),
          ...amounts,
        });
        await sendPaidOrderNotifications(admin, orderId);
      }
    }

    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = orderIdFromSession(session);
      if (orderId) {
        const { error } = await admin.rpc("shop_cancel_pending_order", {
          p_order_id: orderId,
        });
        if (error) throw error;
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (paymentIntent && charge.refunded) {
        const { data: order } = await admin
          .from("shop_orders")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntent)
          .maybeSingle();
        if (order) {
          const { error } = await admin.rpc("shop_mark_order_refunded", {
            p_order_id: order.id,
          });
          if (error) throw error;
        }
      }
    }
    const { error: completeError } = await admin.rpc(
      "shop_complete_stripe_event",
      { p_event_id: event.id },
    );
    if (completeError) throw completeError;
  } catch (error) {
    await admin.rpc("shop_release_stripe_event", { p_event_id: event.id });
    console.error("Stripe webhook processing failed:", event.id, error);
    Sentry.captureException(error, {
      tags: { area: "stripe_webhook", operation: "process_event" },
      extra: { eventId: event.id, eventType: event.type },
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
