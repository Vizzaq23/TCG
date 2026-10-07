import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AddToCartButton } from "@/components/shop/AddToCartButton";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

it("offers only the quantity not already in the cart", () => {
  const props = { listingId: "listing", maxQuantity: 5, existingQuantity: 2 } as { listingId: string; maxQuantity: number; existingQuantity: number };
  const markup = renderToStaticMarkup(createElement(AddToCartButton, props));
  expect(markup).toMatch(/<select[^>]*name="quantity"[\s\S]*<option value="1"[^>]*>1<\/option>[\s\S]*<option value="3"[^>]*>3<\/option><\/select>/);
});
