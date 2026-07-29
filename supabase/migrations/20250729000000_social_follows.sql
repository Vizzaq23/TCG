-- Social follows: one-way follow graph + search + following activity feed

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create index if not exists follows_following_id_idx
  on public.follows (following_id, created_at desc);

create index if not exists follows_follower_id_idx
  on public.follows (follower_id, created_at desc);

alter table public.follows enable row level security;

drop policy if exists "Parties select follows" on public.follows;
create policy "Parties select follows"
  on public.follows for select
  using (auth.uid() = follower_id or auth.uid() = following_id);

drop policy if exists "Users insert own follows" on public.follows;
create policy "Users insert own follows"
  on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "Users delete own follows" on public.follows;
create policy "Users delete own follows"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ── Follow / unfollow ──────────────────────────────────────────────────────

create or replace function public.follow_user(target_username text)
returns void
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
    raise exception 'Username required';
  end if;

  select p.id into target_id
  from public.profiles p
  where p.username = slug;

  if target_id is null then
    raise exception 'User not found';
  end if;
  if target_id = auth.uid() then
    raise exception 'Cannot follow yourself';
  end if;

  insert into public.follows (follower_id, following_id)
  values (auth.uid(), target_id)
  on conflict do nothing;
end;
$$;

grant execute on function public.follow_user(text) to authenticated;

create or replace function public.unfollow_user(target_username text)
returns void
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
    raise exception 'Username required';
  end if;

  select p.id into target_id
  from public.profiles p
  where p.username = slug;

  if target_id is null then
    raise exception 'User not found';
  end if;

  delete from public.follows
  where follower_id = auth.uid()
    and following_id = target_id;
end;
$$;

grant execute on function public.unfollow_user(text) to authenticated;

-- ── Profile search ─────────────────────────────────────────────────────────

create or replace function public.search_profiles(
  q text,
  p_limit int default 20
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
  term text;
  lim int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  term := lower(trim(both from coalesce(q, '')));
  term := regexp_replace(term, '^@', '');
  if char_length(term) < 1 then
    return;
  end if;

  lim := greatest(1, least(coalesce(p_limit, 20), 50));

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    exists (
      select 1
      from public.follows f
      where f.follower_id = auth.uid()
        and f.following_id = p.id
    ) as is_following
  from public.profiles p
  where p.id <> auth.uid()
    and (
      p.username ilike '%' || term || '%'
      or coalesce(p.display_name, '') ilike '%' || term || '%'
    )
  order by
    case when p.username = term then 0
         when p.username like term || '%' then 1
         else 2
    end,
    p.username
  limit lim;
end;
$$;

grant execute on function public.search_profiles(text, int) to authenticated;

-- ── Following activity feed ────────────────────────────────────────────────

create or replace function public.get_following_activity(p_limit int default 40)
returns table (
  id uuid,
  event_type text,
  payload jsonb,
  created_at timestamptz,
  actor_id uuid,
  actor_username text,
  actor_display_name text,
  actor_avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  lim := greatest(1, least(coalesce(p_limit, 40), 100));

  return query
  select
    ae.id,
    ae.event_type,
    ae.payload,
    ae.created_at,
    p.id as actor_id,
    p.username as actor_username,
    p.display_name as actor_display_name,
    p.avatar_url as actor_avatar_url
  from public.activity_events ae
  join public.follows f on f.following_id = ae.profile_id
  join public.profiles p on p.id = ae.profile_id
  where f.follower_id = auth.uid()
  order by ae.created_at desc
  limit lim;
end;
$$;

grant execute on function public.get_following_activity(int) to authenticated;
