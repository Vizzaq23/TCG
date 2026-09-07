/** Server data module. Client components should import types.ts only. */
import catalogSnapshot from "@/lib/catalog/all-cards.json";
import setSnapshot from "@/lib/catalog/sets.json";
import { arcForChapter, journeyCards } from "./catalog";
import { getSceneConnection } from "./scene-connections";
import { buildMarketplaceCatalog } from "./marketplace-catalog";
import { printedNumber } from "@/lib/catalog/tcgplayer-import";
import { isPrbDonGroup } from "@/lib/catalog/don-scope";
import type { JourneyArchiveParams, JourneyArchiveResponse, JourneyCatalogCard, JourneyEntry } from "./types";

type CharacterFact = {
  chapter: number | null;
  episode: number | null;
  debut: string;
  affiliation: string;
  origin: string;
  source: string;
  referenceKind: "appearance" | "mention" | "special";
  referenceLabel: string;
};

const catalog = catalogSnapshot as {
  source: string;
  characterSource: string;
  characterSnapshotDate: string;
  importedAt: string;
  sourceCoverage: {
    englishCards: number; japaneseCards: number; donCards: number; missingImages: number;
    englishProducts: number; japaneseProductsScanned: number;
    japaneseSource: string; donSource: string;
  };
  characters: Record<string, CharacterFact>;
  cards: JourneyCatalogCard[];
};

export const JOURNEY_PAGE_SIZE = 24;
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const originalById = new Map(journeyCards.map((card) => [card.id, card]));
const originalByName = new Map(journeyCards.filter((card) => card.type !== "Event").map((card) => [normalize(card.name), card]));

function debutArc(chapter: number | null): string {
  if (chapter === null) return "Anime / film";
  // Arc boundaries: https://onepiece.fandom.com/wiki/Story_Arcs
  if (chapter >= 1126) return "Elbaph";
  if (chapter >= 1058) return "Egghead";
  return arcForChapter(chapter);
}

function enrich(card: JourneyCatalogCard): Omit<JourneyEntry, "storyChapter"> {
  const characterName = card.characterName ?? card.name;
  const original = originalById.get(card.baseId) ??
    (["Character", "Leader"].includes(card.type) ? originalByName.get(normalize(characterName)) : undefined);
  if (original) {
    return {
      ...card,
      title: original.title, text: original.text, detail: original.detail,
      arc: original.arc, chapter: original.chapter, episode: original.episode,
      note: original.note, source: original.source, entryKind: original.entryKind,
      // The original guide is about the character/technique. Reprints can
      // have different art; no exact panel is inferred from the base ID.
      sceneChapter: null,
    };
  }

  const fact = ["Character", "Leader"].includes(card.type) ? catalog.characters[characterName] : undefined;
  if (fact) {
    const arc = fact.referenceKind === "special" ? "Chapter 0 · Strong World" : debutArc(fact.chapter);
    const detail = [
      fact.affiliation && `Recorded affiliation: ${fact.affiliation}.`,
      fact.origin && fact.origin !== "Unknown" && `Origin: ${fact.origin}.`,
    ].filter(Boolean).join(" ");
    return {
      ...card,
      title: fact.referenceKind === "special" ? "A special chapter in the manga"
        : fact.referenceKind === "mention" ? "A name enters the story"
        : fact.chapter ? `The story starts at chapter ${fact.chapter}` : "A voyage beyond the manga",
      text: fact.referenceKind === "special"
        ? `${characterName}'s indexed manga appearance is in special chapter 0, published for Strong World. This is a manga reference outside the regular numbered chapter archive.`
        : fact.referenceKind === "mention"
        ? `${characterName} is first indexed as a mention in chapter ${fact.chapter}. That reference introduces a name; it is not evidence of an on-page visual debut.`
        : fact.chapter
        ? `${characterName}'s indexed manga debut is chapter ${fact.chapter}, during ${arc}. Follow that first appearance to meet the person behind the card.`
        : `${characterName} has an indexed anime appearance in episode ${fact.episode}. A numbered manga debut has not been established in this archive.`,
      detail: detail || `${card.crew.join(" / ")} appears in the affiliations printed on this card. Each new printing captures another interpretation of the story.`,
      arc, chapter: fact.chapter, episode: fact.episode,
      note: `Character debut reference: ${fact.debut}. This can include an early glimpse, cover or silhouette; it does not identify the card's illustrated scene. Debut facts come from the ${catalog.characterSnapshotDate} character index.`,
      source: fact.source,
      entryKind: fact.referenceKind === "appearance" ? "Character debut" : "Character reference",
      referenceKind: fact.referenceKind, referenceLabel: fact.referenceLabel, sceneChapter: null,
    };
  }

  return {
    ...card,
    title: "An uncharted story",
    text: `${card.name} is part of the card archive. Its exact story connection is still uncharted; no chapter has been assigned without a supporting reference.`,
    detail: card.crew.length ? `The card's printed affiliations are ${card.crew.join(" / ")}. Explore its artwork while the chapter connection awaits verification.` : "The printing is preserved here so that every card in the source catalog remains discoverable.",
    arc: "Uncharted", chapter: null, episode: null,
    note: "Catalogued card; character debut and illustrated scene have not been verified. Film, anime, ensemble and newer characters may have no match in the debut index.",
    source: card.catalogSource,
    entryKind: "Uncharted", sceneChapter: null,
  };
}

const prefixOrder = ["OP", "EB", "ST", "PRB", "P"];
function cardOrder(a: JourneyEntry, b: JourneyEntry): number {
  const prefixA = a.id.match(/^[A-Z]+/)?.[0] ?? "";
  const prefixB = b.id.match(/^[A-Z]+/)?.[0] ?? "";
  const rankA = prefixOrder.indexOf(prefixA);
  const rankB = prefixOrder.indexOf(prefixB);
  return (rankA < 0 ? 99 : rankA) - (rankB < 0 ? 99 : rankB) || a.id.localeCompare(b.id, "en", { numeric: true });
}

const composedCatalog = buildMarketplaceCatalog(catalog.cards, setSnapshot);
// Use exact marketplace identities for PRB DON!! rather than duplicating the
// older artwork archive, which also contains unrelated booster/promo DON!!.
const visibleCards = composedCatalog.cards.filter((card) => card.type !== "DON!!" || card.setIds.some((id) => id.startsWith("tcg:") && isPrbDonGroup(Number(id.slice(4)))));
const membershipCounts = new Map<string, number>();
for (const card of visibleCards) for (const id of card.setIds) membershipCounts.set(id, (membershipCounts.get(id) ?? 0) + 1);
const visibleSets = composedCatalog.sets.map((set) => ({ ...set, count: membershipCounts.get(set.id) ?? 0 })).filter((set) => set.count > 0);
const visibleMarketplaceCards = visibleCards.filter((card) => card.tcgplayerProductId);
const entries: JourneyEntry[] = visibleCards.map((card) => {
  const entry = enrich(card);
  const scene = getSceneConnection(card.baseId, card.id);
  if (!scene) return { ...entry, storyChapter: entry.chapter };
  const isCharacter = ["Character", "Leader"].includes(card.type);
  return {
    ...entry,
    title: scene.title, text: scene.summary,
    detail: isCharacter && entry.entryKind !== "Uncharted" ? entry.detail : scene.note,
    arc: debutArc(scene.chapter),
    note: scene.note, source: scene.source,
    entryKind: isCharacter ? entry.entryKind : "Scene guide" as const,
    storyChapter: scene.chapter,
    sceneChapter: scene.exactness === "confirmed" ? scene.chapter : null,
  };
}).sort(cardOrder);
const entriesById = new Map(entries.map((card) => [card.id.toLowerCase(), card]));
/** Server-side discovery features; never serialize this collection to a client. */
export function getJourneyEntries(): readonly JourneyEntry[] { return entries; }
const entriesByProduct = new Map(entries.filter(card=>card.tcgplayerProductId).map(card=>[String(card.tcgplayerProductId),card]));
/** Link an existing collectible identity without guessing an alternate illustration. */
export function getJourneyForCollectible(number: string | null, product: string | null): JourneyEntry | null {
  const byProduct = product ? entriesByProduct.get(product) : undefined;
  return byProduct ?? (number ? entriesById.get(number.toLowerCase()) : undefined) ?? null;
}
const searchText = new Map(entries.map((card) => [card.id, [card.id, card.sourceCardId, card.name, card.characterName ?? "", card.marketplaceName ?? "", card.tcgplayerProductId ?? "", card.originalName ?? "", card.title, card.arc, card.setLabel, ...card.crew, card.storyChapter ? `chapter ${card.storyChapter}` : "", card.chapter ? `chapter ${card.chapter}` : ""].join(" ").toLowerCase()]));
const stats = {
  cards: entries.length,
  baseCards: new Set(entries.map((card) => printedNumber(card.baseId)).filter(Boolean)).size,
  sets: visibleSets.length,
  mapped: entries.filter((card) => card.storyChapter !== null).length,
};
const coverage: JourneyArchiveResponse["coverage"] = {
  catalogSource: catalog.source,
  catalogUpdatedAt: catalog.importedAt,
  characterSource: catalog.characterSource,
  characterSnapshotDate: catalog.characterSnapshotDate,
  scope: `${catalog.sourceCoverage.englishCards.toLocaleString("en-US")} English printings, ${catalog.sourceCoverage.japaneseCards} additional Japanese source identifiers and ${visibleMarketplaceCards.length.toLocaleString("en-US")} TCGplayer singles. DON!! selection is limited to PRB-01 and PRB-02 using exact marketplace printing identities.`,
  note: `Catalog snapshots include source-listed previews. English records retain precedence where regional source IDs overlap. TCGplayer product IDs remain distinct from printed card numbers; promo, event and alternate-art products may overlap other source printings without verified equivalence. Only regular OP17 number-and-name matches are attached to existing base cards. This is not exhaustive worldwide release coverage. DON!! and marketplace-only records do not infer image language. ${entries.filter((card) => !card.imageAvailable).length} records lack supplied artwork. Chapter coverage is partial; mentions, special chapters, character debuts and illustration scenes are distinguished.`,
  englishCards: catalog.sourceCoverage.englishCards,
  japaneseCards: catalog.sourceCoverage.japaneseCards,
  donCards: visibleCards.filter((card) => card.type === "DON!!").length,
  missingImages: entries.filter((card) => !card.imageAvailable).length,
  japaneseSource: catalog.sourceCoverage.japaneseSource,
  donSource: composedCatalog.coverage.marketplaceSource,
  ...composedCatalog.coverage,
  marketplaceProducts: visibleMarketplaceCards.length,
  marketplaceAdded: visibleMarketplaceCards.filter((card) => card.marketplaceIdentity === "marketplace-printing").length,
};

/** A bounded, read-only query; only one page and its selected entry leave the server. */
export function getJourneyArchive(params: JourneyArchiveParams = {}): JourneyArchiveResponse {
  const q = (params.q ?? "").trim().slice(0, 120).toLowerCase();
  const set = (params.set ?? "").trim().slice(0, 40);
  const type = (params.type ?? "").trim().slice(0, 30).toLowerCase();
  const language = (params.language ?? "").trim().slice(0, 20).toLowerCase();
  const allSets = !set || ["all", "all sets"].includes(set.toLowerCase());
  const allTypes = !type || ["all", "all cards"].includes(type);
  const filtered = entries.filter((card) =>
    (!q || searchText.get(card.id)!.includes(q) || normalize(card.name).includes(normalize(q)) && normalize(q).length > 0) &&
    (allSets || card.setIds.includes(set) || normalize(card.originSet) === normalize(set)) &&
    (allTypes || card.type.toLowerCase() === type) &&
    (!language || language === "all" || card.language === language));

  if (params.order === "story") {
    filtered.sort((a, b) => (a.storyChapter ?? Infinity) - (b.storyChapter ?? Infinity) || cardOrder(a, b));
  }

  const rawPage = typeof params.page === "number" ? params.page : Number((params.page ?? "1").slice(0, 12));
  const totalPages = Math.max(1, Math.ceil(filtered.length / JOURNEY_PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number.isFinite(rawPage) ? Math.floor(rawPage) : 1));
  const cards = filtered.slice((page - 1) * JOURNEY_PAGE_SIZE, page * JOURNEY_PAGE_SIZE);
  const selectedId = (params.card ?? "").trim().slice(0, 80).toLowerCase();
  const selected = selectedId ? entriesById.get(selectedId) ?? null : cards[0] ?? null;
  return { cards, selected, total: filtered.length, page, totalPages, stats, sets: visibleSets, coverage };
}
