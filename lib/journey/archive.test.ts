import { describe, expect, it } from "vitest";
import snapshot from "@/lib/catalog/all-cards.json";
import seedSets from "@/lib/catalog/sets.json";
import marketplaceSnapshot from "@/lib/catalog/tcgplayer-catalog.json";
import { GET } from "@/app/api/journey/route";
import { getJourneyArchive, JOURNEY_PAGE_SIZE } from "./archive";

describe("Journey catalog archive", () => {
  it("includes all source printings and preserves reprint memberships", () => {
    const result = getJourneyArchive();
    expect(result.total).toBe(snapshot.cards.length + result.coverage.marketplaceAdded);
    expect(result.total).toBeGreaterThan(4000);
    expect(result.stats.baseCards).toBe(new Set(snapshot.cards.filter((card) => card.type !== "DON!!").map((card) => card.baseId)).size);
    expect(result.stats.baseCards).toBeLessThan(result.stats.cards);
    expect(result.sets).toHaveLength(seedSets.length + marketplaceSnapshot.groups.length);
    expect(new Set(snapshot.cards.map((card) => card.id)).size).toBe(snapshot.cards.length);
    expect(result.sets.reduce((sum, set) => sum + set.count, 0)).toBe(snapshot.productEntries + marketplaceSnapshot.products.length);
    expect(result.sets.find((set) => set.id === "569901")!.count).toBeGreaterThan(300);
    expect(snapshot.cards.filter((card) => card.id.includes("_r")).every((card) => !card.baseId.includes("_"))).toBe(true);
  });

  it("adds Japanese identifiers and DON!! records while retaining English precedence", () => {
    const english = getJourneyArchive({ language: "en", card: "OP01-003" });
    const japanese = getJourneyArchive({ language: "ja" });
    const don = getJourneyArchive({ type: "DON!!" });
    expect(english.total).toBe(4843);
    expect(english.selected).toMatchObject({ language: "en", sourceCardId: "OP01-003" });
    expect(english.selected!.image).toContain("https://en.onepiece-cardgame.com/");
    expect(japanese.total).toBe(435);
    expect(japanese.cards.every((card) => card.language === "ja" && card.originalName && card.setIds.every((id) => id.startsWith("jp:")))).toBe(true);
    expect(japanese.cards.every((card) => card.image.startsWith("https://www.onepiece-cardgame.com/"))).toBe(true);
    expect(don.total).toBe(snapshot.sourceCoverage.donCards + marketplaceSnapshot.stats.don);
    expect(don.cards[0]).toMatchObject({ id: "DON-001", sourceCardId: "don_1", language: "unspecified", entryKind: "Uncharted", chapter: null });
    expect(getJourneyArchive({ card: "DON-132" }).selected).toMatchObject({ image: "", imageAvailable: false });
    expect(don.coverage.missingImages).toBe(snapshot.sourceCoverage.missingImages + marketplaceSnapshot.stats.missingImages);
    expect(getJourneyArchive({ language: "not-a-language" }).total).toBe(0);
  });

  it("searches promo variants and OP17 marketplace products with their separate source identities", () => {
    const promo = getJourneyArchive({ q: "Promotion Pack 2022", set: "tcg:17675", card: "P-001_tcg450299" });
    expect(promo.total).toBeGreaterThan(0);
    expect(promo.cards.every((card) => card.setIds.includes("tcg:17675"))).toBe(true);
    expect(promo.selected).toMatchObject({ name: "Monkey.D.Luffy (Promotion Pack 2022)", chapter: 1, sceneChapter: null, tcgplayerProductId: 450299 });
    const op17 = getJourneyArchive({ set: "tcg:24736", card: "OP17-030" });
    expect(op17.total).toBe(179);
    expect(op17.selected).toMatchObject({ id: "OP17-030", tcgplayerProductId: 712607, chapter: 1 });
    expect(getJourneyArchive({ set: "tcg:24775" }).total).toBe(75);
    expect(getJourneyArchive({ card: "TCG-518691" }).selected).toMatchObject({ chapter: 1, characterName: "Monkey.D.Luffy" });
    expect(getJourneyArchive({ card: "OP01-030_tcg617586" }).selected).toMatchObject({ storyChapter: 597, sceneChapter: null });
    expect(getJourneyArchive({ q: "712607" }).cards.some((card) => card.id === "OP17-030")).toBe(true);
    expect(op17.coverage.note).toContain("without verified equivalence");
  });

  it("keeps mention-only introductions and special chapter zero separate from visual debuts", () => {
    for (const name of ["Curly.Dadan", "Shiki"]) {
      const card = snapshot.cards.find((card) => card.name === name)!;
      expect(getJourneyArchive({ card: card.id }).selected).toMatchObject({
        chapter: null, referenceKind: "special", referenceLabel: "Special manga chapter 0", entryKind: "Character reference",
      });
    }
    const wangZhi = snapshot.cards.find((card) => card.name === "Wang Zhi")!;
    expect(getJourneyArchive({ card: wangZhi.id }).selected).toMatchObject({ chapter: 957, referenceKind: "mention", entryKind: "Character reference" });
  });

  it("returns bounded disjoint pages, clamps malformed pagination, and keeps OP-01 first", () => {
    const first = getJourneyArchive();
    const second = getJourneyArchive({ page: 2 });
    expect(first.cards).toHaveLength(JOURNEY_PAGE_SIZE);
    expect(first.cards[0].id).toBe("OP01-001");
    expect(second.cards.some((card) => first.cards.some((other) => other.id === card.id))).toBe(false);
    for (const page of ["nope", "Infinity", -100, 0]) expect(getJourneyArchive({ page }).page).toBe(1);
    expect(getJourneyArchive({ page: 1e9 }).page).toBe(first.totalPages);
    const empty = getJourneyArchive({ q: "there-is-no-card-with-this-name" });
    expect(empty).toMatchObject({ cards: [], selected: null, total: 0, page: 1, totalPages: 1 });
  });

  it("combines search, source product and card type without hiding selection", () => {
    const result = getJourneyArchive({ q: "luffy", set: "569101", type: "Leader", card: "ST01-001" });
    expect(result.total).toBeGreaterThan(0);
    expect(result.cards.every((card) => card.name.includes("Luffy") && card.type === "Leader" && card.setIds.includes("569101"))).toBe(true);
    expect(result.selected?.id).toBe("ST01-001");
    expect(getJourneyArchive({ q: "Monkey D Luffy" }).total).toBeGreaterThan(20);
    expect(getJourneyArchive({ set: "OP01" }).cards.every((card) => card.originSet === "OP01")).toBe(true);
    expect(getJourneyArchive({ set: "invalid-product" }).total).toBe(0);
    expect(getJourneyArchive({ card: "__proto__" }).selected).toBeNull();
  });

  it("reuses character debuts across sets without claiming exact illustrated scenes", () => {
    for (const id of ["OP01-003", "OP01-003_p1", "ST01-001"]) {
      expect(getJourneyArchive({ card: id }).selected).toMatchObject({ chapter: 1, entryKind: "Character debut", sceneChapter: null });
    }
    expect(getJourneyArchive({ card: "OP01-024_r1" }).selected).toMatchObject({ baseId: "OP01-024", chapter: 1 });
    expect(getJourneyArchive({ card: "OP01-011" }).selected).toMatchObject({ chapter: null, episode: null });
    const unknown = snapshot.cards.find((card) => card.name === "Ginny")!;
    expect(getJourneyArchive({ card: unknown.id }).selected).toMatchObject({ entryKind: "Uncharted", chapter: null, sceneChapter: null });
    expect(getJourneyArchive().coverage.note).toContain("DON!!");
  });

  it("orders mapped character debuts before unknown scenes and reports honest coverage", () => {
    const first = getJourneyArchive({ order: "story" });
    const last = getJourneyArchive({ order: "story", page: first.totalPages });
    expect(first.cards.every((card) => card.storyChapter === 1)).toBe(true);
    expect(last.cards.every((card) => card.storyChapter === null)).toBe(true);
    expect(first.stats.mapped).toBeGreaterThan(2000);
    expect(first.stats.mapped).toBeLessThan(first.stats.cards);
  });

  it("serves only a page of public data through the read-only route", async () => {
    const response = GET(new Request("https://example.com/api/journey?q=luffy&page=2&card=OP01-003"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("public");
    const body = await response.json();
    expect(body.cards).toHaveLength(24);
    expect(body.selected.id).toBe("OP01-003");
    expect(JSON.stringify(body).length).toBeLessThan(80_000);
  });
});
