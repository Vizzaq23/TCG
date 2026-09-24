import { expect, it } from "vitest";
import { matchesShopSearch } from "@/lib/shop/search";
// @ts-expect-error extra listing details are not supported yet
it("matches listing metadata case-insensitively", () => expect([matchesShopSearch("Monkey D. Luffy SEC", "romance dawn", "Romance Dawn", "SEC"), matchesShopSearch("Roronoa Zoro SR", "leader", "Romance Dawn", "Leader")]).toEqual([true, true]));
