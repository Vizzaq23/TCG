-- Don't count a collector viewing their own public shelf as a profile view.
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

  -- Owner viewing their own page should not inflate public analytics.
  if auth.uid() is not null and auth.uid() = pid then
    return;
  end if;

  insert into public.collection_views (profile_id)
  values (pid);
end;
$$;

grant execute on function public.record_collection_view(text) to anon, authenticated;
