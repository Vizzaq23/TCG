import { describe, expect, it } from "vitest";
import {
  getVerifiedCheckoutAmounts,
  isCheckoutPaymentConfirmed,
} from "@/lib/shop/checkout";

describe("isCheckoutPaymentConfirmed", () => {
  it("accepts only completed payment statuses", () => {
    expect(isCheckoutPaymentConfirmed("paid")).toBe(true);
    expect(isCheckoutPaymentConfirmed("no_payment_required")).toBe(true);
    expect(isCheckoutPaymentConfirmed("unpaid")).toBe(false);
    expect(isCheckoutPaymentConfirmed(null)).toBe(false);
  });
});

describe("getVerifiedCheckoutAmounts", () => {
  it("accepts a confirmed subtotal plus Stripe tax", () => {
    expect(
      getVerifiedCheckoutAmounts({
        payment_status: "paid",
        amount_subtotal: 1500,
        amount_total: 1620,
        currency: "usd",
        total_details: {
          amount_discount: 0,
          amount_shipping: 0,
          amount_tax: 120,
        },
      }),
    ).toEqual({
      currency: "usd",
      amountSubtotalCents: 1500,
      amountTotalCents: 1620,
      taxCents: 120,
    });
  });

  it("accepts tax included in the Stripe subtotal", () => {
    expect(
      getVerifiedCheckoutAmounts({
        payment_status: "paid",
        amount_subtotal: 1500,
        amount_total: 1500,
        currency: "usd",
        total_details: {
          amount_discount: 0,
          amount_shipping: 0,
          amount_tax: 100,
        },
      }).taxCents,
    ).toBe(100);
  });

  it("rejects an unpaid session", () => {
    expect(() =>
      getVerifiedCheckoutAmounts({
        payment_status: "unpaid",
        amount_subtotal: 1500,
        amount_total: 1500,
        currency: "usd",
        total_details: null,
      }),
    ).toThrow(/not_confirmed/);
  });
});
