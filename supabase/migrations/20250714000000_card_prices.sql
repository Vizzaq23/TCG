-- Variant-aware JustTCG price cache (additive; keeps cards.* denorm NM fields)

alter table public.cards
  add column if not exists justtcg_set_id text;

comment on column public.cards.justtcg_set_id is
  'JustTCG set id/slug for set-scoped price sync.';

create table if not exists public.card_prices (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  provider text not null default 'justtcg',
  external_card_id text,
  external_variant_id text,
  printing text not null,
  condition text not null,
  market_price_cents integer not null check (market_price_cents >= 0),
  currency text not null default 'USD',
  price_change_24h_pct numeric(8, 4),
  price_change_7d_pct numeric(8, 4),
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_prices_provider_variant_unique
    unique (provider, card_id, printing, condition)
);

create index if not exists card_prices_card_id_idx on public.card_prices (card_id);
create index if not exists card_prices_fetched_at_idx on public.card_prices (fetched_at desc);
create index if not exists card_prices_provider_external_card_idx
  on public.card_prices (provider, external_card_id)
  where external_card_id is not null;

create table if not exists public.card_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  card_price_id uuid not null references public.card_prices (id) on delete cascade,
  market_price_cents integer not null check (market_price_cents >= 0),
  recorded_at timestamptz not null default now()
);

create index if not exists card_price_snapshots_price_recorded_idx
  on public.card_price_snapshots (card_price_id, recorded_at desc);

alter table public.card_prices enable row level security;
alter table public.card_price_snapshots enable row level security;

drop policy if exists "Card prices are publicly readable" on public.card_prices;
create policy "Card prices are publicly readable"
  on public.card_prices for select
  using (true);

drop policy if exists "Card price snapshots are publicly readable" on public.card_price_snapshots;
create policy "Card price snapshots are publicly readable"
  on public.card_price_snapshots for select
  using (true);

-- No direct client writes; service role bypasses RLS for sync scripts.

create or replace function public.set_card_prices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists card_prices_set_updated_at on public.card_prices;
create trigger card_prices_set_updated_at
  before update on public.card_prices
  for each row
  execute function public.set_card_prices_updated_at();

-- Prefer: manual estimate → Near Mint card_prices → denorm cards.market_price_cents
create or replace function public.collection_unit_value_cents(
  p_estimated_value_cents integer,
  p_market_price_cents integer
)
returns integer
language sql
immutable
as $$
  select coalesce(p_estimated_value_cents, p_market_price_cents);
$$;

create or replace function public.card_display_market_cents(p_card_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select cp.market_price_cents
      from public.card_prices cp
      where cp.card_id = p_card_id
        and cp.provider = 'justtcg'
        and cp.condition in ('Near Mint', 'NM')
      order by
        case when lower(cp.printing) = 'normal' then 0 else 1 end,
        cp.fetched_at desc
      limit 1
    ),
    (
      select cp.market_price_cents
      from public.card_prices cp
      where cp.card_id = p_card_id
        and cp.provider = 'justtcg'
      order by cp.fetched_at desc
      limit 1
    ),
    (select c.market_price_cents from public.cards c where c.id = p_card_id)
  );
$$;

create or replace function public.snapshot_collection_value(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total bigint;
begin
  select coalesce(
    sum(
      uc.quantity * coalesce(
        public.collection_unit_value_cents(
          uc.estimated_value_cents,
          public.card_display_market_cents(uc.card_id)
        ),
        0
      )
    ),
    0
  )::bigint
    into total
  from public.user_collections uc
  where uc.user_id = p_user_id;

  insert into public.collection_value_snapshots (user_id, total_value_cents)
  values (p_user_id, total);
end;
$$;

create or replace function public.record_daily_value_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := coalesce(new.user_id, old.user_id);
  total bigint;
begin
  select coalesce(
    sum(
      uc.quantity * coalesce(
        public.collection_unit_value_cents(
          uc.estimated_value_cents,
          public.card_display_market_cents(uc.card_id)
        ),
        0
      )
    ),
    0
  )::bigint
    into total
  from public.user_collections uc
  where uc.user_id = uid;

  delete from public.collection_value_snapshots s
  where s.user_id = uid
    and s.recorded_at::date = now()::date;

  insert into public.collection_value_snapshots (user_id, total_value_cents)
  values (uid, total);

  return coalesce(new, old);
end;
$$;

drop function if exists public.get_collection_stats();

create or replace function public.get_collection_stats()
returns table (
  total_cards_owned bigint,
  unique_cards_owned bigint,
  total_collection_views bigint,
  cards_marked_for_trade bigint,
  portfolio_value_cents bigint,
  portfolio_value_cents_30d_ago bigint,
  valued_cards_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(sum(uc.quantity), 0)::bigint as total_cards_owned,
    count(distinct uc.card_id)::bigint as unique_cards_owned,
    (select count(*)::bigint from public.collection_views cv where cv.profile_id = auth.uid()) as total_collection_views,
    coalesce(sum(case when uc.is_for_trade then uc.quantity else 0 end), 0)::bigint as cards_marked_for_trade,
    coalesce(
      sum(
        uc.quantity * coalesce(
          public.collection_unit_value_cents(
            uc.estimated_value_cents,
            public.card_display_market_cents(uc.card_id)
          ),
          0
        )
      ),
      0
    )::bigint as portfolio_value_cents,
    (
      select s.total_value_cents
      from public.collection_value_snapshots s
      where s.user_id = auth.uid()
        and s.recorded_at <= now() - interval '30 days'
      order by s.recorded_at desc
      limit 1
    ) as portfolio_value_cents_30d_ago,
    count(*) filter (
      where public.collection_unit_value_cents(
        uc.estimated_value_cents,
        public.card_display_market_cents(uc.card_id)
      ) is not null
    )::bigint as valued_cards_count
  from public.user_collections uc
  where uc.user_id = auth.uid();
$$;

grant execute on function public.get_collection_stats() to authenticated;
grant execute on function public.snapshot_collection_value(uuid) to service_role;
grant execute on function public.snapshot_collection_value(uuid) to authenticated;
grant execute on function public.card_display_market_cents(uuid) to anon, authenticated, service_role;
