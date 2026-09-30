-- Availability for a cart excludes its own pending holds but includes every
-- other buyer's hold. This read-only RPC is private to the application server.
create or replace function public.shop_cart_available_quantities(p_listing_ids uuid[], p_checkout_token uuid default null)
returns table(listing_id uuid, available_quantity integer, own_held_quantity integer)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id,
    greatest(0,l.quantity_available-coalesce(sum(r.quantity) filter (
      where o.checkout_token is distinct from p_checkout_token or p_checkout_token is null
    ),0))::integer,
    coalesce(sum(r.quantity) filter (where o.checkout_token=p_checkout_token),0)::integer
  from public.shop_listings l
  left join public.inventory_reservations r on r.listing_id=l.id and r.status='held' and r.expires_at>now()
  left join public.shop_orders o on o.id=r.order_id
  where l.id=any(p_listing_ids)
  group by l.id,l.quantity_available;
$$;
revoke all on function public.shop_cart_available_quantities(uuid[],uuid) from public,anon,authenticated;
grant execute on function public.shop_cart_available_quantities(uuid[],uuid) to service_role;
