-- JustTCG / market pricing on catalog cards; portfolio prefers manual override then market

alter table public.cards
  add column if not exists market_price_cents integer
    check (market_price_cents is null or market_price_cents >= 0),
  add column if not exists market_price_updated_at timestamptz,
  add column if not exists justtcg_card_id text,
  add column if not exists tcgplayer_product_id text;

comment on column public.cards.market_price_cents is
  'Near Mint market estimate from JustTCG (USD cents).';

create index if not exists cards_justtcg_card_id_idx
  on public.cards (justtcg_card_id)
  where justtcg_card_id is not null;

-- Effective unit value: owner override, else market
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
        public.collection_unit_value_cents(uc.estimated_value_cents, c.market_price_cents),
        0
      )
    ),
    0
  )::bigint
    into total
  from public.user_collections uc
  join public.cards c on c.id = uc.card_id
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
        public.collection_unit_value_cents(uc.estimated_value_cents, c.market_price_cents),
        0
      )
    ),
    0
  )::bigint
    into total
  from public.user_collections uc
  join public.cards c on c.id = uc.card_id
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
          public.collection_unit_value_cents(uc.estimated_value_cents, c.market_price_cents),
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
      where public.collection_unit_value_cents(uc.estimated_value_cents, c.market_price_cents) is not null
    )::bigint as valued_cards_count
  from public.user_collections uc
  join public.cards c on c.id = uc.card_id
  where uc.user_id = auth.uid();
$$;

grant execute on function public.get_collection_stats() to authenticated;

grant execute on function public.snapshot_collection_value(uuid) to service_role;
grant execute on function public.snapshot_collection_value(uuid) to authenticated;
