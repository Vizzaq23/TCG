import { describe, expect, it } from "vitest";
import { buildVisibleCatalogFilter } from "../catalog-query";
import { isVisibleCatalogCard, isPrbDonGroup } from "./don-scope";
import snapshot from "./tcgplayer-catalog.json";
import { planCatalogSync } from "./tcgplayer-import";

describe("PRB DON!! catalog selection", () => {
  it("accepts only the two Premium Booster DON!! sets without excluding ordinary cards", () => {
    for (const set_name of ["Premium Booster (PRB-01)", "Premium Booster (PRB-02)", "PRB01", "prb 2"]) {
      expect(isVisibleCatalogCard({ type: "DON!!", set_name })).toBe(true);
    }
    for (const set_name of [null, "Promotion card", "OP-17", "PRB-03", "PRB-012", "PRB-021"]) {
      expect(isVisibleCatalogCard({ type: "DON!!", set_name })).toBe(false);
      expect(isVisibleCatalogCard({ type: "Character", set_name })).toBe(true);
      expect(isVisibleCatalogCard({ type: null, set_name })).toBe(true);
    }
  });

  it("retains exact marketplace identities and set labels for all 120 DON!! printings", () => {
    const products = snapshot.products.filter((product) => isPrbDonGroup(product.groupId));
    expect(products).toHaveLength(120);
    expect(products.every((product) => product.cardType === "DON!!")).toBe(true);
    const plan = planCatalogSync([], products, []);
    expect(plan.inserts).toHaveLength(120);
    expect(plan.inserts.every((card) => isVisibleCatalogCard({ type: card.type ?? null, set_name: card.set_name ?? null }))).toBe(true);
    for (const product of products) {
      expect(plan.inserts.find((card) => card.tcgplayer_product_id === String(product.productId))?.card_number).toBe(`TCG-${product.productId}`);
    }
  });

  it("combines a literal search with the DON!! restriction instead of replacing it", () => {
    const filter = buildVisibleCatalogFilter('Luffy,OR("DON!!")');
    expect(filter).toContain('and(or(type.is.null,type.neq."DON!!",set_name.imatch.');
    expect(filter).toContain('),or(name.imatch.');
    expect(filter).toContain('\\"');
    expect(buildVisibleCatalogFilter()).toContain('type.is.null');
  });
});
