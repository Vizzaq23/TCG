import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
  rpc: mocks.rpc, from: mocks.from,
}) }));
vi.mock("@/lib/shop/config", () => ({ isShopOwner: () => true }));
vi.mock("@/lib/shop/owner", () => ({ ensureShopSettings: vi.fn() }));
import { POST } from "./route";
function post(body: object) {
  return POST(new Request("https://shop.example.com/api/shop/listings", {
    method: "POST", body: JSON.stringify({ kind: "single", title: "Synthetic", quantity: 1,
      price_cents: 100, collection_id: "collection", ...body }),
  }));
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockImplementation((name: string) => name === "shop_collection_allocated_units"
    ? Promise.resolve({ data: 0, error: null })
    : { single: async () => ({ data: { id: "listing" }, error: null }) });
  mocks.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "listing" }, error: null }) }) });
  mocks.from.mockImplementation((table: string) => table === "user_collections" ? {
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
      id: "collection", user_id: "owner", card_id: "card", quantity: 1, condition: "Near Mint",
    }, error: null }) }) }) }),
  } : table === "cards" ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
    : { insert: mocks.insert });
});
it("blocks creation when the allocation lookup fails", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
  expect((await post({})).status).toBe(503);
});
it("returns the atomic creation result including bundle failure", async () => {
  mocks.rpc.mockReturnValue({ single: async () => ({ data: null, error: { message: "invalid bundle card" } }) });
  const response = await post({ kind: "bulk_lot", collection_id: null, items: [{ card_id: "missing", quantity: 1 }] });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid bundle card" });
});
