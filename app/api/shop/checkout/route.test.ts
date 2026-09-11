import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CartState } from "@/lib/shop/cart";
import type { PendingCheckout } from "@/lib/shop/checkout";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  reserve: vi.fn(),
  readCart: vi.fn(),
  writeCart: vi.fn(),
  create: vi.fn(),
  retrieve: vi.fn(),
  expire: vi.fn(),
  attach: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/lib/shop/cart-cookie", () => ({
  readCartCookie: mocks.readCart,
  writeCartCookie: mocks.writeCart,
}));
vi.mock("@/lib/shop/checkout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/shop/checkout")>()),
  createPendingOrderWithHolds: mocks.reserve,
}));
vi.mock("@/lib/shop/config", () => ({
  getCheckoutConfigurationError: () => null,
  getShopOwnerUserId: () => "owner",
  getAppBaseUrl: () => "https://shop.example.com",
  getStripeTaxMode: () => "none",
}));
vi.mock("@/lib/shop/rate-limit", () => ({
  getCheckoutFingerprint: () => "test-fingerprint",
}));
vi.mock("@/lib/shop/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: {
      create: mocks.create, retrieve: mocks.retrieve, expire: mocks.expire,
    } },
  }),
}));
vi.mock("@/lib/supabase/server-user", () => ({
  getVerifiedServerUser: async () => null,
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { POST } from "./route";

const token = "00000000-0000-4000-8000-000000000001";
const sessionId = "cs_test_checkout";
let cart: CartState;
let pending: PendingCheckout;

function post() {
  return POST(new Request("https://shop.example.com/api/shop/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "buyer@example.com" }),
  }));
}

function expectReservationRetained() {
  expect(mocks.rpc).not.toHaveBeenCalledWith("shop_cancel_pending_order", expect.anything());
  expect(cart.checkoutToken).toBe(token);
  expect(mocks.writeCart).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  cart = { items: [{ listingId: "listing", quantity: 1 }], checkoutToken: token };
  pending = {
    orderId: "order", orderNumber: "TCG-TEST", orderStatus: "pending_payment",
    stripeCheckoutSessionId: null, subtotalCents: 1500, shippingCents: 0,
    totalCents: 1500, currency: "usd",
    lines: [{ listingId: "listing", title: "Card", kind: "single",
      condition: "Near Mint", quantity: 1, unitPriceCents: 1500 }],
  };
  mocks.readCart.mockResolvedValue(cart);
  mocks.reserve.mockImplementation(async () => ({ ...pending }));
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.attach.mockResolvedValue({ error: null });
  mocks.from.mockImplementation((table: string) => {
    if (table === "shop_settings") {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: { is_live: true, launch_ready_at: "2026-09-10", shipping_cents: 0,
          currency: "usd", support_email: "support@example.com" }, error: null,
      }) }) }) };
    }
    if (table === "shop_orders") {
      return { update: () => ({ eq: () => ({ eq: mocks.attach }) }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  mocks.create.mockResolvedValue({
    id: sessionId, url: "https://checkout.stripe.com/test", status: "open", payment_status: "unpaid",
  });
  mocks.expire.mockResolvedValue({ id: sessionId, status: "expired", payment_status: "unpaid" });
});

afterEach(() => vi.restoreAllMocks());

describe("checkout failure inventory safety", () => {
  it("keeps the order and token when Stripe creation has an unknown outcome", async () => {
    mocks.create.mockRejectedValue(new Error("connection lost after request sent"));
    expect((await post()).status).toBe(502);
    expectReservationRetained();
    expect(mocks.expire).not.toHaveBeenCalled();
  });

  it("does not cancel a shared order when a concurrent creation request fails", async () => {
    mocks.create.mockResolvedValueOnce({ id: sessionId, url: "https://checkout.stripe.com/test" })
      .mockRejectedValueOnce(new Error("idempotency_key_in_use"));
    const responses = await Promise.all([post(), post()]);
    expect(responses.map((response) => response.status)).toEqual([200, 502]);
    expectReservationRetained();
  });

  it("keeps inventory reserved when session expiration fails after an attach error", async () => {
    mocks.attach.mockResolvedValue({ error: new Error("database unavailable") });
    mocks.expire.mockRejectedValue(new Error("session already complete or network failure"));
    expect((await post()).status).toBe(502);
    expect(mocks.expire).toHaveBeenCalledWith(sessionId);
    expectReservationRetained();
  });

  it.each([
    { id: sessionId, status: "complete", payment_status: "paid" },
    { id: sessionId, status: "open", payment_status: "unpaid" },
    { id: "cs_other", status: "expired", payment_status: "unpaid" },
    { id: sessionId, status: "expired", payment_status: "paid" },
  ])("requires confirmed unpaid expiration of the matching session: %j", async (session) => {
    mocks.attach.mockResolvedValue({ error: new Error("attach failed") });
    mocks.expire.mockResolvedValue(session);
    expect((await post()).status).toBe(502);
    expectReservationRetained();
  });

  it("releases inventory and rotates the token after confirmed unpaid expiration", async () => {
    mocks.attach.mockResolvedValue({ error: new Error("attach failed") });
    expect((await post()).status).toBe(502);
    expect(mocks.rpc).toHaveBeenCalledWith("shop_cancel_pending_order", { p_order_id: "order" });
    expect(cart.checkoutToken).not.toBe(token);
    expect(mocks.writeCart).toHaveBeenCalledWith(cart);
  });

  it("keeps the token when database cancellation fails after confirmed expiration", async () => {
    mocks.attach.mockResolvedValue({ error: new Error("attach failed") });
    mocks.rpc.mockImplementation(async (name: string) => ({
      error: name === "shop_cancel_pending_order" ? new Error("database unavailable") : null,
    }));
    expect((await post()).status).toBe(502);
    expect(cart.checkoutToken).toBe(token);
    expect(mocks.writeCart).not.toHaveBeenCalled();
  });

  it("does not create a replacement when cancellation of a resumed expired order fails", async () => {
    pending.stripeCheckoutSessionId = sessionId;
    mocks.retrieve.mockResolvedValue({ id: sessionId, status: "expired", payment_status: "unpaid" });
    mocks.rpc.mockImplementation(async (name: string) => ({
      error: name === "shop_cancel_pending_order" ? new Error("database unavailable") : null,
    }));
    expect((await post()).status).toBe(502);
    expect(cart.checkoutToken).toBe(token);
    expect(mocks.reserve).toHaveBeenCalledTimes(1);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([
    { id: "cs_other", status: "expired", payment_status: "unpaid" },
    { id: sessionId, status: "expired", payment_status: "paid" },
  ])("retains a resumed order without matching unpaid expiration: %j", async (session) => {
    pending.stripeCheckoutSessionId = sessionId;
    mocks.retrieve.mockResolvedValue(session);
    expect((await post()).status).toBe(502);
    expectReservationRetained();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("starts a replacement after successfully cancelling a resumed expired order", async () => {
    pending.stripeCheckoutSessionId = sessionId;
    mocks.retrieve.mockResolvedValue({ id: sessionId, status: "expired", payment_status: "unpaid" });
    mocks.reserve.mockResolvedValueOnce({ ...pending }).mockResolvedValueOnce({
      ...pending, orderId: "replacement-order", stripeCheckoutSessionId: null,
    });
    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ orderId: "replacement-order" });
    expect(mocks.rpc).toHaveBeenCalledWith("shop_cancel_pending_order", { p_order_id: "order" });
    expect(cart.checkoutToken).not.toBe(token);
    expect(mocks.reserve).toHaveBeenLastCalledWith(expect.objectContaining({ checkoutToken: cart.checkoutToken }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      client_reference_id: "replacement-order",
    }), { idempotencyKey: cart.checkoutToken });
  });

  it("still returns a successfully created checkout", async () => {
    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ url: "https://checkout.stripe.com/test", orderId: "order" });
    expectReservationRetained();
  });
});
