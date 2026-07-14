export const PRICE_FRESHNESS_HOURS = 24;

export function isPriceFresh(
  fetchedAt: string | Date | null | undefined,
  now = Date.now(),
  freshnessHours = PRICE_FRESHNESS_HOURS,
): boolean {
  if (!fetchedAt) return false;
  const t = typeof fetchedAt === "string" ? new Date(fetchedAt).getTime() : fetchedAt.getTime();
  if (!Number.isFinite(t)) return false;
  return now - t < freshnessHours * 60 * 60 * 1000;
}

export function hoursSince(fetchedAt: string | Date | null | undefined, now = Date.now()): number | null {
  if (!fetchedAt) return null;
  const t = typeof fetchedAt === "string" ? new Date(fetchedAt).getTime() : fetchedAt.getTime();
  if (!Number.isFinite(t)) return null;
  return (now - t) / (60 * 60 * 1000);
}
