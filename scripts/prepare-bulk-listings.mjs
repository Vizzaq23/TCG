/**
 * Prepare OP01–OP17 regular-print bulk listings using the daily TCGplayer
 * product/printing price export. This command only writes local files.
 * Run: node --use-system-ca scripts/prepare-bulk-listings.mjs
 * Cached rebuild: append --offline. Source: https://tcgcsv.com/docs
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const dir = new URL('../output/bulk-listings/', import.meta.url);
await mkdir(dir, { recursive: true });
const sourceFile = new URL('tcgplayer-snapshot.json', dir);
const offline = process.argv.includes('--offline');
const headers = { 'User-Agent': 'TCG-Shelf-Bulk-Pricing/1.0' };
async function get(path, json = true) {
  await delay(100);
  const response = await fetch(`https://tcgcsv.com${path}`, { headers, signal: AbortSignal.timeout(30000) });
  assert.ok(response.ok, `Source request failed: ${path} (${response.status})`);
  if (!json) return (await response.text()).trim();
  const data = await response.json();
  assert.equal(data.success, true);
  assert.deepEqual(data.errors, []);
  assert.ok(Array.isArray(data.results));
  if (data.totalItems != null) assert.equal(data.results.length, data.totalItems);
  return data.results;
}
let raw;
try { raw = JSON.parse(await readFile(sourceFile, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (offline) assert.ok(raw, 'No cached snapshot available.');
else {
  const build = await get('/last-updated.txt', false);
  if (build !== raw?.sourceBuild) {
    const groups = (await get('/tcgplayer/68/groups')).filter(g => /^OP(?:0[1-9]|1[0-7])(?:-EB04)?$/.test(g.abbreviation))
      .sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
    assert.equal(groups.length, 17, 'Expected all 17 main booster sets.');
    const collections = [];
    for (const group of groups) {
      const products = await get(`/tcgplayer/68/${group.groupId}/products`);
      const prices = await get(`/tcgplayer/68/${group.groupId}/prices`);
      collections.push({ group, products, prices });
      console.log(`${group.abbreviation}: ${products.length} products, ${prices.length} printing prices`);
    }
    raw = { source: 'TCGplayer API export via TCGCSV', sourceDocumentation: 'https://tcgcsv.com/docs', sourceBuild: build, retrievedAt: new Date().toISOString(), collections };
    await writeFile(sourceFile, JSON.stringify(raw, null, 2) + '\n');
  }
}

const rarityNames = { SR: 'Super Rare', R: 'Rare', C: 'Common', UC: 'Uncommon' };
const clean = text => String(text ?? '').replace(/<[^>]*>/g, '').replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"').trim();
const cards = [], excluded = [];
for (const { group, products, prices } of raw.collections) {
  const setCode = group.abbreviation.slice(0, 4);
  const priceMap = new Map();
  for (const price of prices) {
    const key = `${price.productId}:${price.subTypeName}`;
    assert.ok(!priceMap.has(key), `Duplicate printing price: ${key}`);
    priceMap.set(key, price);
  }
  for (const product of products) {
    const fields = Object.fromEntries((product.extendedData ?? []).map(f => [f.name, clean(f.value)]));
    if (!rarityNames[fields.Rarity] || !new RegExp(`^${setCode}-\\d{3}$`).test(fields.Number)) continue;
    // Parentheses may identify a card number or a character alias, rather than
    // special artwork. Keep observed aliases; reject other variant annotations.
    const name = clean(product.name);
    const variantName = name.replaceAll(`(${fields.Number})`, '').replace(/\(\d{3}\)/g, '')
      .replace(/\((?:Zala|Daz\.Bonez|Bentham|Galdino|Gem|Marianne|Mikita|Drophy|Babe|Navy|Grandma Nyon|Brownbeard)\)/gi, '');
    const variant = variantName.match(/[()[\]]|\b(?:parallel|alternate art|manga|box topper|pre-release|release event|special foil|anniversary|reprint|errata|silver foil)\b/i);
    if (variant || product.presaleInfo?.isPresale) {
      excluded.push({ productId: product.productId, number: fields.Number, name, reason: 'Special printing or presale; not ordinary bulk.' });
      continue;
    }
    const printingPrices = [...priceMap.values()].filter(p => p.productId === product.productId);
    for (const price of printingPrices) {
      const market = Number.isFinite(price.marketPrice) && price.marketPrice > 0 ? Math.round(price.marketPrice * 100) : null;
      cards.push({ productId: product.productId, setCode, setName: group.name, number: fields.Number,
        name, rarity: fields.Rarity, rarityName: rarityNames[fields.Rarity], printing: price.subTypeName,
        marketCents: market, lowCents: price.lowPrice == null ? null : Math.round(price.lowPrice * 100),
        url: product.url, imageUrl: product.imageUrl, sourceBuild: raw.sourceBuild });
    }
    if (!printingPrices.length) excluded.push({ productId: product.productId, number: fields.Number, name, reason: 'No printing price row.' });
  }
}
const byNumber = new Map();
let spotChecks = [];
try { spotChecks = JSON.parse(await readFile(new URL('tcgplayer-spot-checks.json', dir), 'utf8')).checks; }
catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const card of cards) {
  const check = spotChecks.find(c => c.productId === card.productId && c.printing === card.printing);
  if (check && Date.parse(check.checkedAt) >= Date.parse(raw.sourceBuild) && Date.now() - Date.parse(check.checkedAt) < 24 * 60 * 60 * 1000) {
    assert.equal(check.url, card.url);
    assert.ok(Number.isSafeInteger(check.marketCents) && check.marketCents > 0);
    card.exportMarketCents = card.marketCents;
    card.marketCents = check.marketCents;
    card.marketBasis = 'Live TCGplayer English Near Mint price point';
    card.checkedAt = check.checkedAt;
  }
}
for (const card of cards) byNumber.set(card.number, [...(byNumber.get(card.number) ?? []), card]);
const ambiguous = [...byNumber.values()].filter(rows => rows.length !== 1);
const usable = cards.filter(c => byNumber.get(c.number).length === 1 && c.marketCents != null);

// Provisional offers, not claimed profit: costs, condition, and stock are unknown.
// Free-shipping floor assumes economical letter fulfilment; tracked shipments
// and actual acquisition/labour costs must be reviewed before activation.
const offers = usable.map(card => {
  const kind = card.marketCents >= 200 ? 'single' : 'playset';
  const units = kind === 'single' ? 1 : 4;
  const floor = kind === 'single' ? 249 : 299;
  const priceCents = Math.max(floor, Math.ceil(card.marketCents * units * 0.95 / 5) * 5);
  return { ...card, kind, cardsPerUnit: units, priceCents,
    floorApplied: card.marketCents * units * 0.95 < floor,
    title: `${card.name} ${card.number} | ${card.rarity} | ${units === 1 ? 'Single' : '4-card playset'} | English NM`,
    description: `${units === 1 ? 'One copy' : 'Four copies'} of ${card.name} (${card.number}) from ${card.setName}. English, Near Mint. ${card.rarityName}; regular ${card.printing.toLowerCase()} printing.`,
    condition: 'Near Mint', quantityAvailable: 0, unitCostCents: null, status: 'draft',
    reviewRequired: ['Count sale inventory', 'Enter card cost and verify shipping margin', ...(priceCents >= 2000 ? ['Review tracked shipping cost'] : [])] };
});
// Keep all SR/R offers plus C/UC worth at least 25 cents. The remaining
// C/UC inventory is better suited to set-specific lots than hundreds of
// near-identical minimum-price offers. All cards remain in the price file.
const drafts = offers.filter(c => ['SR', 'R'].includes(c.rarity) || c.marketCents >= 25);
const lots = raw.collections.map(({ group }) => {
  const setCode = group.abbreviation.slice(0, 4);
  const candidates = usable.filter(c => c.setCode === setCode && ['C', 'UC'].includes(c.rarity) && c.marketCents < 25);
  return { setCode, setName: group.name, kind: 'bulk_lot', cardsPerUnit: 50,
    title: `${setCode} ${group.name} | 50 Common/Uncommon Cards | English NM`,
    description: `50 English Near Mint Common and Uncommon cards from ${group.name} (${setCode}). Assorted regular printings. Duplicates may be included; this is not a complete set or a guaranteed playset. No Rare, Super Rare, Secret Rare, alternate-art, or DON!! cards included.`,
    priceCents: 999, condition: 'Near Mint', quantityAvailable: 0, unitCostCents: null, status: 'draft',
    priceBasis: 'Proposed $9.99 lot price with free shipping; not a TCGplayer market quote for a lot.',
    eligibleCardNumbers: candidates.map(c => c.number),
    reviewRequired: ['Physically assemble and count each 50-card lot', 'Enter acquisition cost and verify packed shipping cost', 'Do not allocate the same cards to individual offers'] };
}).filter(lot => lot.eligibleCardNumbers.length > 0);
const plan = { source: raw.source, sourceBuild: raw.sourceBuild, retrievedAt: raw.retrievedAt,
  assumptions: { currency: 'USD', language: 'English confirmed by owner', inventory: 'Unknown; zero stock on every draft', condition: 'Owner says mint; shop label Near Mint', marketBasis: 'Product + printing Market Price; not a condition-specific NM quote', priceRule: '95% of market, rounded up to $0.05; single >= $2 market, otherwise four-card playset; free-shipping floors $2.49/$2.99. C/UC below $0.25 go in proposed $9.99 50-card set-specific lots.', profitability: 'Not established: acquisition cost, postage, supplies, labour and actual processing fees are unknown.' },
  cards, drafts, lots, ambiguous, excluded,
  summary: { pricedCards: usable.length, drafts: drafts.length + lots.length, singles: drafts.filter(d => d.kind === 'single').length,
    playsets: drafts.filter(d => d.kind === 'playset').length,
    bulkLots: lots.length,
    below25c: usable.filter(c => c.marketCents < 25).length,
    bySet: raw.collections.map(({ group }) => ({ set: group.abbreviation, name: group.name, cards: usable.filter(c => c.setCode === group.abbreviation.slice(0, 4)).length })),
    byRarity: Object.fromEntries(Object.keys(rarityNames).map(r => [r, usable.filter(c => c.rarity === r).length])) } };
await writeFile(new URL('listing-plan.json', dir), JSON.stringify(plan, null, 2) + '\n');
console.log(JSON.stringify({ ...plan.summary, ambiguous: ambiguous.map(rows => rows.map(c => ({ number: c.number, name: c.name, printing: c.printing }))), highestRegularPrices: usable.toSorted((a, b) => b.marketCents - a.marketCents).slice(0, 12).map(({ number, name, marketCents, url }) => ({ number, name, marketCents, url })) }, null, 2));
