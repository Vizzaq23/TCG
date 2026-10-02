import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cart: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/shop/cart-cookie", () => ({ readCartCookie: mocks.cart }));
vi.mock("@/lib/supabase/admin", () => ({ tryCreateAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("@/lib/supabase/server-user", () => ({ getVerifiedServerUser: async () => null }));
vi.mock("@/lib/shop/owner", () => ({ getPublicShopSettings: async () => ({
  is_live: true, launch_ready_at: "synthetic", support_email: "synthetic@example.com", shipping_cents: 0,
}) }));
vi.mock("@/lib/shop/config", () => ({ getCheckoutConfigurationError: () => null, getShopOwnerUserId: () => "owner" }));
vi.mock("@/components/shop/CheckoutForm", () => ({ CheckoutForm: () => "CHECKOUT READY" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import CartPage from "./page";
let listing: { id: string; title: string; kind: string; condition: string | null; price_cents: number;
  quantity_available: number; status: string; image_url: null; cards: null } | null;
let available: number;
let pending: { id: string; shipping_cents: number } | null;
let reserved: { listing_id: string; title: string; kind: string; condition: null; quantity: number; unit_price_cents: number }[];
beforeEach(() => {
  vi.resetAllMocks();
  listing={ id: "listing", title: "Synthetic card", kind: "single", condition: null,
    price_cents: 100, quantity_available: 1, status: "active", image_url: null, cards: null };
  available=1;
  pending=null; reserved=[];
  mocks.cart.mockResolvedValue({ items: [{ listingId: "listing", quantity: 1 }], checkoutToken: "token" });
  mocks.from.mockImplementation((table: string) => {
    const result={ data: table === "shop_orders" ? pending : listing, error: null };
    const chain={ eq: () => chain, maybeSingle: async () => result,
      in: async () => ({ data: listing ? [listing] : [], error: null }), order: async () => ({ data: reserved, error: null }) };
    return { select: () => chain };
  });
  mocks.rpc.mockImplementation(async (name: string) => ({ error: null,
    data: name === "shop_held_quantity" ? 1 : [{ listing_id: "listing", available_quantity: available, own_held_quantity: 1 }],
  }));
});
async function render() { return renderToStaticMarkup(await CartPage({ searchParams: Promise.resolve({ cancelled: "1" }) })); }
it("shows the requested copy as available when its own checkout holds it", async () => {
  const html=await render();
  expect(html).toContain("1 of 1 max");
  expect(html).toContain("CHECKOUT READY");
});
it("keeps requested quantity and total consistent while blocking a stale stock conflict", async () => {
  mocks.cart.mockResolvedValue({ items: [{ listingId: "listing", quantity: 3 }] }); available=1;
  const html=await render();
  expect(html).toContain("3 of 1 max");
  expect(html).toContain("$3.00");
  expect(html).not.toContain("CHECKOUT READY");
});
it("keeps missing cookie lines visible and removable", async () => {
  listing=null;
  const html=await render();
  expect(html).toContain("No longer available");
  expect(html).toContain("Remove");
  expect(html).not.toContain("Your cart is empty");
});
it("blocks checkout when availability cannot be verified", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: "temporary failure" } });
  expect(await render()).not.toContain("CHECKOUT READY");
});
it("resumes with immutable reserved prices and shipping totals", async () => {
  pending={id:"order",shipping_cents:250};
  reserved=[{listing_id:"listing",title:"Reserved card",kind:"single",condition:null,quantity:1,unit_price_cents:70}];
  const html=await render();
  expect(html.includes("$0.70")).toBe(true);
  expect(html.includes("$3.20")).toBe(true);
  expect(html.includes("$3.50")).toBe(false);
});
it("preserves an explicitly empty reserved condition after listing metadata changes", async () => {
  listing!.condition = "Near Mint";
  pending = { id: "order", shipping_cents: 0 };
  reserved = [{ listing_id: "listing", title: "Reserved card", kind: "single", condition: null, quantity: 1, unit_price_cents: 70 }];
  expect(await render()).not.toContain("Near Mint");
});
it("refuses to resume when cookie quantities disagree with the pending order", async () => {
  pending={id:"order",shipping_cents:0};
  reserved=[{listing_id:"listing",title:"Reserved card",kind:"single",condition:null,quantity:2,unit_price_cents:70}];
  const html=await render();
  expect(html.includes("CHECKOUT READY")).toBe(false);
  expect(html.includes("Your cart differs from its reserved checkout")).toBe(true);
});
