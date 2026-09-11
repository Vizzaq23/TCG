/**
 * Match prepared offers to the shop catalog and stage zero-stock drafts.
 * Preview: node --use-system-ca --env-file=.env.local scripts/stage-bulk-listing-drafts.mjs
 * Stage:   same command with --apply
 * No collection quantities, existing listings, checkout, or shop settings change.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const dir = new URL('../output/bulk-listings/', import.meta.url);
const plan = JSON.parse(await readFile(new URL('listing-plan.json', dir), 'utf8'));
let previousRows = [], previousSaved = [];
try { previousRows = JSON.parse(await readFile(new URL('draft-manifest.json', dir), 'utf8')).rows; }
catch (error) { if (error.code !== 'ENOENT') throw error; }
try { previousSaved = JSON.parse(await readFile(new URL('staged-receipt.json', dir), 'utf8')).saved; }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const owner = process.env.SHOP_OWNER_USER_ID;
assert.ok(owner && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL, 'Shop credentials are required.');
assert.ok(Date.now() - Date.parse(plan.retrievedAt) < 48 * 60 * 60 * 1000, 'Refresh stale pricing before staging.');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function readAll(table, columns, ownerColumn) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    let q = db.from(table).select(columns).order('id').range(start, start + 999);
    if (ownerColumn) q = q.eq(ownerColumn, owner);
    const { data, error } = await q;
    assert.equal(error, null, error?.message);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
const settings = await readAll('shop_settings', 'id,owner_user_id,store_name,shipping_cents', 'owner_user_id');
assert.equal(settings.length, 1, 'Expected one configured shop.');
assert.equal(settings[0].shipping_cents, 0, 'Pricing assumes the current free-shipping setting. Rebuild pricing if that changes.');
const cards = await readAll('cards', 'id,name,card_number,set_name,rarity,image_url');
const existing = await readAll('shop_listings', 'id,card_id,kind,title,status,quantity_available', 'owner_user_id');
const normalise = s => s.toLowerCase().replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"').normalize('NFKD').replace(/[^a-z0-9]/g, '');
function stableId(key) {
  const bytes = createHash('sha256').update(`${owner}:op01-op17-bulk-v1:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const rows = [], skipped = [], review = [];
for (const offer of [...plan.drafts, ...plan.lots]) {
  let card = null;
  if (offer.number) {
    const matches = cards.filter(c => c.card_number === offer.number);
    assert.equal(matches.length, 1, `Exact regular card is missing or ambiguous: ${offer.number}`);
    card = matches[0];
    const suffix = offer.name.match(/\s*-\s*(OP\d{2})-(\d{2,3})$/);
    const suffixMatches = suffix && `${suffix[1]}-${suffix[2].padStart(3, '0')}` === offer.number;
    const sourceName = (suffixMatches ? offer.name.slice(0, suffix.index) : offer.name).replaceAll(`(${offer.number})`, '').replace(/\s*\(\d{3}\)/g, '');
    if (normalise(sourceName) !== normalise(card.name) || card.rarity !== offer.rarityName) {
      review.push({ number: offer.number, sourceName, catalogName: card.name, reason: 'Name or rarity mismatch' });
      continue;
    }
    const printSet = new RegExp(`\\bOP-?${offer.setCode.slice(2)}(?!\\d)`);
    if (!printSet.test(card.set_name)) {
      review.push({ number: offer.number, reason: 'Catalog set mismatch', set: card.set_name });
      continue;
    }
  }
  const key = offer.number ? `${offer.productId}:${offer.printing}:${offer.kind}` : `${offer.setCode}:50-cuc`;
  const id = stableId(key);
  if (existing.some(e => e.id === id || (card && e.card_id === card.id && e.status !== 'archived') || e.title === offer.title)) {
    skipped.push({ key, reason: 'An existing offer is already present.' });
    continue;
  }
  assert.ok(Number.isSafeInteger(offer.priceCents) && offer.priceCents > 0);
  assert.equal(offer.quantityAvailable, 0);
  assert.equal(offer.condition, 'Near Mint');
  const row = { id, owner_user_id: owner, kind: offer.kind, title: offer.title,
    description: offer.description, condition: 'Near Mint', quantity_available: 0,
    price_cents: offer.priceCents, unit_cost_cents: null, card_id: card?.id ?? null,
    collection_id: null, status: 'draft', image_url: offer.imageUrl ?? card?.image_url ?? null };
  rows.push(row);
}
const manifest = { preparedAt: new Date().toISOString(), shopName: settings[0].store_name, sourceBuild: plan.sourceBuild,
  rows: [...new Map([...previousRows, ...rows].map(r => [r.id, r])).values()], skipped, review, instructions: 'Stock is unknown. Count inventory, link singles/playsets to the exact collection row, enter costs, check fulfilment margin, then activate. Never assign stock from catalog coverage alone.' };
await writeFile(new URL('draft-manifest.json', dir), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'stage-drafts' : 'preview', rows: rows.length, skipped: skipped.length, review }, null, 2));
if (process.argv.includes('--apply')) {
  const saved = [];
  for (let i = 0; i < rows.length; i += 100) {
    const { data, error } = await db.from('shop_listings').insert(rows.slice(i, i + 100)).select('id,status,quantity_available,price_cents');
    assert.equal(error, null, error?.message);
    assert.equal(data.length, rows.slice(i, i + 100).length);
    saved.push(...data);
    await writeFile(new URL('staged-receipt.json', dir), JSON.stringify({ stagedAt: new Date().toISOString(), sourceBuild: plan.sourceBuild, saved: [...new Map([...previousSaved, ...saved].map(r => [r.id, r])).values()] }, null, 2) + '\n');
  }
  const verified = await readAll('shop_listings', 'id,status,quantity_available,price_cents', 'owner_user_id');
  for (const row of rows) {
    const actual = verified.find(v => v.id === row.id);
    assert.ok(actual, `Missing created draft ${row.id}`);
    assert.equal(actual.status, 'draft');
    assert.equal(actual.quantity_available, 0);
    assert.equal(actual.price_cents, row.price_cents);
  }
  console.log(`Verified ${saved.length} saved drafts; all have zero stock.`);
}
