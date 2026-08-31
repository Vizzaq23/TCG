import { describe, expect, it } from "vitest";
import {
  dollarsToCents,
  parseOptcgNumber,
  pickMarketVariant,
  scoreCardMatch,
  MIN_ACCEPT_SCORE,
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
  it("prefers Near Mint Normal for base cards", () => {
    const picked = pickMarketVariant([
      variant({ condition: "Lightly Played", printing: "Normal", price: 1 }),
      variant({ condition: "Near Mint", printing: "Foil", price: 9 }),
      variant({ condition: "Near Mint", printing: "Normal", price: 2.5 }),
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

  it("parses OPTCG numbers including parallels", () => {
    expect(parseOptcgNumber("OP01-001")).toEqual({
      raw: "OP01-001",
      base: "OP01-001",
      setCode: "OP01",
      collector: "001",
      parallelIndex: null,
    });
    expect(parseOptcgNumber("OP01-001_p1")).toMatchObject({
      base: "OP01-001",
      parallelIndex: 1,
    });
  });

  it("scores exact number + set highly and rejects demo-set traps", () => {
    const romance = scoreCardMatch(
      {
        name: "Roronoa Zoro",
        number: "OP01-001",
        set: "op01",
        set_name: "Romance Dawn",
        variants: [variant({ condition: "Near Mint", printing: "Normal", price: 1 })],
      },
      { cardNumber: "OP01-001", name: "Roronoa Zoro", setName: "Romance Dawn" },
    );
    const demo = scoreCardMatch(
      {
        name: "Roronoa Zoro",
        number: "OP01-001",
        set: "demo",
        set_name: "One Piece Demo Deck Cards",
        variants: [variant({ condition: "Near Mint", printing: "Normal", price: 1 })],
      },
      { cardNumber: "OP01-001", name: "Roronoa Zoro", setName: "Romance Dawn" },
    );
    expect(romance).toBeGreaterThanOrEqual(MIN_ACCEPT_SCORE);
    expect(romance).toBeGreaterThan(demo);
  });

  it("does not accept base Normal as a strong parallel match", () => {
    const score = scoreCardMatch(
      {
        name: "Roronoa Zoro",
        number: "OP01-001",
        set: "op01",
        set_name: "Romance Dawn",
        variants: [variant({ condition: "Near Mint", printing: "Normal", price: 1 })],
      },
      { cardNumber: "OP01-001_p1", name: "Roronoa Zoro", setName: "Romance Dawn" },
    );
    expect(score).toBeLessThan(MIN_ACCEPT_SCORE);
  });

  it("accepts JustTCG Parallel-labeled rows for catalog _pN cards", () => {
    const score = scoreCardMatch(
      {
        name: "Donquixote Doflamingo (073) (Parallel)",
        number: "OP01-073",
        set: "op01",
        set_name: "Romance Dawn",
        variants: [variant({ condition: "Near Mint", printing: "Normal", price: 40 })],
      },
      {
        cardNumber: "OP01-073_p2",
        name: "Donquixote Doflamingo",
        setName: "Romance Dawn",
      },
    );
    expect(score).toBeGreaterThanOrEqual(MIN_ACCEPT_SCORE);
  });

  it("scores number matches loosely for base cards", () => {
    expect(
      scoreCardMatch(
        {
          name: "Monkey D. Luffy",
          number: "OP01-001",
          set: "op01",
          variants: [],
        },
        { cardNumber: "OP01-001", name: "Monkey D. Luffy" },
      ),
    ).toBeGreaterThanOrEqual(MIN_ACCEPT_SCORE);
  });
});
