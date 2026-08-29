import { describe, expect, it } from "vitest";
import {
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
});
