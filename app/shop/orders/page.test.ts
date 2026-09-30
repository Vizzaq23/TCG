import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), owner: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) }, from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: mocks.query }) }) }) }) }) }));
vi.mock("@/lib/shop/config", () => ({ isShopOwner: mocks.owner }));
vi.mock("@/components/shop/OrderActions", () => ({ OrderActions: ({ status }: { status: string }) => createElement("span", null, `Actions for ${status}`) }));
import OrdersPage from "./page";
beforeEach(() => { vi.resetAllMocks(); mocks.owner.mockReturnValue(true); });
it("makes refunded-order recovery reachable", async () => {
  mocks.query.mockResolvedValue({ data: [{ id: "order", order_number: "TCG-TEST", status: "refunded", total_cents: 100, shop_order_items: [] }], error: null });
  expect(renderToStaticMarkup(await OrdersPage())).toContain("Actions for refunded");
});
it("reports failed order reads instead of an empty order desk", async () => {
  mocks.query.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
  const html = renderToStaticMarkup(await OrdersPage());
  expect(html).toContain("Orders could not be loaded");
  expect(html).not.toContain("No orders yet");
});
it("does not read orders for another collector", async () => {
  mocks.owner.mockReturnValue(false);
  expect(renderToStaticMarkup(await OrdersPage())).toContain("Shop owner only");
  expect(mocks.query).not.toHaveBeenCalled();
});
