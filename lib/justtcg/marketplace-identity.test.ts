import { beforeEach, describe, expect, it, vi } from "vitest";
import { listGames, searchCards } from "@/lib/justtcg/client";
import { lookupOnePieceCard, parseOptcgNumber, resetJustTcgMatchCache } from "@/lib/justtcg/match";
import { JustTcgClientError, type JustTcgCard } from "@/lib/justtcg/types";

vi.mock("@/lib/justtcg/client", () => ({
  listGames: vi.fn(),
  searchCards: vi.fn(),
}));

function card(overrides: Partial<JustTcgCard> = {}): JustTcgCard {
  return {
    id: "provider-card",
    name: "Monkey.D.Luffy (Alternate Art)",
    game: "one-piece-card-game",
    set: "romance-dawn",
    number: "OP01-003",
    tcgplayerId: "12345",
    variants: [{ id: "variant", condition: "Near Mint", printing: "Normal", price: 25 }],
    ...overrides,
  };
}

const input = {
  cardNumber: "OP01-003_tcg12345",
  name: "Monkey.D.Luffy",
  tcgplayerProductId: "12345",
};

beforeEach(() => {
  vi.resetAllMocks();
  resetJustTcgMatchCache();
  vi.mocked(listGames).mockResolvedValue([{ id: "onepiece", name: "One Piece" }]);
  vi.mocked(searchCards).mockResolvedValue([]);
});

describe("marketplace catalog numbers", () => {
  it("recovers the base number and collector from a marketplace printing", () => {
    expect(parseOptcgNumber(" OP01-003_tcg12345 ")).toEqual({
      raw: "OP01-003_tcg12345",
      base: "OP01-003",
      setCode: "OP01",
      collector: "003",
      parallelIndex: null,
    });
  });

  it("parses promo numbers and preserves existing parallel indices", () => {
    expect(parseOptcgNumber("P-001_tcg12345")).toMatchObject({
      base: "P-001", setCode: "P", collector: "001", parallelIndex: null,
    });
    expect(parseOptcgNumber("OP01-003_p2")).toMatchObject({
      base: "OP01-003", setCode: "OP01", collector: "003", parallelIndex: 2,
    });
    expect(parseOptcgNumber("OP01-003_p2_tcg12345")).toMatchObject({
      base: "OP01-003", parallelIndex: 2,
    });
    expect(parseOptcgNumber("TCG-12345")).toMatchObject({
      setCode: null, collector: null,
    });
  });
});

describe("exact marketplace price identity", () => {
  it("finds the exact product even when another printing is returned first", async () => {
    const exact = card();
    vi.mocked(searchCards).mockResolvedValue([
      card({ id: "wrong-printing", tcgplayerId: "99999" }), exact,
    ]);
    expect((await lookupOnePieceCard(input)).card).toBe(exact);
    expect(searchCards).toHaveBeenCalledOnce();
    expect(searchCards).toHaveBeenCalledWith(expect.objectContaining({ tcgplayerId: "12345" }));
    expect(listGames).not.toHaveBeenCalled();
  });

  it("never substitutes a same-name/base-number printing when the product is absent", async () => {
    vi.mocked(searchCards).mockResolvedValue([card({ tcgplayerId: "99999" })]);
    const result = await lookupOnePieceCard(input);
    expect(result.card).toBeNull();
    expect(result.failure?.reason).toContain("12345");
    expect(searchCards).toHaveBeenCalledOnce();
    expect(listGames).not.toHaveBeenCalled();
  });

  it("rejects results without a provider product ID despite a perfect name/number match", async () => {
    vi.mocked(searchCards).mockResolvedValue([card({ tcgplayerId: null })]);
    expect((await lookupOnePieceCard(input)).card).toBeNull();
    expect(searchCards).toHaveBeenCalledOnce();
  });

  it("discards a stale stored provider ID before resolving the required product", async () => {
    const exact = card();
    vi.mocked(searchCards)
      .mockResolvedValueOnce([card({ id: "stale", tcgplayerId: "99999" })])
      .mockResolvedValueOnce([exact]);
    expect((await lookupOnePieceCard({ ...input, justtcgCardId: "stale" })).card).toBe(exact);
    expect(searchCards).toHaveBeenNthCalledWith(2, expect.objectContaining({ tcgplayerId: "12345" }));
  });

  it("accepts an exact stored identity without relying on variant-name heuristics", async () => {
    const exact = card({ name: "Luffy, Championship Winner" });
    vi.mocked(searchCards).mockResolvedValue([exact]);
    expect((await lookupOnePieceCard({ ...input, justtcgCardId: exact.id })).card).toBe(exact);
    expect(searchCards).toHaveBeenCalledOnce();
  });

  it.each(["OP02-003", "OP01-004", "004", "unrelated"])(
    "rejects a conflicting provider number %s even with an exact product ID",
    async (number) => {
      vi.mocked(searchCards).mockResolvedValue([card({ number })]);
      expect((await lookupOnePieceCard(input)).card).toBeNull();
      expect(searchCards).toHaveBeenCalledOnce();
    },
  );

  it("rejects an unrelated game even when the provider reports the requested product ID", async () => {
    vi.mocked(searchCards).mockResolvedValue([card({ game: "pokemon" })]);
    expect((await lookupOnePieceCard(input)).card).toBeNull();
  });

  it.each([null, "3", "003", "op01-003"])(
    "accepts exact identities with an omitted or compatible collector number %s",
    async (number) => {
      const exact = card({ number });
      vi.mocked(searchCards).mockResolvedValue([exact]);
      expect((await lookupOnePieceCard(input)).card).toBe(exact);
    },
  );

  it("validates promo collector numbers", async () => {
    const exact = card({ number: "P-001" });
    vi.mocked(searchCards).mockResolvedValue([exact]);
    expect((await lookupOnePieceCard({ ...input, cardNumber: "P-001_tcg12345" })).card).toBe(exact);
  });

  it("recovers required identity from the suffix if the product field is absent", async () => {
    vi.mocked(searchCards).mockResolvedValue([card({ tcgplayerId: "99999" })]);
    expect((await lookupOnePieceCard({ ...input, tcgplayerProductId: null })).card).toBeNull();
    expect(searchCards).toHaveBeenCalledOnce();
    expect(searchCards).toHaveBeenCalledWith(expect.objectContaining({ tcgplayerId: "12345" }));
  });

  it("resolves unnumbered DON!! cards by embedded product identity", async () => {
    const exact = card({ name: "DON!! Card (Tournament)", number: null });
    vi.mocked(searchCards).mockResolvedValue([exact]);
    expect((await lookupOnePieceCard({ cardNumber: "TCG-12345", name: "DON!! Card" })).card).toBe(exact);
    expect(searchCards).toHaveBeenCalledWith(expect.objectContaining({ tcgplayerId: "12345" }));
  });

  it("rejects conflicting catalog identities before requesting any price", async () => {
    expect((await lookupOnePieceCard({ ...input, tcgplayerProductId: "99999" })).card).toBeNull();
    expect(searchCards).not.toHaveBeenCalled();
  });

  it("returns a rate-limit failure without falling back to a different search", async () => {
    vi.mocked(searchCards).mockRejectedValue(new JustTcgClientError("rate_limited", "Rate limited", 429));
    expect(await lookupOnePieceCard(input)).toMatchObject({ card: null, failure: { rateLimited: true } });
    expect(searchCards).toHaveBeenCalledOnce();
  });
});
