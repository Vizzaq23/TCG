import { describe, expect, it } from "vitest";
import seedSnapshot from "@/lib/catalog/all-cards.json";
import seedSets from "@/lib/catalog/sets.json";
import marketplaceSnapshot from "@/lib/catalog/tcgplayer-catalog.json";
import { buildMarketplaceCatalog } from "./marketplace-catalog";
import type { JourneyCatalogCard } from "./types";

const seed = seedSnapshot.cards as JourneyCatalogCard[];
const overlay = buildMarketplaceCatalog(seed, seedSets);
const byId = new Map(overlay.cards.map((card) => [card.id, card]));

describe("TCGplayer Journey overlay", () => {
  it("keeps every seed identity and its art while accounting for all source products", () => {
    expect(overlay.cards.length).toBe(seed.length + overlay.coverage.marketplaceAdded);
    expect(new Set(overlay.cards.map((card) => card.id)).size).toBe(overlay.cards.length);
    expect(overlay.coverage.marketplaceAdded + overlay.coverage.marketplaceLinked).toBe(marketplaceSnapshot.products.length);
    for (const original of seed) {
      const card = byId.get(original.id)!;
      expect(card).toMatchObject({ id: original.id, baseId: original.baseId, name: original.name, image: original.image, language: original.language });
      expect(card.setIds).toEqual(expect.arrayContaining(original.setIds));
    }
    expect(seed.find((card) => card.id === "OP17-030")!.setIds).not.toContain("tcg:24736");
  });

  it("links plain OP17 products but preserves promo and event printing identities", () => {
    expect(byId.get("OP17-030")).toMatchObject({ name: "Monkey.D.Luffy", tcgplayerProductId: 712607, marketplaceIdentity: "regular-number", language: "en" });
    expect(byId.get("OP17-030")!.setIds).toContain("tcg:24736");
    for (const productId of [450299, 450300]) {
      const card = byId.get(`P-001_tcg${productId}`)!;
      expect(card).toMatchObject({ baseId: "P-001", tcgplayerProductId: productId, marketplaceIdentity: "marketplace-printing", language: "unspecified", characterName: "Monkey.D.Luffy" });
    }
    expect(byId.get("P-001_tcg450299")!.name).toBe("Monkey.D.Luffy (Promotion Pack 2022)");
    expect(byId.get("P-001")!.tcgplayerProductId).toBeUndefined();
    expect(byId.get("OP17-002_tcg712666")).toMatchObject({ name: "Atmos", baseId: "OP17-002", setIds: ["tcg:24775"] });
  });

  it("keeps source-only leaders, DON!! and unavailable artwork without made-up base numbers", () => {
    expect(byId.get("TCG-518691")).toMatchObject({ type: "Leader", baseId: "TCG-518691", characterName: "Monkey.D.Luffy" });
    const don = marketplaceSnapshot.products.find((product) => product.cardType === "DON!!")!;
    expect(byId.get(`TCG-${don.productId}`)).toMatchObject({ type: "DON!!", language: "unspecified" });
    const missing = overlay.cards.filter((card) => card.marketplaceIdentity === "marketplace-printing" && !card.imageAvailable);
    expect(missing).toHaveLength(marketplaceSnapshot.stats.missingImages);
    expect(missing.every((card) => card.image === "")).toBe(true);
    const oversized = byId.get("TCG-695310")!;
    expect(oversized.name).toContain("Oversized");
    expect(oversized.baseId).toBe("TCG-695310");
  });

  it("exposes every marketplace group with correct product membership and snapshot provenance", () => {
    expect(overlay.sets).toHaveLength(seedSets.length + marketplaceSnapshot.groups.length);
    for (const group of marketplaceSnapshot.groups) {
      const setId = `tcg:${group.groupId}`;
      expect(overlay.sets.find((set) => set.id === setId)?.count).toBe(group.counts.singles);
      expect(overlay.cards.filter((card) => card.setIds.includes(setId))).toHaveLength(group.counts.singles);
    }
    expect(overlay.coverage.marketplaceSourceBuild).toBe(marketplaceSnapshot.sourceBuild);
    expect(overlay.coverage.marketplaceProducts).toBe(marketplaceSnapshot.products.length);
  });
});
