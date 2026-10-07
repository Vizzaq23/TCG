import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AddToCartButton } from "@/components/shop/AddToCartButton";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

it("offers every available quantity before adding to cart", () => {
  const markup = renderToStaticMarkup(createElement(AddToCartButton, { listingId: "listing", maxQuantity: 3 }));
  expect(markup).toMatch(/<select[^>]*name="quantity"[\s\S]*<option value="1"[^>]*>1<\/option>[\s\S]*<option value="3"[^>]*>3<\/option>/);
});
