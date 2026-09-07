# Journey archive

Journey is a checked-in, account-free story archive at `/journey`. It presents card artwork in a manga-inspired reader and links to referenced chapters on TCB. The homepage and shared shell use the same paper, ink, and red visual direction.

## Catalog sources

- [Punk Records](https://github.com/buhbbl/punk-records) supplies the English product catalog and additional printing IDs from the Japanese catalog. English entries take precedence for IDs shared by both catalogs; Japanese additions retain their original names and source provenance. This is not a claim that both languages' art variants are identical.
- [OPTCG API](https://optcgapi.com/documentation) supplies DON!! cards. Its `card_image_id` is preserved separately from Journey's stable `DON-001` style identifier; these are archive identifiers, not printed card numbers. Records without artwork remain visible with an explicit placeholder.
- `marketplace-catalog.ts` overlays TCGplayer promotional, OP-17 and OP-17 release-event singles from the checked-in TCGCSV export. Regular OP-17 records gain marketplace links; unresolved promo/parallel identities retain separate source identifiers and full variant names. Their missing artwork and unspecified language remain labeled. See [shared catalog source notes](../../docs/catalog-sources.md) for database sync and preservation details.
- `lib/catalog/all-cards.json` records import time, sources, coverage, card provenance and character facts; `sets.json` records product memberships. Previews and announced cards present in a source are included.
- Refresh the catalog with `node --use-system-ca scripts/import-journey-catalog.mjs`. Inspect the source counts and coverage changes before committing an updated snapshot. Rendering never depends on a live scrape.

## Story references

- Character facts come from the [One Piece character dataset](https://huggingface.co/datasets/yjg30737/onepiece-characters), a structured One Piece Wiki snapshot. Individual source links are retained. First mentions, silhouettes, special chapters, film continuity and unmapped origins need distinct labels.
- `catalog.ts`, `stories.ts`, `debuts.json`, and `lib/catalog/op01.json` retain the original OP-01 editorial seed. Original prose may be reused for the same character in later products. It does not establish the origin of a new illustration.
- `chapters.json` contains the factual chapter index retrieved from [TCB's One Piece index](https://tcbonepiecechapters.com/mangas/5/one-piece). Only supplied titles are stored. Missing titles remain null; chapter URLs are never guessed.
- `scene-connections.ts` contains original summaries for 16 curated story moments. Twelve regular event printings have checked scene connections; four others are explicitly contextual. `getSceneConnection` downgrades unverified alternate artwork to context.
- `chapter` preserves an indexed debut/reference. `storyChapter` is the chapter displayed by the reader and used in manga chronology. `sceneChapter` is only populated for verified artwork. An unknown connection never becomes a guessed chapter.
- Chapter buttons open TCB externally. No complete chapters or manga scan pages are bundled. Story summaries are original editorial text, not claimed to be written or endorsed by Eiichiro Oda.

## Behavior

The server archive module handles search, product/type filtering, chronology, selected cards and pagination. Only a 24-card page and selected record are serialized to the client; the full JSON catalog is not a client import. `/api/journey` is read-only.

Selection and filters have shareable query parameters. Changing filters preserves the selected story. Empty states, failed requests and missing artwork remain explicit. Aborted or superseded requests cannot overwrite newer searches.

Explored printings are stored on this device. Progress migrates from the earlier OP-01 storage key; corrupt or unavailable local storage is handled without blocking the reader. Story notes are visible initially and can be hidden with the spoiler control; card names and artwork remain visible.

Random Encounter uses a read-only POST endpoint to select a card with artwork and an indexed chapter. Each base number has equal draw probability, independent of how many promo printings it has. The current base is excluded; unseen bases are preferred. The browser sends at most 1,000 recent/explored identifiers, and the endpoint neither stores them nor caches its response. The discovery trail keeps the last 20 selections for this page session. Story links can be copied, with a selectable URL fallback when clipboard access is unavailable.

The collectible-card button resolves an exact database card number or TCGplayer product ID. If the printing is unavailable, it opens catalog search instead of substituting a base illustration. Matching catalog detail pages link back to the Journey entry.

Validation covers catalog completeness against imported snapshots, query behavior, bounded responses, debut/scene distinctions, chapter index integrity, alternate-printing safeguards and local-progress parsing.
