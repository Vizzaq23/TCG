import { describe, expect, it } from "vitest";
import {
  collectionUnitsForSale,
  maxListableUnits,
  sellableQuantity,
  stockLabel,
} from "@/lib/shop/inventory";

describe("sellableQuantity", () => {
  it("subtracts holds", () => {
    expect(sellableQuantity(10, 3)).toBe(7);
  });

  it("floors at zero", () => {
    expect(sellableQuantity(2, 5)).toBe(0);
  });
});

it("highlights low stock", () => expect([stockLabel(3), stockLabel(4)]).toEqual(["Low stock: 3 left", "4 left"]));

describe("maxListableUnits", () => {
  it("counts singles 1:1", () => {
    expect(
      maxListableUnits({
        collectionQuantity: 12,
        kind: "single",
        alreadyListedCollectionUnits: 4,
      }),
    ).toBe(8);
  });

  it("counts playsets as 4 cards", () => {
    expect(
      maxListableUnits({
        collectionQuantity: 20,
        kind: "playset",
        alreadyListedCollectionUnits: 4,
      }),
    ).toBe(4);
  });

  it("allows unlimited for bulk lots (manual stock)", () => {
    expect(
      maxListableUnits({
        collectionQuantity: 1,
        kind: "bulk_lot",
        alreadyListedCollectionUnits: 0,
      }),
    ).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("collectionUnitsForSale", () => {
  it("scales by kind", () => {
    expect(collectionUnitsForSale("playset", 2)).toBe(8);
    expect(collectionUnitsForSale("single", 3)).toBe(3);
    expect(collectionUnitsForSale("bulk_lot", 5)).toBe(0);
  });
});
