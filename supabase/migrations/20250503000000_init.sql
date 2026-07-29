-- One Piece TCG Collection — initial schema, RLS, RPCs
-- Idempotent: safe when tables/policies already exist (no drops of user data).

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users) — sole CREATE for public.profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz not null default now();

-- Ensure username is NOT NULL when column already existed as nullable
do $$
begin
  alter table public.profiles alter column username set not null;
exception
  when others then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_username_lower_only
    check (username = lower(username));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists profiles_username_key on public.profiles (username);
create index if not exists profiles_username_idx on public.profiles (username);

-- Catalog
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  card_number text,
  name text not null,
  set_name text,
  rarity text,
  color text,
  type text,
  cost text,
  power text,
  counter text,
  attribute text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.cards
  add column if not exists card_number text,
  add column if not exists name text,
  add column if not exists set_name text,
  add column if not exists rarity text,
  add column if not exists color text,
  add column if not exists type text,
  add column if not exists cost text,
  add column if not exists power text,
  add column if not exists counter text,
  add column if not exists attribute text,
  add column if not exists image_url text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  alter table public.cards alter column name set not null;
exception
  when others then null;
end $$;

create index if not exists cards_set_name_idx on public.cards (set_name);
create index if not exists cards_rarity_idx on public.cards (rarity);
create index if not exists cards_color_idx on public.cards (color);
create index if not exists cards_type_idx on public.cards (type);
create index if not exists cards_name_idx on public.cards (name);

-- User ownership rows
create table if not exists public.user_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  quantity int not null default 1,
  "condition" text,
  notes text,
  is_for_trade boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_collections
  add column if not exists user_id uuid,
  add column if not exists card_id uuid,
  add column if not exists quantity int not null default 1,
  add column if not exists "condition" text,
  add column if not exists notes text,
  add column if not exists is_for_trade boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table public.user_collections
    add constraint user_collections_quantity_check
    check (quantity >= 1);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.user_collections
    add constraint user_collections_user_id_card_id_key
    unique (user_id, card_id);
exception
  when duplicate_object then null;
end $$;

create index if not exists user_collections_user_id_idx on public.user_collections (user_id);

create or replace function public.set_user_collections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_collections_set_updated_at on public.user_collections;
create trigger user_collections_set_updated_at
  before update on public.user_collections
  for each row
  execute function public.set_user_collections_updated_at();

-- Analytics (public profile views)
create table if not exists public.collection_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

alter table public.collection_views
  add column if not exists profile_id uuid,
  add column if not exists viewed_at timestamptz not null default now();

create index if not exists collection_views_profile_id_idx on public.collection_views (profile_id);
create index if not exists collection_views_profile_viewed_at_idx
  on public.collection_views (profile_id, viewed_at desc);

-- New user → profile row (username must be unique)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  attempt int := 0;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  base := coalesce(
    nullif(
      lower(
        regexp_replace(
          split_part(coalesce(new.email, ''), '@', 1),
          '[^a-z0-9_]',
          '',
          'g'
        )
      ),
      ''
    ),
    'collector'
  );

  if length(base) < 3 then
    base := 'collector';
  end if;

  base := left(base, 16);

  loop
    attempt := attempt + 1;
    if attempt > 80 then
      candidate := lower('u_' || replace(gen_random_uuid()::text, '-', ''));
      exit;
    end if;
    candidate := lower(
      base || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
    );
    exit when not exists (select 1 from public.profiles p where p.username = candidate);
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    candidate,
    nullif(
      trim(
        both from coalesce(
          new.raw_user_meta_data->>'full_name',
          nullif(split_part(coalesce(new.email, ''), '@', 1), '')
        )
      ),
      ''
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Public collection read (bypasses direct RLS on user_collections for anon)
create or replace function public.get_public_collection(target_username text)
returns table (
  collection_id uuid,
  user_id uuid,
  card_id uuid,
  quantity int,
  "condition" text,
  notes text,
  is_for_trade boolean,
  card_number text,
  card_name text,
  set_name text,
  rarity text,
  color text,
  type text,
  cost text,
  power text,
  counter text,
  attribute text,
  image_url text,
  display_name text,
  username text,
  profile_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    uc.id as collection_id,
    uc.user_id,
    uc.card_id,
    uc.quantity,
    uc."condition",
    uc.notes,
    uc.is_for_trade,
    c.card_number,
    c.name as card_name,
    c.set_name,
    c.rarity,
    c.color,
    c.type,
    c.cost,
    c.power,
    c.counter,
    c.attribute,
    c.image_url,
    p.display_name,
    p.username,
    p.id as profile_id
  from public.profiles p
  join public.user_collections uc on uc.user_id = p.id
  join public.cards c on c.id = uc.card_id
  where lower(p.username) = lower(target_username);
$$;

grant execute on function public.get_public_collection(text) to anon, authenticated;

create or replace function public.record_collection_view(target_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  select p.id into pid
  from public.profiles p
  where lower(p.username) = lower(target_username)
  limit 1;

  if pid is null then
    return;
  end if;

  insert into public.collection_views (profile_id)
  values (pid);
end;
$$;

grant execute on function public.record_collection_view(text) to anon, authenticated;

-- Stats for the signed-in user (owner dashboard)
create or replace function public.get_collection_stats()
returns table (
  total_cards_owned bigint,
  unique_cards_owned bigint,
  total_collection_views bigint,
  cards_marked_for_trade bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(sum(uc.quantity), 0)::bigint as total_cards_owned,
    count(distinct uc.card_id)::bigint as unique_cards_owned,
    (select count(*)::bigint from public.collection_views cv where cv.profile_id = auth.uid()) as total_collection_views,
    coalesce(sum(case when uc.is_for_trade then uc.quantity else 0 end), 0)::bigint as cards_marked_for_trade
  from public.user_collections uc
  where uc.user_id = auth.uid();
$$;

grant execute on function public.get_collection_stats() to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.user_collections enable row level security;
alter table public.collection_views enable row level security;

-- profiles
drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- cards (catalog)
drop policy if exists "Cards are readable by everyone" on public.cards;
create policy "Cards are readable by everyone"
  on public.cards for select
  using (true);

-- user_collections: only owner can touch rows directly
drop policy if exists "Owners select own collection" on public.user_collections;
create policy "Owners select own collection"
  on public.user_collections for select
  using (auth.uid() = user_id);

drop policy if exists "Owners insert own collection" on public.user_collections;
create policy "Owners insert own collection"
  on public.user_collections for insert
  with check (auth.uid() = user_id);

drop policy if exists "Owners update own collection" on public.user_collections;
create policy "Owners update own collection"
  on public.user_collections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owners delete own collection" on public.user_collections;
create policy "Owners delete own collection"
  on public.user_collections for delete
  using (auth.uid() = user_id);

-- collection_views: only owner can read their analytics
drop policy if exists "Owners read own collection views" on public.collection_views;
create policy "Owners read own collection views"
  on public.collection_views for select
  using (
    profile_id in (select id from public.profiles where id = auth.uid())
  );

-- No direct insert from clients; use record_collection_view RPC
drop policy if exists "Deny direct insert collection_views" on public.collection_views;
create policy "Deny direct insert collection_views"
  on public.collection_views for insert
  with check (false);

drop policy if exists "Deny direct update collection_views" on public.collection_views;
create policy "Deny direct update collection_views"
  on public.collection_views for update
  using (false);

drop policy if exists "Deny direct delete collection_views" on public.collection_views;
create policy "Deny direct delete collection_views"
  on public.collection_views for delete
  using (false);

-- Seed sample cards only when those card_numbers are missing (no duplicates)
insert into public.cards (
  card_number, name, set_name, rarity, color, type, cost, power, counter, attribute, image_url
)
select v.card_number, v.name, v.set_name, v.rarity, v.color, v.type, v.cost, v.power, v.counter, v.attribute, v.image_url
from (
  values
    ('OP01-001', 'Monkey.D.Luffy', 'Romance Dawn', 'Leader', 'Red', 'Leader', '5', '5000', '2000', 'Strike', 'https://placehold.co/420x600/1a1a2e/eee?text=Luffy'),
    ('OP01-002', 'Roronoa Zoro', 'Romance Dawn', 'Super Rare', 'Green', 'Character', '4', '5000', '2000', 'Slash', 'https://placehold.co/420x600/16213e/eee?text=Zoro'),
    ('OP01-003', 'Nami', 'Romance Dawn', 'Rare', 'Blue', 'Character', '3', '2000', '1000', 'Wisdom', 'https://placehold.co/420x600/0f3460/eee?text=Nami'),
    ('OP01-004', 'Usopp', 'Romance Dawn', 'Common', 'Yellow', 'Character', '2', '3000', '1000', 'Ranged', 'https://placehold.co/420x600/533483/eee?text=Usopp'),
    ('OP01-005', 'Sanji', 'Romance Dawn', 'Rare', 'Blue', 'Character', '4', '5000', '2000', 'Strike', 'https://placehold.co/420x600/e94560/fff?text=Sanji'),
    ('OP01-006', 'Tony Tony Chopper', 'Romance Dawn', 'Common', 'Green', 'Character', '1', '2000', '1000', 'Wisdom', 'https://placehold.co/420x600/1b4332/eee?text=Chopper'),
    ('OP01-007', 'Nico Robin', 'Romance Dawn', 'Uncommon', 'Purple', 'Character', '3', '4000', '1000', 'Wisdom', 'https://placehold.co/420x600/3d0066/eee?text=Robin'),
    ('OP01-008', 'Shanks', 'Romance Dawn', 'Secret Rare', 'Red', 'Character', '9', '10000', '2000', 'Slash', 'https://placehold.co/420x600/7f1d1d/eee?text=Shanks')
) as v(card_number, name, set_name, rarity, color, type, cost, power, counter, attribute, image_url)
where not exists (
  select 1 from public.cards c where c.card_number = v.card_number
);
