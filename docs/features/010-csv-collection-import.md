# Feature 10/365 — CSV collection import

**Status:** Implemented  
**Date:** 2026-08-11  

## What it does

Signed-in collectors can import shelf rows from a `.csv` file on **My collection**. Rows match the catalog by `card_number` and upsert into `user_collections` (same card updates quantity/condition/notes/trade/grade fields).

## Why

Bulk-load from spreadsheets or exports without clicking Add on every card. Supports the same fields the collection editor already uses.

## How to use

1. Open `/collection` → **Import CSV**
2. Download the template (or use your own file with a `card_number` column)
3. Preview valid rows → **Import**

## Columns

| Column | Required | Notes |
|--------|----------|--------|
| `card_number` | Yes | Must exist in `cards` |
| `quantity` | No | Integer ≥ 1 (default 1) |
| `condition` | No | Near Mint, Lightly Played, … |
| `notes` | No | Truncated to 280 chars |
| `is_for_trade` | No | true/false |
| `is_graded` | No | true/false |
| `grading_company` | If graded | PSA, BGS, CGC, SGC |
| `grade` | If graded | 1–10 |
| `is_black_label` | No | Only BGS 10 |
| `cert_number` | No | Graded only |
| `slab_image_url` | No | Graded only |
| `estimated_value_usd` | No | Stored as cents |

Limit: 500 rows per request. Unmatched card numbers are reported and skipped.

## No migration

Uses existing `user_collections` unique `(user_id, card_id)` and RLS (authenticated user client).

## Files

- `lib/collection/import-csv.ts` — parse + template
- `app/api/collection/import/route.ts` — auth + catalog lookup + upsert
- `components/collection/CollectionImportDialog.tsx` — UI on `/collection`
