import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { CartLineControls } from "@/components/shop/CartLineControls";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

it("names each cart control for its listing", () => {
  const Component = CartLineControls as ComponentType<{ listingId: string; quantity: number; maxQuantity: number; label: string }>;
  const markup = renderToStaticMarkup(createElement(Component, { listingId: "listing", quantity: 2, maxQuantity: 4, label: "Monkey D. Luffy" }));

  expect(markup).toContain('aria-label="Quantity for Monkey D. Luffy"');
  expect(markup).toContain('aria-label="Decrease quantity for Monkey D. Luffy"');
  expect(markup).toContain('aria-label="Increase quantity for Monkey D. Luffy"');
  expect(markup).toContain('aria-label="Remove Monkey D. Luffy from cart"');
});
