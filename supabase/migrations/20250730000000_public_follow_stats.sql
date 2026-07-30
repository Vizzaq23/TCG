-- Public follow stats: counts for anyone + relationship/lists for signed-in users

create or replace function public.get_profile_follow_stats(target_username text)
returns table (
  follower_count bigint,
  following_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  slug text;
begin
  slug := lower(trim(both from coalesce(target_username, '')));
  slug := regexp_replace(slug, '^@', '');
  if slug = '' then
    return;
  end if;

  select p.id into target_id
  from public.profiles p
  where p.username = slug;

  if target_id is null then
    return;
  end if;

  return query
  select
    (
      select count(*)::bigint
      from public.follows f
      where f.following_id = target_id
    ) as follower_count,
    (
      select count(*)::bigint
      from public.follows f
      where f.follower_id = target_id
    ) as following_count;
end;
$$;

grant execute on function public.get_profile_follow_stats(text) to anon, authenticated;

create or replace function public.get_profile_follow_relationship(target_username text)
returns table (
  is_following boolean,
  follows_you boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  slug text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  slug := lower(trim(both from coalesce(target_username, '')));
  slug := regexp_replace(slug, '^@', '');
  if slug = '' then
    return;
  end if;

  select p.id into target_id
  from public.profiles p
  where p.username = slug;

  if target_id is null then
    return;
  end if;

  return query
  select
    exists (
      select 1
      from public.follows f
      where f.follower_id = auth.uid()
        and f.following_id = target_id
    ) as is_following,
    exists (
      select 1
      from public.follows f
      where f.follower_id = target_id
        and f.following_id = auth.uid()
    ) as follows_you;
end;
$$;

grant execute on function public.get_profile_follow_relationship(text) to authenticated;

create or replace function public.get_profile_followers(
  target_username text,
  p_limit int default 40,
  p_offset int default 0
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_following boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  slug text;
  lim int;
  off int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  slug := lower(trim(both from coalesce(target_username, '')));
  slug := regexp_replace(slug, '^@', '');
  if slug = '' then
    return;
  end if;

  select p.id into target_id
  from public.profiles p
  where p.username = slug;

  if target_id is null then
    return;
  end if;

  lim := greatest(1, least(coalesce(p_limit, 40), 100));
  off := greatest(0, coalesce(p_offset, 0));

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    exists (
      select 1
      from public.follows f2
      where f2.follower_id = auth.uid()
        and f2.following_id = p.id
    ) as is_following
  from public.follows f
  join public.profiles p on p.id = f.follower_id
  where f.following_id = target_id
  order by f.created_at desc
  limit lim
  offset off;
end;
$$;

grant execute on function public.get_profile_followers(text, int, int) to authenticated;

create or replace function public.get_profile_following(
  target_username text,
  p_limit int default 40,
  p_offset int default 0
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_following boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  slug text;
  lim int;
  off int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  slug := lower(trim(both from coalesce(target_username, '')));
  slug := regexp_replace(slug, '^@', '');
  if slug = '' then
    return;
  end if;

  select p.id into target_id
  from public.profiles p
  where p.username = slug;

  if target_id is null then
    return;
  end if;

  lim := greatest(1, least(coalesce(p_limit, 40), 100));
  off := greatest(0, coalesce(p_offset, 0));

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    exists (
      select 1
      from public.follows f2
      where f2.follower_id = auth.uid()
        and f2.following_id = p.id
    ) as is_following
  from public.follows f
  join public.profiles p on p.id = f.following_id
  where f.follower_id = target_id
  order by f.created_at desc
  limit lim
  offset off;
end;
$$;

grant execute on function public.get_profile_following(text, int, int) to authenticated;
