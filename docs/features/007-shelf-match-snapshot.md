# Feature 7/365 — Shelf match snapshot

**Status:** Implemented  
**Date:** 2026-08-04  

## What it does

On a public profile `/u/{username}`, signed-in visitors (not the owner) see a **Shelf match** card:

- Shared cards  
- Only you own  
- Only they own  
- CTA → `/compare?a={you}&b={them}`

Signed-out visitors see a soft “Sign in to see how your shelf matches…” prompt.

## Why

After social discovery + deep links, visitors need a quick answer: “Do our collections overlap enough to trade or compare?” Reuses existing `compare_collectors` RPC — no migration.

## Acceptance

- Owner never sees the match card on their own shelf  
- Compare counts match the full `/compare` page  
- Compare RPC failure does not break the profile page  
