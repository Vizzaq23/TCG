import { parseOptcgNumber } from "@/lib/justtcg/match";
import { selectDisplayPrice, type PriceVariantRow } from "@/lib/prices/select-display-price";

export type CollectionValueItem = {
  collectionId: string;
  cardId: string;
  cardName: string;
  setName: string | null;
  cardNumber: string | null;
  quantity: number;
  isGraded: boolean;
  unitCents: number | null;
  lineCents: number | null;
  priceSource: "manual" | "market" | null;
  priceLabel: string;
};

export type CollectionValueSummary = {
  estimatedValueCents: number;
  pricedCards: number;
  unpricedCards: number;
  mostValuable: CollectionValueItem | null;
  topFive: CollectionValueItem[];
  topBySet: Array<{ setName: string; valueCents: number; cards: number }>;
};

export function buildCollectionValueItems(
  rows: Array<{
    id: string;
    card_id: string;
    quantity: number;
    estimated_value_cents: number | null;
    condition: string | null;
    is_graded: boolean;
    cards: {
      name: string;
      set_name: string | null;
      card_number: string | null;
      market_price_cents: number | null;
      market_price_updated_at: string | null;
    } | null;
  }>,
  variantsByCardId: Map<string, PriceVariantRow[]>,
): CollectionValueItem[] {
  const items: CollectionValueItem[] = [];

  for (const row of rows) {
    const card = row.cards;
    if (!card) continue;

    const rawQuantity = Number(row.quantity);
    if (!Number.isFinite(rawQuantity) || rawQuantity <= 0) continue;
    const quantity = Math.trunc(rawQuantity);

    const display = selectDisplayPrice({
      variants: variantsByCardId.get(row.card_id) ?? [],
      preferredCondition: row.is_graded ? null : row.condition,
      isGraded: row.is_graded,
      preferAltPrinting: parseOptcgNumber(card.card_number)?.parallelIndex != null,
      fallbackMarketCents: card.market_price_cents,
      fallbackFetchedAt: card.market_price_updated_at,
    });

    const manualPrice =
      row.estimated_value_cents != null && Number.isFinite(row.estimated_value_cents) && row.estimated_value_cents >= 0
        ? row.estimated_value_cents
        : null;
    const unit = manualPrice ?? display.marketPriceCents;
    const normalizedUnit = typeof unit === "number" && Number.isFinite(unit) && unit >= 0 ? unit : null;

    items.push({
      collectionId: row.id,
      cardId: row.card_id,
      cardName: card.name,
      setName: card.set_name,
      cardNumber: card.card_number,
      quantity,
      isGraded: row.is_graded,
      unitCents: normalizedUnit,
      lineCents: normalizedUnit != null ? normalizedUnit * quantity : null,
      priceSource:
        manualPrice != null
          ? "manual"
          : normalizedUnit != null
            ? "market"
            : null,
      priceLabel: display.label,
    });
  }

  return items;
}

export function summarizeCollectionValue(items: CollectionValueItem[]): CollectionValueSummary {
  const priced = items.filter((i) => typeof i.lineCents === "number" && Number.isFinite(i.lineCents) && i.lineCents >= 0);
  const unpriced = items.filter((i) => i.lineCents == null || !Number.isFinite(i.lineCents) || i.lineCents < 0);
  const estimatedValueCents = priced.reduce((sum, i) => sum + (i.lineCents ?? 0), 0);

  const topFive = [...priced].sort((a, b) => (b.lineCents ?? 0) - (a.lineCents ?? 0)).slice(0, 5);
  const mostValuable = topFive[0] ?? null;

  const bySet = new Map<string, { valueCents: number; cards: number }>();
  for (const item of priced) {
    const key = item.setName?.trim() || "Unknown set";
    const cur = bySet.get(key) ?? { valueCents: 0, cards: 0 };
    cur.valueCents += item.lineCents ?? 0;
    cur.cards += 1;
    bySet.set(key, cur);
  }

  const topBySet = [...bySet.entries()]
    .map(([setName, v]) => ({ setName, valueCents: v.valueCents, cards: v.cards }))
    .sort((a, b) => b.valueCents - a.valueCents);

  return {
    estimatedValueCents,
    pricedCards: priced.length,
    unpricedCards: unpriced.length,
    mostValuable,
    topFive,
    topBySet,
  };
}

/** Top N cards for a set by Near Mint / display market unit price (not × qty). */
export function topCardsBySetMarket(
  items: CollectionValueItem[],
  setName: string,
  limit = 10,
): CollectionValueItem[] {
  const want = setName.trim().toLowerCase();
  return items
    .filter(
      (i) =>
        i.unitCents != null &&
        (i.setName ?? "").trim().toLowerCase() === want &&
        i.priceSource === "market",
    )
    .sort((a, b) => (b.unitCents ?? 0) - (a.unitCents ?? 0))
    .slice(0, limit);
}
