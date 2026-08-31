export type CartItem = {
  listingId: string;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
  checkoutToken?: string;
};

export const MAX_CART_LINES = 20;
export const MAX_ITEM_QUANTITY = 20;

export function emptyCart(): CartState {
  return { items: [] };
}

export function parseCart(raw: string | undefined | null): CartState {
  if (!raw) return emptyCart();
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return emptyCart();
    const cartData = data as { items?: unknown; checkoutToken?: unknown };
    const items = cartData.items;
    if (!Array.isArray(items)) return emptyCart();
    const cleaned: CartItem[] = [];
    for (const row of items) {
      if (!row || typeof row !== "object") continue;
      const listingId = String((row as { listingId?: unknown }).listingId ?? "");
      const quantity = Number((row as { quantity?: unknown }).quantity);
      if (!listingId || !Number.isFinite(quantity) || quantity < 1) continue;
      cleaned.push({
        listingId,
        quantity: Math.min(MAX_ITEM_QUANTITY, Math.floor(quantity)),
      });
    }
    const checkoutToken =
      typeof cartData.checkoutToken === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        cartData.checkoutToken,
      )
        ? cartData.checkoutToken
        : undefined;
    return mergeCartItems(cleaned, checkoutToken);
  } catch {
    return emptyCart();
  }
}

export function serializeCart(cart: CartState): string {
  return JSON.stringify(mergeCartItems(cart.items, cart.checkoutToken));
}

export function mergeCartItems(
  items: CartItem[],
  checkoutToken?: string,
): CartState {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!map.has(item.listingId) && map.size >= MAX_CART_LINES) continue;
    map.set(
      item.listingId,
      Math.min(
        MAX_ITEM_QUANTITY,
        (map.get(item.listingId) ?? 0) + item.quantity,
      ),
    );
  }
  return {
    items: [...map.entries()].map(([listingId, quantity]) => ({
      listingId,
      quantity,
    })),
    ...(checkoutToken ? { checkoutToken } : {}),
  };
}

export function setCartItem(
  cart: CartState,
  listingId: string,
  quantity: number,
): CartState {
  const others = cart.items.filter((i) => i.listingId !== listingId);
  if (quantity <= 0) return { items: others, checkoutToken: cart.checkoutToken };
  return mergeCartItems(
    [...others, { listingId, quantity: Math.min(quantity, MAX_ITEM_QUANTITY) }],
    cart.checkoutToken,
  );
}

export function removeCartItem(cart: CartState, listingId: string): CartState {
  return {
    items: cart.items.filter((i) => i.listingId !== listingId),
    checkoutToken: cart.checkoutToken,
  };
}

export function cartCount(cart: CartState): number {
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}
