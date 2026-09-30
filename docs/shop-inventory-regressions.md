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
to free its stock. Collector reductions and deletion cannot remove allocated
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
