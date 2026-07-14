/** JustTCG API domain types (validated shapes used by our client). */

export type JustTcgCondition =
  | "Sealed"
  | "Near Mint"
  | "Lightly Played"
  | "Moderately Played"
  | "Heavily Played"
  | "Damaged"
  | "NM"
  | "LP"
  | "MP"
  | "HP"
  | "DMG"
  | "S"
  | string;

export type JustTcgPrinting = string;

export type JustTcgSet = {
  id: string;
  name: string;
  game_id?: string;
  game?: string;
  count?: number;
  release_date?: string | null;
};

export type JustTcgGame = {
  id: string;
  name: string;
  cards_count?: number;
  sets_count?: number;
};

export type JustTcgPriceChanges = {
  priceChange24hr?: number | null;
  priceChange7d?: number | null;
};

export type JustTcgVariant = {
  id: string;
  uuid?: string;
  condition: JustTcgCondition;
  printing: JustTcgPrinting;
  language?: string | null;
  tcgplayerSkuId?: string;
  price: number;
  lastUpdated?: number;
} & JustTcgPriceChanges;

export type JustTcgCard = {
  id: string;
  uuid?: string;
  name: string;
  game: string;
  set: string;
  set_name?: string;
  number: string | null;
  rarity?: string | null;
  tcgplayerId?: string | null;
  details?: string | null;
  variants: JustTcgVariant[];
};

export type JustTcgMarketPrice = {
  marketPriceCents: number;
  currency: "USD";
  condition: string;
  printing: string;
  priceChange24hPct: number | null;
  priceChange7dPct: number | null;
  fetchedAt: string;
  externalCardId: string;
  externalVariantId: string | null;
  tcgplayerProductId: string | null;
  matchedName: string;
};

export type JustTcgClientErrorCode =
  | "missing_api_key"
  | "timeout"
  | "http_error"
  | "rate_limited"
  | "invalid_response"
  | "unauthorized"
  | "bad_request";

export class JustTcgClientError extends Error {
  readonly code: JustTcgClientErrorCode;
  readonly status?: number;

  constructor(code: JustTcgClientErrorCode, message: string, status?: number) {
    super(message);
    this.name = "JustTcgClientError";
    this.code = code;
    this.status = status;
  }
}

export function isJustTcgCard(value: unknown): value is JustTcgCard {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    Array.isArray(c.variants)
  );
}

export function isJustTcgGame(value: unknown): value is JustTcgGame {
  if (!value || typeof value !== "object") return false;
  const g = value as Record<string, unknown>;
  return typeof g.id === "string" && typeof g.name === "string";
}
