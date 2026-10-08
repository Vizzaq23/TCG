import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
it("shows remaining quantity and links existing cart context", () => {
  const markup = renderToStaticMarkup(createElement(AddToCartButton, { listingId: "listing", maxQuantity: 5, existingQuantity: 2 }));
  expect(markup).toMatch(/<input(?=[^>]*name="quantity")(?=[^>]*min="1")(?=[^>]*max="3")(?=[^>]*step="1")[^>]*>/);
  expect(markup).toContain('<a href="/cart"');
  expect(markup).toContain("2 items already in cart");
});
