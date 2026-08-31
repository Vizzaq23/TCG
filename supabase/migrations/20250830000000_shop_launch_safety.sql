-- Production checkout safety: fail-closed settings, atomic reservations,
-- duplicate-checkout protection, durable rate limiting, and private seller data.

-- A new shop must remain offline until the merchant has explicitly reviewed all
-- launch decisions. Existing rows also require an explicit launch_ready_at value.
alter table public.shop_settings
  alter column is_live set default false;
alter table public.shop_settings
  alter column shipping_cents drop default;
alter table public.shop_settings
  alter column shipping_cents drop not null;
alter table public.shop_settings
  add column if not exists launch_ready_at timestamptz;

alter table public.shop_orders
  add column if not exists checkout_token uuid;
alter table public.shop_orders
  add column if not exists tax_cents integer not null default 0
    check (tax_cents >= 0);
alter table public.shop_orders
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'failed', 'refunded'));
alter table public.shop_orders
  add column if not exists fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in ('unfulfilled', 'packed', 'shipped', 'cancelled'));
alter table public.shop_orders
  add column if not exists restocked_at timestamptz;

-- A webhook event is claimed before processing and marked complete afterward.
-- An abandoned claim becomes retryable so a process crash cannot permanently
-- discard a paid order event.
alter table public.stripe_webhook_events
  alter column processed_at drop not null;
alter table public.stripe_webhook_events
  add column if not exists processing_started_at timestamptz;

create unique index if not exists shop_orders_checkout_token_idx
  on public.shop_orders (checkout_token)
  where checkout_token is not null;

update public.shop_orders
set payment_status = case
      when status in ('paid', 'packed', 'shipped') then 'paid'
      when status = 'refunded' then 'refunded'
      when status = 'cancelled' then 'failed'
      else 'unpaid'
    end,
    fulfillment_status = case
      when status = 'packed' then 'packed'
      when status = 'shipped' then 'shipped'
      when status = 'cancelled' then 'cancelled'
      else 'unfulfilled'
    end;

-- Checkout attempt counters live in Postgres so limits hold across serverless
-- instances. The app stores only an HMAC fingerprint, never a raw IP or email.
create table if not exists public.shop_checkout_rate_limits (
  fingerprint text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now()
);

alter table public.shop_checkout_rate_limits enable row level security;
revoke all on table public.shop_checkout_rate_limits from anon, authenticated;

create or replace function public.shop_enforce_checkout_rate_limit(
  p_fingerprint text,
  p_limit integer default 8,
  p_window_seconds integer default 600
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  counter public.shop_checkout_rate_limits%rowtype;
begin
  if length(trim(p_fingerprint)) < 32
     or p_limit < 1
     or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_parameters';
  end if;

  insert into public.shop_checkout_rate_limits (fingerprint, attempts)
  values (p_fingerprint, 0)
  on conflict (fingerprint) do nothing;

  select * into counter
  from public.shop_checkout_rate_limits
  where fingerprint = p_fingerprint
  for update;

  if counter.window_started_at <= now() - make_interval(secs => p_window_seconds) then
    update public.shop_checkout_rate_limits
    set window_started_at = now(), attempts = 1, updated_at = now()
    where fingerprint = p_fingerprint;
  elsif counter.attempts >= p_limit then
    raise exception 'checkout_rate_limit_exceeded';
  else
    update public.shop_checkout_rate_limits
    set attempts = attempts + 1, updated_at = now()
    where fingerprint = p_fingerprint;
  end if;
end;
$$;

revoke all on function public.shop_enforce_checkout_rate_limit(text, integer, integer) from public;
grant execute on function public.shop_enforce_checkout_rate_limit(text, integer, integer) to service_role;

create or replace function public.shop_claim_stripe_event(
  p_event_id text,
  p_event_type text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean := false;
begin
  if length(trim(p_event_id)) < 3 or length(trim(p_event_type)) < 3 then
    raise exception 'invalid_stripe_event';
  end if;

  insert into public.stripe_webhook_events (
    id, type, processing_started_at, processed_at
  ) values (
    p_event_id, p_event_type, now(), null
  )
  on conflict (id) do nothing;

  if found then
    return true;
  end if;

  update public.stripe_webhook_events
  set type = p_event_type,
      processing_started_at = now()
  where id = p_event_id
    and processed_at is null
    and (
      processing_started_at is null
      or processing_started_at <= now() - interval '5 minutes'
    )
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

revoke all on function public.shop_claim_stripe_event(text, text) from public;
grant execute on function public.shop_claim_stripe_event(text, text) to service_role;

create or replace function public.shop_complete_stripe_event(p_event_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.stripe_webhook_events
  set processed_at = coalesce(processed_at, now()),
      processing_started_at = null
  where id = p_event_id;
end;
$$;

revoke all on function public.shop_complete_stripe_event(text) from public;
grant execute on function public.shop_complete_stripe_event(text) to service_role;

create or replace function public.shop_release_stripe_event(p_event_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.stripe_webhook_events
  set processing_started_at = null
  where id = p_event_id and processed_at is null;
end;
$$;

revoke all on function public.shop_release_stripe_event(text) from public;
grant execute on function public.shop_release_stripe_event(text) to service_role;

-- Create the order, immutable price snapshots, and all stock holds in one
-- transaction. Only the service role can call this function. Prices and stock
-- are always loaded from locked database rows; browser-provided prices are never
-- accepted.
create or replace function public.shop_create_pending_order(
  p_checkout_token uuid,
  p_order_number text,
  p_owner_user_id uuid,
  p_buyer_email text,
  p_buyer_user_id uuid,
  p_items jsonb
)
returns table (
  order_id uuid,
  order_number text,
  order_status text,
  stripe_checkout_session_id text,
  subtotal_cents integer,
  shipping_cents integer,
  total_cents integer,
  currency text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  settings public.shop_settings%rowtype;
  existing_order public.shop_orders%rowtype;
  new_order public.shop_orders%rowtype;
  listing public.shop_listings%rowtype;
  requested record;
  held_quantity integer;
  calculated_subtotal integer := 0;
begin
  if p_checkout_token is null
     or p_owner_user_id is null
     or length(trim(p_order_number)) < 6
     or length(trim(p_buyer_email)) > 320
     or position('@' in p_buyer_email) < 2 then
    raise exception 'invalid_checkout_input';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 20 then
    raise exception 'invalid_cart';
  end if;

  -- Serialize duplicate submissions before checking or creating an order. This
  -- makes concurrent double-clicks return the same pending order even when the
  -- first request is still creating its inventory holds.
  perform pg_advisory_xact_lock(hashtextextended(p_checkout_token::text, 0));

  select * into existing_order
  from public.shop_orders o
  where o.checkout_token = p_checkout_token
  for update;

  if found then
    if existing_order.owner_user_id <> p_owner_user_id then
      raise exception 'checkout_token_owner_mismatch';
    end if;
    return query
      select o.id, o.order_number, o.status, o.stripe_checkout_session_id,
             o.subtotal_cents, o.shipping_cents, o.total_cents, o.currency
      from public.shop_orders o
      where o.id = existing_order.id;
    return;
  end if;

  select * into settings
  from public.shop_settings s
  where s.owner_user_id = p_owner_user_id
  for share;

  if not found
     or not settings.is_live
     or settings.launch_ready_at is null
     or settings.shipping_cents is null
     or settings.support_email is null
     or position('@' in settings.support_email) < 2
     or settings.currency !~ '^[a-zA-Z]{3}$' then
    raise exception 'shop_not_launch_ready';
  end if;

  perform public.shop_release_expired_reservations();

  for requested in
    select (entry->>'listingId')::uuid as listing_id,
           sum((entry->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as entry
    group by 1
    order by 1
  loop
    if requested.quantity < 1 or requested.quantity > 20 then
      raise exception 'invalid_cart_quantity';
    end if;

    select * into listing
    from public.shop_listings l
    where l.id = requested.listing_id
      and l.owner_user_id = p_owner_user_id
    for update;

    if not found or listing.status <> 'active' or listing.price_cents < 1 then
      raise exception 'listing_unavailable';
    end if;

    select coalesce(sum(r.quantity), 0)::integer into held_quantity
    from public.inventory_reservations r
    where r.listing_id = listing.id
      and r.status = 'held'
      and r.expires_at > now();

    if listing.quantity_available - held_quantity < requested.quantity then
      raise exception 'insufficient_inventory';
    end if;

    calculated_subtotal := calculated_subtotal
      + (listing.price_cents * requested.quantity);
  end loop;

  begin
    insert into public.shop_orders (
      order_number,
      owner_user_id,
      buyer_email,
      buyer_user_id,
      status,
      payment_status,
      fulfillment_status,
      currency,
      subtotal_cents,
      shipping_cents,
      tax_cents,
      total_cents,
      checkout_token
    ) values (
      trim(p_order_number),
      p_owner_user_id,
      lower(trim(p_buyer_email)),
      p_buyer_user_id,
      'pending_payment',
      'unpaid',
      'unfulfilled',
      lower(settings.currency),
      calculated_subtotal,
      settings.shipping_cents,
      0,
      calculated_subtotal + settings.shipping_cents,
      p_checkout_token
    ) returning * into new_order;
  exception
    when unique_violation then
      select * into new_order
      from public.shop_orders o
      where o.checkout_token = p_checkout_token;
      if not found then
        raise;
      end if;
  end;

  if new_order.status = 'pending_payment'
     and not exists (
       select 1 from public.shop_order_items i where i.order_id = new_order.id
     ) then
    for requested in
      select (entry->>'listingId')::uuid as listing_id,
             sum((entry->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) as entry
      group by 1
      order by 1
    loop
      select * into listing
      from public.shop_listings l
      where l.id = requested.listing_id
        and l.owner_user_id = p_owner_user_id
      for update;

      insert into public.shop_order_items (
        order_id,
        listing_id,
        title,
        kind,
        condition,
        quantity,
        unit_price_cents,
        unit_cost_cents,
        card_id,
        collection_id
      ) values (
        new_order.id,
        listing.id,
        listing.title,
        listing.kind,
        listing.condition,
        requested.quantity,
        listing.price_cents,
        listing.unit_cost_cents,
        listing.card_id,
        listing.collection_id
      );

      insert into public.inventory_reservations (
        order_id, listing_id, quantity, status, expires_at
      ) values (
        new_order.id,
        listing.id,
        requested.quantity,
        'held',
        now() + interval '2 hours'
      );
    end loop;
  end if;

  return query
    select o.id, o.order_number, o.status, o.stripe_checkout_session_id,
           o.subtotal_cents, o.shipping_cents, o.total_cents, o.currency
    from public.shop_orders o
    where o.id = new_order.id;
end;
$$;

revoke all on function public.shop_create_pending_order(uuid, text, uuid, text, uuid, jsonb) from public;
grant execute on function public.shop_create_pending_order(uuid, text, uuid, text, uuid, jsonb) to service_role;

-- Replace payment finalization with amount, currency, and session validation.
create or replace function public.shop_finalize_verified_order(
  p_order_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_buyer_email text,
  p_shipping_name text,
  p_shipping_address jsonb,
  p_currency text,
  p_amount_subtotal_cents integer,
  p_amount_total_cents integer,
  p_tax_cents integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.shop_orders%rowtype;
  item public.shop_order_items%rowtype;
  listing public.shop_listings%rowtype;
  units integer;
  dest_state text;
  coll_qty integer;
begin
  select * into ord from public.shop_orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if length(trim(p_stripe_checkout_session_id)) < 5
     or lower(p_currency) <> lower(ord.currency)
     or p_amount_subtotal_cents <> ord.subtotal_cents + ord.shipping_cents
     or p_tax_cents < 0
     or (
       p_amount_total_cents <> p_amount_subtotal_cents
       and p_amount_total_cents <> p_amount_subtotal_cents + p_tax_cents
     ) then
    raise exception 'payment_amount_mismatch';
  end if;

  if ord.stripe_checkout_session_id is not null
     and ord.stripe_checkout_session_id <> p_stripe_checkout_session_id then
    raise exception 'checkout_session_mismatch';
  end if;

  -- Idempotent after a verified payment.
  if ord.payment_status in ('paid', 'refunded') then
    return;
  end if;

  if ord.status <> 'pending_payment' or ord.payment_status <> 'unpaid' then
    raise exception 'order_not_pending';
  end if;

  update public.shop_orders
  set status = 'paid',
      payment_status = 'paid',
      fulfillment_status = 'unfulfilled',
      paid_at = now(),
      stripe_checkout_session_id = p_stripe_checkout_session_id,
      stripe_payment_intent_id = coalesce(nullif(p_stripe_payment_intent_id, ''), stripe_payment_intent_id),
      buyer_email = coalesce(nullif(lower(trim(p_buyer_email)), ''), buyer_email),
      shipping_name = coalesce(nullif(trim(p_shipping_name), ''), shipping_name),
      shipping_address = coalesce(p_shipping_address, shipping_address),
      tax_cents = p_tax_cents,
      total_cents = p_amount_total_cents
  where id = p_order_id;

  dest_state := nullif(
    trim(coalesce(p_shipping_address->>'state', p_shipping_address->>'stateCode', '')),
    ''
  );

  for item in
    select * from public.shop_order_items where order_id = p_order_id
  loop
    if item.listing_id is not null then
      select * into listing
      from public.shop_listings
      where id = item.listing_id
      for update;

      if not found then
        raise exception 'listing_missing';
      end if;
      if listing.quantity_available < item.quantity then
        raise exception 'insufficient_stock';
      end if;

      update public.shop_listings
      set quantity_available = quantity_available - item.quantity,
          status = case
            when quantity_available - item.quantity = 0 then 'archived'
            else status
          end
      where id = listing.id;

      units := public.shop_collection_units_per_listing(listing.kind) * item.quantity;
      if units > 0 and listing.collection_id is not null then
        select quantity into coll_qty
        from public.user_collections
        where id = listing.collection_id
        for update;

        if coll_qty is null then
          null;
        elsif coll_qty <= units then
          delete from public.user_collections where id = listing.collection_id;
        else
          update public.user_collections
          set quantity = quantity - units
          where id = listing.collection_id;
        end if;
      end if;
    end if;

    insert into public.sales_ledger (
      order_id, order_item_id, sold_at, listing_id, card_id, title,
      quantity, revenue_cents, cogs_cents, shipping_destination_state
    ) values (
      p_order_id, item.id, now(), item.listing_id, item.card_id, item.title,
      item.quantity, item.unit_price_cents * item.quantity,
      coalesce(item.unit_cost_cents, 0) * item.quantity, dest_state
    );
  end loop;

  update public.inventory_reservations
  set status = 'consumed'
  where order_id = p_order_id and status = 'held';
end;
$$;

revoke all on function public.shop_finalize_verified_order(uuid, text, text, text, text, jsonb, text, integer, integer, integer) from public;
grant execute on function public.shop_finalize_verified_order(uuid, text, text, text, text, jsonb, text, integer, integer, integer) to service_role;

create unique index if not exists sales_ledger_order_item_unique_idx
  on public.sales_ledger (order_item_id);

drop function if exists public.shop_finalize_paid_order(uuid, text, text, text, text, jsonb);

create or replace function public.shop_cancel_pending_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shop_orders
  set status = 'cancelled',
      payment_status = 'failed',
      fulfillment_status = 'cancelled'
  where id = p_order_id
    and status = 'pending_payment'
    and payment_status = 'unpaid';

  if found then
    update public.inventory_reservations
    set status = 'released'
    where order_id = p_order_id and status = 'held';
  end if;
end;
$$;

revoke all on function public.shop_cancel_pending_order(uuid) from public;
grant execute on function public.shop_cancel_pending_order(uuid) to service_role;

create or replace function public.shop_mark_order_refunded(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shop_orders
  set status = 'refunded',
      payment_status = 'refunded',
      refunded_at = coalesce(refunded_at, now())
  where id = p_order_id
    and payment_status in ('paid', 'refunded');
end;
$$;

revoke all on function public.shop_mark_order_refunded(uuid) from public;
grant execute on function public.shop_mark_order_refunded(uuid) to service_role;

-- Restocking is a separate, explicit merchant choice and is idempotent.
create or replace function public.shop_restock_refunded_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.shop_orders%rowtype;
  item public.shop_order_items%rowtype;
begin
  select * into ord from public.shop_orders where id = p_order_id for update;
  if not found or ord.payment_status <> 'refunded' or ord.restocked_at is not null then
    return;
  end if;

  for item in select * from public.shop_order_items where order_id = p_order_id
  loop
    if item.listing_id is not null then
      update public.shop_listings
      set quantity_available = quantity_available + item.quantity,
          status = case when status = 'archived' then 'active' else status end
      where id = item.listing_id;
    end if;
  end loop;

  update public.shop_orders set restocked_at = now() where id = p_order_id;
end;
$$;

revoke all on function public.shop_restock_refunded_order(uuid) from public;
grant execute on function public.shop_restock_refunded_order(uuid) to service_role;

-- Active listing rows contain seller-only cost and collection identifiers. Public
-- storefront reads now go through server-only, explicit-column queries.
drop policy if exists "Public read active listings" on public.shop_listings;
drop policy if exists "Owner read listings" on public.shop_listings;
create policy "Owner read listings"
  on public.shop_listings for select
  using (auth.uid() = owner_user_id);

drop policy if exists "Public read listing items for visible listings" on public.shop_listing_items;
drop policy if exists "Owner read listing items" on public.shop_listing_items;
create policy "Owner read listing items"
  on public.shop_listing_items for select
  using (
    exists (
      select 1 from public.shop_listings l
      where l.id = listing_id and l.owner_user_id = auth.uid()
    )
  );

revoke execute on function public.shop_held_quantity(uuid) from anon, authenticated;
revoke execute on function public.shop_release_expired_reservations() from anon, authenticated;

-- Prevent arbitrary authenticated callers from probing another collector's
-- allocation totals through this security-definer function.
create or replace function public.shop_collection_allocated_units(p_collection_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result integer;
begin
  if auth.role() <> 'service_role'
     and not exists (
       select 1 from public.user_collections c
       where c.id = p_collection_id and c.user_id = auth.uid()
     ) then
    raise exception 'forbidden';
  end if;

  select coalesce(sum(
    l.quantity_available * public.shop_collection_units_per_listing(l.kind)
  ), 0)::integer into result
  from public.shop_listings l
  where l.collection_id = p_collection_id
    and l.status in ('draft', 'active');
  return result;
end;
$$;

revoke all on function public.shop_collection_allocated_units(uuid) from public;
grant execute on function public.shop_collection_allocated_units(uuid) to authenticated, service_role;
