import { describe, expect, it } from "vitest";
import type { PublicCollectionRow } from "@/lib/types/database";
import {
  computeWantedPoster,
  formatBerries,
  isRareHit,
} from "@/lib/wanted-poster";

function row(
  overrides: Partial<PublicCollectionRow> & { collection_id: string },
): PublicCollectionRow {
  return {
    user_id: "u",
    card_id: overrides.collection_id,
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
    card_name: "Card",
    set_name: "Set",
    rarity: "Common",
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
    ...overrides,
  };
}

describe("isRareHit", () => {
  it("detects rare-ish labels", () => {
    expect(isRareHit("Secret Rare")).toBe(true);
    expect(isRareHit("SR")).toBe(true);
    expect(isRareHit("Leader")).toBe(true);
    expect(isRareHit("Common")).toBe(false);
    expect(isRareHit(null)).toBe(false);
  });
});

describe("computeWantedPoster", () => {
  it("gives rookies a starter bounty", () => {
    const stats = computeWantedPoster([], 0);
    expect(stats.rankTitle).toBe("East Blue Rookie");
    expect(stats.bountyBerries).toBe(0);
    expect(formatBerries(stats.bountyBerries)).toBe("0 berries");
  });

  it("boosts rare-heavy shelves", () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      row({ collection_id: `r${i}`, rarity: i < 8 ? "Super Rare" : "Common" }),
    );
    const stats = computeWantedPoster(rows, 2);
    expect(stats.rareHits).toBe(8);
    expect(stats.rankTier).not.toBe("rookie");
    expect(stats.bountyBerries).toBeGreaterThan(250_000);
  });

  it("boosts black labels into yonko class", () => {
    const stats = computeWantedPoster(
      [
        row({
          collection_id: "bl",
          rarity: "SEC",
          is_graded: true,
          is_black_label: true,
          grading_company: "BGS",
          grade: 10,
        }),
      ],
      0,
    );
    expect(stats.blackLabels).toBe(1);
    expect(stats.rankTitle).toBe("Yonko-Class Shelf");
  });
});
