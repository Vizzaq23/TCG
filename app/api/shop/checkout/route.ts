import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { readCartCookie, writeCartCookie } from "@/lib/shop/cart-cookie";
import {
  createPendingOrderWithHolds,
  customerSafeCheckoutError,
  type PendingCheckout,
} from "@/lib/shop/checkout";
import {
  getAppBaseUrl,
  getCheckoutConfigurationError,
  getShopOwnerUserId,
  getStripeTaxMode,
} from "@/lib/shop/config";
import { getCheckoutFingerprint } from "@/lib/shop/rate-limit";
import { getStripe } from "@/lib/shop/stripe";
import { getVerifiedServerUser } from "@/lib/supabase/server-user";

export const runtime = "nodejs";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidEmail(value: string): boolean {
  return (
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export async function POST(request: Request) {
  const configurationError = getCheckoutConfigurationError();
  if (configurationError) {
    console.error("Checkout configuration blocked:", configurationError);
    return json({ error: "Checkout is not available yet." }, 503);
  }

  const ownerId = getShopOwnerUserId();
  if (!ownerId) {
    return json({ error: "Checkout is not available yet." }, 503);
  }
  const configuredOwnerId = ownerId;

  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const user = await getVerifiedServerUser();
  const email = (body.email?.trim() || user?.email || "").toLowerCase();
  if (!isValidEmail(email)) {
    return json({ error: "A valid email is required for checkout." }, 400);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return json({ error: "Checkout is not available yet." }, 503);
  }

  const { data: settings, error: settingsError } = await admin
    .from("shop_settings")
    .select("is_live, launch_ready_at, shipping_cents, currency, support_email")
    .eq("owner_user_id", configuredOwnerId)
    .maybeSingle();
  if (
    settingsError ||
    !settings?.is_live ||
    !settings.launch_ready_at ||
    settings.shipping_cents == null ||
    !settings.support_email
  ) {
    return json({ error: "The shop is not open for checkout yet." }, 403);
  }

  const cart = await readCartCookie();
  if (!cart.items.length) {
    return json({ error: "Your cart is empty." }, 400);
  }

  let checkoutToken = cart.checkoutToken ?? crypto.randomUUID();
  if (!cart.checkoutToken) {
    cart.checkoutToken = checkoutToken;
    await writeCartCookie(cart);
  }

  let fingerprint: string;
  try {
    fingerprint = getCheckoutFingerprint(request, email);
  } catch (error) {
    console.error("Checkout rate-limit configuration failed:", error);
    return json({ error: "Checkout is not available yet." }, 503);
  }
  const { error: rateLimitError } = await admin.rpc(
    "shop_enforce_checkout_rate_limit",
    { p_fingerprint: fingerprint, p_limit: 8, p_window_seconds: 600 },
  );
  if (rateLimitError) {
    if (/checkout_rate_limit_exceeded/i.test(rateLimitError.message)) {
      return json(
        { error: "Too many checkout attempts. Please wait a few minutes and retry." },
        429,
      );
    }
    console.error("Checkout rate-limit check failed:", rateLimitError.message);
    return json({ error: "Checkout is temporarily unavailable." }, 503);
  }

  async function reserve(token: string): Promise<PendingCheckout> {
    return createPendingOrderWithHolds({
      admin,
      ownerUserId: configuredOwnerId,
      buyerEmail: email,
      buyerUserId: user?.id ?? null,
      checkoutToken: token,
      cart: { ...cart, checkoutToken: token },
    });
  }

  let pending: PendingCheckout;
  try {
    pending = await reserve(checkoutToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "pending_order_failed";
    return json({ error: customerSafeCheckoutError(message) }, 409);
  }

  const stripe = getStripe();
  const base = getAppBaseUrl();

  if (pending.orderStatus !== "pending_payment") {
    if (
      ["paid", "packed", "shipped", "refunded"].includes(pending.orderStatus) &&
      pending.stripeCheckoutSessionId
    ) {
      return json({
        url: `${base}/shop/order/success?session_id=${encodeURIComponent(
          pending.stripeCheckoutSessionId,
        )}`,
        orderId: pending.orderId,
        orderNumber: pending.orderNumber,
      });
    }
    checkoutToken = crypto.randomUUID();
    cart.checkoutToken = checkoutToken;
    await writeCartCookie(cart);
    try {
      pending = await reserve(checkoutToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "pending_order_failed";
      return json({ error: customerSafeCheckoutError(message) }, 409);
    }
  }

  if (pending.stripeCheckoutSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(
        pending.stripeCheckoutSessionId,
      );
      if (existing.status === "open" && existing.url) {
        return json({
          url: existing.url,
          orderId: pending.orderId,
          orderNumber: pending.orderNumber,
          resumed: true,
        });
      }
      if (existing.status === "complete") {
        return json({
          url: `${base}/shop/order/success?session_id=${encodeURIComponent(
            existing.id,
          )}`,
          orderId: pending.orderId,
          orderNumber: pending.orderNumber,
          resumed: true,
        });
      }
      if (existing.status === "expired") {
        await admin.rpc("shop_cancel_pending_order", {
          p_order_id: pending.orderId,
        });
        checkoutToken = crypto.randomUUID();
        cart.checkoutToken = checkoutToken;
        await writeCartCookie(cart);
        pending = await reserve(checkoutToken);
      }
    } catch (error) {
      console.error("Could not resume Stripe Checkout session:", error);
      return json(
        { error: "Your existing checkout could not be resumed. Please try again shortly." },
        502,
      );
    }
  }

  const taxMode = getStripeTaxMode();
  if (!taxMode) {
    return json({ error: "Checkout is not available yet." }, 503);
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    pending.lines.map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency: pending.currency,
      unit_amount: line.unitPriceCents,
      product_data: {
        name: line.title,
        description:
          [line.kind, line.condition].filter(Boolean).join(" · ") || undefined,
      },
    },
    }));
  if (pending.shippingCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: pending.currency,
        unit_amount: pending.shippingCents,
        product_data: { name: "Shipping" },
      },
    });
  }

  let sessionId: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: email,
        client_reference_id: pending.orderId,
        metadata: {
          order_id: pending.orderId,
          order_number: pending.orderNumber,
        },
        payment_intent_data: { receipt_email: email },
        shipping_address_collection: { allowed_countries: ["US"] },
        automatic_tax: taxMode === "automatic" ? { enabled: true } : undefined,
        line_items: lineItems,
        success_url: `${base}/shop/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/cart?cancelled=1`,
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      },
      { idempotencyKey: checkoutToken },
    );
    sessionId = session.id;
    if (!session.url) throw new Error("stripe_checkout_url_missing");

    const { error: attachError } = await admin
      .from("shop_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", pending.orderId)
      .eq("checkout_token", checkoutToken);
    if (attachError) throw attachError;

    return json({
      url: session.url,
      orderId: pending.orderId,
      orderNumber: pending.orderNumber,
    });
  } catch (error) {
    console.error("Stripe Checkout session creation failed:", error);
    if (sessionId) {
      try {
        await stripe.checkout.sessions.expire(sessionId);
      } catch {
        // The signed webhook remains authoritative if expiration races completion.
      }
    }
    await admin.rpc("shop_cancel_pending_order", { p_order_id: pending.orderId });
    cart.checkoutToken = crypto.randomUUID();
    await writeCartCookie(cart);
    return json(
      { error: "Stripe Checkout could not be started. Your cart was kept; please retry." },
      502,
    );
  }
}
