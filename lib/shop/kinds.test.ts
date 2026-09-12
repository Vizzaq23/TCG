import { expect, it } from "vitest";
import { emptyShopMessage } from "@/lib/shop/kinds";
it("distinguishes filtered and unfiltered empty shops", () => expect([emptyShopMessage("playset", false), emptyShopMessage(undefined, false)]).toEqual(["No playset listings match this category.", "No listings yet. Check back soon."]));
