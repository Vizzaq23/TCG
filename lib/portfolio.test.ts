import { describe, expect, it } from "vitest";
import { computeSetProgress } from "@/lib/collection/set-progress";
import {
  centsToInputValue,
  formatUsdCents,
  parseDollarsToCents,
} from "@/lib/money";
import { formatActivityEvent } from "@/lib/activity";
import { buildHoldings, portfolioDeltaLabel, sparklinePoints, buildValueChart, formatAxisCents } from "@/lib/portfolio";

describe("computeSetProgress", () => {
  it("counts owned unique cards per set", () => {
    const catalog = [
      { id: "1", set_name: "OP01" },
      { id: "2", set_name: "OP01" },
      { id: "3", set_name: "OP02" },
    ];
    const owned = [{ card_id: "1" }, { card_id: "1" }, { card_id: "3" }];
    expect(computeSetProgress(catalog, owned)).toEqual([
      { setName: "OP01", owned: 1, total: 2 },
      { setName: "OP02", owned: 1, total: 1 },
    ]);
  });
});

describe("money helpers (portfolio valuation)", () => {
  it("parses and formats cents", () => {
    expect(parseDollarsToCents("12.50")).toBe(1250);
    expect(parseDollarsToCents("$1,234.56")).toBe(123456);
    expect(parseDollarsToCents("")).toBeNull();
    expect(parseDollarsToCents("-1")).toBeNull();
    expect(formatUsdCents(1250)).toBe("$12.50");
    expect(centsToInputValue(1250)).toBe("12.50");
  });
});

describe("activity feed copy", () => {
  it("formats trade and showcase events", () => {
    expect(
      formatActivityEvent({
        id: "1",
        event_type: "marked_trade",
        payload: { card_name: "Luffy" },
        created_at: new Date().toISOString(),
      }),
    ).toBe("Marked Luffy for trade");
    expect(
      formatActivityEvent({
        id: "2",
        event_type: "updated_showcase",
        payload: { card_name: "Zoro" },
        created_at: new Date().toISOString(),
      }),
    ).toBe("Updated showcase · Zoro");
  });
});

describe("portfolio holdings", () => {
  it("splits valued and unpriced and sorts by line value", () => {
    const { valued, unpriced } = buildHoldings([
      {
        id: "a",
        quantity: 2,
        estimated_value_cents: 500,
        is_for_trade: false,
        is_graded: false,
        cards: {
          name: "Cheap",
          set_name: "OP01",
          card_number: "001",
          image_url: null,
        },
      },
      {
        id: "b",
        quantity: 1,
        estimated_value_cents: 2000,
        is_for_trade: true,
        is_graded: true,
        cards: {
          name: "Expensive",
          set_name: "OP01",
          card_number: "002",
          image_url: null,
        },
      },
      {
        id: "c",
        quantity: 1,
        estimated_value_cents: null,
        is_for_trade: false,
        is_graded: false,
        cards: {
          name: "No price",
          set_name: null,
          card_number: null,
          image_url: null,
        },
      },
    ]);
    expect(valued.map((h) => h.id)).toEqual(["b", "a"]);
    expect(valued[0].lineCents).toBe(2000);
    expect(valued[1].lineCents).toBe(1000);
    expect(unpriced).toHaveLength(1);
  });

  it("labels 30-day delta", () => {
    expect(portfolioDeltaLabel(1500, 1000).label).toBe("+$5.00 vs 30 days ago");
    expect(portfolioDeltaLabel(1000, null).positive).toBeNull();
  });

  it("builds sparkline points", () => {
    const { points } = sparklinePoints([
      { id: "1", total_value_cents: 100, recorded_at: "2025-01-01" },
      { id: "2", total_value_cents: 200, recorded_at: "2025-01-02" },
    ]);
    expect(points.split(" ")).toHaveLength(2);
  });

  it("builds a value chart model", () => {
    const chart = buildValueChart([
      { id: "1", total_value_cents: 10000, recorded_at: "2025-01-01" },
      { id: "2", total_value_cents: 15000, recorded_at: "2025-01-08" },
      { id: "3", total_value_cents: 12000, recorded_at: "2025-01-15" },
    ]);
    expect(chart).not.toBeNull();
    expect(chart!.points).toHaveLength(3);
    expect(chart!.linePath.startsWith("M")).toBe(true);
    expect(chart!.areaPath.endsWith("Z")).toBe(true);
    expect(chart!.yTicks.length).toBeGreaterThan(0);
    expect(formatAxisCents(150000)).toBe("$1.5k");
  });
});
