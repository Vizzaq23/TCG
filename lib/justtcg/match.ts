import { dollarsToCents } from "@/lib/money";
import type { JustTcgCard, JustTcgMarketPrice, JustTcgVariant } from "@/lib/justtcg/types";
import { JustTcgClientError } from "@/lib/justtcg/types";
import { listGames, searchCards } from "@/lib/justtcg/client";

export const JUSTTCG_GAME_CANDIDATES = ["onepiece", "one-piece", "one-piece-card-game"] as const;

/** Minimum score to accept a fuzzy search hit (exact/base number required). */
export const MIN_ACCEPT_SCORE = 100;

let cachedGameId: string | null = null;

export function resetJustTcgMatchCache() {
  cachedGameId = null;
}

export function parseOptcgNumber(cardNumber: string | null | undefined): {
  raw: string;
  setCode: string | null;
  collector: string | null;
  base: string;
  parallelIndex: number | null;
} | null {
  const raw = cardNumber?.trim();
  if (!raw) return null;
  const withoutMarketplaceId = raw.replace(/_tcg\d+$/i, "");
  const parallelMatch = withoutMarketplaceId.match(/_p(\d+)$/i);
  const parallelIndex = parallelMatch ? Number.parseInt(parallelMatch[1], 10) : null;
  const base = withoutMarketplaceId.replace(/_p\d+$/i, "");
  const m = base.match(/^([A-Za-z]+\d+|P)-(\d+[A-Za-z]?)$/i);
  return {
    raw,
    base,
    setCode: m?.[1] ?? null,
    collector: m?.[2] ?? null,
    parallelIndex: Number.isFinite(parallelIndex) ? parallelIndex : null,
  };
}

function normalizeNumber(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/^0+/, "") || "0";
}

function marketplaceIdFromNumber(cardNumber: string | null): string | null {
  const match = cardNumber?.trim().match(/(?:_tcg(\d+)$|^TCG-(\d+)$)/i);
  return match?.[1] ?? match?.[2] ?? null;
}

/** Exact marketplace identity takes precedence over naming/parallel-label heuristics. */
function matchesMarketplaceIdentity(
  card: JustTcgCard,
  productId: string,
  wanted: ReturnType<typeof parseOptcgNumber>,
): boolean {
  if (card.tcgplayerId?.trim() !== productId) return false;
  const game = (card.game ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (game !== "onepiece" && game !== "onepiececardgame") return false;

  // An unnumbered DON!!/promo has only its product identity. Some provider rows
  // omit collector numbers; the exact global product ID still identifies them.
  if (!wanted?.setCode || !wanted.collector || !card.number?.trim()) return true;
  const actual = parseOptcgNumber(card.number);
  if (actual?.setCode && actual.collector) {
    return actual.setCode.toLowerCase() === wanted.setCode.toLowerCase()
      && normalizeNumber(actual.collector) === normalizeNumber(wanted.collector);
  }

  // The provider also uses collector-only numbers. A different full set code
  // must never pass merely because its numeric tail happens to match.
  return /^\d+[A-Za-z]?$/.test(card.number.trim())
    && normalizeNumber(card.number) === normalizeNumber(wanted.collector);
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

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    // JustTCG often suffixes " (073) (Parallel)" — strip for name compare.
    .replace(/\([^)]*\)/g, " ")
    .replace(/[._']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAltPrinting(printing: string): boolean {
  return /alt|parallel|special|manga|illustration|showcase|borderless/i.test(printing);
}

function cardLooksParallel(card: Pick<JustTcgCard, "name" | "number" | "details" | "variants">): boolean {
  const blob = `${card.name} ${card.number ?? ""} ${card.details ?? ""}`;
  if (/_p\d+/i.test(blob) || /\balt\b|parallel|manga rare|illustration/i.test(blob)) return true;
  return (card.variants ?? []).some((v) => isAltPrinting(v.printing));
}

export function scoreCardMatch(
  card: Pick<JustTcgCard, "name" | "number" | "set" | "set_name" | "details" | "variants">,
  input: {
    cardNumber: string | null;
    name: string;
    setName?: string | null;
  },
): number {
  let score = 0;
  const parsed = parseOptcgNumber(input.cardNumber);
  const cardNumber = card.number?.trim() ?? "";
  const parallelHit = parsed?.parallelIndex != null && cardLooksParallel(card);

  if (parsed) {
    if (numbersLooselyEqual(cardNumber, parsed.raw)) {
      score += 120;
    } else if (numbersLooselyEqual(cardNumber, parsed.base)) {
      if (parsed.parallelIndex != null) {
        // Base # + Parallel-labeled JustTCG row is the usual OPTCG mapping for _pN.
        score += parallelHit ? 80 : 25;
      } else {
        score += 100;
      }
    } else if (parsed.collector && numbersLooselyEqual(cardNumber, parsed.collector)) {
      score += 15;
    }
  }

  const want = normalizeText(input.name);
  const got = normalizeText(card.name);
  if (want && got === want) score += 50;
  else if (want && (got.includes(want) || want.includes(got))) score += 20;

  const wantSet = normalizeText(input.setName);
  if (wantSet) {
    const gotSet = normalizeText(card.set_name || card.set);
    if (gotSet && (gotSet === wantSet || gotSet.includes(wantSet) || wantSet.includes(gotSet))) {
      score += 40;
    } else if (gotSet && /demo|learn together|proxy/i.test(gotSet)) {
      score -= 40;
    }
  } else if (/demo|learn together|proxy/i.test(card.set_name || card.set || "")) {
    score -= 25;
  }

  if (parsed?.parallelIndex != null) {
    if (parallelHit) score += 40;
    else score -= 50;
  }

  return score;
}

export function pickBestCard(
  cards: JustTcgCard[],
  input: { cardNumber: string | null; name: string; setName?: string | null },
): JustTcgCard | null {
  if (!cards.length) return null;
  const ranked = [...cards]
    .map((c) => ({ c, score: scoreCardMatch(c, input) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.c ?? null;
}

export function pickNearMintVariant(
  variants: JustTcgVariant[],
  opts?: { preferAltPrinting?: boolean },
): JustTcgVariant | null {
  const priced = variants.filter(
    (v) => typeof v.price === "number" && Number.isFinite(v.price) && v.price >= 0,
  );
  if (!priced.length) return null;

  const nm = priced.filter((v) => {
    const c = v.condition.trim().toLowerCase();
    return c === "near mint" || c === "nm";
  });
  const pool = nm.length ? nm : priced;

  if (opts?.preferAltPrinting) {
    const alt = pool.find((v) => isAltPrinting(v.printing));
    if (alt) return alt;
    const nonNormal = pool.find((v) => v.printing.trim().toLowerCase() !== "normal");
    if (nonNormal) return nonNormal;
  }

  return (
    pool.find((v) => v.printing.trim().toLowerCase() === "normal") ?? pool[0] ?? null
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

  cachedGameId = "onepiece";
  return cachedGameId;
}

export type LookupResult = {
  card: JustTcgCard | null;
  failure?: { reason: string; rateLimited?: boolean };
};

async function searchSafe(
  params: Parameters<typeof searchCards>[0],
): Promise<JustTcgCard[]> {
  try {
    return await searchCards(params);
  } catch (err) {
    if (err instanceof JustTcgClientError && err.code === "rate_limited") throw err;
    if (err instanceof JustTcgClientError && err.code === "unauthorized") throw err;
    return [];
  }
}

/**
 * Match a catalog card to JustTCG. A supplied marketplace identity is mandatory:
 * stored IDs and search responses must resolve to that exact product. Catalog
 * cards without marketplace identity retain number/set matching.
 */
export async function lookupOnePieceCard(input: {
  cardNumber: string | null;
  name: string;
  setName?: string | null;
  justtcgCardId?: string | null;
  tcgplayerProductId?: string | null;
}): Promise<LookupResult> {
  try {
    const matchInput = {
      cardNumber: input.cardNumber,
      name: input.name,
      setName: input.setName,
    };
    const parsed = parseOptcgNumber(input.cardNumber);
    const embeddedProductId = marketplaceIdFromNumber(input.cardNumber);
    const suppliedProductId = input.tcgplayerProductId?.trim() || null;
    if (embeddedProductId && suppliedProductId && embeddedProductId !== suppliedProductId) {
      return { card: null, failure: { reason: "Conflicting TCGplayer product identities" } };
    }
    const productId = suppliedProductId ?? embeddedProductId;

    if (input.justtcgCardId?.trim()) {
      const byId = await searchSafe({
        cardId: input.justtcgCardId.trim(),
        limit: 5,
        include_null_prices: true,
      });
      const stored = productId
        ? byId.find((card) => matchesMarketplaceIdentity(card, productId, parsed))
        : byId[0];
      if (stored && productId) return { card: stored };
      if (stored && scoreCardMatch(stored, matchInput) >= MIN_ACCEPT_SCORE) {
        if (parsed?.parallelIndex == null || cardLooksParallel(stored)) {
          return { card: stored };
        }
      }
      // Stale/wrong stored id — fall through to search.
    }

    if (productId) {
      const byTcg = await searchSafe({
        tcgplayerId: productId,
        limit: 5,
        include_null_prices: true,
      });
      const exact = byTcg.find((card) => matchesMarketplaceIdentity(card, productId, parsed));
      return exact
        ? { card: exact }
        : { card: null, failure: { reason: `No reliable JustTCG match for TCGplayer product ${productId}` } };
    }

    const game = await resolveOnePieceGameId();

    const candidates: JustTcgCard[] = [];
    const seen = new Set<string>();
    const pushAll = (cards: JustTcgCard[]) => {
      for (const c of cards) {
        const key = c.uuid || c.id;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(c);
      }
    };

    if (parsed?.raw) {
      pushAll(
        await searchSafe({
          game,
          query: parsed.raw,
          limit: 15,
          include_null_prices: true,
        }),
      );
    }

    if (parsed?.base && parsed.base !== parsed.raw) {
      pushAll(
        await searchSafe({
          game,
          query: parsed.base,
          limit: 15,
          include_null_prices: true,
        }),
      );
    } else if (parsed?.base) {
      pushAll(
        await searchSafe({
          game,
          query: parsed.base,
          limit: 15,
          include_null_prices: true,
        }),
      );
    }

    if (parsed?.collector && input.name.trim()) {
      pushAll(
        await searchSafe({
          game,
          query: input.name.trim(),
          number: parsed.collector,
          limit: 15,
          include_null_prices: true,
        }),
      );
    }

    const best = pickBestCard(candidates, matchInput);
    const score = best ? scoreCardMatch(best, matchInput) : 0;

    if (!best || score < MIN_ACCEPT_SCORE) {
      return {
        card: null,
        failure: {
          reason: best
            ? `Weak JustTCG match (score ${score}): ${best.name} #${best.number}`
            : "No reliable JustTCG match",
        },
      };
    }

    // Parallel catalog rows must not keep a plain base/Normal-only SKU.
    if (parsed?.parallelIndex != null && !cardLooksParallel(best)) {
      return {
        card: null,
        failure: {
          reason: `Refusing base-only match for parallel ${parsed.raw} → ${best.name} #${best.number}`,
        },
      };
    }

    return { card: best };
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
