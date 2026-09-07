import { describe, expect, it } from "vitest";
import { getChapter, getSceneConnection, mangaChapters, sceneConnections } from "./scene-connections";

describe("manga chapter index", () => {
  it("keeps an unbroken source index with only known outbound chapter URLs", () => {
    expect(mangaChapters.length).toBeGreaterThan(1100);
    expect(mangaChapters.map(chapter => chapter.number)).toEqual(Array.from({ length: mangaChapters.length }, (_, i) => i + 1));
    expect(new Set(mangaChapters.map(chapter => chapter.url)).size).toBe(mangaChapters.length);
    for (const chapter of mangaChapters) {
      const url = new URL(chapter.url);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("tcbonepiecechapters.com");
      expect(url.pathname).toMatch(new RegExp(`/chapters/\\d+/one-piece-chapter-${chapter.number}(?:-|$)`));
    }
  });

  it("preserves absent source titles and rejects unknown chapter numbers", () => {
    expect(getChapter(1)).toMatchObject({ number: 1, title: null });
    expect(getChapter(1044)).toMatchObject({ title: "Warrior of Liberation" });
    for (const unknown of [null, undefined, NaN, -1, 0, 1.5, 100000]) expect(getChapter(unknown)).toBeUndefined();
  });
});

describe("card-to-story evidence", () => {
  it("separates verified event scenes from a character's debut or a form's context", () => {
    expect(getSceneConnection("EB01-050")).toMatchObject({ chapter: 398, exactness: "confirmed" });
    expect(getSceneConnection("OP06-096")).toMatchObject({ chapter: 485, exactness: "confirmed" });
    expect(getSceneConnection("OP01-016")).toMatchObject({ chapter: 81, exactness: "context" });
    expect(getSceneConnection("OP05-119")).toMatchObject({ chapter: 1044, exactness: "context" });
    expect(getSceneConnection("OP10-019")?.chapter).toBe(1079);
    expect(getSceneConnection("OP13-076")?.chapter).toBe(966);
    expect(getSceneConnection("UNKNOWN")).toBeUndefined();
  });

  it("never transfers an exact scene claim to unverified alternate art", () => {
    expect(getSceneConnection("OP01-026", "OP01-026_p1")).toMatchObject({ chapter: 644, exactness: "context" });
    expect(getSceneConnection("OP01-026", "OP01-026_p1")?.note).toContain("unverified illustration");
    expect(getSceneConnection("OP01-026")?.exactness).toBe("confirmed");
  });

  it("attaches both card-art and chapter evidence to every editorial connection", () => {
    for (const [baseId, connection] of Object.entries(sceneConnections)) {
      expect(connection.source).toBe(getChapter(connection.chapter)?.url);
      expect(connection.evidence).toContain(`https://en.onepiece-cardgame.com/images/cardlist/card/${baseId}.png`);
      expect(connection.evidence).toContain(`https://onepiece.fandom.com/wiki/Chapter_${connection.chapter}`);
      expect(connection.verifiedPrintings).toEqual(connection.exactness === "confirmed" ? [baseId] : []);
    }
  });
});
