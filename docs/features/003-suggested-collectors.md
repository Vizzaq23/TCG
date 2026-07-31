# Feature 3/365 — Suggested collectors

**Status:** Implemented  
**Date:** 2026-07-30  
**Builds on:** Day 1 social follows + Day 2 public follow stats

## What it does

On `/social`, show a **Suggested for you** list of collectors the signed-in user does not already follow, ranked by how many unique cards they share.

## Pieces

1. Migration `20250731000000_suggested_collectors.sql`  
   - RPC `get_suggested_collectors(p_limit)`  
   - Overlap tier first, then discovery fallback (active shelves)  
   - Includes `follows_you` for social proof
2. Types in `lib/types/database.ts` — `SuggestedCollectorRow`
3. UI `components/social/SuggestedCollectors.tsx` on `/social`

## Apply migration

```powershell
npx supabase db push
```

Or paste the SQL file into the Supabase SQL editor.
