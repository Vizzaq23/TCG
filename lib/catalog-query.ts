import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types/database";

export type CatalogMetadata = Pick<Database["public"]["Tables"]["cards"]["Row"], "id" | "set_name" | "rarity" | "color" | "type">;
export const CATALOG_METADATA_COLUMNS = "id,set_name,rarity,color,type";
export const CATALOG_METADATA_PAGE_SIZE = 500;

export function normalizeCatalogSearchQuery(value: string | null | undefined): string {
  return (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/[‐‑–—]/g, "-").trim().slice(0, 120);
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// .or() takes raw PostgREST grammar. Keep every user value in a quoted literal,
// escaping both quotes and backslashes before the SDK URL-encodes the query.
const quoteFilterValue = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** Name, printed number, or product search. No user input becomes filter syntax. */
export function buildCatalogSearchFilter(value: string | null | undefined): string | null {
  const q = normalizeCatalogSearchQuery(value);
  if (!q) return null;
  // Literal regular expressions avoid treating user %, _, or * as SQL wildcards.
  // Whitespace also accepts punctuation in official names such as Monkey.D.Luffy.
  const textPattern = q.split(/\s+/).map(escapeRegex).join("[^[:alnum:]]*");
  const conditions = ["name", "card_number", "set_name"].map(column => `${column}.imatch.${quoteFilterValue(textPattern)}`);
  const product = q.match(/^(OP|EB|ST|PRB)\s*-?\s*(\d{1,2})(?:\s*-\s*(\d{1,3}))?((?:_[a-z]\d+)*)$/i);
  const promoNumber = q.match(/^P\s*-?\s*(\d{1,3})((?:_[a-z]\d+)*)$/i);

  if (product) {
    // Identifier-shaped input is canonicalized rather than also searching its
    // raw substring: "OP1" must not match every card in OP10 through OP17.
    conditions.length = 0;
    const [, prefix, digits, collector, suffix] = product;
    const code = `${prefix.toUpperCase()}${digits.padStart(2, "0")}`;
    const cardPattern = collector
      ? `^${code}-${collector.padStart(3, "0")}${escapeRegex(suffix)}${suffix ? "$" : "(_|$)"}`
      : `^${code}-`;
    conditions.push(`card_number.imatch.${quoteFilterValue(cardPattern)}`);
    if (!collector) conditions.push(`set_name.imatch.${quoteFilterValue(`${prefix}[-[:space:]]?${digits.padStart(2, "0")}(?:[^[:digit:]]|$)`)}`);
  } else if (promoNumber) {
    conditions.length = 0;
    conditions.push(`card_number.imatch.${quoteFilterValue(`^P-${promoNumber[1].padStart(3, "0")}${escapeRegex(promoNumber[2])}${promoNumber[2] ? "$" : "(_|$)"}`)}`);
  }

  if (/^(?:promos?|promotions?|promotional)(?:\s+cards?)?$/i.test(q)) {
    conditions.push('card_number.imatch."^P-"', 'set_name.imatch."promo"', 'rarity.eq."Promo"');
  }
  return [...new Set(conditions)].join(",");
}

/** Read all public catalog metadata without relying on Supabase's row cap. */
export async function readCatalogMetadata(client: Pick<SupabaseClient<Database>, "from">): Promise<CatalogMetadata[]> {
  const rows: CatalogMetadata[] = [];
  for (;;) {
    const { data, error, count } = await client.from("cards")
      .select(CATALOG_METADATA_COLUMNS, { count: "exact" })
      .order("id", { ascending: true })
      .range(rows.length, rows.length + CATALOG_METADATA_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) return rows;
    rows.push(...data);
    if (count !== null && rows.length >= count) return rows;
    // Continue from the actual number returned, even if the server imposed a
    // smaller page size. An empty page also terminates when count is unavailable.
  }
}
