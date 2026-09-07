/** Server-only catalog composition; import Journey types separately in clients. */
import marketplaceSnapshot from "@/lib/catalog/tcgplayer-catalog.json";
import { marketplaceCatalogNumber, printedNumber } from "@/lib/catalog/tcgplayer-import";
import type { JourneyCatalogCard, JourneySet } from "./types";

export function buildMarketplaceCatalog(seedCards: readonly JourneyCatalogCard[], seedSets: readonly JourneySet[]) {
  // Clone membership arrays: composing this overlay must never mutate the
  // underlying Bandai/JP/DON snapshot or an existing caller's card objects.
  const cards = seedCards.map((card) => ({ ...card, setIds: [...card.setIds] }));
  const byId = new Map(cards.map((card) => [card.id, card]));
  const english = new Map(seedCards.filter((card) => card.language === "en").map((card) => [card.id, card]));
  const characterNames = [...new Set(seedCards.filter((card) => card.language === "en" && ["Character", "Leader"].includes(card.type)).map((card) => card.name))];
  const groups = marketplaceSnapshot.groups.map((group) => ({ id: `tcg:${group.groupId}`, label: `TCGplayer · ${group.name}`, count: 0 }));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  let added = 0;
  let linked = 0;

  for (const product of marketplaceSnapshot.products) {
    const id = marketplaceCatalogNumber(product, english);
    const setId = `tcg:${product.groupId}`;
    const group = groupById.get(setId);
    if (!group) throw new Error(`Missing TCGplayer source group ${setId}`);
    const existing = byId.get(id);
    const marketplace = {
      tcgplayerProductId: product.productId,
      tcgplayerUrl: product.url,
      marketplaceName: product.name,
      marketplaceIdentity: existing ? "regular-number" as const : "marketplace-printing" as const,
    };

    if (existing) {
      if (existing.tcgplayerProductId && existing.tcgplayerProductId !== product.productId) {
        throw new Error(`Two marketplace products resolve to ${id}`);
      }
      // The helper only attaches a plain OP17 product when number and name
      // agree with the original English base card. Preserve its original art.
      Object.assign(existing, marketplace);
      if (!existing.setIds.includes(setId)) existing.setIds.push(setId);
      linked++;
    } else {
      const baseId = printedNumber(product.number);
      const isCharacter = ["Character", "Leader"].includes(product.cardType);
      const original = baseId ? english.get(baseId) : undefined;
      const namedMatches = isCharacter && !original ? characterNames.filter((name) => product.name.startsWith(`${name} (`)) : [];
      const characterName = isCharacter ? original?.name ?? (namedMatches.length === 1 ? namedMatches[0] : undefined) : undefined;
      const card: JourneyCatalogCard = {
        id, baseId: baseId ?? id, name: product.name,
        ...(characterName ? { characterName } : {}),
        type: product.cardType, colors: product.colors, rarity: product.rarity,
        image: product.imageAvailable ? product.imageUrl : "",
        imageAvailable: product.imageAvailable,
        language: "unspecified", sourceCardId: String(product.productId),
        catalogSource: product.url, crew: product.subtypes,
        originSet: baseId?.match(/^([A-Z]+\d*)-/)?.[1] ?? (product.cardType === "DON!!" ? "DON" : "TCG"),
        setIds: [setId], setLabel: group.label,
        ...marketplace,
      };
      cards.push(card);
      byId.set(id, card);
      added++;
    }
    group.count++;
  }

  return {
    cards,
    sets: [...seedSets.map((set) => ({ ...set })), ...groups],
    coverage: {
      marketplaceProducts: marketplaceSnapshot.products.length,
      marketplaceAdded: added,
      marketplaceLinked: linked,
      marketplaceSourceBuild: marketplaceSnapshot.sourceBuild,
      marketplaceSource: marketplaceSnapshot.sourceDocumentation,
    },
  };
}
