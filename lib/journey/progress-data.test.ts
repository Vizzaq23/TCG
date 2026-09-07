import { describe, expect, it } from "vitest";
import { parseJourneyProgress } from "./progress-data";

describe("device-local journey progress", () => {
  it("preserves old OP01 progress along with promos, alternate prints and DON cards", () => {
    expect(parseJourneyProgress('["OP01-003","OP17-001_p1","P-001","don_1","OP01-003"]'))
      .toEqual(["OP01-003", "OP17-001_p1", "P-001", "don_1"]);
  });
  it("recovers from corrupt storage and discards invalid values", () => {
    expect(parseJourneyProgress("not json")).toEqual([]);
    expect(parseJourneyProgress('{"OP01-003":true}')).toEqual([]);
    expect(parseJourneyProgress('[null,4,"","<script>","OP01-003"]')).toEqual(["OP01-003"]);
  });
});
