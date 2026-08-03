-- Trade inbox context: offers with target card details for both parties

create or replace function public.get_my_trade_offers(p_limit int default 50)
returns table (
  id uuid,
  status text,
  message text,
  created_at timestamptz,
  direction text,
  counterpart_username text,
  counterpart_display_name text,
  counterpart_avatar_url text,
  owner_username text,
  target_collection_id uuid,
  card_id uuid,
  card_name text,
  set_name text,
  card_number text,
  image_url text,
  quantity integer,
  condition text,
  notes text,
  is_for_trade boolean,
  is_graded boolean,
  grading_company text,
  grade numeric,
  is_black_label boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  lim int;
begin
  me := auth.uid();
  if me is null then
    raise exception 'Not authenticated';
  end if;

  lim := greatest(1, least(coalesce(p_limit, 50), 100));

  return query
  select
    t.id,
    t.status,
    t.message,
    t.created_at,
    case
      when t.to_user_id = me then 'incoming'
      else 'outgoing'
    end as direction,
    cp.username as counterpart_username,
    cp.display_name as counterpart_display_name,
    cp.avatar_url as counterpart_avatar_url,
    owner.username as owner_username,
    t.target_collection_id,
    c.id as card_id,
    c.name as card_name,
    c.set_name,
    c.card_number,
    c.image_url,
    uc.quantity,
    uc.condition,
    uc.notes,
    uc.is_for_trade,
    coalesce(uc.is_graded, false) as is_graded,
    uc.grading_company,
    uc.grade,
    coalesce(uc.is_black_label, false) as is_black_label
  from public.trade_offers t
  join public.user_collections uc on uc.id = t.target_collection_id
  join public.cards c on c.id = uc.card_id
  join public.profiles owner on owner.id = uc.user_id
  join public.profiles cp on cp.id = case
    when t.to_user_id = me then t.from_user_id
    else t.to_user_id
  end
  where t.from_user_id = me or t.to_user_id = me
  order by t.created_at desc
  limit lim;
end;
$$;

grant execute on function public.get_my_trade_offers(int) to authenticated;
