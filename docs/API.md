# Public API

Base URL: your deployment origin (e.g. `https://your-app.vercel.app`).

All `/api/v1` JSON endpoints below. OpenAPI: [`docs/openapi.yaml`](./openapi.yaml).

## Auth

| Endpoint | Auth |
|----------|------|
| `GET /api/v1/profiles/:username` | Public |
| `GET /api/v1/profiles/:username/collection` | Public |
| `GET /api/v1/profiles/:username/showcase` | Public |
| `GET /api/v1/profiles/:username/activity` | Public |
| `POST /api/v1/trade-offers` | **Session cookie** (signed-in user) |

Public reads never expose `estimated_value_cents` (portfolio values stay owner-only via RLS). Catalog **market** prices from `cards.market_price_cents` / `card_prices` are OK to show on public shelf UIs.

## Ops / admin (not public API)

| Endpoint | Auth | Notes |
|----------|------|-------|
| `POST /api/admin/prices/refresh` | `Authorization: Bearer $PRICE_SYNC_SECRET` | Refreshes stale JustTCG prices into Supabase |
| `POST /api/prices/sync` | — | **410 Gone** (quota protection). Use CLI or admin refresh |

CLI: `npm run prices:sync -- --limit 5`

## Examples

### Profile

```http
GET /api/v1/profiles/luffy
```

```json
{
  "username": "luffy",
  "display_name": "Monkey D. Luffy",
  "avatar_url": null,
  "bio": "King of the pirates",
  "accent": "amber",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

### Collection

```http
GET /api/v1/profiles/luffy/collection
```

Returns `{ username, count, cards[] }` with trade/grade fields. No private valuations.

### Showcase

```http
GET /api/v1/profiles/luffy/showcase
```

### Activity

```http
GET /api/v1/profiles/luffy/activity?limit=15
```

### Create trade offer (authenticated)

Browser session (same-origin cookies after sign-in):

```http
POST /api/v1/trade-offers
Content-Type: application/json

{
  "target_collection_id": "<uuid of a for-trade user_collections row>",
  "message": "I can offer OP01 Luffy + OP02 Zoro"
}
```

`401` if not signed in. `400` if the card is not for trade or you already have a pending offer.

## Privacy notes

- Direct `user_collections` reads require ownership (RLS).
- Public shelf data goes through `get_public_collection` / `get_public_showcase` / `get_public_activity`.
- Trade offers are visible only to the two parties.
- Manual `estimated_value_cents` and value snapshots are owner-only.
- Public UIs may show **catalog market** prices (JustTCG cache), never owner manual estimates.
