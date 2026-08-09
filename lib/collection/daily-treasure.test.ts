import { describe, expect, it } from "vitest";
import type { PublicCollectionRow } from "@/lib/types/database";
import {
  dailyTreasureIndex,
  selectDailyTreasure,
  utcDateKey,
} from "@/lib/collection/daily-treasure";

function fakeRow(id: string, cardId = id): PublicCollectionRow {
  return {
    collection_id: id,
    user_id: "u",
    card_id: cardId,
    quantity: 1,
    condition: null,
    notes: null,
    is_for_trade: false,
    is_graded: false,
    grading_company: null,
    grade: null,
    cert_number: null,
    slab_image_url: null,
    is_black_label: false,
    card_number: "1",
    card_name: `Card ${id}`,
    set_name: "Test",
    rarity: null,
    color: null,
    type: null,
    cost: null,
    power: null,
    counter: null,
    attribute: null,
    image_url: null,
    display_name: null,
    username: "luffy",
    profile_id: "p",
  };
}

describe("utcDateKey", () => {
  it("formats UTC YYYY-MM-DD", () => {
    expect(utcDateKey(new Date("2026-08-09T23:30:00.000Z"))).toBe("2026-08-09");
  });
});

describe("dailyTreasureIndex", () => {
  it("is stable for the same seed", () => {
    const a = dailyTreasureIndex("luffy", "2026-08-09", 10);
    const b = dailyTreasureIndex("luffy", "2026-08-09", 10);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(10);
  });

  it("returns -1 for empty lists", () => {
    expect(dailyTreasureIndex("luffy", "2026-08-09", 0)).toBe(-1);
  });
});

describe("selectDailyTreasure", () => {
  it("returns null when shelf is empty", () => {
    expect(selectDailyTreasure("luffy", [])).toBeNull();
  });

  it("picks the same card for the same day regardless of input order", () => {
    const rows = [fakeRow("c"), fakeRow("a"), fakeRow("b")];
    const day = new Date("2026-08-09T12:00:00.000Z");
    const first = selectDailyTreasure("luffy", rows, day);
    const second = selectDailyTreasure("luffy", [...rows].reverse(), day);
    expect(first?.collection_id).toBe(second?.collection_id);
  });
});
