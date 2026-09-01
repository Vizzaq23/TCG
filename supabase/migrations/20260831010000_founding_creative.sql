-- Founding Creative entitlement + public dispatch.
-- Entitlements are service-managed; entitled users may edit only their dispatch.

create table if not exists public.account_entitlements (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  entitlement_key text not null,
  badge_label text not null,
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  primary key (profile_id, entitlement_key),
  constraint account_entitlements_key_format
    check (entitlement_key ~ '^[a-z][a-z0-9_]{2,39}$'),
  constraint account_entitlements_badge_length
    check (char_length(badge_label) between 3 and 32)
);

create table if not exists public.creator_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  spotlight_title text not null default 'Creative Dispatch',
  spotlight_message text not null default 'Charting a collection one grail at a time.',
  profile_effect text not null default 'aurora',
  updated_at timestamptz not null default now(),
  constraint creator_profiles_title_length
    check (char_length(spotlight_title) between 3 and 48),
  constraint creator_profiles_message_length
    check (char_length(spotlight_message) between 1 and 240),
  constraint creator_profiles_effect_allowed
    check (profile_effect in ('aurora', 'wanted', 'deep_sea'))
);

comment on table public.account_entitlements is
  'Service-managed account capabilities. Browser clients have no direct access.';
comment on table public.creator_profiles is
  'Public creative dispatch settings, writable only through the gated RPC.';

alter table public.account_entitlements enable row level security;
alter table public.creator_profiles enable row level security;

-- No direct browser access. Public reads and entitled writes go through the RPCs below.
revoke all on table public.account_entitlements from anon, authenticated;
revoke all on table public.creator_profiles from anon, authenticated;

create or replace function public.set_creator_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists creator_profiles_set_updated_at on public.creator_profiles;
create trigger creator_profiles_set_updated_at
  before update on public.creator_profiles
  for each row
  execute function public.set_creator_profiles_updated_at();

drop function if exists public.get_profile_creative_features(text);
create function public.get_profile_creative_features(target_username text)
returns table (
  is_creative boolean,
  badge_label text,
  spotlight_title text,
  spotlight_message text,
  profile_effect text,
  granted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    true as is_creative,
    ae.badge_label,
    coalesce(cp.spotlight_title, 'Creative Dispatch') as spotlight_title,
    coalesce(
      cp.spotlight_message,
      'Charting a collection one grail at a time.'
    ) as spotlight_message,
    coalesce(cp.profile_effect, 'aurora') as profile_effect,
    ae.granted_at
  from public.profiles p
  join public.account_entitlements ae
    on ae.profile_id = p.id
   and ae.entitlement_key = 'founding_creative'
   and ae.active
  left join public.creator_profiles cp on cp.profile_id = p.id
  where lower(p.username) = lower(trim(target_username))
  limit 1;
$$;

revoke all on function public.get_profile_creative_features(text) from public;
grant execute on function public.get_profile_creative_features(text) to anon, authenticated;

drop function if exists public.update_creator_profile(text, text, text);
create function public.update_creator_profile(
  p_spotlight_title text,
  p_spotlight_message text,
  p_profile_effect text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_title text := trim(coalesce(p_spotlight_title, ''));
  normalized_message text := trim(coalesce(p_spotlight_message, ''));
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.account_entitlements ae
    where ae.profile_id = auth.uid()
      and ae.entitlement_key = 'founding_creative'
      and ae.active
  ) then
    raise exception 'creative entitlement required';
  end if;

  if char_length(normalized_title) < 3 or char_length(normalized_title) > 48 then
    raise exception 'spotlight title must be between 3 and 48 characters';
  end if;

  if char_length(normalized_message) < 1 or char_length(normalized_message) > 240 then
    raise exception 'spotlight message must be between 1 and 240 characters';
  end if;

  if p_profile_effect not in ('aurora', 'wanted', 'deep_sea') then
    raise exception 'unknown profile effect';
  end if;

  insert into public.creator_profiles (
    profile_id,
    spotlight_title,
    spotlight_message,
    profile_effect
  )
  values (
    auth.uid(),
    normalized_title,
    normalized_message,
    p_profile_effect
  )
  on conflict (profile_id) do update
  set spotlight_title = excluded.spotlight_title,
      spotlight_message = excluded.spotlight_message,
      profile_effect = excluded.profile_effect;
end;
$$;

revoke all on function public.update_creator_profile(text, text, text) from public;
grant execute on function public.update_creator_profile(text, text, text) to authenticated;

-- The requested account grant. The entitlement is attached to the profile id so it
-- survives future username changes.
insert into public.account_entitlements (
  profile_id,
  entitlement_key,
  badge_label,
  active
)
select
  p.id,
  'founding_creative',
  'Founding Creative',
  true
from public.profiles p
where lower(p.username) = 'alostzoro'
on conflict (profile_id, entitlement_key) do update
set badge_label = excluded.badge_label,
    active = true;

insert into public.creator_profiles (
  profile_id,
  spotlight_title,
  spotlight_message,
  profile_effect
)
select
  p.id,
  'From the Captain''s Desk',
  'Building the Grand Line''s sharpest shelf, one legendary pull at a time.',
  'aurora'
from public.profiles p
where lower(p.username) = 'alostzoro'
on conflict (profile_id) do nothing;
