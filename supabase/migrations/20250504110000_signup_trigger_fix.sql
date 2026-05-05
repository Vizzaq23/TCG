-- Apply in Supabase SQL Editor if sign up shows "Database error saving new user".
-- Fixes profile insert edge cases and uses EXECUTE FUNCTION for the auth trigger (newer Postgres).

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
