import { createHmac } from "node:crypto";

export function getCheckoutFingerprint(request: Request, email: string): string {
  const secret = process.env.SHOP_RATE_LIMIT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("SHOP_RATE_LIMIT_SECRET must be at least 32 characters.");
  }
  const forwarded = request.headers.get("x-forwarded-for") ?? "unknown";
  const clientAddress = forwarded.split(",", 1)[0]?.trim().slice(0, 128) || "unknown";
  return createHmac("sha256", secret)
    .update(`${clientAddress}\n${email.trim().toLowerCase()}`)
    .digest("hex");
}
