/**
 * Read-only TCGplayer catalog ingestion via TCGCSV's documented public API
 * exports. This writes local snapshots only; it never contacts our database.
 *
 * Run: node --use-system-ca scripts/import-tcgplayer-catalog.mjs
 * Validate/rebuild from the saved response without network: append --offline
 *
 * Source usage: https://tcgcsv.com/docs#usage-guidelines
 * A custom User-Agent, build-timestamp cache, and 100ms request spacing keep
 * the importer within the publisher's documented usage recommendations.
 */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const CATEGORY = 68;
const GROUPS = [24736, 24775, 17675];
const HOST = "https://tcgcsv.com";
const root = new URL("../lib/catalog/", import.meta.url);
const rawPath = new URL("tcgplayer-source.json", root);
const outputPath = new URL("tcgplayer-catalog.json", root);
const userAgent = "TCG-Journey-Catalog/1.0";
const offline = process.argv.includes("--offline");

async function loadJson(path) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function fetchText(path) {
  await delay(100);
  const response = await fetch(`${HOST}${path}`, {
    headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${response.status} fetching ${path}`);
  return response.text();
}

async function fetchCollection(path) {
  const data = JSON.parse(await fetchText(path));
  assert.equal(data.success, true, `Source reported failure for ${path}`);
  assert.deepEqual(data.errors, [], `Source returned errors for ${path}`);
  assert.ok(Array.isArray(data.results), `Missing results for ${path}`);
  assert.equal(data.totalItems, data.results.length, `Incomplete source collection for ${path}`);
  return data;
}

let raw = await loadJson(rawPath);
if (offline) {
  assert.ok(raw, "--offline requires an existing tcgplayer-source.json snapshot");
} else {
  const sourceBuild = (await fetchText("/last-updated.txt")).trim();
  assert.ok(sourceBuild.length > 0, "Source build timestamp is empty");
  if (raw?.sourceBuild === sourceBuild && GROUPS.every((id) => raw.collections.some((group) => group.groupId === id))) {
    console.log("TCGCSV build is unchanged; using the saved source responses.");
  } else {
    console.log("Fetching TCGplayer OP-17, its release-event cards, and the promotion catalog…");
    const groups = (await fetchCollection(`/tcgplayer/${CATEGORY}/groups`)).results
      .filter((group) => GROUPS.includes(group.groupId));
    assert.equal(groups.length, GROUPS.length, "A required TCGplayer group is missing");
    const collections = [];
    for (const groupId of GROUPS) {
      const response = await fetchCollection(`/tcgplayer/${CATEGORY}/${groupId}/products`);
      collections.push({ groupId, response });
    }
    raw = { source: `${HOST}/docs`, sourceBuild, importedAt: new Date().toISOString(), categoryId: CATEGORY, groups, collections };
    // Save only after all required groups succeed. Every later transform can
    // be rerun locally without repeatedly requesting the same daily build.
    await writeFile(rawPath, JSON.stringify(raw, null, 2) + "\n");
  }
}

const journey = await loadJson(new URL("all-cards.json", root));
assert.ok(journey?.cards, "Existing Journey catalog is required for the coverage comparison");
const journeyByBase = new Map();
for (const card of journey.cards) {
  const entries = journeyByBase.get(card.baseId) ?? [];
  entries.push(card.id);
  journeyByBase.set(card.baseId, entries);
}

const clean = (value) => String(value ?? "").replace(/<[^>]*>/g, "").replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&quot;", '"').replace(/\s+/g, " ").trim();
const nullable = (value) => clean(value) || null;
const supportedTypes = new Map(["Leader", "Character", "Event", "Stage", "DON!!"].map((value) => [value.toLowerCase(), value]));
const rarityNames = { C: "Common", UC: "Uncommon", R: "Rare", SR: "Super Rare", SEC: "Secret Rare", L: "Leader", PR: "Promo", SP: "Special", TR: "Treasure Rare", "DON!!": "DON!!" };
const products = [];
const excluded = [];

for (const collection of raw.collections) {
  for (const product of collection.response.results) {
    assert.equal(product.categoryId, CATEGORY, `Unexpected category for ${product.productId}`);
    assert.equal(product.groupId, collection.groupId, `Unexpected group for ${product.productId}`);
    assert.equal(new URL(product.url).hostname, "www.tcgplayer.com");
    const fields = Object.fromEntries((product.extendedData ?? []).map((field) => [field.name, clean(field.value)]));
    const number = nullable(fields.Number);
    const baseId = number?.match(/^(?:(?:OP|ST|EB|PRB)\d{2}|P)-\d{3}$/)?.[0] ?? null;
    const don = fields.CardType?.toUpperCase() === "DON!!" || fields.Rarity?.toUpperCase() === "DON!!";
    const cardType = don ? "DON!!" : supportedTypes.get(fields.CardType?.toLowerCase()) ?? null;
    // A serial/oversized promo can have a Number such as "1/1000" without
    // an OPxx-style base number. It remains a single, but cannot be merged
    // into an ordinary numbered card. Preserve that source distinction.
    if (!cardType && !number) {
      excluded.push({
        productId: product.productId, groupId: product.groupId,
        name: product.name, url: product.url,
        reason: "No recognized single-card type, printed card number, or DON!! rarity; sealed products and accessories are excluded.",
      });
      continue;
    }
    assert.ok(Number.isSafeInteger(product.productId), "Invalid product ID");
    const imageUrl = product.imageUrl ?? "";
    assert.ok(!imageUrl || new URL(imageUrl).hostname === "tcgplayer-cdn.tcgplayer.com", `Unexpected image host for ${product.productId}`);
    products.push({
      productId: product.productId, groupId: product.groupId,
      name: clean(product.name), number, cardType: cardType ?? "Unspecified",
      rarity: rarityNames[fields.Rarity] ?? fields.Rarity ?? "Unspecified",
      colors: (fields.Color ?? "").split(/[;/]/).map(clean).filter(Boolean),
      subtypes: (fields.Subtypes ?? "").split(";").map(clean).filter(Boolean),
      attribute: nullable(fields.Attribute), cost: nullable(fields.Cost),
      power: nullable(fields.Power), counter: nullable(fields.Counterplus), life: nullable(fields.Life),
      imageUrl, imageCount: product.imageCount ?? 0,
      imageAvailable: Boolean(imageUrl) && (product.imageCount ?? 0) > 0,
      url: product.url, modifiedOn: product.modifiedOn,
      presaleInfo: product.presaleInfo,
      journeyMatch: {
        kind: baseId ? "base-number-only" : "no-base-number",
        baseId,
        candidateIds: baseId ? journeyByBase.get(baseId) ?? [] : [],
      },
    });
  }
}

products.sort((a, b) => a.groupId - b.groupId || a.productId - b.productId);
assert.equal(new Set(products.map((product) => product.productId)).size, products.length, "A TCGplayer product is duplicated across source groups");
const groupResults = raw.groups.map((group) => {
  const singles = products.filter((product) => product.groupId === group.groupId);
  return {
    ...group,
    sourceUrl: `${HOST}/tcgplayer/${CATEGORY}/${group.groupId}/products`,
    counts: {
      products: raw.collections.find((collection) => collection.groupId === group.groupId).response.results.length,
      singles: singles.length,
      don: singles.filter((product) => product.cardType === "DON!!").length,
      numbered: singles.filter((product) => product.journeyMatch.baseId !== null).length,
      uniqueBaseNumbers: new Set(singles.flatMap((product) => product.journeyMatch.baseId ? [product.journeyMatch.baseId] : [])).size,
      excluded: excluded.filter((product) => product.groupId === group.groupId).length,
      existingBaseNumber: singles.filter((product) => product.journeyMatch.candidateIds.length > 0).length,
      missingBaseNumber: singles.filter((product) => product.journeyMatch.baseId && !product.journeyMatch.candidateIds.length).length,
    },
  };
});

const snapshot = {
  source: "TCGplayer catalog API export via TCGCSV",
  sourceDocumentation: `${HOST}/docs`,
  sourceBuild: raw.sourceBuild, importedAt: raw.importedAt, categoryId: CATEGORY,
  matchPolicy: "TCGplayer productId identifies a marketplace product. Number identifies its printed base card. Matching a printed number does not establish the exact Bandai artwork, stamp or parallel printing. No exact-print merges are assigned by this snapshot.",
  groups: groupResults, products, excluded,
  stats: {
    singles: products.length,
    sourceProducts: products.length + excluded.length,
    excluded: excluded.length,
    don: products.filter((product) => product.cardType === "DON!!").length,
    missingImages: products.filter((product) => !product.imageAvailable).length,
    existingJourneyEntries: journey.cards.length,
    numberedBaseCards: new Set(products.flatMap((product) => product.journeyMatch.baseId ? [product.journeyMatch.baseId] : [])).size,
    missingBaseNumbers: [...new Set(products.filter((product) => product.journeyMatch.baseId && !product.journeyMatch.candidateIds.length).map((product) => product.journeyMatch.baseId))].sort(),
  },
};
for (const group of snapshot.groups) assert.equal(group.counts.products, group.counts.singles + group.counts.excluded);
await writeFile(outputPath, JSON.stringify(snapshot, null, 2) + "\n");
console.log(JSON.stringify({ stats: snapshot.stats, groups: snapshot.groups.map(({ groupId, name, counts }) => ({ groupId, name, counts })) }, null, 2));
