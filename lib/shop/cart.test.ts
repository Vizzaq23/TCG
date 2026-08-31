import { describe, expect, it } from "vitest";
import {
  MAX_CART_LINES,
  MAX_ITEM_QUANTITY,
  cartCount,
  parseCart,
  removeCartItem,
  serializeCart,
  setCartItem,
} from "@/lib/shop/cart";

describe("cart", () => {
  it("parses and merges duplicate lines", () => {
    const cart = parseCart(
      JSON.stringify({
        items: [
          { listingId: "a", quantity: 1 },
          { listingId: "a", quantity: 2 },
          { listingId: "b", quantity: 1 },
        ],
      }),
    );
    expect(cart.items).toEqual([
      { listingId: "a", quantity: 3 },
      { listingId: "b", quantity: 1 },
    ]);
    expect(cartCount(cart)).toBe(4);
  });

  it("round-trips serialize", () => {
    const cart = setCartItem({ items: [] }, "x", 2);
    expect(parseCart(serializeCart(cart))).toEqual(cart);
  });

  it("removes items", () => {
    const cart = removeCartItem(
      { items: [{ listingId: "a", quantity: 1 }] },
      "a",
    );
    expect(cart.items).toEqual([]);
  });

  it("tolerates junk", () => {
    expect(parseCart("not-json").items).toEqual([]);
    expect(parseCart('{"items":[{"listingId":"","quantity":1}]}').items).toEqual(
      [],
    );
  });

  it("bounds untrusted cookie quantities and line counts", () => {
    const items = Array.from({ length: MAX_CART_LINES + 5 }, (_, index) => ({
      listingId: `listing-${index}`,
      quantity: MAX_ITEM_QUANTITY + 100,
    }));
    const cart = parseCart(JSON.stringify({ items }));
    expect(cart.items).toHaveLength(MAX_CART_LINES);
    expect(cart.items.every((item) => item.quantity === MAX_ITEM_QUANTITY)).toBe(
      true,
    );
  });

  it("preserves a valid checkout token and rejects an invalid one", () => {
    const valid = "63da5d0e-581b-4a64-a5d4-1dc2c53f61a8";
    expect(
      parseCart(JSON.stringify({ items: [], checkoutToken: valid })).checkoutToken,
    ).toBe(valid);
    expect(
      parseCart(JSON.stringify({ items: [], checkoutToken: "not-a-token" }))
        .checkoutToken,
    ).toBeUndefined();
  });
});
