# Feature 4/365 — Public shelf notes mode

**Status:** Implemented  
**Date:** 2026-08-02  

## What it does

- Public profiles get a **With notes** shelf tab (`/u/name?notes=1`)
- Collection note editor is a multiline **public note** with a 280-char hint

## Why

Days 1–3 increased profile visits. Notes were already stored and shown, but hard to browse. This makes storytelling cards easy to find and makes authors aware notes are public.

## No migration

Uses existing `user_collections.notes` and `get_public_collection`.
