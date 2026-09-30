// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ update: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  from: () => ({ update: () => ({ eq: mocks.update }) }),
}) }));
import { ListingStatusButtons } from "./ListingStatusButtons";
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  vi.resetAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(ListingStatusButtons, { listingId: "listing", status: "archived" })));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
it("shows a stock conflict and leaves activation retryable", async () => {
  mocks.update.mockResolvedValue({ error: { message: "insufficient_collection_stock" } });
  await act(async () => container.querySelector("button")!.click());
  expect(container.querySelector('[role="alert"]')?.textContent ?? "").toMatch(/collection|shelf/i);
  expect(container.querySelector("button")!.disabled).toBe(false);
});
