import { expect, it } from "vitest";
import { emptyShopMessage, listingHref, listingItemSummary, listingSummary } from "@/lib/shop/kinds";
it("summarizes cart listing details", () => expect([listingSummary("playset", "Near Mint"), listingSummary("single", null)]).toEqual(["Playset · Near Mint", "Single"]));
it("builds safe listing links", () => expect(listingHref("listing / 1")).toBe("/shop/listing%20%2F%201"));
it("summarizes included card details", () => expect([listingItemSummary("Kingdoms of Intrigue", "OP04-024", "Near Mint"), listingItemSummary(null, null, null)]).toEqual(["Kingdoms of Intrigue · OP04-024 · Near Mint", "Details unavailable"]));
it("distinguishes filtered and unfiltered empty shops", () => expect([emptyShopMessage("playset", false), emptyShopMessage(undefined, false)]).toEqual(["No playset listings match this category.", "No listings yet. Check back soon."]));
