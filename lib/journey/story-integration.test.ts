import { describe, expect, it } from "vitest";
import { getJourneyArchive } from "./archive";

describe("story connections in the archive", () => {
  it("gives verified event cards a scene chapter without inventing a character debut", () => {
    const robin = getJourneyArchive({ card: "EB01-050" }).selected!;
    expect(robin).toMatchObject({ storyChapter: 398, sceneChapter: 398, entryKind: "Scene guide", arc: "Water 7" });
    expect(robin.text).toContain("Robin");
    expect(robin.note).not.toContain("uncharted");
  });
  it("keeps character debut separate from a later story milestone", () => {
    const luffy = getJourneyArchive({ card: "OP05-119" }).selected!;
    expect(luffy.chapter).toBe(1);
    expect(luffy.storyChapter).toBe(1044);
    expect(luffy.sceneChapter).toBeNull();
    expect(luffy.arc).toBe("Wano Country");
  });
  it("finds and orders cards by their displayed story chapter", () => {
    const results = getJourneyArchive({ q: "chapter 398", order: "story" });
    expect(results.cards.some(card => card.baseId === "EB01-050")).toBe(true);
    const byStory = getJourneyArchive({ type: "Event", order: "story" });
    const chapters = byStory.cards.map(card => card.storyChapter ?? Infinity);
    expect(chapters).toEqual([...chapters].sort((a,b) => a-b));
  });
});
