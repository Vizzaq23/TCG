# Feature 2/365 — Public follow stats & social proof

**Status:** Implemented  
**Date:** 2026-07-30  
**Builds on:** Day 1/365 — Social follows + public collection notes (2026-07-29)

---

## Day 1 recap

Yesterday shipped the social foundation:

- `follows` table + `follow_user` / `unfollow_user` RPCs
- `/social` — search collectors, following/followers lists, following activity feed
- Follow button on public profiles (`/u/[username]`)
- Public display of per-card `notes` on the shelf

**Gap left for Day 2:** Public shelves show a Follow button but no follower/following counts, no “Follows you” signal, and no way for visitors to browse who follows a collector. RLS on `follows` only lets the two parties read edges, so counts are invisible to everyone else.

---

## Recommendation: Public follow stats on profiles

Ship **social proof on the public shelf** — the natural next slice after Day 1 follows.

### User value

- Collectors see their shelf gaining an audience.
- Visitors can judge how connected a collector is before following.
- Mutual / “Follows you” context makes follow decisions clearer.
- Completes the Day 1 social loop without inventing a new product surface.

### Scope (one daily shippable slice)

**In**

1. Public follower + following counts on `/u/[username]`
2. “Follows you” badge when the profile owner follows the signed-in viewer
3. Optional lightweight modal/page for signed-in users to browse that profile’s followers / following (reuse `CollectorRow`)
4. Security-definer RPCs so counts work under current RLS
5. Docs/README mention of Social + follow stats

**Out (later days)**

- Follow notifications / email
- Suggested collectors / overlap ranking
- Private accounts or follow requests
- Activity events for “X followed Y”
- Public API follow endpoints

---

## Technical approach

### 1. Migration — public-safe social RPCs

New file: `supabase/migrations/20250730000000_public_follow_stats.sql`

```sql
-- Counts visible to anyone (anon + authenticated)
get_profile_follow_stats(target_username text)
  → { follower_count int, following_count int }

-- Relationship relative to auth.uid() (authenticated only)
get_profile_follow_relationship(target_username text)
  → { is_following boolean, follows_you boolean }

-- Paginated lists for signed-in viewers (authenticated only)
get_profile_followers(target_username text, p_limit int, p_offset int)
get_profile_following(target_username text, p_limit int, p_offset int)
  → same shape as search_profiles rows (id, username, display_name, avatar_url, bio, is_following)
```

Notes:

- All functions `security definer` with `set search_path = public`.
- Grant `get_profile_follow_stats` to `anon` + `authenticated`.
- Grant relationship + list RPCs to `authenticated` only (keeps lists behind sign-in; counts stay public).
- Do **not** open broad SELECT RLS on `follows` — keep edge privacy, expose only aggregates/lists via RPC.

### 2. Types

Update `lib/types/database.ts`:

- `Functions.get_profile_follow_stats`
- `Functions.get_profile_follow_relationship`
- `Functions.get_profile_followers` / `get_profile_following`
- Shared row type if useful: `ProfileFollowListRow` (mirror `ProfileSearchRow`)

### 3. Public profile UI

Update `app/u/[username]/page.tsx`:

- Fetch `get_profile_follow_stats` for every visitor.
- If signed-in and not owner: also fetch `get_profile_follow_relationship`.
- Under `@username` / bio, render compact stats:

  `12 followers · 8 following`

- If `follows_you`: small text badge near Follow button (“Follows you”).
- Counts are links (signed-in) to `?social=followers` / `?social=following` on the same profile, or open a client panel.

New component (suggested): `components/social/ProfileFollowStats.tsx`

- Displays counts
- Optional panel listing followers/following via RPC
- Reuses `CollectorRow` + `FollowButton`

### 4. Empty / edge states

| State | Behavior |
|-------|----------|
| 0 followers / 0 following | Show `0` (don’t hide) |
| Anonymous visitor | Counts visible; lists prompt sign-in |
| Own profile | Counts visible; no Follow button; no “Follows you” |
| Missing migration | Soft error or omit stats (match `/social` pattern) |

### 5. Docs

- `README.md` — add Social + follow stats under Features
- `STRUCTURE.md` — note new migration + `ProfileFollowStats`
- `docs/API.md` — optional note that follow graph is app-only for now (no public REST yet)

---

## Acceptance criteria

- [ ] `/u/{username}` shows accurate follower and following counts for anon and signed-in visitors
- [ ] Following / unfollowing updates counts after refresh (or optimistic + refresh)
- [ ] Signed-in non-owner sees “Follows you” when the profile follows them
- [ ] Signed-in users can open followers and following lists for that profile
- [ ] Lists show follow state for each row (can follow/unfollow from the list)
- [ ] Owner does not see Follow / Follows you on their own shelf
- [ ] No new broad RLS that exposes the full `follows` table to the world
- [ ] Migration applies cleanly on top of `20250729000000_social_follows.sql`
- [ ] Lint / unit tests pass; smoke-test follow → count bump → unfollow → count drop

---

## Implementation phases

### Phase A — Data layer

1. Write migration with the four RPCs
2. Update `lib/types/database.ts`
3. Apply migration locally / hosted Supabase

### Phase B — Profile header UI

1. Add `ProfileFollowStats` (counts + “Follows you”)
2. Wire into `app/u/[username]/page.tsx` header next to Follow button
3. Mobile layout: counts wrap cleanly under name/bio

### Phase C — Lists

1. Add followers/following panel or query-param sections
2. Reuse `CollectorRow`; cap page size (e.g. 40) with simple “Show more” if needed
3. Gate list fetch behind auth; show sign-in CTA for anon

### Phase D — Polish & verify

1. Update README / STRUCTURE
2. Manual QA matrix (anon / signed-in / owner / mutual follow)
3. Confirm Day 1 `/social` still works unchanged

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| RLS still blocks direct count queries | Only use security-definer RPCs |
| Count vs list drift if someone unfollows mid-view | Lists and counts fetched in same request; refresh after toggle |
| Hot profiles / large follower graphs | Limit list pages; counts via `count(*)` indexes already on `follows` |
| Privacy expectations | Document that follower/following lists are visible to signed-in users (Instagram-style public social) |

---

## Alternates (if you want a different Day 2)

Ranked backups that also fit a one-day ship:

| # | Feature | Why it fits | Size |
|---|---------|-------------|------|
| A | **“With notes” shelf tab** (`?notes=1`) | Extends Day 1 notes display; no schema | Small |
| B | **Public-note composer** (textarea, “Shown publicly”, char count) | Improves note authoring quality | Small |
| C | **Trade inbox shows target note/condition/grade** | Makes trades more informed | Small–medium |
| D | **Suggested collectors** (overlap with people you don’t follow) | Uses compare + follows | Medium |

Stick with **public follow stats** unless you explicitly want to deepen notes/trades instead of social.

---

## Suggested commit / PR title (when implementing)

`feat(social): public follow stats and Follows you on profiles (2/365)`
