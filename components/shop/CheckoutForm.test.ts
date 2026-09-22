import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
it("identifies the receipt email for autofill", () => expect(renderToStaticMarkup(createElement(CheckoutForm))).toMatch(/(?=[\s\S]*name="email")(?=[\s\S]*autocomplete="email")/i));
