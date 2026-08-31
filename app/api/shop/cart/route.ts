import { NextResponse } from "next/server";
import {
  MAX_CART_LINES,
  MAX_ITEM_QUANTITY,
  removeCartItem,
  setCartItem,
  type CartState,
} from "@/lib/shop/cart";
import { readCartCookie, writeCartCookie } from "@/lib/shop/cart-cookie";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isListingId(value: string | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

function cartResponse(cart: CartState) {
  return NextResponse.json({ items: cart.items });
}

export async function GET() {
  const cart = await readCartCookie();
  return cartResponse(cart);
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
  if (!isListingId(listingId) || !Number.isFinite(quantity)) {
    return NextResponse.json({ error: "listingId and quantity required" }, { status: 400 });
  }

  const cart = await readCartCookie();
  const existing = cart.items.find((i) => i.listingId === listingId)?.quantity ?? 0;
  if (!existing && cart.items.length >= MAX_CART_LINES) {
    return NextResponse.json(
      { error: `A cart can contain at most ${MAX_CART_LINES} different listings.` },
      { status: 400 },
    );
  }
  const requested = existing + Math.max(1, Math.floor(quantity));
  if (requested > MAX_ITEM_QUANTITY) {
    return NextResponse.json(
      { error: `A cart line can contain at most ${MAX_ITEM_QUANTITY} items.` },
      { status: 400 },
    );
  }
  const next = {
    ...setCartItem(cart, listingId, requested),
    checkoutToken: crypto.randomUUID(),
  };
  await writeCartCookie(next);
  return cartResponse(next);
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
  if (!isListingId(listingId) || !Number.isFinite(quantity)) {
    return NextResponse.json({ error: "listingId and quantity required" }, { status: 400 });
  }

  const cart = await readCartCookie();
  let next: CartState;
  if (quantity <= 0) {
    next = removeCartItem(cart, listingId);
  } else {
    if (quantity > MAX_ITEM_QUANTITY) {
      return NextResponse.json(
        { error: `A cart line can contain at most ${MAX_ITEM_QUANTITY} items.` },
        { status: 400 },
      );
    }
    next = setCartItem(cart, listingId, Math.floor(quantity));
  }
  next.checkoutToken = crypto.randomUUID();
  await writeCartCookie(next);
  return cartResponse(next);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId")?.trim();
  const cart = await readCartCookie();
  if (!listingId) {
    await writeCartCookie({ items: [] });
    return NextResponse.json({ items: [] });
  }
  if (!isListingId(listingId)) {
    return NextResponse.json({ error: "Invalid listingId" }, { status: 400 });
  }
  const next = removeCartItem(cart, listingId);
  next.checkoutToken = crypto.randomUUID();
  await writeCartCookie(next);
  return cartResponse(next);
}
