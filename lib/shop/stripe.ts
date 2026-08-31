import Stripe from "stripe";
import {
  getStripeConfigurationError,
  getStripeMode,
} from "@/lib/shop/config";

let stripe: Stripe | null = null;
let stripeKey: string | null = null;

export function getStripe(): Stripe {
  const configurationError = getStripeConfigurationError();
  if (configurationError) {
    throw new Error(configurationError);
  }
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (getStripeMode() === "live" && process.env.STRIPE_LIVE_PAYMENTS_ENABLED !== "true") {
    throw new Error("Live Stripe payments are disabled.");
  }
  if (!stripe || stripeKey !== key) {
    stripe = new Stripe(key, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
    stripeKey = key;
  }
  return stripe;
}
