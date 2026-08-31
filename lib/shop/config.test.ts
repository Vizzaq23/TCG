import { describe, expect, it } from "vitest";
import { getStripeConfigurationError } from "@/lib/shop/config";

const testConfig: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://example.com",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
  STRIPE_SECRET_KEY: "sk_test_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
  STRIPE_TAX_MODE: "none",
};

describe("Stripe configuration", () => {
  it("accepts an explicit test-mode configuration", () => {
    expect(getStripeConfigurationError(testConfig)).toBeNull();
  });

  it("rejects mixed key modes", () => {
    expect(
      getStripeConfigurationError({
        ...testConfig,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
      }),
    ).toMatch(/matching test or live pair/i);
  });

  it("locks live keys unless live payments are explicitly enabled", () => {
    expect(
      getStripeConfigurationError({
        ...testConfig,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
        STRIPE_SECRET_KEY: "sk_live_example",
      }),
    ).toMatch(/live stripe payments are locked/i);
  });

  it("requires an explicit tax mode", () => {
    expect(
      getStripeConfigurationError({ ...testConfig, STRIPE_TAX_MODE: undefined }),
    ).toMatch(/tax_mode/i);
  });
});
