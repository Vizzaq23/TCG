import { expect, it } from "vitest";
import { matchesShopSearch, shopCategoryHref, shopResultLabel } from "@/lib/shop/search";
it("matches listing metadata case-insensitively", () => expect([matchesShopSearch("Monkey D. Luffy SEC", "luffy", "Romance Dawn", "SEC"), matchesShopSearch("Monkey D. Luffy SEC", "romance dawn", "Romance Dawn", "SEC"), matchesShopSearch("Roronoa Zoro SR", "leader", "Romance Dawn", "Leader"), matchesShopSearch("Roronoa Zoro SR", "nami", "Romance Dawn", "Leader")]).toEqual([true, true, true, false]));
it("preserves active shop filters in category links", () => expect(shopCategoryHref("playset", "price_asc", "luffy & ace", "Near Mint")).toBe("/shop?kind=playset&sort=price_asc&q=luffy+%26+ace&condition=Near+Mint"));
it("describes active listing filters", () => expect([shopResultLabel(1, undefined, undefined), shopResultLabel(3, "luffy", "Near Mint")]).toEqual(["1 listing available", "3 listings available matching “luffy” in Near Mint condition"]));
