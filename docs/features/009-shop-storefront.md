# 009 — Shop storefront (Phase 1)

Single-merchant storefront layered on the collector app. Buyers browse `/shop`, use a cookie cart, and pay via Stripe Checkout. Inventory decrements only after the Stripe webhook confirms payment.

## Setup

1. Apply migration `supabase/migrations/20250811000000_shop_storefront.sql`.
2. Set env vars (see `.env.local.example`):
   - `SHOP_OWNER_USER_ID` — your Supabase `auth.users` UUID
   - `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY` (required for checkout + webhook)
   - `NEXT_PUBLIC_APP_URL` (local/prod site URL for Stripe redirects)
3. Local webhooks:

```bash
stripe listen --forward-to localhost:3000/api/shop/webhook
```

## Seller flow

1. Sign in as the shop owner.
2. From **My collection** → **List for sale** (singles / playsets) or **Sell desk** for bulk / C-UC lots.
3. Manage stock on `/shop/sell`, fulfill on `/shop/orders`, export history on `/shop/reports`.

## Buyer flow

1. `/shop` → listing → Add to cart → `/cart` → Stripe Checkout.
2. Success page: `/shop/order/success`.
3. Policies: `/shop/shipping`, `/shop/returns`, `/shop/contact`.

## Inventory rules

- Soft hold at Checkout create (`inventory_reservations`).
- `shop_finalize_paid_order` consumes holds, decrements `shop_listings.quantity_available`, and for singles/playsets reduces linked `user_collections` quantity.
- Expired Checkout sessions release holds via webhook.
