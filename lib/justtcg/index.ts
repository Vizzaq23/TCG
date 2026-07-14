/**
 * Compatibility barrel for JustTCG helpers.
 * Prefer importing from `@/lib/justtcg/client`, `match`, or `types`.
 */

export { isJustTcgConfigured, listGames, listSets, searchCards, getCardsByBatch } from "@/lib/justtcg/client";
export {
  JUSTTCG_GAME_CANDIDATES,
  parseOptcgNumber,
  scoreCardMatch,
  pickBestCard,
  pickNearMintVariant,
  variantToMarketPrice,
  resolveOnePieceGameId,
  lookupOnePieceCard,
  resetJustTcgMatchCache,
} from "@/lib/justtcg/match";
export {
  JustTcgClientError,
  type JustTcgCard,
  type JustTcgVariant,
  type JustTcgSet,
  type JustTcgGame,
  type JustTcgMarketPrice,
} from "@/lib/justtcg/types";
export { dollarsToCents } from "@/lib/money";

/** @deprecated Prefer pickNearMintVariant */
export { pickNearMintVariant as pickMarketVariant } from "@/lib/justtcg/match";
