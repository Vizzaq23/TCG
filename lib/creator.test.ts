import { describe, expect, it } from "vitest";
import {
  buildCreatorViewSeries,
  creatorViewTrend,
  isCreatorEffect,
  normalizeCreatorMessage,
  normalizeCreatorTitle,
} from "@/lib/creator";

describe("creator profile helpers", () => {
  it("recognizes only reserved creative effects", () => {
    expect(isCreatorEffect("aurora")).toBe(true);
    expect(isCreatorEffect("deep_sea")).toBe(true);
    expect(isCreatorEffect("admin")).toBe(false);
  });

  it("normalizes dispatch copy", () => {
    expect(normalizeCreatorTitle("  Captain's   log  ")).toBe("Captain's log");
    expect(normalizeCreatorMessage("  Hunt\n\nfor   the One Piece  ")).toBe(
      "Hunt for the One Piece",
    );
  });

  it("builds a zero-filled UTC view series", () => {
    const now = new Date("2026-08-31T18:00:00.000Z");
    const points = buildCreatorViewSeries(
      [
        "2026-08-29T02:00:00.000Z",
        "2026-08-29T21:00:00.000Z",
        "2026-08-31T01:00:00.000Z",
        "not-a-date",
      ],
      4,
      now,
    );

    expect(points.map((point) => [point.dateKey, point.count])).toEqual([
      ["2026-08-28", 0],
      ["2026-08-29", 2],
      ["2026-08-30", 0],
      ["2026-08-31", 1],
    ]);
  });

  it("compares the latest seven days with the prior seven", () => {
    const points = Array.from({ length: 14 }, (_, index) => ({
      dateKey: String(index),
      label: String(index),
      count: index < 7 ? 1 : 2,
    }));

    expect(creatorViewTrend(points)).toEqual({
      recent: 14,
      previous: 7,
      label: "+100% vs previous 7 days",
    });
  });
});
