export function getShopOwnerUserId(): string | null {
  const id = process.env.SHOP_OWNER_USER_ID?.trim();
  return id || null;
}

export function isShopOwner(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const owner = getShopOwnerUserId();
  return Boolean(owner && owner === userId);
}

export type StripeMode = "test" | "live";
export type StripeTaxMode = "none" | "automatic";

function secretKeyMode(key: string | undefined): StripeMode | null {
  if (key?.startsWith("sk_test_")) return "test";
  if (key?.startsWith("sk_live_")) return "live";
  return null;
}

function publishableKeyMode(key: string | undefined): StripeMode | null {
  if (key?.startsWith("pk_test_")) return "test";
  if (key?.startsWith("pk_live_")) return "live";
  return null;
}

export function getStripeMode(): StripeMode | null {
  return secretKeyMode(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeTaxMode(): StripeTaxMode | null {
  const value = process.env.STRIPE_TAX_MODE?.trim().toLowerCase();
  return value === "none" || value === "automatic" ? value : null;
}

export function getStripeConfigurationError(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const secretKey = env.STRIPE_SECRET_KEY?.trim();
  const publishableKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secretKey || !publishableKey || !webhookSecret) {
    return "Stripe test keys and a webhook signing secret are required.";
  }

  const secretMode = secretKeyMode(secretKey);
  const publishableMode = publishableKeyMode(publishableKey);
  if (!secretMode || !publishableMode || secretMode !== publishableMode) {
    return "Stripe secret and publishable keys must be a matching test or live pair.";
  }
  if (!webhookSecret.startsWith("whsec_")) {
    return "STRIPE_WEBHOOK_SECRET is invalid.";
  }
  if (secretMode === "live" && env.STRIPE_LIVE_PAYMENTS_ENABLED !== "true") {
    return "Live Stripe payments are locked until STRIPE_LIVE_PAYMENTS_ENABLED=true.";
  }
  if (!(["none", "automatic"] as string[]).includes(env.STRIPE_TAX_MODE ?? "")) {
    return "STRIPE_TAX_MODE must explicitly be none or automatic.";
  }
  if (env.NODE_ENV === "production" && !env.NEXT_PUBLIC_APP_URL?.trim()) {
    return "NEXT_PUBLIC_APP_URL is required in production.";
  }
  return null;
}

export function getCheckoutConfigurationError(): string | null {
  const stripeError = getStripeConfigurationError();
  if (stripeError) return stripeError;
  const rateLimitSecret = process.env.SHOP_RATE_LIMIT_SECRET?.trim();
  if (!rateLimitSecret || rateLimitSecret.length < 32) {
    return "SHOP_RATE_LIMIT_SECRET must be at least 32 characters.";
  }
  try {
    getAppBaseUrl();
  } catch (error) {
    return error instanceof Error ? error.message : "The public app URL is invalid.";
  }
  return null;
}

export function isStripeConfigured(): boolean {
  return getStripeConfigurationError() === null;
}

export function isStripeEventModeAllowed(livemode: boolean): boolean {
  const mode = getStripeMode();
  return mode !== null && livemode === (mode === "live");
}

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const vercel = process.env.VERCEL_URL?.trim();
  const value = explicit || (vercel ? `https://${vercel}` : "http://localhost:3000");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be an absolute URL.");
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_APP_URL must contain only the site origin.");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS in production.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTP or HTTPS.");
  }
  return url.origin;
}

export const CART_COOKIE = "shop_cart";
export const CHECKOUT_HOLD_MINUTES = 30;
