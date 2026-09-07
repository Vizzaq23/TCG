import { getChapter, type MangaChapter } from "./scene-connections";
import type { JourneyEntry } from "./types";

export const ENCOUNTER_MAX_BODY_BYTES = 64 * 1024;
export const ENCOUNTER_MAX_SEEN = 1000;
const MAX_ID_LENGTH = 80;

export type EncounterInput = { current?: string; seen?: readonly string[] };
export type EncounterResult = {
  selected: JourneyEntry | null;
  chapter: MangaChapter | null;
  /** True when all eligible bases have already been explored. */
  revisited: boolean;
  /** Number of equally likely base cards in this encounter's draw. */
  eligibleBases: number;
};

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH && /^[A-Za-z0-9][A-Za-z0-9_:.-]*$/.test(value);
}

/** Validate the small public request independently of the selection algorithm. */
export function parseEncounterInput(value: unknown): EncounterInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "current" && key !== "seen")) return null;
  if (input.current !== undefined && !validIdentifier(input.current)) return null;
  if (input.seen !== undefined && (!Array.isArray(input.seen) || input.seen.length > ENCOUNTER_MAX_SEEN || !input.seen.every(validIdentifier))) return null;
  return {
    ...(typeof input.current === "string" ? { current: input.current } : {}),
    ...(Array.isArray(input.seen) ? { seen: [...new Set(input.seen as string[])] } : {}),
  };
}

function representativeRank(card: JourneyEntry): number {
  if (card.sceneChapter !== null && card.sceneChapter !== undefined && card.sceneChapter === card.storyChapter) return 0;
  if (card.language === "en" && card.id === card.baseId) return 1;
  if (card.language === "en") return 2;
  if (card.id === card.baseId) return 3;
  return 4;
}

/**
 * Draw a base card first, then choose its clearest representative. Ten promo
 * printings must never give a base card ten times the encounter probability.
 * This is pure: it reads supplied progress and never persists or mutates it.
 */
export function selectJourneyEncounter(
  entries: readonly JourneyEntry[],
  input: EncounterInput = {},
  random: () => number = Math.random,
): EncounterResult {
  const identities = new Map<string, string>();
  for (const entry of entries) {
    identities.set(entry.id.toLowerCase(), entry.baseId.toLowerCase());
    identities.set(entry.baseId.toLowerCase(), entry.baseId.toLowerCase());
  }
  const currentBase = input.current ? identities.get(input.current.toLowerCase()) : undefined;
  const seenBases = new Set((input.seen ?? []).slice(0, ENCOUNTER_MAX_SEEN)
    .map((id) => identities.get(id.toLowerCase())).filter((id): id is string => id !== undefined));
  const bases = new Map<string, JourneyEntry[]>();

  for (const entry of entries) {
    const base = entry.baseId.toLowerCase();
    if (base === currentBase || !entry.imageAvailable || !entry.image.trim() || !getChapter(entry.storyChapter)?.url) continue;
    const printings = bases.get(base) ?? [];
    printings.push(entry);
    bases.set(base, printings);
  }
  if (bases.size === 0) return { selected: null, chapter: null, revisited: false, eligibleBases: 0 };

  const all = [...bases.entries()];
  const unseen = all.filter(([base]) => !seenBases.has(base));
  const candidates = unseen.length ? unseen : all;
  const sample = random();
  const index = Number.isFinite(sample) ? Math.min(candidates.length - 1, Math.max(0, Math.floor(sample * candidates.length))) : 0;
  const printings = candidates[index][1];
  const selected = printings.reduce((best, card) => {
    const rank = representativeRank(card) - representativeRank(best);
    return rank < 0 || rank === 0 && card.id.localeCompare(best.id, "en", { numeric: true }) < 0 ? card : best;
  });
  return {
    selected,
    chapter: getChapter(selected.storyChapter) ?? null,
    revisited: unseen.length === 0,
    eligibleBases: candidates.length,
  };
}
