-- Suggested collectors: rank people you don't follow by shared shelf cards

create or replace function public.get_suggested_collectors(p_limit int default 8)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_following boolean,
  shared_cards integer,
  follows_you boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int;
  me uuid;
begin
  me := auth.uid();
  if me is null then
    raise exception 'Not authenticated';
  end if;

  lim := greatest(1, least(coalesce(p_limit, 8), 24));

  return query
  with my_cards as (
    select distinct uc.card_id
    from public.user_collections uc
    where uc.user_id = me
  ),
  already_following as (
    select f.following_id
    from public.follows f
    where f.follower_id = me
  ),
  overlap as (
    select
      uc.user_id as profile_id,
      count(distinct uc.card_id)::int as shared
    from public.user_collections uc
    join my_cards mc on mc.card_id = uc.card_id
    where uc.user_id <> me
      and not exists (
        select 1 from already_following af where af.following_id = uc.user_id
      )
    group by uc.user_id
    having count(distinct uc.card_id) >= 1
  ),
  discovery as (
    -- Fallback when the viewer has little/no overlap: active public shelves
    select
      uc.user_id as profile_id,
      0::int as shared
    from public.user_collections uc
    where uc.user_id <> me
      and not exists (
        select 1 from already_following af where af.following_id = uc.user_id
      )
      and not exists (
        select 1 from overlap o where o.profile_id = uc.user_id
      )
    group by uc.user_id
    having count(*) >= 1
    order by count(*) desc
    limit lim
  ),
  ranked as (
    select o.profile_id, o.shared, 0 as tier
    from overlap o
    union all
    select d.profile_id, d.shared, 1 as tier
    from discovery d
  )
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    false as is_following,
    r.shared as shared_cards,
    exists (
      select 1
      from public.follows f
      where f.follower_id = p.id
        and f.following_id = me
    ) as follows_you
  from ranked r
  join public.profiles p on p.id = r.profile_id
  order by
    r.tier asc,
    r.shared desc,
    follows_you desc,
    p.username
  limit lim;
end;
$$;

grant execute on function public.get_suggested_collectors(int) to authenticated;
