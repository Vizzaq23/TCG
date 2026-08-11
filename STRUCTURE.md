# Project structure

Guide to the One Piece TCG Shelf repo. Paths follow the source tree (excluding `.next/`, `node_modules/`, and `.git/`).

```
TCG/
├── app/                    # Next.js App Router (pages, layouts, API)
├── components/             # React UI by domain
├── docs/                   # API docs + OpenAPI
├── lib/                    # Shared utilities, types, Supabase clients
├── scripts/                # Dev / import tooling
├── supabase/               # DB config + migrations
├── public/                 # Static assets + PWA manifest/icons
├── .github/workflows/      # CI (lint, test, build)
├── proxy.ts                # Auth gate + session refresh (Node runtime)
├── package.json
├── vitest.config.ts
├── README.md
└── STRUCTURE.md            # This file
```

---

## Root

| Path | Role |
|------|------|
| `README.md` | Product overview, setup, deploy |
| `STRUCTURE.md` | This map of folders and files |
| `AGENTS.md` / `CLAUDE.md` | Notes for AI coding agents (Next.js conventions) |
| `package.json` | Dependencies and npm scripts |
| `package-lock.json` | Locked dependency tree |
| `tsconfig.json` | TypeScript compiler options |
| `next.config.ts` | Next.js config (React Compiler enabled) |
| `next-env.d.ts` | Next-generated TypeScript refs |
| `postcss.config.mjs` | PostCSS / Tailwind pipeline |
| `eslint.config.mjs` | ESLint flat config |
| `proxy.ts` | Protects `/collection`, `/social`, `/settings`; redirects signed-in users away from `/login` & `/signup`; refreshes Supabase cookies (Node.js runtime) |
| `.env.local` | Local secrets (not committed) |
| `.env.local.example` | Template for env vars |
| `.env.example` | Same keys as `.env.local.example` (no secrets) |
| `.gitignore` / `.gitattributes` | Git ignore / line-ending rules |

---

## `app/` — routes & server entry

Next.js App Router. Each folder is a URL segment unless noted.

```
app/
├── layout.tsx              # Root layout: fonts, header, PWA metadata, SVG filter
├── page.tsx                # Landing (/) — One Piece–themed hero
├── loading.tsx             # Root route skeleton
├── not-found.tsx           # Global 404
├── globals.css             # Tokens, ambient themes, showcase/slab/foil CSS
├── favicon.ico
├── api/
│   ├── admin/prices/refresh/route.ts  # Bearer PRICE_SYNC_SECRET → JustTCG sync
│   ├── prices/sync/route.ts           # Legacy sync (410 Gone)
│   ├── avatar/route.ts     # POST/DELETE profile photo (service-role upload)
│   ├── card-image/route.ts # Proxy for official card art hosts
│   └── v1/                 # Public JSON API (profile, collection, showcase, activity, trades)
├── auth/
│   └── callback/route.ts   # OAuth / email-confirm code exchange → redirect
├── browse/
│   ├── page.tsx            # Catalog grid + filters
│   ├── [cardId]/page.tsx  # Card detail + cached market prices
│   └── loading.tsx
├── collection/
│   ├── page.tsx            # Signed-in collection dashboard (value, alerts)
│   ├── portfolio/page.tsx  # Holdings + CollectionValueCard
│   ├── trades/page.tsx     # Trade offers inbox
│   └── loading.tsx
├── compare/
│   └── page.tsx            # Compare two collectors’ shelves
├── login/
│   ├── page.tsx            # Sign in (+ ?next=)
│   └── loading.tsx
├── settings/
│   ├── page.tsx            # Account / profile customization
│   └── loading.tsx
├── signup/
│   ├── page.tsx            # Create account
│   └── loading.tsx
├── social/
│   ├── page.tsx            # Follow graph, search, following activity
│   └── loading.tsx
└── u/[username]/
    ├── page.tsx            # Public collector shelf + activity + trade CTAs
    ├── loading.tsx
    └── not-found.tsx       # Unknown username
```

| Path | Role |
|------|------|
| `layout.tsx` | Wraps all pages with `SiteHeader`, Geist fonts, card-sharpen SVG |
| `page.tsx` | Marketing home: CTAs, hero showcase preview, benefits |
| `globals.css` | Design tokens, `.home-ambient`, Collector’s Showcase / foil / slab styles, skeleton shimmer |
| `api/avatar/route.ts` | Authenticated avatar upload/remove; ensures Storage bucket; updates `profiles.avatar_url` |
| `api/card-image/route.ts` | Image proxy to avoid hotlink / CORS issues for catalog art |
| `auth/callback/route.ts` | Exchanges `code` for session; sanitizes `next` redirect |
| `browse/page.tsx` | Server-filtered catalog + pagination |
| `browse/[cardId]/page.tsx` | Card detail with variant market prices from cache |
| `collection/page.tsx` | Stats, showcase editor, card rows, set progress, trade alerts |
| `collection/portfolio/page.tsx` | Cache-first valuation + holdings |
| `settings/page.tsx` | Profile customization (photo, username, bio, accent) |
| `social/page.tsx` | Search collectors, suggestions, follow lists, following activity |
| `api/admin/prices/refresh/route.ts` | Secret-gated price refresh (no browser JustTCG) |
| `login/page.tsx` / `signup/page.tsx` | Auth pages; redirect if already signed in |
| `u/[username]/page.tsx` | Public profile, follow stats, showcase hero, shelf grid |

---

## `components/` — UI

```
components/
├── auth/           # Login / signup forms
├── cards/          # Catalog tiles, foil, slabs, browse toolbar
├── collection/     # Dashboard + public shelf pieces
├── layout/         # Site chrome / nav
├── marketing/      # Landing-only visuals
├── prices/         # Market price display + collection value
├── profile/        # Avatar + profile settings
├── social/         # Follows, collector search rows, follow stats
├── trades/         # Trade offers / alerts
└── ui/             # Shared primitives
```

### `components/auth/`

| File | Role |
|------|------|
| `LoginForm.tsx` | Email/password sign-in → hard navigate to safe `next` |
| `SignupForm.tsx` | Sign-up + optional username; email redirect through callback |

### `components/cards/`

| File | Role |
|------|------|
| `CardTile.tsx` | Catalog card cell (image + meta + market price + link to detail) |
| `CardImage.tsx` | Card art with optional proxy + sharpen filter |
| `CardFoil.tsx` | Foil overlay driven by pointer / rarity tier |
| `GradedSlab.tsx` | PSA/BGS/CGC/SGC slab chrome + glare |
| `BrowseToolbar.tsx` | GET form filters for `/browse` |
| `AddToCollectionButton.tsx` | Upsert into `user_collections` |

### `components/prices/`

| File | Role |
|------|------|
| `MarketPrice.tsx` | Compact / detail USD display from cached cents |
| `PriceChangeBadge.tsx` | 24h / 7d change chips |
| `PriceLastUpdated.tsx` | Relative “prices as of” text |
| `CollectionValueCard.tsx` | Estimated total, priced/unpriced, top holdings |

### `components/collection/`

| File | Role |
|------|------|
| `CollectionStats.tsx` | Owner stat cards (RPC) |
| `CollectionRow.tsx` | Edit one collection entry (qty, grade, trade, market) |
| `ShowcasePicker.tsx` | Assign three showcase slots (autosave RPC) |
| `ShowcaseGlassCase.tsx` | Premium public showcase hero + walnut stand |
| `SlabShowcase.tsx` | Older unused slab display (superseded by glass case) |
| `SetProgress.tsx` | Per-set completion UI (sort / hide zero) |
| `CopyShareLink.tsx` | Copy `/u/username` to clipboard |
| `PublicShelfToolbar.tsx` | All cards / For trade / With notes tabs |
| `ShelfMatchCard.tsx` | Visitor vs owner collection overlap snapshot |
| `DailyTreasurePull.tsx` | Per-day spotlight card on public profiles |
| `PortfolioHistory.tsx` | Snapshot chart |
| `PortfolioHoldings.tsx` | Valued / unpriced lists |

### `components/layout/`

| File | Role |
|------|------|
| `SiteHeader.tsx` | Brand, nav, account menu or sign-in |
| `HeaderNav.tsx` | Browse / My collection with active state |
| `HeaderSignInLink.tsx` | Sign-in with `?next=` = current path |
| `AccountMenu.tsx` | Avatar dropdown: public shelf, customize profile, sign out |

### `components/marketing/`

| File | Role |
|------|------|
| `HeroShowcasePreview.tsx` | Static/demo three-card preview for landing |

### `components/profile/`

| File | Role |
|------|------|
| `ProfileSettingsForm.tsx` | Username, display name, bio, accent; avatar uploads via API (`/settings`) |
| `AvatarDropzone.tsx` | Drag/drop + file picker for photos |
| `ProfileAvatar.tsx` | Circular avatar or accent initials |

### `components/social/`

| File | Role |
|------|------|
| `FollowButton.tsx` | Follow / unfollow via RPC |
| `CollectorRow.tsx` | Search / list row with avatar + follow |
| `CollectorSearchForm.tsx` | Username search form for `/social` |
| `FollowingLists.tsx` | Following + followers columns |
| `SocialActivityFeed.tsx` | Activity from people you follow |
| `ProfileFollowStats.tsx` | Public follower/following counts + list dialog |
| `SuggestedCollectors.tsx` | Overlap-based suggestions on `/social` |

### `components/ui/`

| File | Role |
|------|------|
| `Button.tsx` | Primary / secondary / ghost / destructive |
| `Field.tsx` | Label wrapper + `Input` / `Select` |
| `PageContainer.tsx` | `max-w-6xl` page shell |
| `SectionHeader.tsx` | Title + description + actions |
| `Badge.tsx` | Small status chips |
| `StatCard.tsx` | Dashboard metric cell |
| `Pagination.tsx` | Page links for browse |
| `Skeleton.tsx` | Shimmer primitives + `PageSkeleton` presets |

---

## `lib/` — shared logic

```
lib/
├── auth/safe-next.ts       # Allow only internal redirect paths
├── collection/set-progress.ts
├── justtcg/                # Secure JustTCG HTTP client + OPTCG matching
├── prices/                 # card_prices repository, display selection, valuation
├── money.ts                # cents ↔ USD display
├── portfolio.ts            # Holdings helpers
├── supabase/
│   ├── client.ts           # Browser Supabase client
│   ├── server.ts           # Server Components / Route Handlers
│   └── middleware.ts       # Cookie-aware client for proxy / session refresh
├── types/
│   ├── database.ts         # Generated-style DB types
│   └── grading.ts          # Companies, grades, helpers
├── validators/username.ts
├── cn.ts                   # className join helper
├── env.ts                  # isSupabaseConfigured()
├── foil.ts                 # Foil tier from rarity / name
└── profile.ts              # Accents, bio/display-name helpers
```

| Path | Role |
|------|------|
| `auth/safe-next.ts` | Blocks open redirects (`//`, absolute URLs) |
| `collection/set-progress.ts` | Computes owned/total per set name |
| `collection/daily-treasure.ts` | Deterministic daily spotlight picker |
| `justtcg/*` | API client (`x-api-key`), types, card match scoring |
| `prices/repository.ts` | Upsert `card_prices` + denorm NM onto `cards` |
| `prices/select-display-price.ts` | Pick display variant (NM / preferred / graded label) |
| `prices/collection-value.ts` | Estimated total, top 5, by-set |
| `prices/freshness.ts` | 24h stale helpers for sync |
| `supabase/*` | Three Supabase client factories (browser / server / middleware) |
| `types/database.ts` | Tables, RPCs, public collection row shapes |
| `types/grading.ts` | Graded slab data model + formatters |
| `validators/username.ts` | Normalize + validate public usernames |
| `profile.ts` | Shelf accent presets and field normalizers |
| `foil.ts` | Maps rarity → foil visual tier |
| `env.ts` | Whether public Supabase env vars are present |
| `cn.ts` | Tiny `cn(...)` for conditional classes |
| `shelf-links.ts` | Public shelf `#card-…` deep-link helpers |

---

## `scripts/`

| Path | Role |
|------|------|
| `setup-dev.ps1` | Start local Supabase, write `.env.local` |
| `import-catalog.ts` | Fetch/import card catalog (needs service role) |
| `sync-justtcg-prices.ts` | CLI price sync (`npm run prices:sync`) |

---

## `supabase/`

```
supabase/
├── config.toml             # Local Supabase project config
├── .gitignore
└── migrations/             # Ordered SQL migrations
```

| Migration | What it adds |
|-----------|----------------|
| `20250503000000_init.sql` | Profiles, cards, collections, views, RLS, core RPCs |
| `20250504110000_signup_trigger_fix.sql` | Robust new-user → profile trigger |
| `20250505000000_catalog_import_setup.sql` | Import-friendly card constraints / helpers |
| `20250713000000_showcase_shelf.sql` | Top-3 showcase slots + public showcase RPC |
| `20250713160000_graded_slabs.sql` | Graded fields + public collection RPC updates |
| `20250713170000_bgs_black_label.sql` | BGS Black Label support |
| `20250713180000_profile_customization.sql` | `bio`, `accent` on profiles |
| `20250713190000_skip_own_profile_views.sql` | Don’t count owner self-views |
| `20250713200000_avatar_storage.sql` | `avatars` Storage bucket + policies |
| `20250713210000_portfolio_trades_activity.sql` | Portfolio snapshots, trades, activity |
| `20250713220000_justtcg_market_prices.sql` | Denorm market columns on `cards` |
| `20250714000000_card_prices.sql` | `card_prices` + snapshots + valuation SQL |
| `20250729000000_social_follows.sql` | Follow graph, search, following activity |
| `20250730000000_public_follow_stats.sql` | Public follower/following counts + list RPCs |
| `20250731000000_suggested_collectors.sql` | Suggested collectors by shared cards |
| `20250802000000_trade_offer_context.sql` | Trade inbox RPC with card context |

Apply with `npx supabase db push` or by running files in the Supabase SQL editor (in order).

---

## `public/`

Default Next.js static SVGs (`next.svg`, `vercel.svg`, etc.). App imagery mostly comes from the card catalog / Storage, not this folder.

---

## Request flow (mental model)

```
Browser
  → proxy.ts (session + /collection guard, Node runtime)
  → app/*/page.tsx (Server Components)
       ↔ lib/supabase/server.ts → Supabase Postgres / Auth
  → Client components (forms, showcase, upload)
       ↔ lib/supabase/client.ts or /api/avatar
```

Public shelf: `app/u/[username]/page.tsx` → `record_collection_view` (skipped for owner) → `get_public_collection` / `get_public_showcase` → `ShowcaseGlassCase` + card grid.
