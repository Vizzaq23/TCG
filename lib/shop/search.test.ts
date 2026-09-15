import { expect, it } from "vitest";
import { matchesShopSearch } from "@/lib/shop/search";
it("matches listing titles case-insensitively", () => expect([matchesShopSearch("Monkey D. Luffy SEC", "luffy"), matchesShopSearch("Roronoa Zoro SR", "luffy")]).toEqual([true, false]));
