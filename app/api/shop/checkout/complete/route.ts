import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearCartCookie, readCartCookie } from "@/lib/shop/cart-cookie";
import { isCheckoutPaymentConfirmed } from "@/lib/shop/checkout";
import { getStripeConfigurationError } from "@/lib/shop/config";
import { getStripe } from "@/lib/shop/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (getStripeConfigurationError()) {
    return NextResponse.json({ error: "Checkout unavailable" }, { status: 503 });
  }
  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const sessionId = body.sessionId?.trim();
  if (!sessionId?.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (!isCheckoutPaymentConfirmed(session.payment_status)) {
      return NextResponse.json({ error: "Payment is not confirmed" }, { status: 409 });
    }
    const orderId = session.metadata?.order_id || session.client_reference_id;
    if (!orderId) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const admin = createAdminClient();
    const { data: order } = await admin
      .from("shop_orders")
      .select("checkout_token, stripe_checkout_session_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!order || order.stripe_checkout_session_id !== session.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const cart = await readCartCookie();
    const cleared = Boolean(
      cart.checkoutToken && cart.checkoutToken === order.checkout_token,
    );
    if (cleared) await clearCartCookie();
    return NextResponse.json(
      { ok: true, cleared },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not complete local checkout state:", error);
    return NextResponse.json({ error: "Could not verify payment" }, { status: 502 });
  }
}
