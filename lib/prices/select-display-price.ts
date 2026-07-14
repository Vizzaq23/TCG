export type PriceVariantRow = {
  market_price_cents: number;
  printing: string;
  condition: string;
  price_change_24h_pct?: number | null;
  price_change_7d_pct?: number | null;
  fetched_at?: string | null;
};

export type DisplayPrice = {
  marketPriceCents: number | null;
  printing: string | null;
  condition: string | null;
  priceChange24hPct: number | null;
  priceChange7dPct: number | null;
  fetchedAt: string | null;
  unavailable: boolean;
  /** Graded slabs: raw market is not the slab value */
  label: string;
  isUnderlyingRaw: boolean;
};

function normalizeCondition(value: string): string {
  const v = value.trim().toLowerCase();
  if (v === "nm" || v === "near mint") return "near mint";
  if (v === "lp" || v === "lightly played") return "lightly played";
  if (v === "mp" || v === "moderately played") return "moderately played";
  if (v === "hp" || v === "heavily played") return "heavily played";
  if (v === "dmg" || v === "damaged") return "damaged";
  return v;
}

function isAltPrinting(printing: string): boolean {
  return /alt|parallel|special|manga|illustration|showcase|borderless/i.test(printing);
}

function printingRank(printing: string, preferAlt: boolean): number {
  const alt = isAltPrinting(printing);
  if (preferAlt) return alt ? 0 : printing.trim().toLowerCase() === "normal" ? 2 : 1;
  return printing.trim().toLowerCase() === "normal" ? 0 : alt ? 1 : 2;
}

/**
 * Choose a single display market price from cached variants.
 * Never uses max() across unrelated conditions/printings.
 */
export function selectDisplayPrice(input: {
  variants: PriceVariantRow[];
  preferredCondition?: string | null;
  isGraded?: boolean;
  /** When true (catalog parallel / alt art), prefer non-Normal printings. */
  preferAltPrinting?: boolean;
  fallbackMarketCents?: number | null;
  fallbackFetchedAt?: string | null;
}): DisplayPrice {
  const {
    variants,
    preferredCondition,
    isGraded,
    preferAltPrinting = false,
    fallbackMarketCents,
    fallbackFetchedAt,
  } = input;

  const priced = variants.filter(
    (v) =>
      typeof v.market_price_cents === "number" &&
      Number.isFinite(v.market_price_cents) &&
      v.market_price_cents >= 0,
  );

  let chosen: PriceVariantRow | null = null;

  if (priced.length) {
    const want = preferredCondition ? normalizeCondition(preferredCondition) : "near mint";
    const byCondition = priced.filter((v) => normalizeCondition(v.condition) === want);
    const pool = byCondition.length ? byCondition : priced.filter((v) => normalizeCondition(v.condition) === "near mint");
    const pool2 = pool.length ? pool : priced;

    chosen = [...pool2].sort((a, b) => {
      const pr =
        printingRank(a.printing, preferAltPrinting) -
        printingRank(b.printing, preferAltPrinting);
      if (pr !== 0) return pr;
      const at = a.fetched_at ? new Date(a.fetched_at).getTime() : 0;
      const bt = b.fetched_at ? new Date(b.fetched_at).getTime() : 0;
      return bt - at;
    })[0];
  }

  if (!chosen && fallbackMarketCents != null && fallbackMarketCents >= 0) {
    return {
      marketPriceCents: fallbackMarketCents,
      printing: "Normal",
      condition: "Near Mint",
      priceChange24hPct: null,
      priceChange7dPct: null,
      fetchedAt: fallbackFetchedAt ?? null,
      unavailable: false,
      label: isGraded ? "Underlying raw market" : "Market",
      isUnderlyingRaw: Boolean(isGraded),
    };
  }

  if (!chosen) {
    return {
      marketPriceCents: null,
      printing: null,
      condition: null,
      priceChange24hPct: null,
      priceChange7dPct: null,
      fetchedAt: null,
      unavailable: true,
      label: isGraded ? "Underlying raw market" : "Market",
      isUnderlyingRaw: Boolean(isGraded),
    };
  }

  return {
    marketPriceCents: chosen.market_price_cents,
    printing: chosen.printing,
    condition: chosen.condition,
    priceChange24hPct:
      chosen.price_change_24h_pct != null ? Number(chosen.price_change_24h_pct) : null,
    priceChange7dPct:
      chosen.price_change_7d_pct != null ? Number(chosen.price_change_7d_pct) : null,
    fetchedAt: chosen.fetched_at ?? null,
    unavailable: false,
    label: isGraded ? "Underlying raw market" : "Market",
    isUnderlyingRaw: Boolean(isGraded),
  };
}
