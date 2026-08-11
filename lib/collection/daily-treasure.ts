import type { PublicCollectionRow } from "@/lib/types/database";

/** UTC calendar day as YYYY-MM-DD. */
export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Deterministic index from username + UTC date.
 * Same profile + same day → same treasure (SSR-safe).
 */
export function dailyTreasureIndex(
  username: string,
  dayKey: string,
  length: number,
): number {
  if (length <= 0) return -1;
  const seed = `${username.toLowerCase().trim()}|${dayKey}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % length;
}

/** Pick today's treasure from a public collection list. */
export function selectDailyTreasure(
  username: string,
  rows: PublicCollectionRow[],
  date: Date = new Date(),
): PublicCollectionRow | null {
  if (!rows.length) return null;
  // Stable order so index isn't affected by RPC row order quirks.
  const ordered = [...rows].sort((a, b) =>
    a.collection_id.localeCompare(b.collection_id),
  );
  const idx = dailyTreasureIndex(username, utcDateKey(date), ordered.length);
  return ordered[idx] ?? null;
}
