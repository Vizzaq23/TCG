import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
it("caps whole-unit quantity input at stock not already in the cart", () => expect(renderToStaticMarkup(createElement(AddToCartButton, { listingId: "listing", maxQuantity: 5, existingQuantity: 2 }))).toMatch(/<input(?=[^>]*name="quantity")(?=[^>]*min="1")(?=[^>]*max="3")(?=[^>]*step="1")[^>]*>/));
