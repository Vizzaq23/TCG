import { NextResponse } from "next/server";
import {
  removeCartItem,
  setCartItem,
  type CartState,
} from "@/lib/shop/cart";
import { readCartCookie, writeCartCookie } from "@/lib/shop/cart-cookie";

export const runtime = "nodejs";

export async function GET() {
  const cart = await readCartCookie();
  return NextResponse.json(cart);
}

export async function POST(request: Request) {
  let body: { listingId?: string; quantity?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const listingId = body.listingId?.trim();
  const quantity = Number(body.quantity ?? 1);
  if (!listingId || !Number.isFinite(quantity)) {
    return NextResponse.json({ error: "listingId and quantity required" }, { status: 400 });
  }

  const cart = await readCartCookie();
  const existing = cart.items.find((i) => i.listingId === listingId)?.quantity ?? 0;
  const next = setCartItem(cart, listingId, existing + Math.max(1, Math.floor(quantity)));
  await writeCartCookie(next);
  return NextResponse.json(next);
}

export async function PATCH(request: Request) {
  let body: { listingId?: string; quantity?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const listingId = body.listingId?.trim();
  const quantity = Number(body.quantity);
  if (!listingId || !Number.isFinite(quantity)) {
    return NextResponse.json({ error: "listingId and quantity required" }, { status: 400 });
  }

  const cart = await readCartCookie();
  let next: CartState;
  if (quantity <= 0) {
    next = removeCartItem(cart, listingId);
  } else {
    next = setCartItem(cart, listingId, Math.floor(quantity));
  }
  await writeCartCookie(next);
  return NextResponse.json(next);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId")?.trim();
  const cart = await readCartCookie();
  if (!listingId) {
    await writeCartCookie({ items: [] });
    return NextResponse.json({ items: [] });
  }
  const next = removeCartItem(cart, listingId);
  await writeCartCookie(next);
  return NextResponse.json(next);
}
