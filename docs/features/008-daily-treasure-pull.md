# Feature 8/365 — Daily Treasure Pull

**Status:** Implemented  
**Date:** 2026-08-09  

## What it does

Each public profile spotlights **one card from the shelf per UTC day** as today’s “treasure.” Selection is deterministic (`username + YYYY-MM-DD`), so everyone sees the same card for that collector on that day. CTA jumps to the shelf deep link.

## Why

Playful reason to revisit a shelf tomorrow. Surfaces cards beyond the 3-slot showcase. Builds on deep links + public notes.

## No migration

Uses `get_public_collection` rows already loaded on the profile page.
