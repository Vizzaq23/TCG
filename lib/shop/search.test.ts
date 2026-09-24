import { expect, it } from "vitest";
import { matchesShopSearch } from "@/lib/shop/search";
it("matches listing metadata case-insensitively", () => expect([matchesShopSearch("Monkey D. Luffy SEC", "luffy", "Romance Dawn", "SEC"), matchesShopSearch("Monkey D. Luffy SEC", "romance dawn", "Romance Dawn", "SEC"), matchesShopSearch("Roronoa Zoro SR", "leader", "Romance Dawn", "Leader"), matchesShopSearch("Roronoa Zoro SR", "nami", "Romance Dawn", "Leader")]).toEqual([true, true, true, false]));
