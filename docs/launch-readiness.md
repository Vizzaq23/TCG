# Storefront launch readiness

Audit date: 2026-08-30

Current verdict: **NO-GO**. The collection product remains usable, but customer
checkout must stay offline until every launch blocker below is closed and a full
Stripe test-mode order succeeds end to end.

## Scope inspected

- Repository and current working tree
- GitHub PR #14 and its PR #15 follow-up
- Current Vercel production deployment (`tcg-lyart.vercel.app`)
- Hosted Supabase project schema, RLS, Auth, email, and backup settings
- Stripe Checkout, webhook, refund, inventory, and order code paths
- Production storefront in Chrome at desktop and 390 × 844 mobile widths

## 1. Launch blockers

### Merchant decisions required

These must be supplied by the store owner; the code intentionally does not invent
defaults for them.

- Product pricing and launch inventory quantities
- Shipping charge, supported regions, carrier, handling time, and packaging promise
- Tax registration and whether Stripe automatic tax is enabled
- Returns, cancellations, refund eligibility, and refund timing
- Legal business identity and required seller disclosures
- Customer-support email and other public contact information
- Final privacy policy, terms, shipping policy, and return/refund policy

### Manual platform configuration required

- Change Supabase Auth Site URL from localhost to the final HTTPS origin and add the
  production `/auth/callback` redirect.
- Configure production SMTP. Supabase's built-in email service is not suitable for a
  customer-facing launch.
- Enable recoverable database backups (the audited Free plan has no managed backups),
  or document and test an external backup/restore process.
- In Vercel, add all storefront environment variables listed below and mark every
  server-only value as Secret. `SUPABASE_SERVICE_ROLE_KEY` was stored as Config during
  the audit and must be re-saved as Secret.
- Configure a production custom domain, then use that exact origin for
  `NEXT_PUBLIC_APP_URL`, Supabase Auth, Stripe redirects, canonical metadata, and the
  webhook endpoint.
- Configure an external error-monitoring destination and alerts. The app now has safe
  fallback UI and structured platform logs, but no external alerting service was chosen.
- Choose and configure customer order email and internal order notification delivery.
  Stripe receipt email alone must not be assumed until it is enabled and verified.

### Stripe test-mode verification required

- Sign in to Stripe and use a matching `pk_test_…` / `sk_test_…` key pair.
- Create a test webhook endpoint at
  `https://<final-domain>/api/shop/webhook` with these events:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `charge.refunded`
- Add the endpoint's `whsec_…` signing secret to Vercel.
- Complete successful, cancelled, failed, retried, double-clicked, refreshed, sold-out,
  expired-session, and refunded test orders.
- Confirm one and only one order, inventory decrement, ledger entry, and notification
  occurs for duplicate webhook delivery and duplicate checkout submission.
- Keep `STRIPE_LIVE_PAYMENTS_ENABLED=false`. Enabling live payments requires explicit
  owner approval after all checks pass. Never perform a real charge for verification.

### Release verification still required

- Deploy the completed tree and repeat Chrome checks at desktop and true mobile widths.
- The currently deployed commit is not the hardened working tree. Its desktop shop has
  no semantic `h1`; at 390 × 844 it renders 630 CSS pixels wide, clips navigation, and
  shows a horizontal scrollbar.
- Verify `/robots.txt`, `/sitemap.xml`, social preview, canonical URL, favicon, security
  headers, auth redirects, checkout redirects, and webhook delivery on the final domain.

## 2. Important after launch

- Add product and checkout funnel analytics after choosing a privacy-compatible tool and
  updating consent/privacy disclosures as required.
- Add automated restore drills and retention monitoring for backups.
- Add operational alerts for webhook failures, payment/inventory mismatches, pending
  orders older than the Checkout expiry, and notification delivery failures.
- Consider splitting legacy combined order `status` from the new payment and fulfillment
  fields throughout every admin view once historical data is confirmed.
- Add automated accessibility scanning and continuous mobile visual regression coverage.

## 3. Optional enhancements

- Dynamic product URLs in the sitemap after inventory cadence is established.
- Additional payment methods after their delayed-payment inventory semantics are tested.
- Customer accounts with self-service order history, cancellation requests, and return
  authorization workflows.
- Richer merchandising, discount codes, wish lists, and abandoned-cart recovery.

## Decision-free safeguards implemented in this phase

- The hosted launch-safety migration is applied and the linked `public` schema passes
  Supabase's warning-level database lint with no findings.

- Checkout is fail-closed for missing/mixed Stripe keys, an unset tax mode, missing
  webhook secret, missing rate-limit secret, or live keys without the live-payment lock.
- Store settings default offline with no shipping-price default; an explicit
  `launch_ready_at` marker and support contact are required.
- Cart input is bounded and duplicate submissions share a stable checkout token.
- Order creation, server-side price snapshots, and inventory holds are atomic in
  Postgres; browser prices are never trusted.
- Stripe Checkout creation uses an idempotency key and resumes an existing open session.
- Cancellation and Stripe failure preserve the customer's cart. A paid success return
  clears only the matching cart after server-side verification.
- Signed webhook events are mode checked, idempotent, amount/currency/tax validated, and
  only paid sessions can decrement inventory. In-progress event claims become retryable
  after a worker crash instead of permanently discarding the event.
- Refund creation and optional restocking are independently idempotent.
- Seller cost basis and collection identifiers are no longer publicly queryable.
- Checkout attempts are durably rate limited using an HMAC fingerprint.
- Optional signed-in UI state uses verified JWT claims, duplicate checks are deduplicated
  within a render, and navigation prefetch no longer floods Supabase Auth.
- Security headers, safe error fallbacks, canonical/social metadata, robots rules,
  sitemap, keyboard navigation, page headings, and mobile hit areas are present.

## Verification completed on the hardened working tree

- Vitest: 13 files and 64 tests passed.
- ESLint: passed with no findings.
- TypeScript: `tsc --noEmit` passed.
- Next.js 16.2.4 production build: passed; 37 static/dynamic routes generated.
- Local production server: `/shop`, `/robots.txt`, and `/sitemap.xml` return 200;
  CSP, HSTS, frame denial, MIME sniffing protection, and referrer policy are present.
- Chrome desktop: no horizontal overflow and a semantic shop heading is present.
- Chrome 390 × 844: no horizontal overflow, mobile navigation is usable, and the shop
  remains visibly fail-closed while launch settings are incomplete.
- Secret scan: `.env.local` is ignored; no tracked Stripe secret or service-role token
  was found. The only tracked JWT-shaped value is the intentionally public Supabase anon
  key used by CI.

## Required Vercel environment variables

Public values:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test key until launch approval)

Server-only secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SHOP_OWNER_USER_ID`
- `STRIPE_SECRET_KEY` (test key until launch approval)
- `STRIPE_WEBHOOK_SECRET`
- `SHOP_RATE_LIMIT_SECRET`
- `JUSTTCG_API_KEY`
- `PRICE_SYNC_SECRET`

Explicit non-secret controls:

- `STRIPE_TAX_MODE=none` or `automatic` only after the owner decides tax policy
- `STRIPE_LIVE_PAYMENTS_ENABLED=false` until an approved live launch

## Final launch gate

Launch is allowed only when all launch blockers are closed, the hosted migration and
environment are verified, Chrome desktop/mobile checks pass, a complete Stripe test-mode
order/refund cycle passes, and the owner explicitly authorizes live payments.
