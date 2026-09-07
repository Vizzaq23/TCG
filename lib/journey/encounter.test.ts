import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/journey/encounter/route";
import { getJourneyArchive } from "./archive";
import { ENCOUNTER_MAX_BODY_BYTES, parseEncounterInput, selectJourneyEncounter } from "./encounter";
import { getChapter } from "./scene-connections";
import type { JourneyEntry } from "./types";

const template = getJourneyArchive({ card: "OP01-003" }).selected!;
function card(id: string, overrides: Partial<JourneyEntry> = {}): JourneyEntry {
  return { ...template, id, baseId: id, storyChapter: 1, sceneChapter: null, ...overrides };
}

describe("Random Encounter selection", () => {
  it("requires a mapped, indexed chapter and available artwork", () => {
    const selected = card("OP01-001");
    const result = selectJourneyEncounter([
      card("OP01-002", { storyChapter: null }),
      card("OP01-004", { storyChapter: 999999 }),
      card("OP01-005", { imageAvailable: false }),
      card("OP01-006", { image: "" }), selected,
    ], {}, () => 0);
    expect(result.selected).toBe(selected);
    expect(result.chapter).toEqual(getChapter(1));
    expect(result.eligibleBases).toBe(1);
    expect(selectJourneyEncounter([])).toEqual({ selected: null, chapter: null, revisited: false, eligibleBases: 0 });
  });

  it("excludes every printing of the current base and prefers unexplored bases", () => {
    const entries = [card("OP01-001"), card("OP01-001_p1", { baseId: "OP01-001" }), card("OP01-002"), card("OP01-002_p1", { baseId: "OP01-002" }), card("OP01-003")];
    const result = selectJourneyEncounter(entries, { current: "op01-001_p1", seen: ["OP01-002_p1", "unknown-old-id"] }, () => 0);
    expect(result.selected?.id).toBe("OP01-003");
    expect(result).toMatchObject({ revisited: false, eligibleBases: 1 });
    expect(selectJourneyEncounter(entries.slice(0, 2), { current: "OP01-001" }).selected).toBeNull();
  });

  it("revisits explored cards only when needed, still excluding the current base", () => {
    const entries = [card("OP01-001"), card("OP01-002"), card("OP01-003")];
    const result = selectJourneyEncounter(entries, { current: "OP01-001", seen: entries.map((entry) => entry.id) }, () => 0);
    expect(result).toMatchObject({ selected: { id: "OP01-002" }, revisited: true, eligibleBases: 2 });
  });

  it("draws base cards fairly even when one has many printings", () => {
    const first = card("OP01-001");
    const entries = [first, ...Array.from({ length: 20 }, (_, index) => card(`OP01-001_p${index + 1}`, { baseId: first.baseId })), card("OP01-002")];
    expect(selectJourneyEncounter(entries, {}, () => 0.49).selected?.baseId).toBe("OP01-001");
    expect(selectJourneyEncounter(entries, {}, () => 0.5).selected?.baseId).toBe("OP01-002");
    expect(selectJourneyEncounter(entries, {}, () => 1).selected?.baseId).toBe("OP01-002");
    expect(selectJourneyEncounter(entries, {}, () => NaN).selected?.baseId).toBe("OP01-001");
  });

  it("chooses regular English art or a verified scene without mutating input", () => {
    const base = card("OP01-001");
    const alternate = card("OP01-001_p1", { baseId: base.baseId });
    const japanese = card("OP01-001_p2", { baseId: base.baseId, language: "ja" });
    const entries = [alternate, japanese, base];
    const before = JSON.stringify(entries);
    expect(selectJourneyEncounter(entries, {}, () => 0).selected).toBe(base);
    expect(JSON.stringify(entries)).toBe(before);
    const verified = { ...japanese, sceneChapter: 1 };
    expect(selectJourneyEncounter([base, verified], {}, () => 0).selected).toBe(verified);
  });
});

describe("Encounter input and route boundaries", () => {
  it("accepts valid progress and rejects malformed, oversized or unexpected fields", () => {
    expect(parseEncounterInput({})).toEqual({});
    expect(parseEncounterInput({ current: "OP01-001", seen: ["OP01-002", "OP01-002"] })).toEqual({ current: "OP01-001", seen: ["OP01-002"] });
    expect(parseEncounterInput({ seen: Array(1000).fill("OP01-001") })).not.toBeNull();
    for (const input of [null, [], "text", { current: 12 }, { current: "" }, { current: "x".repeat(81) }, { seen: "OP01-001" }, { seen: [null] }, { seen: ["<script>"] }, { seen: Array(1001).fill("OP01-001") }, { extra: true }]) {
      expect(parseEncounterInput(input)).toBeNull();
    }
  });

  it("returns an indexed encounter with no-store and no persistence", async () => {
    const response = await POST(new Request("https://example.com/api/journey/encounter", { method: "POST", body: JSON.stringify({ current: "OP01-003", seen: [] }) }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Set-Cookie")).toBeNull();
    const result = await response.json();
    expect(result.selected.baseId).not.toBe("OP01-003");
    expect(result.selected.imageAvailable).toBe(true);
    expect(result.chapter).toEqual(getChapter(result.selected.storyChapter));
    expect(result.eligibleBases).toBeGreaterThan(100);
  });

  it("rejects malformed and empty JSON with bounded error responses", async () => {
    for (const body of ["", "{broken", "null", JSON.stringify({ seen: Array(1001).fill("OP01-001") })]) {
      const response = await POST(new Request("https://example.com/api/journey/encounter", { method: "POST", body }));
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    }
  });

  it("enforces actual UTF-8 bytes and accepts a body exactly at the byte limit", async () => {
    const url = "https://example.com/api/journey/encounter";
    const oversized = await POST(new Request(url, { method: "POST", body: JSON.stringify({ current: "😀".repeat(16_384) }) }));
    expect(oversized.status).toBe(413);
    expect(oversized.headers.get("Cache-Control")).toContain("no-store");
    const advertised = await POST(new Request(url, { method: "POST", headers: { "Content-Length": String(ENCOUNTER_MAX_BODY_BYTES + 1) }, body: "{}" }));
    expect(advertised.status).toBe(413);
    const boundary = await POST(new Request(url, { method: "POST", body: " ".repeat(ENCOUNTER_MAX_BODY_BYTES - 2) + "{}" }));
    expect(boundary.status).toBe(200);
  });
});
