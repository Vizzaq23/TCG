import { dollarsToCents } from "@/lib/money";
import type { JustTcgCard, JustTcgMarketPrice, JustTcgVariant } from "@/lib/justtcg/types";
import { JustTcgClientError } from "@/lib/justtcg/types";
import { listGames, searchCards } from "@/lib/justtcg/client";

export const JUSTTCG_GAME_CANDIDATES = ["onepiece", "one-piece", "one-piece-card-game"] as const;

let cachedGameId: string | null = null;

export function resetJustTcgMatchCache() {
  cachedGameId = null;
}

export function parseOptcgNumber(cardNumber: string | null | undefined): {
  raw: string;
  setCode: string | null;
  collector: string | null;
  base: string;
} | null {
  const raw = cardNumber?.trim();
  if (!raw) return null;
  const base = raw.replace(/_p\d+$/i, "");
  const m = base.match(/^([A-Za-z]+\d+)-(\d+[A-Za-z]?)$/);
  return {
    raw,
    base,
    setCode: m?.[1] ?? null,
    collector: m?.[2] ?? null,
  };
}

function normalizeNumber(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/^0+/, "") || "0";
}

function numbersLooselyEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (left === right) return true;
  if (normalizeNumber(left) === normalizeNumber(right)) return true;
  const leftTail = left.includes("-") ? left.split("-").pop()! : left;
  const rightTail = right.includes("-") ? right.split("-").pop()! : right;
  return normalizeNumber(leftTail) === normalizeNumber(rightTail);
}

export function scoreCardMatch(
  card: Pick<JustTcgCard, "name" | "number">,
  input: { cardNumber: string | null; name: string },
): number {
  let score = 0;
  const parsed = parseOptcgNumber(input.cardNumber);
  if (parsed && numbersLooselyEqual(card.number, parsed.raw)) score += 100;
  else if (parsed && numbersLooselyEqual(card.number, parsed.base)) score += 90;
  else if (parsed?.collector && numbersLooselyEqual(card.number, parsed.collector)) score += 40;

  const want = input.name.trim().toLowerCase();
  const got = card.name.trim().toLowerCase();
  if (want && got === want) score += 50;
  else if (want && (got.includes(want) || want.includes(got))) score += 20;

  return score;
}

export function pickBestCard(
  cards: JustTcgCard[],
  input: { cardNumber: string | null; name: string },
): JustTcgCard | null {
  if (!cards.length) return null;
  const ranked = [...cards]
    .map((c) => ({ c, score: scoreCardMatch(c, input) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.c ?? null;
}

export function pickNearMintVariant(variants: JustTcgVariant[]): JustTcgVariant | null {
  const priced = variants.filter(
    (v) => typeof v.price === "number" && Number.isFinite(v.price) && v.price >= 0,
  );
  if (!priced.length) return null;
  return (
    priced.find((v) => v.condition === "Near Mint" || v.condition === "NM") ?? priced[0]
  );
}

export function variantToMarketPrice(
  card: JustTcgCard,
  variant: JustTcgVariant,
  fetchedAt = new Date().toISOString(),
): JustTcgMarketPrice {
  return {
    marketPriceCents: dollarsToCents(variant.price),
    currency: "USD",
    condition: variant.condition,
    printing: variant.printing,
    priceChange24hPct:
      typeof variant.priceChange24hr === "number" ? variant.priceChange24hr : null,
    priceChange7dPct: typeof variant.priceChange7d === "number" ? variant.priceChange7d : null,
    fetchedAt,
    externalCardId: card.uuid || card.id,
    externalVariantId: variant.uuid || variant.id || null,
    tcgplayerProductId: card.tcgplayerId ?? null,
    matchedName: card.name,
  };
}

export async function resolveOnePieceGameId(): Promise<string> {
  if (cachedGameId) return cachedGameId;

  try {
    const games = await listGames();
    const match = games.find((g) => {
      const blob = `${g.id} ${g.name}`.toLowerCase();
      return blob.includes("one piece") || blob.includes("onepiece") || g.id === "onepiece";
    });
    if (match) {
      cachedGameId = match.id;
      return match.id;
    }
  } catch (err) {
    if (err instanceof JustTcgClientError && err.code === "rate_limited") throw err;
  }

  for (const candidate of JUSTTCG_GAME_CANDIDATES) {
    try {
      const probe = await searchCards({
        game: candidate,
        query: "Luffy",
        limit: 1,
        include_null_prices: true,
      });
      if (probe.length) {
        cachedGameId = candidate;
        return candidate;
      }
    } catch (err) {
      if (err instanceof JustTcgClientError && err.code === "rate_limited") throw err;
    }
  }

  cachedGameId = "onepiece";
  return cachedGameId;
}

export type LookupResult = {
  card: JustTcgCard | null;
  failure?: { reason: string; rateLimited?: boolean };
};

/**
 * Match a catalog card to JustTCG. Prefer stored id, then number, then name+collector.
 */
export async function lookupOnePieceCard(input: {
  cardNumber: string | null;
  name: string;
  justtcgCardId?: string | null;
  tcgplayerProductId?: string | null;
}): Promise<LookupResult> {
  try {
    if (input.justtcgCardId?.trim()) {
      const byId = await searchCards({
        cardId: input.justtcgCardId.trim(),
        limit: 5,
        include_null_prices: true,
      });
      if (byId[0]) return { card: byId[0] };
    }

    if (input.tcgplayerProductId?.trim()) {
      const byTcg = await searchCards({
        tcgplayerId: input.tcgplayerProductId.trim(),
        limit: 5,
        include_null_prices: true,
      });
      if (byTcg[0]) return { card: byTcg[0] };
    }

    const game = await resolveOnePieceGameId();
    const parsed = parseOptcgNumber(input.cardNumber);

    if (parsed?.base) {
      const byNumber = await searchCards({
        game,
        query: parsed.base,
        limit: 10,
        include_null_prices: true,
      });
      const best = pickBestCard(byNumber, input);
      if (best && scoreCardMatch(best, input) >= 40) return { card: best };
    }

    if (parsed?.collector && input.name.trim()) {
      const byCollector = await searchCards({
        game,
        query: input.name.trim(),
        number: parsed.collector,
        limit: 10,
        include_null_prices: true,
      });
      const best = pickBestCard(byCollector, input);
      if (best && scoreCardMatch(best, input) >= 40) return { card: best };
    }

    if (input.name.trim() && parsed?.base) {
      // Avoid pure name-only as primary; require number context already tried.
      return { card: null, failure: { reason: "No reliable JustTCG match" } };
    }

    return { card: null, failure: { reason: "No JustTCG match" } };
  } catch (err) {
    if (err instanceof JustTcgClientError) {
      return {
        card: null,
        failure: {
          reason: err.message,
          rateLimited: err.code === "rate_limited",
        },
      };
    }
    return {
      card: null,
      failure: {
        reason: err instanceof Error ? err.message : "Lookup failed",
      },
    };
  }
}
