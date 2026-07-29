-- Profile customization: bio + public accent theme (idempotent; does not recreate profiles)
alter table public.profiles
  add column if not exists bio text;

alter table public.profiles
  add column if not exists accent text;

-- Backfill + enforce default without rewriting existing non-null accents
update public.profiles
set accent = 'amber'
where accent is null;

alter table public.profiles
  alter column accent set default 'amber';

do $$
begin
  alter table public.profiles alter column accent set not null;
exception
  when others then null;
end $$;

alter table public.profiles
  drop constraint if exists profiles_bio_length;

alter table public.profiles
  add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 280);

alter table public.profiles
  drop constraint if exists profiles_accent_allowed;

alter table public.profiles
  add constraint profiles_accent_allowed
  check (accent in ('amber', 'crimson', 'ocean', 'emerald', 'gold'));

comment on column public.profiles.bio is 'Short public bio shown on collector shelf (max 280 chars).';
comment on column public.profiles.accent is 'Public profile accent theme key.';
