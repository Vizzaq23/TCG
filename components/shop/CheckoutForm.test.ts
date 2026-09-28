import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
it("identifies the receipt email for autofill", () => expect(renderToStaticMarkup(createElement(CheckoutForm))).toMatch(/(?=[\s\S]*name="email")(?=[\s\S]*autocomplete="email")/i));
it("uses a native submit form for keyboard checkout", () => expect(renderToStaticMarkup(createElement(CheckoutForm))).toMatch(/^<form[\s\S]*type="submit"/));
it("uses native email validation and mobile-friendly input hints", () => expect(renderToStaticMarkup(createElement(CheckoutForm))).toMatch(/(?=[\s\S]*type="email")(?=[\s\S]*required="")(?=[\s\S]*autocapitalize="none")(?=[\s\S]*spellcheck="false")(?=[\s\S]*aria-describedby="checkout-email-help")(?=[\s\S]*id="checkout-email-help")/i));
it("exposes checkout progress to assistive technology", () => expect(renderToStaticMarkup(createElement(CheckoutForm))).toMatch(/^(?!<form[^>]*aria-busy)[\s\S]*<button[^>]*aria-live="polite"[\s\S]*Continue to Stripe Checkout/));
