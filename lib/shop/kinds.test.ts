import { expect, it } from "vitest";
import { emptyShopMessage, listingHref, listingItemCountLabel, listingItemSummary, listingReturnHref, listingSummary } from "@/lib/shop/kinds";
it("summarizes cart listing details", () => expect([listingSummary("playset", "Near Mint"), listingSummary("single", null)]).toEqual(["Playset · Near Mint", "Single"]));
it("builds safe listing links", () => expect([listingHref("listing / 1"), listingHref("listing / 1", "/shop?kind=playset")]).toEqual(["/shop/listing%20%2F%201", "/shop/listing%20%2F%201?returnTo=%2Fshop%3Fkind%3Dplayset"]));
it("accepts only shop return links", () => expect([listingReturnHref("/shop?q=luffy"), listingReturnHref("https://example.com"), listingReturnHref("/cart")]).toEqual(["/shop?q=luffy", "/shop", "/shop"]));
it("summarizes included card details", () => expect([listingItemSummary("Kingdoms of Intrigue", "OP04-024", "Near Mint"), listingItemSummary(null, null, null)]).toEqual(["Kingdoms of Intrigue · OP04-024 · Near Mint", "Details unavailable"]));
it("counts included cards", () => expect([listingItemCountLabel([]), listingItemCountLabel([1]), listingItemCountLabel([2, 4])]).toEqual(["0 cards total", "1 card total", "6 cards total"]));
it("distinguishes filtered and unfiltered empty shops", () => expect([emptyShopMessage("playset", false), emptyShopMessage(undefined, false)]).toEqual(["No playset listings match this category.", "No listings yet. Check back soon."]));
