import cards from "@/lib/catalog/op01.json";
import debutData from "./debuts.json";
import { characterStories, eventStories, type Story } from "./stories";

type Debut = { chapter: number | null; episode: number | null; debut: string; note: string | null; source: string };
export type JourneyCard = (typeof cards)[number] & Story & {
  arc: string; chapter: number | null; episode: number | null; note: string | null;
  source: string; entryKind: "Character debut" | "Scene guide";
};
export const officialCardSource = "https://en.onepiece-cardgame.com/cardlist/?series=569101";
export const stages = ["All seas", "East Blue", "Grand Line", "New World", "Wano", "Film"] as const;
export type Stage = (typeof stages)[number];

export function arcForChapter(chapter: number | null): string {
  if (chapter === null) return "Film: Red";
  if (chapter <= 100) return "East Blue";
  if (chapter <= 217) return "Alabasta";
  if (chapter <= 302) return "Jaya & Skypiea";
  if (chapter <= 441) return "Water 7";
  if (chapter <= 489) return "Thriller Bark";
  if (chapter <= 513) return "Sabaody Archipelago";
  if (chapter <= 524) return "Amazon Lily";
  if (chapter <= 549) return "Impel Down";
  if (chapter <= 580) return "Marineford";
  if (chapter <= 597) return "Post-war";
  if (chapter <= 602) return "Return to Sabaody";
  if (chapter <= 653) return "Fish-Man Island";
  if (chapter <= 699) return "Punk Hazard";
  if (chapter <= 801) return "Dressrosa";
  if (chapter <= 824) return "Zou";
  if (chapter <= 902) return "Whole Cake Island";
  if (chapter <= 908) return "Levely";
  return "Wano Country";
}

export function stageForArc(arc: string): Stage {
  if (arc === "Film: Red") return "Film";
  if (arc === "Wano Country") return "Wano";
  if (arc === "East Blue") return "East Blue";
  if (["Return to Sabaody", "Fish-Man Island", "Punk Hazard", "Dressrosa", "Zou", "Whole Cake Island", "Levely"].includes(arc)) return "New World";
  return "Grand Line";
}

const localArt = new Set(["OP01-003","OP01-016","OP01-025","OP01-120"]);
export const journeyCards: JourneyCard[] = cards.map(card => {
  const event = eventStories[card.id];
  const debut = (debutData as Record<string, Debut>)[card.id];
  const story = card.type === "Event" ? event : characterStories[card.id];
  if (!story || (card.type !== "Event" && !debut)) throw new Error("Missing Journey entry: " + card.id);
  return {
    ...card, ...story,
    image: localArt.has(card.id) ? `/cards/${card.id}.png` : card.image,
    arc: event?.arc ?? (card.id === "OP01-005" ? "Film: Red" : arcForChapter(debut.chapter)),
    chapter: event ? event.chapter ?? null : debut.chapter,
    episode: event ? event.episode ?? null : debut.episode,
    note: event ? null : debut.note,
    source: event?.source ?? debut.source,
    entryKind: card.type === "Event" ? "Scene guide" : "Character debut",
  };
});

export type JourneyFilters = { query: string; stage: Stage; type: string; order: "card" | "story"; unexploredOnly?: boolean; explored?: string[] };
export function filterJourneyCards(filters: JourneyFilters): JourneyCard[] {
  const q = filters.query.trim().toLocaleLowerCase();
  return journeyCards.filter(card =>
    (!q || [card.id, card.name, card.arc, ...card.crew].join(" ").toLocaleLowerCase().includes(q)) &&
    (filters.stage === "All seas" || stageForArc(card.arc) === filters.stage) &&
    (filters.type === "All cards" || card.type === filters.type) &&
    (!filters.unexploredOnly || !filters.explored?.includes(card.id))
  ).sort((a,b) => filters.order === "story"
    ? (a.chapter ?? Infinity) - (b.chapter ?? Infinity) || a.id.localeCompare(b.id)
    : a.id.localeCompare(b.id));
}

export function parseExplored(raw: string): string[] {
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const valid = new Set(journeyCards.map(c=>c.id));
    return [...new Set(data.filter((id): id is string => typeof id === "string" && valid.has(id)))];
  } catch { return []; }
}
