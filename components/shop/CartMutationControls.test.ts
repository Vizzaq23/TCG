// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
import { CartLineControls } from "./CartLineControls";
import { AddToCartButton } from "./AddToCartButton";
let root: Root; let container: HTMLDivElement;
beforeEach(() => {
  vi.resetAllMocks(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container=document.createElement("div"); document.body.append(container); root=createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
for (const control of ["quantity", "add"]) {
  it.each(["rejected", "network", "invalid response"])(`${control} shows a recoverable cart mutation %s failure`, async (failure) => {
    await act(async () => root.render(control === "quantity"
      ? createElement(CartLineControls,{listingId:"listing",quantity:1,maxQuantity:2})
      : createElement(AddToCartButton,{listingId:"listing",maxQuantity:2})));
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
      if (failure === "network") throw new Error("network unavailable");
      return { ok: false, json: async () => { if(failure === "invalid response") throw new Error("HTML"); return { error: "Existing checkout could not be cancelled; cart was kept." }; } };
    }));
    const button = control === "quantity" ? container.querySelector<HTMLButtonElement>('[aria-label="Increase quantity"]')! : container.querySelector("button")!;
    await act(async () => button.click());
    expect(button.disabled).toBe(false); expect(container.textContent).toMatch(/could not|kept|retry/i);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
}
