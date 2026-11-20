import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ShopFooterLinks } from "@/components/shop/ShopFooterLinks";
it("offers a return to browsing only from policy pages", () => { for (const current of ["shipping", "returns", "contact"] as const) expect(renderToStaticMarkup(createElement<NonNullable<Parameters<typeof ShopFooterLinks>[0]>>(ShopFooterLinks, { current }))).toMatch(/<a[^>]*href="\/shop"[^>]*>← Back to shop<\/a>/); expect(renderToStaticMarkup(createElement(ShopFooterLinks))).not.toContain('href="/shop"'); });
