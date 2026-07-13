import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-next";

describe("safeNextPath (auth redirect privacy)", () => {
  it("allows same-origin relative paths", () => {
    expect(safeNextPath("/collection")).toBe("/collection");
    expect(safeNextPath("/u/luffy?trade=1")).toBe("/u/luffy?trade=1");
    expect(safeNextPath("/collection/trades")).toBe("/collection/trades");
  });

  it("blocks open redirects", () => {
    expect(safeNextPath("https://evil.example")).toBe("/collection");
    expect(safeNextPath("//evil.example")).toBe("/collection");
    expect(safeNextPath("/\\evil")).toBe("/collection");
    expect(safeNextPath("collection")).toBe("/collection");
  });

  it("uses fallback when empty", () => {
    expect(safeNextPath(null, "/browse")).toBe("/browse");
    expect(safeNextPath(undefined)).toBe("/collection");
  });
});
