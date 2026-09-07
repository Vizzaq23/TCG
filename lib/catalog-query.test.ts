import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "./types/database";
import { buildCatalogSearchFilter, CATALOG_METADATA_COLUMNS, normalizeCatalogSearchQuery, readCatalogMetadata, type CatalogMetadata } from "./catalog-query";

/** Strictly parse the subset of PostgREST grammar this search is allowed to emit. */
function parseConditions(filter: string) {
  const conditions: { column: string; operator: string; value: string }[] = [];
  const grammar = /(?:^|,)(name|card_number|set_name|rarity)\.(imatch|eq)\."((?:\\.|[^"\\])*)"/gy;
  let offset = 0;
  let match: RegExpExecArray | null;
  while ((match = grammar.exec(filter))) {
    conditions.push({ column: match[1], operator: match[2], value: match[3].replace(/\\(.)/g, "$1") });
    offset = grammar.lastIndex;
  }
  expect(offset).toBe(filter.length);
  return conditions;
}

describe("shared catalog search", () => {
  it("supports official product and promo number spellings", () => {
    for (const input of ["OP17", "op-17", "OP 17"]) {
      const conditions = parseConditions(buildCatalogSearchFilter(input)!);
      expect(conditions.some(c => c.column === "card_number" && c.value === "^OP17-")).toBe(true);
      expect(conditions.some(c => c.column === "set_name" && c.value.toUpperCase().includes("OP[-[:SPACE:]]?17"))).toBe(true);
    }
    for (const input of ["P-123", "p123", "P 123"]) {
      const pattern = parseConditions(buildCatalogSearchFilter(input)!).find(c => c.value.startsWith("^P-"))!.value;
      expect(new RegExp(pattern).test("P-123")).toBe(true);
      expect(new RegExp(pattern).test("P-123_p1")).toBe(true);
      expect(new RegExp(pattern).test("P-1234")).toBe(false);
    }
    const exact = parseConditions(buildCatalogSearchFilter("OP-17-1_p1")!).find(c => c.value.startsWith("^OP17"))!;
    expect(new RegExp(exact.value).test("OP17-001_p1")).toBe(true);
    expect(new RegExp(exact.value).test("OP17-001_p10")).toBe(false);
    const shortPromo = parseConditions(buildCatalogSearchFilter("p1")!);
    expect(shortPromo).toHaveLength(1);
    expect(new RegExp(shortPromo[0].value).test("P-001")).toBe(true);
    expect(new RegExp(shortPromo[0].value).test("OP17-001_p1")).toBe(false);
  });

  it("finds promo product labels as well as P-number cards", () => {
    for (const input of ["promo", "promos", "promotion card", "promotional cards"]) {
      const conditions = parseConditions(buildCatalogSearchFilter(input)!);
      const pattern = conditions.find(c => c.column === "set_name" && c.value === "promo")!;
      for (const set of ["Promotion card", "One Piece Promotion Cards", "TCGplayer Promo Cards"]) {
        expect(new RegExp(pattern.value, "i").test(set)).toBe(true);
      }
      expect(conditions).toContainEqual({ column: "card_number", operator: "imatch", value: "^P-" });
    }
  });

  it("quotes raw filter delimiters and treats regex and SQL wildcards literally", () => {
    for (const input of ['"),id.not.is.null,name.eq.("', 'a,b.c:d(e)', 'quote"and\\slash', '100%_*+?^$[]{}|']) {
      const conditions = parseConditions(buildCatalogSearchFilter(input)!);
      expect(conditions.map(c => c.column)).toEqual(["name", "card_number", "set_name"]);
      for (const condition of conditions) {
        expect(new RegExp(condition.value).test(input)).toBe(true);
        expect(new RegExp(condition.value).test("Monkey.D.Luffy")).toBe(false);
      }
    }
    expect(buildCatalogSearchFilter("  \0\n  ")).toBeNull();
    expect(normalizeCatalogSearchQuery("x".repeat(1000))).toHaveLength(120);
    expect(normalizeCatalogSearchQuery(" op–17 \0")).toBe("op-17");
    expect(parseConditions(buildCatalogSearchFilter("Monkey D Luffy")!)[0].value).toBe("Monkey[^[:alnum:]]*D[^[:alnum:]]*Luffy");
  });
});

function metadataClient(total: number, serverLimit = 1000, counts = true, failAt?: number) {
  const rows: CatalogMetadata[] = Array.from({ length: total }, (_, index) => ({
    id: String(index).padStart(8, "0"),
    set_name: index < 1000 ? "ROMANCE DAWN (OP-01)" : "THE WORLD'S STRONGEST WARRIORS (OP-17)",
    rarity: index === total - 1 ? "Promo" : "Common", color: "Red", type: "Character",
  }));
  const offsets: number[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    expect(url.searchParams.get("select")).toBe(CATALOG_METADATA_COLUMNS);
    expect(url.searchParams.get("order")).toBe("id.asc");
    const from = Number(url.searchParams.get("offset"));
    offsets.push(from);
    if (failAt !== undefined && from >= failAt) return Response.json({ message: "metadata unavailable" }, { status: 400 });
    const page = rows.slice(from, from + Math.min(serverLimit, Number(url.searchParams.get("limit"))));
    return Response.json(page, { headers: counts ? { "content-range": `${from}-${from + page.length - 1}/${total}` } : {} });
  });
  const client = createClient<Database>("https://catalog.example.test", "test-public-key", {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
  });
  return { client, rows, offsets };
}

describe("complete catalog metadata", () => {
  it("includes later products after the default 1000-row boundary", async () => {
    const { client, rows, offsets } = metadataClient(1201);
    expect(await readCatalogMetadata(client)).toEqual(rows);
    expect(offsets).toEqual([0, 500, 1000]);
  });

  it("continues from returned rows when the server applies a smaller cap", async () => {
    const { client, rows, offsets } = metadataClient(601, 250);
    expect(await readCatalogMetadata(client)).toEqual(rows);
    expect(offsets).toEqual([0, 250, 500]);
  });

  it("terminates without count headers, including an empty catalog", async () => {
    const data = metadataClient(501, 250, false);
    expect(await readCatalogMetadata(data.client)).toEqual(data.rows);
    expect(data.offsets).toEqual([0, 250, 500, 501]);
    expect(await readCatalogMetadata(metadataClient(0).client)).toEqual([]);
  });

  it("reports a failed later page instead of displaying partial set totals", async () => {
    const { client } = metadataClient(1201, 1000, true, 500);
    await expect(readCatalogMetadata(client)).rejects.toThrow("metadata unavailable");
  });
});
