import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import ListingNotFound from "@/app/shop/[listingId]/not-found";

it("explains unavailable listings and offers shop and cart recovery", () => {
  const markup = renderToStaticMarkup(createElement(ListingNotFound));
  expect(markup).toMatch(/<main[^>]*>.*<h1[^>]*>Listing unavailable<\/h1>/);
  expect(markup).toContain('href="/shop"');
  expect(markup).toContain('href="/cart"');
});
