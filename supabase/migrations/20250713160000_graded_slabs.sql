-- Graded slab metadata on collection entries
-- Must DROP functions before recreating: return row type changed.

alter table public.user_collections
  add column if not exists is_graded boolean not null default false,
  add column if not exists grading_company text
    check (
      grading_company is null
      or grading_company in ('PSA', 'BGS', 'CGC', 'SGC')
    ),
  add column if not exists grade numeric(3, 1)
    check (grade is null or (grade >= 1 and grade <= 10)),
  add column if not exists cert_number text,
  add column if not exists slab_image_url text;

alter table public.user_collections
  drop constraint if exists user_collections_graded_fields_check;

alter table public.user_collections
  add constraint user_collections_graded_fields_check
  check (
    (
      is_graded = false
      and grading_company is null
      and grade is null
      and cert_number is null
      and slab_image_url is null
    )
    or (
      is_graded = true
      and grading_company is not null
      and grade is not null
    )
  );

drop function if exists public.get_public_collection(text);
drop function if exists public.get_public_showcase(text);

create or replace function public.get_public_collection(target_username text)
returns table (
  collection_id uuid,
  user_id uuid,
  card_id uuid,
  quantity int,
  "condition" text,
  notes text,
  is_for_trade boolean,
  is_graded boolean,
  grading_company text,
  grade numeric,
  cert_number text,
  slab_image_url text,
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
    uc.is_graded,
    uc.grading_company,
    uc.grade,
    uc.cert_number,
    uc.slab_image_url,
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

create or replace function public.get_public_showcase(target_username text)
returns table (
  collection_id uuid,
  showcase_slot smallint,
  card_id uuid,
  card_number text,
  card_name text,
  set_name text,
  rarity text,
  image_url text,
  is_graded boolean,
  grading_company text,
  grade numeric,
  cert_number text,
  slab_image_url text
)
language sql
security definer
set search_path = public
as $$
  select
    uc.id as collection_id,
    uc.showcase_slot,
    c.id as card_id,
    c.card_number,
    c.name as card_name,
    c.set_name,
    c.rarity,
    c.image_url,
    uc.is_graded,
    uc.grading_company,
    uc.grade,
    uc.cert_number,
    uc.slab_image_url
  from public.profiles p
  join public.user_collections uc on uc.user_id = p.id
  join public.cards c on c.id = uc.card_id
  where lower(p.username) = lower(target_username)
    and uc.showcase_slot is not null
  order by uc.showcase_slot asc;
$$;

grant execute on function public.get_public_showcase(text) to anon, authenticated;
