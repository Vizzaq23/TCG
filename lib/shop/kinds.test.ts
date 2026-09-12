import { expect, it } from "vitest";
import { emptyShopMessage } from "@/lib/shop/kinds";

it("distinguishes filtered and unfiltered empty shops", () => {
  expect(emptyShopMessage("playset", false)).toBe("No playset listings match this category.");
  expect(emptyShopMessage(undefined, false)).toBe("No listings yet. Check back soon.");
});
