import type { PublicCollectionRow } from "@/lib/types/database";

export type WantedPosterStats = {
  uniqueCards: number;
  rareHits: number;
  gradedSlabs: number;
  blackLabels: number;
  forTrade: number;
  followers: number;
  bountyBerries: number;
  rankTitle: string;
  rankTier: "rookie" | "grand-line" | "new-world" | "yonko";
};

const RARE_RE =
  /\b(sec|secret\s*rare|sr|super\s*rare|rare|leader|manga|sp|special|trc|treasure)\b/i;

export function isRareHit(rarity: string | null | undefined): boolean {
  if (!rarity?.trim()) return false;
  const r = rarity.trim();
  // Common / uncommon should not count.
  if (/^(c|u|common|uncommon)$/i.test(r)) return false;
  return RARE_RE.test(r);
}

export function formatBerries(amount: number): string {
  return `${amount.toLocaleString("en-US")} berries`;
}

export function wantedRank(
  bounty: number,
  stats: Omit<WantedPosterStats, "bountyBerries" | "rankTitle" | "rankTier">,
): { title: string; tier: WantedPosterStats["rankTier"] } {
  if (
    bounty >= 5_000_000 ||
    stats.blackLabels >= 1 ||
    (stats.uniqueCards >= 120 && stats.rareHits >= 40)
  ) {
    return { title: "Yonko-Class Shelf", tier: "yonko" };
  }
  if (bounty >= 1_500_000 || stats.gradedSlabs >= 3 || stats.uniqueCards >= 60) {
    return { title: "New World Captain", tier: "new-world" };
  }
  if (bounty >= 250_000 || stats.uniqueCards >= 15 || stats.rareHits >= 5) {
    return { title: "Grand Line Collector", tier: "grand-line" };
  }
  return { title: "East Blue Rookie", tier: "rookie" };
}

export function computeWantedPoster(
  rows: PublicCollectionRow[],
  followerCount = 0,
): WantedPosterStats {
  const uniqueCards = rows.length;
  let rareHits = 0;
  let gradedSlabs = 0;
  let blackLabels = 0;
  let forTrade = 0;

  for (const row of rows) {
    if (isRareHit(row.rarity)) rareHits += 1;
    if (row.is_graded) gradedSlabs += 1;
    if (row.is_black_label) blackLabels += 1;
    if (row.is_for_trade) forTrade += 1;
  }

  const followers = Math.max(0, Math.floor(followerCount));
  const bountyBerries =
    uniqueCards * 10_000 +
    rareHits * 25_000 +
    gradedSlabs * 100_000 +
    blackLabels * 1_000_000 +
    forTrade * 5_000 +
    followers * 5_000;

  const base = {
    uniqueCards,
    rareHits,
    gradedSlabs,
    blackLabels,
    forTrade,
    followers,
  };
  const { title, tier } = wantedRank(bountyBerries, base);

  return {
    ...base,
    bountyBerries,
    rankTitle: title,
    rankTier: tier,
  };
}
