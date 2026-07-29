-- Portfolio valuation, trade offers, activity feed, trade alerts

-- ── Valuation ──────────────────────────────────────────────────────────────
alter table public.user_collections
  add column if not exists estimated_value_cents integer
    check (estimated_value_cents is null or estimated_value_cents >= 0);

comment on column public.user_collections.estimated_value_cents is
  'Owner-entered estimated market value in USD cents (per unit).';

create table if not exists public.collection_value_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  total_value_cents bigint not null check (total_value_cents >= 0),
  recorded_at timestamptz not null default now()
);

create index if not exists collection_value_snapshots_user_recorded_idx
  on public.collection_value_snapshots (user_id, recorded_at desc);

alter table public.collection_value_snapshots enable row level security;

drop policy if exists "Owners read own value snapshots" on public.collection_value_snapshots;
create policy "Owners read own value snapshots"
  on public.collection_value_snapshots for select
  using (auth.uid() = user_id);

drop policy if exists "Deny direct insert value snapshots" on public.collection_value_snapshots;
create policy "Deny direct insert value snapshots"
  on public.collection_value_snapshots for insert
  with check (false);

-- Snapshot helper (security definer)
create or replace function public.snapshot_collection_value(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total bigint;
begin
  select coalesce(sum(uc.quantity * coalesce(uc.estimated_value_cents, 0)), 0)::bigint
    into total
  from public.user_collections uc
  where uc.user_id = p_user_id;

  insert into public.collection_value_snapshots (user_id, total_value_cents)
  values (p_user_id, total);
end;
$$;

-- Keep at most one snapshot per user per calendar day (upsert-ish)
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
  select coalesce(sum(uc.quantity * coalesce(uc.estimated_value_cents, 0)), 0)::bigint
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

drop trigger if exists user_collections_value_snapshot on public.user_collections;
create trigger user_collections_value_snapshot
  after insert or update of quantity, estimated_value_cents or delete
  on public.user_collections
  for each row
  execute function public.record_daily_value_snapshot();

-- Return type changed (added portfolio fields); REPLACE cannot alter OUT params.
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
    coalesce(sum(uc.quantity * coalesce(uc.estimated_value_cents, 0)), 0)::bigint as portfolio_value_cents,
    (
      select s.total_value_cents
      from public.collection_value_snapshots s
      where s.user_id = auth.uid()
        and s.recorded_at <= now() - interval '30 days'
      order by s.recorded_at desc
      limit 1
    ) as portfolio_value_cents_30d_ago,
    count(*) filter (where uc.estimated_value_cents is not null)::bigint as valued_cards_count
  from public.user_collections uc
  where uc.user_id = auth.uid();
$$;

grant execute on function public.get_collection_stats() to authenticated;

-- ── Trade offers ───────────────────────────────────────────────────────────
create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  target_collection_id uuid not null references public.user_collections (id) on delete cascade,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_offers_not_self check (from_user_id <> to_user_id)
);

create index if not exists trade_offers_to_user_status_idx
  on public.trade_offers (to_user_id, status, created_at desc);
create index if not exists trade_offers_from_user_idx
  on public.trade_offers (from_user_id, created_at desc);

create or replace function public.set_trade_offers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trade_offers_set_updated_at on public.trade_offers;
create trigger trade_offers_set_updated_at
  before update on public.trade_offers
  for each row
  execute function public.set_trade_offers_updated_at();

alter table public.trade_offers enable row level security;

drop policy if exists "Parties select trade offers" on public.trade_offers;
create policy "Parties select trade offers"
  on public.trade_offers for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "Authenticated create trade offers" on public.trade_offers;
create policy "Authenticated create trade offers"
  on public.trade_offers for insert
  with check (
    auth.uid() = from_user_id
    and from_user_id <> to_user_id
  );

drop policy if exists "Parties update trade offers" on public.trade_offers;
create policy "Parties update trade offers"
  on public.trade_offers for update
  using (auth.uid() = from_user_id or auth.uid() = to_user_id)
  with check (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Create offer (validates target is for trade and owned by to_user)
create or replace function public.create_trade_offer(
  p_target_collection_id uuid,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
  offer_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select uc.id, uc.user_id, uc.is_for_trade
    into target
  from public.user_collections uc
  where uc.id = p_target_collection_id;

  if target.id is null then
    raise exception 'Collection entry not found';
  end if;
  if not target.is_for_trade then
    raise exception 'Card is not marked for trade';
  end if;
  if target.user_id = auth.uid() then
    raise exception 'Cannot offer on your own card';
  end if;

  -- One pending offer per buyer/target
  if exists (
    select 1 from public.trade_offers t
    where t.from_user_id = auth.uid()
      and t.target_collection_id = p_target_collection_id
      and t.status = 'pending'
  ) then
    raise exception 'You already have a pending offer on this card';
  end if;

  insert into public.trade_offers (from_user_id, to_user_id, target_collection_id, message)
  values (auth.uid(), target.user_id, p_target_collection_id, nullif(trim(p_message), ''))
  returning id into offer_id;

  return offer_id;
end;
$$;

grant execute on function public.create_trade_offer(uuid, text) to authenticated;

create or replace function public.respond_trade_offer(
  p_offer_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  offer record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_action not in ('accept', 'decline', 'cancel') then
    raise exception 'Invalid action';
  end if;

  select * into offer from public.trade_offers where id = p_offer_id;
  if offer.id is null then
    raise exception 'Offer not found';
  end if;
  if offer.status <> 'pending' then
    raise exception 'Offer is no longer pending';
  end if;

  if p_action = 'cancel' then
    if offer.from_user_id <> auth.uid() then
      raise exception 'Only the sender can cancel';
    end if;
    update public.trade_offers set status = 'cancelled' where id = p_offer_id;
    return;
  end if;

  if offer.to_user_id <> auth.uid() then
    raise exception 'Only the owner can respond';
  end if;

  update public.trade_offers
  set status = case when p_action = 'accept' then 'accepted' else 'declined' end
  where id = p_offer_id;
end;
$$;

grant execute on function public.respond_trade_offer(uuid, text) to authenticated;

-- ── Activity feed ──────────────────────────────────────────────────────────
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null
    check (event_type in (
      'added_card',
      'marked_trade',
      'unmarked_trade',
      'updated_showcase',
      'updated_value'
    )),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_profile_created_idx
  on public.activity_events (profile_id, created_at desc);

alter table public.activity_events enable row level security;

drop policy if exists "Activity events are public read" on public.activity_events;
create policy "Activity events are public read"
  on public.activity_events for select
  using (true);

drop policy if exists "Deny direct insert activity" on public.activity_events;
create policy "Deny direct insert activity"
  on public.activity_events for insert
  with check (false);

create or replace function public.log_activity(
  p_profile_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_events (profile_id, event_type, payload)
  values (p_profile_id, p_event_type, coalesce(p_payload, '{}'::jsonb));
end;
$$;

create or replace function public.user_collections_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cname text;
begin
  if tg_op = 'INSERT' then
    select name into cname from public.cards where id = new.card_id;
    perform public.log_activity(new.user_id, 'added_card', jsonb_build_object(
      'card_id', new.card_id,
      'card_name', cname,
      'quantity', new.quantity
    ));
    if new.is_for_trade then
      perform public.log_activity(new.user_id, 'marked_trade', jsonb_build_object(
        'card_id', new.card_id,
        'card_name', cname
      ));
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select name into cname from public.cards where id = new.card_id;
    if new.is_for_trade is distinct from old.is_for_trade then
      perform public.log_activity(
        new.user_id,
        case when new.is_for_trade then 'marked_trade' else 'unmarked_trade' end,
        jsonb_build_object('card_id', new.card_id, 'card_name', cname)
      );
    end if;
    if new.showcase_slot is distinct from old.showcase_slot then
      perform public.log_activity(new.user_id, 'updated_showcase', jsonb_build_object(
        'card_id', new.card_id,
        'card_name', cname,
        'showcase_slot', new.showcase_slot
      ));
    end if;
    if new.estimated_value_cents is distinct from old.estimated_value_cents then
      perform public.log_activity(new.user_id, 'updated_value', jsonb_build_object(
        'card_id', new.card_id,
        'card_name', cname,
        'estimated_value_cents', new.estimated_value_cents
      ));
    end if;
    return new;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists user_collections_activity on public.user_collections;
create trigger user_collections_activity
  after insert or update of is_for_trade, showcase_slot, estimated_value_cents
  on public.user_collections
  for each row
  execute function public.user_collections_activity_trigger();

create or replace function public.get_public_activity(
  target_username text,
  p_limit int default 20
)
returns table (
  id uuid,
  event_type text,
  payload jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select ae.id, ae.event_type, ae.payload, ae.created_at
  from public.activity_events ae
  join public.profiles p on p.id = ae.profile_id
  where lower(p.username) = lower(target_username)
  order by ae.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

grant execute on function public.get_public_activity(text, int) to anon, authenticated;

-- ── Trade alerts ───────────────────────────────────────────────────────────
create table if not exists public.trade_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create index if not exists trade_alerts_card_id_idx on public.trade_alerts (card_id);

alter table public.trade_alerts enable row level security;

drop policy if exists "Owners manage trade alerts" on public.trade_alerts;
drop policy if exists "Owners select trade alerts" on public.trade_alerts;
drop policy if exists "Owners insert trade alerts" on public.trade_alerts;
drop policy if exists "Owners delete trade alerts" on public.trade_alerts;
create policy "Owners select trade alerts"
  on public.trade_alerts for select
  using (auth.uid() = user_id);

create policy "Owners insert trade alerts"
  on public.trade_alerts for insert
  with check (auth.uid() = user_id);

create policy "Owners delete trade alerts"
  on public.trade_alerts for delete
  using (auth.uid() = user_id);

-- When someone marks a card for trade, notify alert subscribers via activity on THEIR profile? 
-- Simpler: store alerts; client polls get_trade_alert_hits RPC.

create or replace function public.get_trade_alert_hits()
returns table (
  alert_id uuid,
  card_id uuid,
  card_name text,
  owner_username text,
  collection_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    ta.id as alert_id,
    c.id as card_id,
    c.name as card_name,
    p.username as owner_username,
    uc.id as collection_id
  from public.trade_alerts ta
  join public.cards c on c.id = ta.card_id
  join public.user_collections uc on uc.card_id = ta.card_id and uc.is_for_trade = true
  join public.profiles p on p.id = uc.user_id
  where ta.user_id = auth.uid()
    and uc.user_id <> auth.uid()
  order by c.name;
$$;

grant execute on function public.get_trade_alert_hits() to authenticated;

-- ── Compare collectors ─────────────────────────────────────────────────────
create or replace function public.compare_collectors(
  username_a text,
  username_b text
)
returns table (
  card_id uuid,
  card_name text,
  set_name text,
  card_number text,
  owned_by_a boolean,
  owned_by_b boolean
)
language sql
security definer
set search_path = public
as $$
  with pa as (
    select id from public.profiles where lower(username) = lower(username_a) limit 1
  ),
  pb as (
    select id from public.profiles where lower(username) = lower(username_b) limit 1
  ),
  a_cards as (
    select distinct uc.card_id from public.user_collections uc, pa where uc.user_id = pa.id
  ),
  b_cards as (
    select distinct uc.card_id from public.user_collections uc, pb where uc.user_id = pb.id
  ),
  all_ids as (
    select card_id from a_cards
    union
    select card_id from b_cards
  )
  select
    c.id as card_id,
    c.name as card_name,
    c.set_name,
    c.card_number,
    exists (select 1 from a_cards a where a.card_id = c.id) as owned_by_a,
    exists (select 1 from b_cards b where b.card_id = c.id) as owned_by_b
  from all_ids ai
  join public.cards c on c.id = ai.card_id
  order by c.set_name nulls last, c.name;
$$;

grant execute on function public.compare_collectors(text, text) to anon, authenticated;
