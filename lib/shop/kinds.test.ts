import { expect, it } from "vitest";
import { emptyShopMessage, listingSummary } from "@/lib/shop/kinds";
it("summarizes cart listing details", () => expect([listingSummary("playset", "Near Mint"), listingSummary("single", null)]).toEqual(["Playset · Near Mint", "Single"]));
it("distinguishes filtered and unfiltered empty shops", () => expect([emptyShopMessage("playset", false), emptyShopMessage(undefined, false)]).toEqual(["No playset listings match this category.", "No listings yet. Check back soon."]));
