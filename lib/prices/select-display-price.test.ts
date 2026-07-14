import { describe, expect, it } from "vitest";
import { selectDisplayPrice } from "@/lib/prices/select-display-price";

const variants = [
  {
    market_price_cents: 100,
    printing: "Foil",
    condition: "Near Mint",
    fetched_at: "2025-01-01T00:00:00.000Z",
  },
  {
    market_price_cents: 250,
    printing: "Normal",
    condition: "Near Mint",
    fetched_at: "2025-01-02T00:00:00.000Z",
  },
  {
    market_price_cents: 80,
    printing: "Normal",
    condition: "Lightly Played",
    fetched_at: "2025-01-02T00:00:00.000Z",
  },
  {
    market_price_cents: 9999,
    printing: "Normal",
    condition: "Damaged",
    fetched_at: "2025-01-02T00:00:00.000Z",
  },
];

describe("selectDisplayPrice", () => {
  it("prefers Near Mint + Normal printing", () => {
    const result = selectDisplayPrice({ variants });
    expect(result.marketPriceCents).toBe(250);
    expect(result.printing).toBe("Normal");
    expect(result.condition).toBe("Near Mint");
    expect(result.unavailable).toBe(false);
  });

  it("uses preferred condition when present", () => {
    const result = selectDisplayPrice({
      variants,
      preferredCondition: "Lightly Played",
    });
    expect(result.marketPriceCents).toBe(80);
    expect(result.condition).toBe("Lightly Played");
  });

  it("does not pick max across unrelated variants", () => {
    const result = selectDisplayPrice({ variants });
    expect(result.marketPriceCents).not.toBe(9999);
  });

  it("labels graded as underlying raw market", () => {
    const result = selectDisplayPrice({ variants, isGraded: true });
    expect(result.label).toBe("Underlying raw market");
    expect(result.isUnderlyingRaw).toBe(true);
    expect(result.marketPriceCents).toBe(250);
  });

  it("falls back to denormalized market cents", () => {
    const result = selectDisplayPrice({
      variants: [],
      fallbackMarketCents: 400,
      fallbackFetchedAt: "2025-01-03T00:00:00.000Z",
    });
    expect(result.marketPriceCents).toBe(400);
    expect(result.unavailable).toBe(false);
  });

  it("returns unavailable when nothing priced", () => {
    const result = selectDisplayPrice({ variants: [] });
    expect(result.marketPriceCents).toBeNull();
    expect(result.unavailable).toBe(true);
  });
});
