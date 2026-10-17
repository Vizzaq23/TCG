import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import Loading from "@/app/shop/loading";

it("shows an accessible shop loading status and a decorative placeholder", () => {
  const markup = renderToStaticMarkup(createElement(Loading));
  expect(markup).toContain("<main");
  expect(markup).toMatch(/<p role="status"[^>]*>Loading shop…<\/p>/);
  expect(markup).toContain('aria-hidden="true"');
  expect(markup).toContain("skeleton");
});
