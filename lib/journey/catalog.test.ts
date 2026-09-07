import { describe, expect, it } from "vitest";
import { filterJourneyCards, journeyCards, parseExplored, type JourneyFilters } from "./catalog";

const defaults: JourneyFilters = { query: "", stage: "All seas", type: "All cards", order: "card" };

describe("OP-01 Journey archive", () => {
  it("covers every base card exactly once, including all events and leaders", () => {
    expect(journeyCards.map(c => c.id)).toEqual(Array.from({ length: 121 }, (_, i) => `OP01-${String(i + 1).padStart(3, "0")}`));
    expect(journeyCards.filter(c => c.type === "Event")).toHaveLength(20);
    expect(journeyCards.filter(c => c.type === "Leader")).toHaveLength(8);
    for (const card of journeyCards) {
      expect(card.title.length).toBeGreaterThan(5);
      expect(card.text.length).toBeGreaterThan(50);
      expect(card.detail.length).toBeGreaterThan(10);
      expect(new URL(card.source).protocol).toBe("https:");
      expect(card.chapter === null || card.chapter > 0).toBe(true);
      expect(card.episode === null || card.episode > 0).toBe(true);
    }
  });

  it("keeps card identity separate from character aliases and different adaptations", () => {
    expect(journeyCards.find(c => c.id === "OP01-001")).toMatchObject({ name: "Roronoa Zoro", chapter: 3, episode: 1 });
    expect(journeyCards.find(c => c.id === "OP01-003")).toMatchObject({ name: "Monkey.D.Luffy", chapter: 1, episode: 1 });
    expect(journeyCards.find(c => c.id === "OP01-016")).toMatchObject({ name: "Nami", chapter: 8, episode: 1 });
    expect(journeyCards.find(c => c.id === "OP01-079")).toMatchObject({ name: "Ms. All Sunday", chapter: 114, episode: 67 });
    expect(journeyCards.find(c => c.id === "OP01-009")).toMatchObject({ name: "Carrot", chapter: 804 });
  });

  it("never assigns a guessed chapter to a film or undated event", () => {
    expect(journeyCards.find(c => c.id === "OP01-011")).toMatchObject({ arc: "Film: Red", chapter: null, episode: null });
    expect(journeyCards.find(c => c.id === "OP01-055")).toMatchObject({ entryKind: "Scene guide", chapter: null, episode: null });
    expect(journeyCards.find(c => c.id === "OP01-026")).toMatchObject({ entryKind: "Scene guide", chapter: 644, episode: 565 });
    expect(journeyCards.find(c => c.id === "OP01-117")).toMatchObject({ arc: "Zou" });
  });
});

describe("Journey discovery", () => {
  it("finds cards by number, name, crew, and arc without case or whitespace sensitivity", () => {
    expect(filterJourneyCards({ ...defaults, query: " op01-120 " }).map(c => c.name)).toEqual(["Shanks"]);
    expect(filterJourneyCards({ ...defaults, query: " lUfFy " })).toHaveLength(2);
    const crew = filterJourneyCards({ ...defaults, query: "Heart Pirates" });
    expect(crew.length).toBeGreaterThan(3);
    expect(crew.every(c => c.crew.includes("Heart Pirates"))).toBe(true);
    expect(filterJourneyCards({ ...defaults, query: "No such pirate exists" })).toEqual([]);
  });

  it("combines region, card type, and progress without losing the master archive", () => {
    const events = filterJourneyCards({ ...defaults, stage: "Wano", type: "Event" });
    expect(events.length).toBeGreaterThan(0);
    expect(events.every(c => c.type === "Event" && c.arc === "Wano Country")).toBe(true);
    expect(filterJourneyCards({ ...defaults, unexploredOnly: true, explored: journeyCards.map(c => c.id) })).toEqual([]);
    expect(filterJourneyCards(defaults)).toHaveLength(121);
  });

  it("sorts numbered appearances before undated scene guides without inventing chronology", () => {
    const sorted = filterJourneyCards({ ...defaults, order: "story" });
    expect(sorted[0].chapter).toBe(1);
    let undated = false;
    let previous = 0;
    for (const card of sorted) {
      if (card.chapter === null) undated = true;
      else {
        expect(undated).toBe(false);
        expect(card.chapter).toBeGreaterThanOrEqual(previous);
        previous = card.chapter;
      }
    }
  });
});

describe("device progress", () => {
  it("rejects corrupt, obsolete, and unexpected stored values", () => {
    for (const input of ["not JSON", "null", "42", '{"id":"OP01-001"}']) expect(parseExplored(input)).toEqual([]);
    expect(parseExplored('["OP01-001","OP01-001","OP02-001","OP01-999",42,null,"OP01-120"]')).toEqual(["OP01-001","OP01-120"]);
  });
});
