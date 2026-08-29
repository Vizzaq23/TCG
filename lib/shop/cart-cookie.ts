import { cookies } from "next/headers";
import { CART_COOKIE } from "@/lib/shop/config";
import {
  type CartState,
  emptyCart,
  parseCart,
  serializeCart,
} from "@/lib/shop/cart";

export async function readCartCookie(): Promise<CartState> {
  const jar = await cookies();
  return parseCart(jar.get(CART_COOKIE)?.value);
}

export async function writeCartCookie(cart: CartState): Promise<void> {
  const jar = await cookies();
  jar.set(CART_COOKIE, serializeCart(cart), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCartCookie(): Promise<void> {
  await writeCartCookie(emptyCart());
}
