export type CartItem = {
  listingId: string;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
};

export function emptyCart(): CartState {
  return { items: [] };
}

export function parseCart(raw: string | undefined | null): CartState {
  if (!raw) return emptyCart();
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return emptyCart();
    const items = (data as { items?: unknown }).items;
    if (!Array.isArray(items)) return emptyCart();
    const cleaned: CartItem[] = [];
    for (const row of items) {
      if (!row || typeof row !== "object") continue;
      const listingId = String((row as { listingId?: unknown }).listingId ?? "");
      const quantity = Number((row as { quantity?: unknown }).quantity);
      if (!listingId || !Number.isFinite(quantity) || quantity < 1) continue;
      cleaned.push({ listingId, quantity: Math.floor(quantity) });
    }
    return mergeCartItems(cleaned);
  } catch {
    return emptyCart();
  }
}

export function serializeCart(cart: CartState): string {
  return JSON.stringify(mergeCartItems(cart.items));
}

export function mergeCartItems(items: CartItem[]): CartState {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.listingId, (map.get(item.listingId) ?? 0) + item.quantity);
  }
  return {
    items: [...map.entries()].map(([listingId, quantity]) => ({
      listingId,
      quantity,
    })),
  };
}

export function setCartItem(
  cart: CartState,
  listingId: string,
  quantity: number,
): CartState {
  const others = cart.items.filter((i) => i.listingId !== listingId);
  if (quantity <= 0) return { items: others };
  return mergeCartItems([...others, { listingId, quantity }]);
}

export function removeCartItem(cart: CartState, listingId: string): CartState {
  return { items: cart.items.filter((i) => i.listingId !== listingId) };
}

export function cartCount(cart: CartState): number {
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}
