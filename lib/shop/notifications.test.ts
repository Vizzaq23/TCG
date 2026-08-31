import { describe, expect, it } from "vitest";
import {
  buildCustomerOrderEmail,
  buildOwnerOrderEmail,
  type OrderNotificationDetails,
} from "@/lib/shop/notifications";
import type { OrderNotificationConfig } from "@/lib/shop/config";

const config: OrderNotificationConfig = {
  apiKey: "re_test_example",
  from: "Grand Line Cards <orders@example.com>",
  ownerEmail: "ops@example.com",
};

const details: OrderNotificationDetails = {
  id: "ddf67c49-7465-49d5-a9f0-f0f09e46d0ce",
  orderNumber: "TCG-20260831-ABC123",
  buyerEmail: "buyer@example.com",
  shippingName: "Robin <script>alert(1)</script>",
  shippingAddress: {
    line1: "123 Going Merry Way",
    city: "New York",
    state: "NY",
    postal_code: "10001",
    country: "US",
  },
  subtotalCents: 2500,
  shippingCents: 499,
  taxCents: 0,
  totalCents: 2999,
  currency: "usd",
  storeName: "Grand Line Cards",
  supportEmail: "support@example.com",
  items: [
    {
      title: "Monkey D. Luffy <Alt Art>",
      condition: "Near Mint",
      quantity: 1,
      unitPriceCents: 2500,
    },
  ],
};

describe("order notification email rendering", () => {
  it("builds a clear customer confirmation and escapes merchant data", () => {
    const email = buildCustomerOrderEmail(details, config);
    expect(email.to).toBe(details.buyerEmail);
    expect(email.replyTo).toBe(details.supportEmail);
    expect(email.subject).toContain(details.orderNumber);
    expect(email.text).toContain("Total: $29.99");
    expect(email.html).toContain("Robin &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(email.html).not.toContain("<script>");
  });

  it("builds an internal fulfillment notice with the shipping address", () => {
    const email = buildOwnerOrderEmail(details, config);
    expect(email.to).toBe(config.ownerEmail);
    expect(email.replyTo).toBe(details.buyerEmail);
    expect(email.text).toContain("123 Going Merry Way");
    expect(email.text).toContain("Verify the order");
    expect(email.html).toContain("Monkey D. Luffy &lt;Alt Art&gt;");
  });
});

