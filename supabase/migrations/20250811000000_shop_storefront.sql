-- Phase 1 storefront: listings, cart holds, Stripe orders, sales ledger
-- Single-merchant shop layered on collector inventory (user_collections).

-- ── Settings ────────────────────────────────────────────────────────────────
create table if not exists public.shop_settings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references public.profiles (id) on delete cascade,
  store_name text not null default 'TCG Shop',
  support_email text,
  shipping_cents integer not null default 500
    check (shipping_cents >= 0),
  currency text not null default 'usd',
  is_live boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_settings_owner_idx
  on public.shop_settings (owner_user_id);

-- ── Listings ────────────────────────────────────────────────────────────────
create table if not exists public.shop_listings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null
    check (kind in ('single', 'playset', 'bulk_lot', 'rarity_set')),
  title text not null,
  description text,
  condition text,
  quantity_available integer not null default 0
    check (quantity_available >= 0),
  price_cents integer not null
    check (price_cents >= 0),
  unit_cost_cents integer
    check (unit_cost_cents is null or unit_cost_cents >= 0),
  card_id uuid references public.cards (id) on delete set null,
  collection_id uuid references public.user_collections (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_listings_status_idx
  on public.shop_listings (status)
  where status = 'active';
create index if not exists shop_listings_owner_idx
  on public.shop_listings (owner_user_id);
create index if not exists shop_listings_collection_idx
  on public.shop_listings (collection_id)
  where collection_id is not null;
create index if not exists shop_listings_card_idx
  on public.shop_listings (card_id)
  where card_id is not null;

create or replace function public.set_shop_listings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shop_listings_set_updated_at on public.shop_listings;
create trigger shop_listings_set_updated_at
  before update on public.shop_listings
  for each row
  execute function public.set_shop_listings_updated_at();

-- Lot / set components (display + optional stock notes)
create table if not exists public.shop_listing_items (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.shop_listings (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  quantity integer not null default 1
    check (quantity >= 1),
  condition text,
  created_at timestamptz not null default now()
);

create index if not exists shop_listing_items_listing_idx
  on public.shop_listing_items (listing_id);

-- ── Reservations (soft holds until Stripe confirms) ─────────────────────────
create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid, -- filled after order row exists; FK added below
  listing_id uuid not null references public.shop_listings (id) on delete cascade,
  quantity integer not null check (quantity >= 1),
  status text not null default 'held'
    check (status in ('held', 'consumed', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_reservations_listing_held_idx
  on public.inventory_reservations (listing_id)
  where status = 'held';
create index if not exists inventory_reservations_order_idx
  on public.inventory_reservations (order_id);

-- ── Orders ──────────────────────────────────────────────────────────────────
create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  buyer_email text not null,
  buyer_user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment',
      'paid',
      'packed',
      'shipped',
      'cancelled',
      'refunded'
    )),
  currency text not null default 'usd',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  shipping_name text,
  shipping_address jsonb,
  tracking_number text,
  notes text,
  paid_at timestamptz,
  shipped_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_orders_owner_idx
  on public.shop_orders (owner_user_id, created_at desc);
create index if not exists shop_orders_status_idx
  on public.shop_orders (status);

create or replace function public.set_shop_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shop_orders_set_updated_at on public.shop_orders;
create trigger shop_orders_set_updated_at
  before update on public.shop_orders
  for each row
  execute function public.set_shop_orders_updated_at();

do $$
begin
  alter table public.inventory_reservations
    add constraint inventory_reservations_order_id_fkey
    foreign key (order_id) references public.shop_orders (id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  listing_id uuid references public.shop_listings (id) on delete set null,
  title text not null,
  kind text not null,
  condition text,
  quantity integer not null check (quantity >= 1),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  unit_cost_cents integer
    check (unit_cost_cents is null or unit_cost_cents >= 0),
  card_id uuid references public.cards (id) on delete set null,
  collection_id uuid references public.user_collections (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists shop_order_items_order_idx
  on public.shop_order_items (order_id);

-- Immutable sales history for reports / distributor packets
create table if not exists public.sales_ledger (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  order_item_id uuid not null references public.shop_order_items (id) on delete cascade,
  sold_at timestamptz not null default now(),
  listing_id uuid,
  card_id uuid,
  title text not null,
  quantity integer not null check (quantity >= 1),
  revenue_cents integer not null check (revenue_cents >= 0),
  cogs_cents integer not null default 0 check (cogs_cents >= 0),
  shipping_destination_state text,
  created_at timestamptz not null default now()
);

create index if not exists sales_ledger_sold_at_idx
  on public.sales_ledger (sold_at desc);
create index if not exists sales_ledger_order_idx
  on public.sales_ledger (order_id);

-- Stripe webhook idempotency
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- ── Helpers ─────────────────────────────────────────────────────────────────
create or replace function public.shop_collection_units_per_listing(p_kind text)
returns integer
language sql
immutable
as $$
  select case p_kind
    when 'playset' then 4
    when 'single' then 1
    else 0
  end;
$$;

-- Held qty per listing
create or replace function public.shop_held_quantity(p_listing_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(r.quantity), 0)::integer
  from public.inventory_reservations r
  where r.listing_id = p_listing_id
    and r.status = 'held'
    and r.expires_at > now();
$$;

-- Collection cards already allocated to non-archived listings.
-- Soft holds sit inside quantity_available (not decremented until paid), so do not add held again.
create or replace function public.shop_collection_allocated_units(p_collection_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    l.quantity_available * public.shop_collection_units_per_listing(l.kind)
  ), 0)::integer
  from public.shop_listings l
  where l.collection_id = p_collection_id
    and l.status in ('draft', 'active');
$$;

grant execute on function public.shop_held_quantity(uuid) to anon, authenticated;
grant execute on function public.shop_collection_allocated_units(uuid) to authenticated;

-- Release expired holds (safe to call often)
create or replace function public.shop_release_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.inventory_reservations r
  set status = 'released'
  where r.status = 'held'
    and r.expires_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.shop_release_expired_reservations() to anon, authenticated, service_role;

-- Finalize paid order: consume holds, decrement stock + collection, ledger
create or replace function public.shop_finalize_paid_order(
  p_order_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_buyer_email text,
  p_shipping_name text,
  p_shipping_address jsonb
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
  perform public.shop_release_expired_reservations();

  select * into ord from public.shop_orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  -- Idempotent if already paid/packed/shipped/refunded
  if ord.status in ('paid', 'packed', 'shipped', 'refunded') then
    return;
  end if;

  if ord.status <> 'pending_payment' then
    raise exception 'order_not_pending';
  end if;

  update public.shop_orders
  set
    status = 'paid',
    paid_at = now(),
    stripe_checkout_session_id = coalesce(p_stripe_checkout_session_id, stripe_checkout_session_id),
    stripe_payment_intent_id = coalesce(p_stripe_payment_intent_id, stripe_payment_intent_id),
    buyer_email = coalesce(nullif(trim(p_buyer_email), ''), buyer_email),
    shipping_name = coalesce(p_shipping_name, shipping_name),
    shipping_address = coalesce(p_shipping_address, shipping_address)
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
        raise exception 'listing_missing %', item.listing_id;
      end if;

      if listing.quantity_available < item.quantity then
        raise exception 'insufficient_stock %', item.listing_id;
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
      order_id,
      order_item_id,
      sold_at,
      listing_id,
      card_id,
      title,
      quantity,
      revenue_cents,
      cogs_cents,
      shipping_destination_state
    ) values (
      p_order_id,
      item.id,
      now(),
      item.listing_id,
      item.card_id,
      item.title,
      item.quantity,
      item.unit_price_cents * item.quantity,
      coalesce(item.unit_cost_cents, 0) * item.quantity,
      dest_state
    );
  end loop;

  update public.inventory_reservations
  set status = 'consumed'
  where order_id = p_order_id
    and status = 'held';
end;
$$;

revoke all on function public.shop_finalize_paid_order(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.shop_finalize_paid_order(uuid, text, text, text, text, jsonb) to service_role;

-- Cancel pending order + release holds
create or replace function public.shop_cancel_pending_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.shop_orders%rowtype;
begin
  select * into ord from public.shop_orders where id = p_order_id for update;
  if not found then
    return;
  end if;
  if ord.status <> 'pending_payment' then
    return;
  end if;

  update public.shop_orders
  set status = 'cancelled'
  where id = p_order_id;

  update public.inventory_reservations
  set status = 'released'
  where order_id = p_order_id
    and status = 'held';
end;
$$;

revoke all on function public.shop_cancel_pending_order(uuid) from public;
grant execute on function public.shop_cancel_pending_order(uuid) to service_role;

-- Mark refunded (inventory restock is handled in app layer for flexibility)
create or replace function public.shop_mark_order_refunded(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shop_orders
  set status = 'refunded',
      refunded_at = coalesce(refunded_at, now())
  where id = p_order_id
    and status in ('paid', 'packed', 'shipped', 'refunded');
end;
$$;

revoke all on function public.shop_mark_order_refunded(uuid) from public;
grant execute on function public.shop_mark_order_refunded(uuid) to service_role;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.shop_settings enable row level security;
alter table public.shop_listings enable row level security;
alter table public.shop_listing_items enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
alter table public.sales_ledger enable row level security;
alter table public.stripe_webhook_events enable row level security;

-- shop_settings: public read when live; owner write
drop policy if exists "Public read live shop settings" on public.shop_settings;
create policy "Public read live shop settings"
  on public.shop_settings for select
  using (is_live = true or auth.uid() = owner_user_id);

drop policy if exists "Owner upsert shop settings" on public.shop_settings;
create policy "Owner insert shop settings"
  on public.shop_settings for insert
  with check (auth.uid() = owner_user_id);

drop policy if exists "Owner update shop settings" on public.shop_settings;
create policy "Owner update shop settings"
  on public.shop_settings for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- listings: anyone can read active; owner full CRUD
drop policy if exists "Public read active listings" on public.shop_listings;
create policy "Public read active listings"
  on public.shop_listings for select
  using (status = 'active' or auth.uid() = owner_user_id);

drop policy if exists "Owner insert listings" on public.shop_listings;
create policy "Owner insert listings"
  on public.shop_listings for insert
  with check (auth.uid() = owner_user_id);

drop policy if exists "Owner update listings" on public.shop_listings;
create policy "Owner update listings"
  on public.shop_listings for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "Owner delete listings" on public.shop_listings;
create policy "Owner delete listings"
  on public.shop_listings for delete
  using (auth.uid() = owner_user_id);

-- listing items follow parent visibility
drop policy if exists "Public read listing items for visible listings" on public.shop_listing_items;
create policy "Public read listing items for visible listings"
  on public.shop_listing_items for select
  using (
    exists (
      select 1 from public.shop_listings l
      where l.id = listing_id
        and (l.status = 'active' or l.owner_user_id = auth.uid())
    )
  );

drop policy if exists "Owner manage listing items" on public.shop_listing_items;
create policy "Owner insert listing items"
  on public.shop_listing_items for insert
  with check (
    exists (
      select 1 from public.shop_listings l
      where l.id = listing_id and l.owner_user_id = auth.uid()
    )
  );

drop policy if exists "Owner update listing items" on public.shop_listing_items;
create policy "Owner update listing items"
  on public.shop_listing_items for update
  using (
    exists (
      select 1 from public.shop_listings l
      where l.id = listing_id and l.owner_user_id = auth.uid()
    )
  );

drop policy if exists "Owner delete listing items" on public.shop_listing_items;
create policy "Owner delete listing items"
  on public.shop_listing_items for delete
  using (
    exists (
      select 1 from public.shop_listings l
      where l.id = listing_id and l.owner_user_id = auth.uid()
    )
  );

-- reservations: no direct client access (service role / security definer only)
drop policy if exists "Deny client reservations" on public.inventory_reservations;
create policy "Deny client select reservations"
  on public.inventory_reservations for select
  using (false);

create policy "Deny client insert reservations"
  on public.inventory_reservations for insert
  with check (false);

create policy "Deny client update reservations"
  on public.inventory_reservations for update
  using (false);

create policy "Deny client delete reservations"
  on public.inventory_reservations for delete
  using (false);

-- orders: owner only via client; service role bypasses RLS
drop policy if exists "Owner read orders" on public.shop_orders;
create policy "Owner read orders"
  on public.shop_orders for select
  using (auth.uid() = owner_user_id);

drop policy if exists "Owner update orders" on public.shop_orders;
create policy "Owner update orders"
  on public.shop_orders for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- No client insert/delete on orders
create policy "Deny client insert orders"
  on public.shop_orders for insert
  with check (false);

create policy "Deny client delete orders"
  on public.shop_orders for delete
  using (false);

drop policy if exists "Owner read order items" on public.shop_order_items;
create policy "Owner read order items"
  on public.shop_order_items for select
  using (
    exists (
      select 1 from public.shop_orders o
      where o.id = order_id and o.owner_user_id = auth.uid()
    )
  );

create policy "Deny client insert order items"
  on public.shop_order_items for insert
  with check (false);

create policy "Deny client update order items"
  on public.shop_order_items for update
  using (false);

create policy "Deny client delete order items"
  on public.shop_order_items for delete
  using (false);

drop policy if exists "Owner read sales ledger" on public.sales_ledger;
create policy "Owner read sales ledger"
  on public.sales_ledger for select
  using (
    exists (
      select 1 from public.shop_orders o
      where o.id = order_id and o.owner_user_id = auth.uid()
    )
  );

create policy "Deny client mutate sales ledger"
  on public.sales_ledger for insert
  with check (false);

create policy "Deny client update sales ledger"
  on public.sales_ledger for update
  using (false);

create policy "Deny client delete sales ledger"
  on public.sales_ledger for delete
  using (false);

-- webhook events: service only
create policy "Deny client webhook events select"
  on public.stripe_webhook_events for select
  using (false);

create policy "Deny client webhook events insert"
  on public.stripe_webhook_events for insert
  with check (false);
