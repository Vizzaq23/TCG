// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CheckoutForm } from "./CheckoutForm";
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(CheckoutForm, { defaultEmail: "buyer@example.com" })));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
it.each(["network", "invalid response"])("leaves checkout retryable after %s failure", async (failure) => {
  const fetchMock = vi.fn().mockImplementation(async () => {
    if (failure === "network") throw new Error("network unavailable");
    return { ok: false, json: async () => { throw new Error("HTML response"); } };
  });
  vi.stubGlobal("fetch", fetchMock);
  await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  expect(container.querySelector("button")!.disabled).toBe(false);
  expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/could not be confirmed|retry/i);
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Please retry shortly." }) });
  await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
