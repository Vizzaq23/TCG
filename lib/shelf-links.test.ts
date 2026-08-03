import { describe, expect, it } from "vitest";
import {
  activityPayloadCardId,
  shelfCardHash,
  shelfCardPath,
} from "@/lib/shelf-links";

describe("shelfCardPath", () => {
  it("builds a plain shelf deep link", () => {
    expect(shelfCardPath("Luffy", "abc-123")).toBe("/u/Luffy#card-abc-123");
  });

  it("adds trade and notes query flags", () => {
    expect(shelfCardPath("nami", "id1", { trade: true })).toBe(
      "/u/nami?trade=1#card-id1",
    );
    expect(shelfCardPath("nami", "id1", { notes: true })).toBe(
      "/u/nami?notes=1#card-id1",
    );
  });
});

describe("activityPayloadCardId", () => {
  it("reads card_id from payload objects", () => {
    expect(activityPayloadCardId({ card_id: "x", card_name: "Nami" })).toBe("x");
    expect(activityPayloadCardId(null)).toBeNull();
    expect(activityPayloadCardId("nope")).toBeNull();
  });
});

describe("shelfCardHash", () => {
  it("prefixes card ids", () => {
    expect(shelfCardHash("uuid")).toBe("card-uuid");
  });
});
