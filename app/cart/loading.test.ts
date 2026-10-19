import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import Loading from "@/app/cart/loading";

it("shows an accessible cart loading status and decorative placeholders", () => {
  const markup = renderToStaticMarkup(createElement(Loading));
  expect(markup).toContain("<main");
  expect(markup).toMatch(/<p role="status"[^>]*>Loading cart…<\/p>/);
  expect(markup).toContain('aria-hidden="true"');
  expect(markup).toContain("skeleton");
});
