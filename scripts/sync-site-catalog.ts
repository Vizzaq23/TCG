/** Add missing English cards and TCGplayer OP17/promos to the shared database.
 * First refresh data/catalog.json and lib/catalog/tcgplayer-catalog.json.
 * Default: read-only plan. --apply performs only inserts and identity links.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/types/database";
import { planCatalogSync, type CatalogInsert, type ExistingCatalogIdentity, type MarketplaceProduct } from "../lib/catalog/tcgplayer-import";

for (const filename of [".env.local", ".env"]) {
  let contents: string;
  try { contents = readFileSync(resolve(filename), "utf8"); } catch { continue; }
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Catalog sync requires the configured Supabase URL and service role key.");
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const english = JSON.parse(readFileSync(resolve("data/catalog.json"), "utf8")) as CatalogInsert[];
  const marketplace = JSON.parse(readFileSync(resolve("lib/catalog/tcgplayer-catalog.json"), "utf8")) as { importedAt: string; products: MarketplaceProduct[] };
  if (english.length < 4000 || marketplace.products.length < 1000) throw new Error("Source catalog is unexpectedly incomplete; refusing to apply.");
  const existing: ExistingCatalogIdentity[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("cards").select("id,card_number,tcgplayer_product_id").order("id").range(offset, offset + 999);
    if (error) throw new Error(`Catalog read failed: ${error.message}`);
    existing.push(...data);
    if (data.length < 1000) break;
  }
  const plan = planCatalogSync(english, marketplace.products, existing);
  const directory = resolve(".next/catalog-sync");
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, "plan.json"), JSON.stringify({ generatedAt: new Date().toISOString(), sourceUpdatedAt: marketplace.importedAt, before: existing, ...plan }, null, 2));
  console.log(JSON.stringify({ existing: existing.length, englishSource: english.length, marketplaceProducts: marketplace.products.length, inserts: plan.inserts.length, identityLinks: plan.links.length, plan: ".next/catalog-sync/plan.json" }));
  if (!process.argv.includes("--apply")) return;
  // Missing records only. A concurrent duplicate fails safely without overwriting data.
  for (let offset = 0; offset < plan.inserts.length; offset += 200) {
    const { error } = await db.from("cards").insert(plan.inserts.slice(offset, offset + 200));
    if (error) throw new Error(`Catalog insert batch failed: ${error.message}`);
  }
  for (const link of plan.links) {
    const { error } = await db.from("cards").update({ tcgplayer_product_id: link.productId }).eq("id", link.id).is("tcgplayer_product_id", null);
    if (error) throw new Error(`Identity link failed for ${link.cardNumber}: ${error.message}`);
  }
  const after: ExistingCatalogIdentity[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("cards").select("id,card_number,tcgplayer_product_id").order("id").range(offset, offset + 999);
    if (error) throw new Error(`Verification read failed: ${error.message}`);
    after.push(...data);
    if (data.length < 1000) break;
  }
  const afterByNumber = new Map(after.map(row => [row.card_number, row]));
  for (const before of existing) if (afterByNumber.get(before.card_number)?.id !== before.id) throw new Error(`Existing catalog identity changed: ${before.card_number}`);
  const products = new Set(after.map(row => row.tcgplayer_product_id));
  const missing = marketplace.products.filter(product => !products.has(String(product.productId)));
  if (missing.length) throw new Error(`${missing.length} marketplace products did not resolve after sync.`);
  const remaining = planCatalogSync(english, marketplace.products, after);
  if (remaining.inserts.length || remaining.links.length) throw new Error("Sync did not converge to an empty plan.");
  writeFileSync(resolve(directory, "result.json"), JSON.stringify({ completedAt: new Date().toISOString(), cards: after.length, productsVerified: marketplace.products.length, preservedIds: existing.length, mappings: plan.mappings }, null, 2));
  console.log(JSON.stringify({ applied: true, totalCards: after.length, productsVerified: marketplace.products.length, preservedIds: existing.length, remainingInserts: 0, remainingLinks: 0 }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Catalog sync failed"); process.exitCode = 1; });
