-- Top-3 showcase shelf on public profiles

alter table public.user_collections
  add column if not exists showcase_slot smallint
  check (showcase_slot is null or showcase_slot between 1 and 3);

create unique index if not exists user_collections_showcase_slot_unique_idx
  on public.user_collections (user_id, showcase_slot)
  where showcase_slot is not null;

-- DROP first: later migrations widen RETURNS TABLE (42P13 on CREATE OR REPLACE).
drop function if exists public.get_public_showcase(text);

create or replace function public.get_public_showcase(target_username text)
returns table (
  collection_id uuid,
  showcase_slot smallint,
  card_id uuid,
  card_number text,
  card_name text,
  set_name text,
  rarity text,
  image_url text
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
    c.image_url
  from public.profiles p
  join public.user_collections uc on uc.user_id = p.id
  join public.cards c on c.id = uc.card_id
  where lower(p.username) = lower(target_username)
    and uc.showcase_slot is not null
  order by uc.showcase_slot asc;
$$;

grant execute on function public.get_public_showcase(text) to anon, authenticated;

create or replace function public.set_showcase_slot(
  p_collection_id uuid,
  p_slot smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_slot is not null and (p_slot < 1 or p_slot > 3) then
    raise exception 'showcase slot must be 1, 2, 3, or null';
  end if;

  if not exists (
    select 1
    from public.user_collections uc
    where uc.id = p_collection_id and uc.user_id = auth.uid()
  ) then
    raise exception 'collection entry not found';
  end if;

  if p_slot is not null then
    update public.user_collections
    set showcase_slot = null
    where user_id = auth.uid() and showcase_slot = p_slot;
  end if;

  update public.user_collections
  set showcase_slot = p_slot
  where id = p_collection_id and user_id = auth.uid();
end;
$$;

grant execute on function public.set_showcase_slot(uuid, smallint) to authenticated;
