# Shop inventory regression checks

Run `npm test`, `npm run lint`, and `npm run typecheck` for the API and UI checks.
For database checks, initialize a **disposable PostgreSQL cluster** with a test
superuser named `tcg_test`, and start it bound only to `127.0.0.1` on a dedicated
port. Then run:

```powershell
npm run test:shop-db -- --psql C:\path\to\pgsql\bin\psql.exe --port 55439
```

The script connects only to loopback, creates/resets the `tcg_test_shop` database,
and uses synthetic identifiers and email addresses. It removes PostgreSQL
connection variables from child processes and ignores psql startup files.
Never point it at a shared/production cluster. Stop the disposable server when
finished. This is a relevant-schema fixture plus the real storefront and safety
migrations; it does not simulate all Supabase services or Stripe delivery.

The allocation migration guards listing creation, quantity increases, changes of
backing or kind, and archived-listing reactivation. Draft listings also reserve
physical capacity. Held quantities are already inside `quantity_available` and
are counted once. A listing with an unexpired checkout hold cannot be archived
to free its stock, change its kind/backing, drop below held quantity, or be
deleted. Pending orders also block listing deletion after their holds expire.
Collector reductions and deletion cannot remove allocated
copies. Payment finalization releases listing allocation before reducing shelf
stock; missing/insufficient legacy backing rolls the entire transaction back.
The concurrency checks observe a second database connection waiting on a lock
before verifying that it sees the first connection's committed allocation.

Listing creation and bundle contents now share one transaction. Database trigger
functions are not callable by public/authenticated clients; the creation RPC
uses invoker privileges and retains RLS/verified owner checks.

Existing overallocations are not silently rewritten by the migration. Review
them before accepting further sales. This read-only query identifies physical
listing totals that exceed a shelf row or have no backing:

```sql
select l.collection_id, c.quantity as shelf_quantity,
       sum(l.quantity_available::bigint * public.shop_collection_units_per_listing(l.kind)) as allocated
from public.shop_listings l
left join public.user_collections c on c.id = l.collection_id
where l.status in ('draft','active') and l.kind in ('single','playset')
group by l.collection_id, c.quantity
having c.quantity is null or sum(l.quantity_available::bigint * public.shop_collection_units_per_listing(l.kind)) > c.quantity;
```

Refund webhook events with an unmatched intent, a failed lookup, or an unpaid
order remain incomplete and return HTTP 500 for retry. Once paid finalization
links the intent, the retry can mark the order refunded; completed duplicate
delivery stays idempotent. A provider-level test payment/refund cycle remains a
separate verification step; these tests use synthetic events and no Stripe API.

Future paid physical order items capture the actual shelf row and units per sold
listing before stock consumption. Explicit refund restock locks the order and
listing, restores shelf copies first, then restores the listing, and marks the
whole return completed in one transaction. A sellout can recreate the original
shelf row, including captured notes and grade metadata. An existing compatible
shelf row retains its current notes; a previous showcase position is not
reclaimed. Changed card/condition/grading identity, missing backing, or legacy
items without a snapshot fail closed with an explicit reconciliation message.
Repeated restock is idempotent. A pending provider refund leaves local payment
and inventory state unchanged; after confirmation the refunded order exposes
an explicit restock action.

Cart display now retains every requested line and quantity, including unavailable
listings. Totals use that same requested quantity, and explicit conflicts block
checkout until resolved. A private batched availability RPC subtracts other
buyers' holds while preserving the cart's own hold. A matching pending checkout
uses its saved item prices and shipping; a mismatched cookie cannot silently
resume a different order. Database read failures block checkout.

This display change does not by itself reconcile an abandoned Checkout when a
cart mutation rotates its token. That write path needs confirmed unpaid Stripe
expiration plus a database token-revocation transaction to protect concurrent
checkout creation. Do not infer cancellation from a browser return or an API
lookup without a matching order.
