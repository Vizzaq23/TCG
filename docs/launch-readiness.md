# Storefront launch readiness

Audit updated: 2026-08-31

Current verdict: **NO-GO for customer payments**. The collection and profile
features can remain online, and the storefront can be deployed in its fail-closed
state, but checkout must remain disabled until the launch blockers below are closed
and a complete Stripe test-mode order/refund cycle passes.

## Scope inspected

- Repository, current `main`, and launch-readiness changes
- GitHub PR #14 and its follow-up changes
- Current Vercel production deployment (`tcg-lyart.vercel.app`)
- Hosted Supabase schema, migrations, RLS, Auth settings, email, and backup posture
- Stripe test dashboard, Checkout settings, webhook configuration, email settings,
  account verification, Tax status, and the application payment workflow
- Storefront behavior at desktop and 390 × 844 mobile widths in Chrome

## 1. Launch blockers

### Business decisions still required

The application intentionally does not invent these values.

- **Tax:** the store's operating/ship-from state, registrations, and whether Stripe
  Tax will be enabled. Available capital does not determine sales-tax obligations.
- **Pricing:** the exact TCGplayer-derived selling-price rule by printing and
  condition, including any markup, discount, minimum price, and rounding. The app
  currently imports TCGplayer-linked market data through JustTCG; storefront listing
  prices are still entered explicitly by the seller.
- **Inventory:** launch quantities for each listing.
- **Returns/cancellations:** eligibility, deadlines, item-condition rules, fees,
  refund timing, and treatment of orders that have already shipped.
- **Business identity:** legal seller/entity name, operating address/state, public
  store name, and required disclosures.
- **Customer support:** public support email and any phone/mailing contact to publish.
- **Shipping operations:** carrier/service, handling time, tracking threshold, and
  packaging/loss/damage language.

The owner has decided **United States only, flat $4.99 shipping**. That decision is
reflected in the public shipping page, but cannot be activated in `shop_settings`
until the correct owner profile is identified and the remaining shipping policy text
is approved.

### Store identity and sealed-product distribution

An online brand alone cannot guarantee sealed-product allocation. Distributor
applications generally require a legal resale business, sales-tax/resale documents,
government identification, and business verification. Several major game
distributors currently require a permanent brick-and-mortar retail location and may
still restrict or allocate new trading-card products. Before applications are
prepared, confirm whether this business will be online-only or will operate a staffed
physical retail location with signage and organized play.

### Stripe account and test-mode setup

The Stripe dashboard was inspected in test mode. The code is protected, but the
account and endpoint are not launch-ready:

- Verify the Stripe account email and complete business/merchant verification.
- Add the public business name, support details, branding, and store-policy links to
  Stripe Checkout.
- Rotate the currently exposed test secret before putting test credentials in Vercel.
- Create a **test** webhook endpoint at
  `https://<deployed-origin>/api/shop/webhook` for:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `charge.refunded`
- Save the endpoint's new `whsec_…` value as a Vercel server secret.
- Keep `STRIPE_LIVE_PAYMENTS_ENABLED=false`. Live payments require explicit owner
  approval after test-mode verification; no real charge is authorized for testing.
- Stripe Tax is not configured. Do not enable automatic tax or collect tax until the
  operating state, nexus/registration position, and tax approach are confirmed.
- Stripe's successful-payment and refund customer email switches are currently off.
  They may be enabled as supplemental receipts after action-time confirmation, but
  the application email outbox remains the authoritative order notification path.

### Stripe test scenarios required

- Successful card payment and order confirmation
- Customer cancellation and return to an intact cart
- Declined/failed payment, retry, and delayed-payment failure
- Refreshing success, cancel, and Checkout pages
- Double-clicked checkout and repeated checkout submission
- Sold-out and simultaneous last-item purchase protection
- Expired Checkout session and inventory release
- Duplicate and out-of-order webhook delivery
- Full and partial refund behavior, including the approved restock choice
- Exactly one paid order, inventory decrement, ledger entry, customer email, and
  internal notification for duplicated submissions/events

### Email and SMTP setup

Approved approach: **Resend**.

- The application now has a durable, RLS-protected email outbox for customer paid-order
  confirmations and internal paid-order notices. Claims, retries, and provider
  idempotency keys prevent normal webhook retries from sending duplicate mail.
- Verify a sending domain in Resend and configure SPF, DKIM, and DMARC.
- Create a Resend API key and configure `RESEND_API_KEY`, `ORDER_EMAIL_FROM`, and
  `ORDER_NOTIFICATION_EMAIL` in Vercel.
- Configure Supabase Auth custom SMTP using Resend SMTP credentials; do not rely on
  Supabase's built-in best-effort development mailer.
- Send and inspect a test signup email, password-reset email, customer order email,
  and internal order email before launch.

### Monitoring and backups

Approved approach: **Sentry + Vercel Observability + Supabase managed backups**.

- Sentry error capture is integrated without default PII and with low production
  trace sampling. Create the Sentry project, configure the DSN/source-map secrets,
  create alerts for checkout/webhook errors, and verify with a test event.
- Basic Vercel Observability is available on the current Hobby plan. Vercel confirms
  that anomaly alerts, custom queries, and 30-day retention require Pro, so Sentry
  alerts must be the launch alerting path unless the Vercel plan is upgraded.
- The Supabase dashboard confirms the organization is on **Free** and explicitly
  states that Free projects do not include project backups. The lower-level backup
  API reports WAL-G enabled, but there is no customer restore point. Upgrade Supabase
  to a tier with scheduled backups (the dashboard currently advertises up to seven
  days on Pro), then wait for and verify the first restore point before taking
  payments. The owner clarified that the recent upgrade was ChatGPT/Codex, not
  Supabase.
- Schedule a separate logical database export and a restore drill after a backup
  destination and retention policy are selected. Supabase database backups do not
  substitute for a separate copy of uploaded storage objects.

### Supabase and store activation

- The safety and notification migrations are applied through
  `20250831000000_shop_order_notifications.sql`; the linked `public` schema passes
  warning-level Supabase database lint with no findings.
- Select which existing Supabase profile is the store owner, then configure the exact
  UUID as `SHOP_OWNER_USER_ID` in Vercel.
- Create/complete that owner's `shop_settings` row with the approved identity,
  support contact, United States region, 499-cent shipping charge, and an explicit
  `launch_ready_at` only after every policy and launch value is complete.
- Supabase Auth now uses `https://tcg-lyart.vercel.app` as its Site URL and allows
  that origin's `/auth/callback`; the localhost callback remains allowed for
  development. Recheck these settings if the production domain changes.
- Re-save `SUPABASE_SERVICE_ROLE_KEY` as a Vercel Secret and never expose it to client
  code.

### Domain, policies, and Vercel configuration

- `https://tcg-lyart.vercel.app` is the verified test-stage production origin and is
  now configured as `NEXT_PUBLIC_APP_URL` for Vercel Production. A later custom
  domain remains a business/brand decision; if chosen, update Supabase Auth, Stripe,
  metadata, robots, sitemap, and all policy links to the same exact HTTPS origin.
- Publish approved privacy, terms, refund/return, shipping/cancellation, contact, and
  seller-disclosure text. Current policy pages are not legal sign-off.
- Complete the Vercel account billing address. The dashboard currently labels it
  missing or incomplete.
- Configure all remaining required Vercel environment variables listed below.
  Supabase, market-data access, the production app origin, a generated rate-limit
  secret, and the explicit live-payment lock are present. Stripe, owner, Resend,
  Sentry, and tax-control values remain absent.
- The hardened tree is now served by `tcg-lyart.vercel.app` and passes desktop/mobile
  Chrome layout checks. Canonical, Open Graph, robots host, and sitemap URLs now use
  that alias. Storefront and policy routes declare route-specific canonical URLs
  instead of inheriting the homepage canonical.
- Recheck auth and Checkout redirects plus webhook delivery after the final origin and
  Vercel environment are configured.

## 2. Important after launch

- Add privacy-compatible product and checkout funnel analytics after consent and
  policy requirements are determined.
- Automate backup exports, retention checks, and scheduled restore drills.
- Add operational alerts for webhook failures, payment/inventory mismatches, stale
  pending orders, and failed email outbox rows.
- Add continuous accessibility scanning and mobile visual-regression tests.
- Consider a dedicated fulfillment workflow and customer-visible tracking events once
  actual carrier operations are established.

## 3. Optional enhancements

- Dynamic product URLs in the sitemap after inventory cadence is established.
- Additional payment methods after delayed-payment inventory semantics are tested.
- Self-service customer cancellation/return requests and return authorization.
- Discount codes, wish lists, merchandising, and abandoned-cart recovery.
- Distributor application tracker and purchase-order/allocation reporting.

## Decision-free safeguards implemented

- Checkout fails closed for missing/mixed Stripe keys, an unset tax mode, missing
  webhook secret, missing notification configuration, missing rate-limit secret, or
  live keys without the live-payment lock.
- Store settings default offline; no shipping, pricing, inventory, identity, tax, or
  policy value is silently invented.
- Cart input is bounded and duplicate submissions share a stable checkout token.
- Order creation, server-side price snapshots, and inventory holds are atomic in
  Postgres; browser-supplied prices are never trusted.
- Stripe Checkout creation uses an idempotency key and resumes an existing open session.
- Cancellation/failure preserves the cart; verified paid success clears only the
  matching cart.
- Signed webhook events are mode checked, idempotent, amount/currency/tax validated,
  and only paid sessions can decrement inventory. Abandoned processing claims become
  retryable instead of permanently discarding an event.
- Refund state and optional restocking are independently idempotent.
- Customer and internal paid-order messages use a durable service-role-only outbox and
  deterministic provider idempotency keys.
- Seller cost basis and collection identifiers are no longer publicly queryable.
- Checkout attempts are durably rate limited with an HMAC fingerprint.
- Security headers, safe error fallbacks, Sentry hooks, canonical/social metadata,
  robots rules, sitemap, keyboard navigation, page headings, and mobile hit areas are
  present.
- Next.js and its security-sensitive transitive dependencies were upgraded/repaired;
  `npm audit --omit=dev` reports zero known vulnerabilities.

## Verification completed on the current tree

- Vitest: 13 files and 66 tests passed.
- ESLint: passes; the logout full-reload exception is documented because Next.js
  recommends clearing preserved user-scoped state on sign-out.
- TypeScript: `tsc --noEmit` passed.
- Next.js 16.3.4 production build: passed; 37 static/dynamic routes generated.
- Supabase migrations: local and remote histories match through `20250831000000`.
- Supabase remote schema lint: no warning-level findings.
- Supabase Auth: production Site URL and callback persisted; localhost callback is
  retained for development.
- Supabase backups: dashboard-confirmed Free plan with no project backups; no restore
  point exists yet.
- Production dependency audit: zero known vulnerabilities.
- Vercel deployment: `/shop`, `/robots.txt`, `/sitemap.xml`, manifest, favicon, and
  social image return 200 with CSP, HSTS, frame denial, MIME protection, permissions,
  and referrer-policy headers. The final deployed `/shop` canonical is
  `https://tcg-lyart.vercel.app/shop`; robots and sitemap use the same origin.
- Vercel Production variables: `NEXT_PUBLIC_APP_URL`, `SHOP_RATE_LIMIT_SECRET`, and
  `STRIPE_LIVE_PAYMENTS_ENABLED=false` were added without exposing the saved secret;
  the audited commit was redeployed successfully with those settings.
- Chrome 1440 × 900 and 390 × 844: one semantic shop heading, working skip target and
  mobile menu, visible fail-closed messaging, and no horizontal page overflow.

The deployed visual/static and current-origin checks are complete. Stripe test-mode
checkout, email, monitoring alerts, and backup restore proof remain blocked by the
unconfigured Stripe/Resend/Sentry/Supabase/business values. If a custom domain
replaces the current Vercel alias, repeat the origin-dependent checks.

## Required Vercel environment variables

Verified in **Production**: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JUSTTCG_API_KEY`,
`PRICE_SYNC_SECRET`, `SHOP_RATE_LIMIT_SECRET`, and
`STRIPE_LIVE_PAYMENTS_ENABLED=false`. Values were not copied into this report.

The remaining required variables are:

Public values:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test key until launch approval)
- `NEXT_PUBLIC_SENTRY_DSN`

Server-only secrets:

- `SHOP_OWNER_USER_ID`
- `STRIPE_SECRET_KEY` (test key until launch approval)
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `ORDER_EMAIL_FROM`
- `ORDER_NOTIFICATION_EMAIL`
- `SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

Explicit controls:

- `STRIPE_TAX_MODE=none` or `automatic` only after the tax decision
- Keep the configured `STRIPE_LIVE_PAYMENTS_ENABLED=false` until an approved live
  launch.

## Final launch gate

Go-live is allowed only when every launch blocker is closed, the deployed environment
is verified, Chrome desktop/mobile tests pass, the complete Stripe test-mode
order/email/refund cycle passes, backups and alerts are proven, and the owner explicitly
authorizes live payments.

## Primary external references

- [Stripe Tax setup](https://docs.stripe.com/tax/set-up?dashboard-or-api=api)
- [Supabase production SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase backups](https://supabase.com/docs/guides/platform/backups)
- [Resend SMTP](https://resend.com/docs/send-with-smtp)
- [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [TCGplayer API access](https://docs.tcgplayer.com/docs/getting-started)
- [TCGplayer price-point definitions](https://help.tcgplayer.com/hc/en-us/articles/222376867-What-do-the-different-price-points-on-TCGplayer-com-mean)
- [Alliance account requirements](https://www.alliance-games.com/downloads/creditterms.pdf)
- [Southern Hobby account requirements](https://www.southernhobby.com/new_account.php)
- [PHD account requirements](https://www.phdgames.com/open-an-account-with-phd/)
