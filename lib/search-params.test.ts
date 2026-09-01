import { describe, expect, it } from "vitest";
import { firstSearchParam } from "@/lib/search-params";

describe("firstSearchParam", () => {
  it("returns scalar values unchanged", () => {
    expect(firstSearchParam("luffy")).toBe("luffy");
    expect(firstSearchParam(undefined)).toBeUndefined();
  });

  it("uses the first value when a query key is repeated", () => {
    expect(firstSearchParam(["luffy", "zoro"])).toBe("luffy");
    expect(firstSearchParam([])).toBeUndefined();
  });
});
