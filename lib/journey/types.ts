export type JourneyCatalogCard = {
  id: string;
  baseId: string;
  name: string;
  /** Canonical character identity used for lore; display name retains the printing variant. */
  characterName?: string;
  type: string;
  colors: string[];
  rarity: string;
  image: string;
  imageAvailable: boolean;
  language: "en" | "ja" | "unspecified";
  /** Native source identifier; DON archive IDs are not official card numbers. */
  sourceCardId: string;
  originalName?: string;
  catalogSource: string;
  tcgplayerProductId?: number;
  tcgplayerUrl?: string;
  marketplaceName?: string;
  marketplaceIdentity?: "regular-number" | "marketplace-printing";
  crew: string[];
  /** Printed card-number prefix, independent of reprint product membership. */
  originSet: string;
  setIds: string[];
  setLabel: string;
};

export type JourneyEntry = JourneyCatalogCard & {
  title: string;
  text: string;
  detail: string;
  arc: string;
  chapter: number | null;
  episode: number | null;
  note: string | null;
  source: string;
  entryKind: "Character debut" | "Character reference" | "Scene guide" | "Uncharted";
  referenceKind?: "appearance" | "mention" | "special";
  referenceLabel?: string;
  /** Chapter shown by the reader: a scene connection when available, otherwise the debut. */
  storyChapter: number | null;
  /** Only assigned when this printing's exact illustrated scene is verified. */
  sceneChapter?: number | null;
};

export type JourneyArchiveParams = {
  q?: string;
  set?: string;
  type?: string;
  language?: string;
  order?: string;
  page?: number | string;
  card?: string;
};

export type JourneySet = { id: string; label: string; count: number };

export type JourneyArchiveResponse = {
  cards: JourneyEntry[];
  selected: JourneyEntry | null;
  total: number;
  page: number;
  totalPages: number;
  stats: { cards: number; baseCards: number; sets: number; mapped: number };
  sets: JourneySet[];
  coverage: {
    catalogSource: string;
    catalogUpdatedAt: string;
    characterSource: string;
    characterSnapshotDate: string;
    scope: string;
    note: string;
    englishCards: number;
    japaneseCards: number;
    donCards: number;
    missingImages: number;
    japaneseSource: string;
    donSource: string;
    marketplaceProducts: number;
    marketplaceAdded: number;
    marketplaceLinked: number;
    marketplaceSourceBuild: string;
    marketplaceSource: string;
  };
};
