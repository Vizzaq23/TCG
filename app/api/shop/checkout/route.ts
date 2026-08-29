import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readCartCookie, clearCartCookie } from "@/lib/shop/cart-cookie";
import {
  buildCheckoutLines,
  createPendingOrderWithHolds,
} from "@/lib/shop/checkout";
import {
  getAppBaseUrl,
  getShopOwnerUserId,
  isStripeConfigured,
} from "@/lib/shop/config";
import { getStripe } from "@/lib/shop/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Checkout is not configured yet (missing Stripe keys)." },
      { status: 503 },
    );
  }

  const ownerId = getShopOwnerUserId();
  if (!ownerId) {
    return NextResponse.json(
      { error: "Shop owner is not configured (SHOP_OWNER_USER_ID)." },
      { status: 503 },
    );
  }

  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = (body.email?.trim() || user?.email || "").toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "A valid email is required for checkout." },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Server is missing Supabase service role configuration." },
      { status: 503 },
    );
  }

  const { data: settings } = await admin
    .from("shop_settings")
    .select("*")
    .eq("owner_user_id", ownerId)
    .maybeSingle();

  if (!settings?.is_live) {
    return NextResponse.json({ error: "The shop is not live." }, { status: 403 });
  }

  const cart = await readCartCookie();
  const { lines, error: lineError } = await buildCheckoutLines(admin, cart);
  if (lineError || !lines.length) {
    return NextResponse.json({ error: lineError ?? "Cart is empty." }, { status: 400 });
  }

  let pending;
  try {
    pending = await createPendingOrderWithHolds({
      admin,
      ownerUserId: ownerId,
      buyerEmail: email,
      buyerUserId: user?.id ?? null,
      shippingCents: settings.shipping_cents,
      currency: settings.currency || "usd",
      lines,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not reserve inventory.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const stripe = getStripe();
  const base = getAppBaseUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      client_reference_id: pending.orderId,
      metadata: {
        order_id: pending.orderId,
        order_number: pending.orderNumber,
      },
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      line_items: [
        ...lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: settings.currency || "usd",
            unit_amount: line.unitPriceCents,
            product_data: {
              name: line.title,
              description: [line.kind, line.condition].filter(Boolean).join(" · ") || undefined,
              images: line.imageUrl ? [line.imageUrl] : undefined,
            },
          },
        })),
        {
          quantity: 1,
          price_data: {
            currency: settings.currency || "usd",
            unit_amount: settings.shipping_cents,
            product_data: {
              name: "US shipping",
            },
          },
        },
      ],
      success_url: `${base}/shop/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/cart?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    await admin
      .from("shop_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", pending.orderId);

    // Clear local cart once Checkout is created; inventory is held server-side.
    await clearCartCookie();

    return NextResponse.json({
      url: session.url,
      orderId: pending.orderId,
      orderNumber: pending.orderNumber,
    });
  } catch (e) {
    await admin.rpc("shop_cancel_pending_order", { p_order_id: pending.orderId });
    const message = e instanceof Error ? e.message : "Stripe checkout failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
