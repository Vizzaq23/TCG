# Shared card catalog

The site's browse pages, collection entries, comparisons, trade alerts and shop listings use `public.cards` in Supabase. Its UUIDs are the durable identities referenced by user data. Journey also has a local story snapshot; updating Journey alone does not add collectible cards to the main site.

The September 7, 2026 refresh added 1,683 database records and preserved all 4,571 existing UUIDs, bringing the shared catalog to 6,254 records. Every one of the 1,530 marketplace products in the imported source was verified after insertion. A second plan required no inserts or identity changes.

## Sources and coverage

- The English Bandai catalog is exported through [Punk Records](https://github.com/buhbbl/punk-records): 4,843 printing identifiers across 60 products.
- [TCGplayer promotion cards](https://www.tcgplayer.com/categories/trading-and-collectible-card-games/one-piece-card-game/one-piece-promotion-cards): 1,276 singles.
- [TCGplayer OP-17](https://www.tcgplayer.com/product/712607/one-piece-card-game-the-world-s-strongest-warriors-monkey-d-luffy-030): 179 singles, including every OP17-001 through OP17-119 number, SP reprints and DON!! cards.
- OP-17 Release Event Cards: 75 singles.
- Structured TCGplayer product metadata is obtained through the [documented TCGCSV export](https://tcgcsv.com/docs), category 68, groups 17675, 24736 and 24775. The checked-in snapshot records source build time and canonical TCGplayer product URLs. 145 sealed/accessory records are excluded; oversized promos and unnumbered leaders are retained. 64 product records have no supplied artwork.

TCGplayer product IDs identify individual marketplace printings. A printed card number alone cannot establish which promo, stamped, parallel, or alternate illustration a product represents. Regular OP-17 products with matching base names are linked to their corresponding Bandai base identifiers. Other products receive stable internal identifiers such as `P-106_tcg123456`; unnumbered records use `TCG-123456`. These suffixes are internal identities, not printed card numbers. Existing explicit marketplace mappings take precedence. Unresolved equivalence across sources can result in separate catalog entries, which must not be described as independently verified unique artwork.

Existing source rows, user collections and market prices are not deleted or overwritten by this sync. New marketplace identity fields are attached only when empty. Price lookup requires the exact TCGplayer product; it cannot silently substitute a cheaper base card for a promo or alternate printing. New cards may have no cached price until the price provider supplies one.

## Refresh

1. Run `node scripts/node-system-ca.mjs --import tsx scripts/import-catalog.ts --json` to refresh the complete English export at `data/catalog.json`.
2. Run `node --use-system-ca scripts/import-tcgplayer-catalog.mjs` to refresh the marketplace snapshots. The importer checks the upstream build marker and caches raw exports.
3. Run `node scripts/node-system-ca.mjs --import tsx scripts/sync-site-catalog.ts` to generate a read-only plan at `.next/catalog-sync/plan.json`.
4. Inspect the additions, identities and source coverage. Run the same sync command with `--apply` to insert missing records and link identities. It verifies all prior UUIDs, all source product IDs and an empty repeat plan. No migrations, table resets, collection changes or price refreshes are performed.

Search supports names, printed numbers, set names, promo aliases, and spellings such as OP17 or OP-17. Browse metadata and collection set progress page through the catalog instead of relying on Supabase's first 1,000 rows.
