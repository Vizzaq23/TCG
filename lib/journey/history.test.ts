import { describe, expect, it } from "vitest";
import { appendDiscovery } from "./history";
import type { JourneyEntry } from "./types";

const card = (id: number) => ({id: String(id)}) as JourneyEntry;
describe("session discovery trail", () => {
  it("bounds retained cards and does not add consecutive duplicates", () => {
    const trail = Array.from({length:20},(_,index)=>card(index));
    expect(appendDiscovery(trail,card(19))).toEqual(trail);
    const next = appendDiscovery(trail,card(20));
    expect(next).toHaveLength(20);
    expect(next[0].id).toBe("1");
    expect(trail[0].id).toBe("0");
  });
  it("continues from the retained path after a previous discovery", () => {
    const trail = [card(1),card(2),card(3)].slice(0,-1);
    expect(appendDiscovery(trail,card(4)).map(item=>item.id)).toEqual(["1","2","4"]);
  });
});
