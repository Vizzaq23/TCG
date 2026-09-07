import { describe, expect, it } from "vitest";
import { marketplaceCatalogNumber, planCatalogSync, type MarketplaceProduct } from "./tcgplayer-import";

const base = { card_number: "OP17-031", name: "Yasopp", image_url: "https://example.com/bandai.png" };
const product: MarketplaceProduct = { productId: 12345, groupId: 24736, number: "OP17-031", name: "Yasopp", cardType: "Character", rarity: "Super Rare", colors: ["Green"], subtypes: ["Red-Haired Pirates"], attribute: "Ranged", cost: "5", power: "6000", counter: "1000", imageUrl: "https://example.com/tcg.png", url: "https://www.tcgplayer.com/product/12345" };

describe("additive marketplace catalog sync", () => {
  it("matches regular OP17 cards but preserves alternate and promo product identities", () => {
    const english = new Map([[base.card_number, base]]);
    expect(marketplaceCatalogNumber(product, english)).toBe("OP17-031");
    expect(marketplaceCatalogNumber({ ...product, name: "Yasopp (Alternate Art)" }, english)).toBe("OP17-031_tcg12345");
    expect(marketplaceCatalogNumber({ ...product, groupId: 17675 }, english)).toBe("OP17-031_tcg12345");
    expect(marketplaceCatalogNumber({ ...product, number: null, cardType: "DON!!" }, english)).toBe("TCG-12345");
  });
  it("retains database UUIDs and plans only an identity link for an existing regular card", () => {
    const existing = [{ id: "existing-uuid", card_number: "OP17-031", tcgplayer_product_id: null }];
    const plan = planCatalogSync([base], [product], existing);
    expect(plan.inserts).toEqual([]);
    expect(plan.links).toEqual([{ id: "existing-uuid", cardNumber: "OP17-031", productId: "12345" }]);
    expect(plan.links[0]).not.toHaveProperty("market_price_cents");
  });
  it("is idempotent and respects a previously resolved marketplace printing", () => {
    const plan = planCatalogSync([base], [product], []);
    expect(plan.inserts).toHaveLength(1);
    expect(plan.inserts[0]).toMatchObject({ ...base, tcgplayer_product_id: "12345" });
    const again = planCatalogSync([base], [product], [{ id: "uuid", card_number: base.card_number, tcgplayer_product_id: "12345" }]);
    expect(again.inserts).toEqual([]);
    expect(again.links).toEqual([]);
    const variant = planCatalogSync([], [{ ...product, groupId: 17675 }], [{ id: "old", card_number: "OP17-031_p2", tcgplayer_product_id: "12345" }]);
    expect(variant.mappings[0].cardNumber).toBe("OP17-031_p2");
    expect(variant.inserts).toEqual([]);
  });
  it("never overwrites another product identity or collapses two promo variants", () => {
    const existing = [{ id: "old", card_number: "OP17-031", tcgplayer_product_id: "99999" }];
    const plan = planCatalogSync([base], [product, { ...product, groupId: 17675, productId: 12346 }], existing);
    expect(plan.links).toEqual([]);
    expect(plan.inserts.map(card => card.card_number)).toEqual(["OP17-031_tcg12345", "OP17-031_tcg12346"]);
  });
  it("leaves preexisting product aliases untouched without adding a third copy", () => {
    const existing = [
      { id: "first", card_number: "OP17-031", tcgplayer_product_id: "12345" },
      { id: "second", card_number: "OP17-031_p1", tcgplayer_product_id: "12345" },
    ];
    const plan = planCatalogSync([base], [product], existing);
    expect(plan.inserts).toEqual([]);
    expect(plan.links).toEqual([]);
    expect(plan.existingProductAliases).toEqual([{ productId: "12345", cardNumbers: ["OP17-031", "OP17-031_p1"] }]);
  });
});
