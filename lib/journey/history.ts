import type { JourneyEntry } from "./types";

/** A bounded session trail; returning to an earlier card starts a new path. */
export function appendDiscovery(trail: readonly JourneyEntry[], card: JourneyEntry): JourneyEntry[] {
  if (trail.at(-1)?.id === card.id) return [...trail];
  return [...trail, card].slice(-20);
}
