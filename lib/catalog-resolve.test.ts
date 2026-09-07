import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalogResolveSearchPath, resolveCatalogPath, type CatalogResolveLookup, type CatalogResolveRow } from "./catalog-resolve";
import { GET } from "@/app/browse/resolve/route";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/env", () => ({ isSupabaseConfigured: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const row = (overrides: Partial<CatalogResolveRow> = {}): CatalogResolveRow => ({
  id: firstId, card_number: "OP01-003", tcgplayer_product_id: null, ...overrides,
});
const lookup = (): CatalogResolveLookup => ({
  byProduct: vi.fn().mockResolvedValue([]),
  byNumber: vi.fn().mockResolvedValue([]),
});

beforeEach(() => { vi.resetAllMocks(); });

describe("catalog printing resolution", () => {
  it.each(["P-001", "OP01-003_p2", "EB01-015_r2"])("opens only the exact %s printing", async (number) => {
    const store = lookup();
    vi.mocked(store.byNumber).mockResolvedValue([row({ card_number: number })]);
    expect(await resolveCatalogPath({ number }, store)).toBe(`/browse/${firstId}`);
    expect(store.byNumber).toHaveBeenCalledWith(number);
    expect(store.byProduct).not.toHaveBeenCalled();
  });

  it("does not open a base card when a Japanese-only or unavailable variant is requested", async () => {
    const store = lookup();
    vi.mocked(store.byNumber).mockResolvedValue([row({ card_number: "OP01-003" })]);
    expect(await resolveCatalogPath({ number: "OP01-003_p99" }, store)).toBe("/browse?q=OP01-003");
    expect(store.byNumber).toHaveBeenCalledOnce();
    expect(store.byNumber).toHaveBeenCalledWith("OP01-003_p99");
  });

  it("prefers an exact product identity and matching number over an older alias", async () => {
    const store = lookup();
    vi.mocked(store.byProduct).mockResolvedValue([
      row({ tcgplayer_product_id: "12345", card_number: "old-alias" }),
      row({ id: secondId, tcgplayer_product_id: "12345", card_number: "OP01-003_tcg12345" }),
    ]);
    expect(await resolveCatalogPath({ number: "OP01-003_tcg12345", product: "12345" }, store)).toBe(`/browse/${secondId}`);
    expect(store.byNumber).not.toHaveBeenCalled();
  });

  it("resolves duplicate product aliases deterministically by UUID when neither number matches", async () => {
    const store = lookup();
    vi.mocked(store.byProduct).mockResolvedValue([
      row({ id: secondId, tcgplayer_product_id: "12345", card_number: "alias-2" }),
      row({ tcgplayer_product_id: "12345", card_number: "alias-1" }),
    ]);
    expect(await resolveCatalogPath({ number: "TCG-12345" }, store)).toBe(`/browse/${firstId}`);
    expect(store.byProduct).toHaveBeenCalledWith("12345");
  });

  it("falls back to the exact numbered row when its product identity has not been linked", async () => {
    const store = lookup();
    vi.mocked(store.byNumber).mockResolvedValue([row()]);
    expect(await resolveCatalogPath({ number: "OP01-003", product: "12345" }, store)).toBe(`/browse/${firstId}`);
    expect(store.byProduct).toHaveBeenCalledWith("12345");
    expect(store.byNumber).toHaveBeenCalledWith("OP01-003");
  });

  it("does not substitute a conflicting marketplace printing", async () => {
    const store = lookup();
    vi.mocked(store.byProduct).mockResolvedValue([row({ tcgplayer_product_id: "99999" })]);
    vi.mocked(store.byNumber).mockResolvedValue([row({ tcgplayer_product_id: "99999" })]);
    expect(await resolveCatalogPath({ number: "OP01-003", product: "12345" }, store)).toBe("/browse?q=OP01-003");
  });

  it("uses the printing suffix's product ID when no product parameter is supplied", async () => {
    const store = lookup();
    vi.mocked(store.byProduct).mockResolvedValue([row({ tcgplayer_product_id: "12345" })]);
    expect(await resolveCatalogPath({ number: "P-001_tcg12345" }, store)).toBe(`/browse/${firstId}`);
    expect(store.byProduct).toHaveBeenCalledWith("12345");
  });

  it.each([
    { number: "OP01-003_tcg12345", product: "99999" },
    { number: "OP01-003", product: "12345&next=https://evil.example" },
    { number: "OP01-003", product: "9007199254740992" },
    { number: "OP01-003", product: "-1" },
    { number: "OP01-003", product: "0" },
  ])("does not look up conflicting or invalid identity $product", async (input) => {
    const store = lookup();
    expect(await resolveCatalogPath(input, store)).toBe("/browse?q=OP01-003");
    expect(store.byProduct).not.toHaveBeenCalled();
    expect(store.byNumber).not.toHaveBeenCalled();
  });

  it.each(["//evil.example", "OP01-003&next=evil", "OP01-003\r\nLocation:evil", "a".repeat(65)])(
    "rejects crafted/oversized card numbers without issuing queries", async (number) => {
      const store = lookup();
      expect(await resolveCatalogPath({ number, product: "12345" }, store)).toBe("/browse");
      expect(store.byProduct).not.toHaveBeenCalled();
      expect(store.byNumber).not.toHaveBeenCalled();
    },
  );

  it("does not turn an invalid database ID into a redirect path", async () => {
    const store = lookup();
    vi.mocked(store.byNumber).mockResolvedValue([row({ id: "../../evil" })]);
    expect(await resolveCatalogPath({ number: "OP01-003" }, store)).toBe("/browse?q=OP01-003");
  });

  it("returns a search on query errors or unavailable configuration", async () => {
    const store = lookup();
    vi.mocked(store.byNumber).mockRejectedValue(new Error("Database unavailable"));
    expect(await resolveCatalogPath({ number: "P-001_p2" }, store)).toBe("/browse?q=P-001");
    expect(await resolveCatalogPath({ number: "P-001_p2" })).toBe("/browse?q=P-001");
  });

  it("normalizes only known numbered prefixes for the search fallback", () => {
    expect(catalogResolveSearchPath(" prb01-001_p2 ")).toBe("/browse?q=PRB01-001");
    expect(catalogResolveSearchPath("DON-001")).toBe("/browse?q=DON-001");
    expect(catalogResolveSearchPath("TCG-12345")).toBe("/browse?q=TCG-12345");
  });
});

describe("read-only catalog resolve route", () => {
  it("returns an internal uncached search redirect when Supabase is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const response = await GET(new Request("https://shelf.example/browse/resolve?number=OP01-003_p99&next=https://evil.example"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/browse?q=OP01-003");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("redirects to search if client setup fails", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(createClient).mockRejectedValue(new Error("Unavailable"));
    const response = await GET(new Request("https://shelf.example/browse/resolve?number=P-001"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/browse?q=P-001");
  });
});
