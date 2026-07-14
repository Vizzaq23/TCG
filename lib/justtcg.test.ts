import { describe, expect, it } from "vitest";
import {
  dollarsToCents,
  parseOptcgNumber,
  pickMarketVariant,
  scoreCardMatch,
} from "@/lib/justtcg";
import type { JustTcgVariant } from "@/lib/justtcg/types";

function variant(
  partial: Pick<JustTcgVariant, "condition" | "printing" | "price"> & { id?: string },
): JustTcgVariant {
  return {
    id: partial.id ?? "v",
    condition: partial.condition,
    printing: partial.printing,
    price: partial.price,
  };
}

describe("justtcg helpers", () => {
  it("prefers Near Mint variant", () => {
    const picked = pickMarketVariant([
      variant({ condition: "Lightly Played", printing: "Normal", price: 1 }),
      variant({ condition: "Near Mint", printing: "Normal", price: 2.5 }),
      variant({ condition: "Damaged", printing: "Foil", price: 0.5 }),
    ]);
    expect(picked).toMatchObject({
      condition: "Near Mint",
      printing: "Normal",
      price: 2.5,
    });
    expect(dollarsToCents(2.5)).toBe(250);
  });

  it("returns null when no priced variants", () => {
    expect(pickMarketVariant([])).toBeNull();
  });

  it("parses OPTCG numbers", () => {
    expect(parseOptcgNumber("OP01-001")).toEqual({
      raw: "OP01-001",
      base: "OP01-001",
      setCode: "OP01",
      collector: "001",
    });
    expect(parseOptcgNumber("OP01-001_p1")?.base).toBe("OP01-001");
  });

  it("scores number matches loosely", () => {
    expect(
      scoreCardMatch(
        { name: "Monkey D. Luffy", number: "OP01-001" },
        { cardNumber: "OP01-001", name: "Monkey D. Luffy" },
      ),
    ).toBeGreaterThan(100);
    expect(
      scoreCardMatch(
        { name: "Monkey D. Luffy", number: "001" },
        { cardNumber: "OP01-001", name: "Monkey D. Luffy" },
      ),
    ).toBeGreaterThan(50);
  });
});
