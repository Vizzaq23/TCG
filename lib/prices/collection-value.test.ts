import { describe, expect, it } from "vitest";
import {
  buildCollectionValueItems,
  summarizeCollectionValue,
  topCardsBySetMarket,
} from "@/lib/prices/collection-value";
import type { PriceVariantRow } from "@/lib/prices/select-display-price";

function row(partial: {
  id: string;
  card_id: string;
  quantity: number;
  estimated_value_cents?: number | null;
  condition?: string | null;
  is_graded?: boolean;
  name: string;
  set_name?: string | null;
  market_price_cents?: number | null;
}) {
  return {
    id: partial.id,
    card_id: partial.card_id,
    quantity: partial.quantity,
    estimated_value_cents: partial.estimated_value_cents ?? null,
    condition: partial.condition ?? "Near Mint",
    is_graded: partial.is_graded ?? false,
    cards: {
      name: partial.name,
      set_name: partial.set_name ?? "Romance Dawn",
      card_number: "OP01-001",
      market_price_cents: partial.market_price_cents ?? null,
      market_price_updated_at: null,
    },
  };
}

describe("collection value", () => {
  it("multiplies unit cents by quantity and skips null prices", () => {
    const variants = new Map<string, PriceVariantRow[]>([
      [
        "c1",
        [
          {
            market_price_cents: 100,
            printing: "Normal",
            condition: "Near Mint",
          },
        ],
      ],
    ]);

    const items = buildCollectionValueItems(
      [
        row({ id: "1", card_id: "c1", quantity: 3, name: "Luffy", market_price_cents: 100 }),
        row({ id: "2", card_id: "c2", quantity: 2, name: "Zoro" }),
      ],
      variants,
    );

    const summary = summarizeCollectionValue(items);
    expect(summary.estimatedValueCents).toBe(300);
    expect(summary.pricedCards).toBe(1);
    expect(summary.unpricedCards).toBe(1);
  });

  it("prefers manual estimated_value_cents", () => {
    const variants = new Map<string, PriceVariantRow[]>([
      [
        "c1",
        [
          {
            market_price_cents: 100,
            printing: "Normal",
            condition: "Near Mint",
          },
        ],
      ],
    ]);

    const items = buildCollectionValueItems(
      [
        row({
          id: "1",
          card_id: "c1",
          quantity: 2,
          name: "Luffy",
          estimated_value_cents: 500,
          market_price_cents: 100,
        }),
      ],
      variants,
    );

    expect(items[0]?.priceSource).toBe("manual");
    expect(items[0]?.lineCents).toBe(1000);
  });

  it("ranks top cards by set market unit price", () => {
    const items = buildCollectionValueItems(
      [
        row({
          id: "1",
          card_id: "a",
          quantity: 1,
          name: "Cheap",
          set_name: "OP01",
          market_price_cents: 50,
        }),
        row({
          id: "2",
          card_id: "b",
          quantity: 10,
          name: "Expensive",
          set_name: "OP01",
          market_price_cents: 200,
        }),
      ],
      new Map(),
    );

    const top = topCardsBySetMarket(items, "OP01", 10);
    expect(top[0]?.cardName).toBe("Expensive");
    expect(top[0]?.unitCents).toBe(200);
  });

  it("ignores non-positive quantities and negative manual values", () => {
    const items = buildCollectionValueItems(
      [
        row({ id: "bad", card_id: "c-bad", quantity: -3, name: "Bad quantity" }),
        row({
          id: "manual-bad",
          card_id: "c-manual-bad",
          quantity: 2,
          name: "Bad manual",
          estimated_value_cents: -150,
          market_price_cents: 50,
        }),
        row({
          id: "ok",
          card_id: "c-ok",
          quantity: 2,
          name: "Good",
          set_name: "OP02",
          market_price_cents: 300,
        }),
      ],
      new Map([
        ["c-ok", [{ market_price_cents: 300, printing: "Normal", condition: "Near Mint" }]],
        ["c-manual-bad", [{ market_price_cents: 50, printing: "Normal", condition: "Near Mint" }]],
      ]),
    );

    expect(items).toHaveLength(2);
    expect(items[0]?.cardName).toBe("Bad manual");
    expect(items[0]?.priceSource).toBe("market");
    expect(items[0]?.lineCents).toBe(100);
    expect(items[1]?.cardName).toBe("Good");
    expect(items[1]?.lineCents).toBe(600);

    const summary = summarizeCollectionValue(items);
    expect(summary.estimatedValueCents).toBe(700);
    expect(summary.pricedCards).toBe(2);
    expect(summary.unpricedCards).toBe(0);
  });
});
