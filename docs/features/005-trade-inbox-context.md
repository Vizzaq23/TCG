# Feature 5/365 — Trade inbox card context

**Status:** Implemented  
**Date:** 2026-08-02  

## What it does

Trade offers inbox shows rich card context for both incoming and outgoing offers:

- Card image, set/number, quantity, condition or grade
- Target collection public note (when present)
- Links to catalog card + owner’s for-trade shelf

## Why

Outgoing offers previously lost card details under RLS (you can’t read someone else’s `user_collections` rows). A security-definer RPC returns only offers where you are sender or recipient, with joined card context.

## Apply migration

```powershell
npx supabase db push
```

Or paste `supabase/migrations/20250802000000_trade_offer_context.sql` in the SQL editor.
