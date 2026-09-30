import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), from: vi.fn(), constructEvent: vi.fn(), finalize: vi.fn(),
  notify: vi.fn(), captureException: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/lib/shop/checkout", async (original) => ({
  ...(await original<typeof import("@/lib/shop/checkout")>()),
  finalizePaidOrder: mocks.finalize,
}));
vi.mock("@/lib/shop/config", () => ({
  getOrderNotificationConfigurationError: () => null,
  getStripeConfigurationError: () => null,
  getStripeTaxMode: () => "none",
  isStripeEventModeAllowed: (live: boolean) => !live,
}));
vi.mock("@/lib/shop/notifications", () => ({ sendPaidOrderNotifications: mocks.notify }));
vi.mock("@/lib/shop/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent: mocks.constructEvent } }),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }));

import { POST } from "./route";

let order: { id: string; payment_status: string; stripe_payment_intent_id: string | null };
let queryError: { message: string } | null;
let processed: Set<string>;
let claimed: Set<string>;
function refund(id = "evt_refund", paymentIntent: string | null = "pi_test") {
  return { id, type: "charge.refunded", livemode: false,
    data: { object: { payment_intent: paymentIntent, refunded: true } } };
}
function paid() {
  return { id: "evt_paid", type: "checkout.session.completed", livemode: false,
    data: { object: { id: "cs_test", metadata: { order_id: "order" },
      payment_intent: "pi_test", payment_status: "paid", currency: "usd",
      amount_subtotal: 1500, amount_total: 1500, total_details: { amount_tax: 0 },
      customer_details: { email: "buyer@example.com" } } } };
}
async function deliver(event: ReturnType<typeof refund> | ReturnType<typeof paid>) {
  mocks.constructEvent.mockReturnValue(event);
  return POST(new Request("https://shop.example.com/api/shop/webhook", {
    method: "POST", headers: { "stripe-signature": "synthetic-signature" }, body: "synthetic",
  }));
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_synthetic");
  vi.spyOn(console, "error").mockImplementation(() => {});
  order = { id: "order", payment_status: "unpaid", stripe_payment_intent_id: null };
  queryError = null; processed = new Set(); claimed = new Set();
  mocks.from.mockReturnValue({ select: () => ({ eq: (field: string, value: string) => ({
    maybeSingle: async () => ({ error: queryError, data: field === "id" ? {
      ...order, currency: "usd", subtotal_cents: 1500, shipping_cents: 0,
      stripe_checkout_session_id: "cs_test",
    } : order.stripe_payment_intent_id === value ? { ...order } : null }),
  }) }) });
  mocks.rpc.mockImplementation(async (name: string, args: { p_event_id?: string }) => {
    const id = args.p_event_id!;
    if (name === "shop_claim_stripe_event") {
      if (processed.has(id) || claimed.has(id)) return { data: false, error: null };
      claimed.add(id); return { data: true, error: null };
    }
    if (name === "shop_complete_stripe_event") { processed.add(id); claimed.delete(id); }
    if (name === "shop_release_stripe_event") claimed.delete(id);
    if (name === "shop_mark_order_refunded" && ["paid", "refunded"].includes(order.payment_status)) {
      order.payment_status = "refunded";
    }
    return { data: null, error: null };
  });
  mocks.finalize.mockImplementation(async () => {
    order.payment_status = "paid"; order.stripe_payment_intent_id = "pi_test";
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("refund delivery recovery", () => {
  it("keeps an unmatched refund retryable until payment finalization links its intent", async () => {
    expect((await deliver(refund())).status).toBe(500);
    expect(processed.has("evt_refund")).toBe(false);
    expect(claimed.has("evt_refund")).toBe(false);
    expect((await deliver(paid())).status).toBe(200);
    expect((await deliver(refund())).status).toBe(200);
    expect(order.payment_status).toBe("refunded");
    expect((await (await deliver(refund())).json()).duplicate).toBe(true);
  });
  it("does not acknowledge a refund when the order lookup fails", async () => {
    queryError = { message: "temporary database failure" };
    expect((await deliver(refund())).status).toBe(500);
    expect(processed.size).toBe(0);
    queryError = null; order.payment_status = "paid"; order.stripe_payment_intent_id = "pi_test";
    expect((await deliver(refund())).status).toBe(200);
    expect(order.payment_status).toBe("refunded");
  });
  it("keeps a linked but unpaid order refund retryable", async () => {
    order.stripe_payment_intent_id = "pi_test";
    expect((await deliver(refund())).status).toBe(500);
    expect(processed.size).toBe(0);
  });
  it("accepts a completed refund idempotently", async () => {
    order.payment_status = "refunded"; order.stripe_payment_intent_id = "pi_test";
    expect((await deliver(refund())).status).toBe(200);
    expect(order.payment_status).toBe("refunded");
  });
  it("does not consume a full refund without a payment intent", async () => {
    expect((await deliver(refund("evt_missing_intent", null))).status).toBe(500);
    expect(processed.size).toBe(0);
  });
});
