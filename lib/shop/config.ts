export function getShopOwnerUserId(): string | null {
  const id = process.env.SHOP_OWNER_USER_ID?.trim();
  return id || null;
}

export function isShopOwner(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const owner = getShopOwnerUserId();
  return Boolean(owner && owner === userId);
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
  );
}

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export const CART_COOKIE = "shop_cart";
export const CHECKOUT_HOLD_MINUTES = 30;
