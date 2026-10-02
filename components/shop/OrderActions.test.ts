// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { OrderActions } from "./OrderActions";
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container=document.createElement("div"); document.body.append(container); root=createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
it("offers explicit inventory recovery after a confirmed refund", async () => {
  await act(async () => root.render(createElement(OrderActions, { orderId: "order", status: "refunded", trackingNumber: null })));
  expect(container.textContent).toContain("Restock returned inventory");
});
