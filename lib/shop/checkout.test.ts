import { describe, expect, it } from "vitest";
import { isCheckoutPaymentConfirmed } from "@/lib/shop/checkout";

describe("isCheckoutPaymentConfirmed", () => {
  it("accepts only completed payment statuses", () => {
    expect(isCheckoutPaymentConfirmed("paid")).toBe(true);
    expect(isCheckoutPaymentConfirmed("no_payment_required")).toBe(true);
    expect(isCheckoutPaymentConfirmed("unpaid")).toBe(false);
    expect(isCheckoutPaymentConfirmed(null)).toBe(false);
  });
});
