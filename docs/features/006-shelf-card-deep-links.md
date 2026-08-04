# Feature 6/365 — Shelf card deep links

**Status:** Implemented  
**Date:** 2026-08-03  

## What it does

Every public shelf card gets a stable URL fragment:

`/u/{username}#card-{card_id}`

Trade alerts, activity feeds, and compare rows link to that exact card. The target card highlights (amber ring) and scrolls into view under the sticky header.

## Why

Days 4–5 make individual cards more meaningful (notes, trade context), but links still dropped people on a whole shelf. Deep links finish the loop: alert → exact card → trade CTA / note.

## No migration

Uses existing `card_id` fields on public collection, trade alerts, activity payloads, and compare results.

## Follow-up

When Day 5 trade inbox merges, point its “View shelf” link at `shelfCardPath(owner, cardId, { trade: true })`.
