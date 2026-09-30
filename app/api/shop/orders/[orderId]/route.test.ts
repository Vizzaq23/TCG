import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), refund: vi.fn(), load: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.load }) }) }) }),
}) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/shop/config", () => ({ isShopOwner: () => true, isStripeConfigured: () => true }));
vi.mock("@/lib/shop/stripe", () => ({ getStripe: () => ({ refunds: { create: mocks.refund } }) }));
import { PATCH } from "./route";
function patch() {
  return PATCH(new Request("https://shop.example.com/api/shop/orders/order", {
    method: "PATCH", body: JSON.stringify({ refund: true, restock: true }),
  }), { params: Promise.resolve({ orderId: "order" }) });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.load.mockResolvedValue({ data: { id: "order", order_number: "SYNTHETIC", status: "paid",
    payment_status: "paid", stripe_payment_intent_id: "pi_test" }, error: null });
  mocks.refund.mockResolvedValue({ status: "succeeded" });
  mocks.rpc.mockResolvedValue({ error: null });
});
it("keeps inventory and local payment state unchanged for a pending provider refund", async () => {
  mocks.refund.mockResolvedValue({ status: "pending" });
  const response = await patch();
  expect(response.status).toBe(202);
  expect(await response.json()).toMatchObject({ status: "refund_pending" });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("surfaces legacy backing reconciliation instead of an opaque restock failure", async () => {
  mocks.load.mockResolvedValue({ data: { id: "order", payment_status: "refunded" }, error: null });
  mocks.rpc.mockResolvedValue({ error: { message: "refund_collection_reconciliation_required" } });
  const response = await patch();
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ reconciliationRequired: true });
});
