-- Enforce shelf capacity on every listing write, including direct owner updates.
-- quantity_available already includes checkout holds; count each copy once.
-- Parent and bundle contents commit together. Invoker privileges retain RLS;
-- only the authenticated owner may create a listing through this RPC.
create or replace function public.shop_create_listing(p_listing jsonb, p_items jsonb default '[]'::jsonb)
returns setof public.shop_listings
language plpgsql
security invoker
set search_path = ''
as $$
declare listing public.shop_listings%rowtype; item jsonb;
begin
  if auth.uid() is null or (p_listing->>'owner_user_id')::uuid is distinct from auth.uid() then
    raise exception 'forbidden';
  end if;
  if jsonb_typeof(p_listing) <> 'object' or p_listing is null
     or length(trim(coalesce(p_listing->>'title',''))) = 0
     or jsonb_typeof(p_items) <> 'array' or p_items is null
     or jsonb_array_length(p_items) > 200 then
    raise exception 'invalid_listing';
  end if;
  insert into public.shop_listings(owner_user_id, kind, title, description, condition,
    quantity_available, price_cents, unit_cost_cents, card_id, collection_id, status, image_url)
  values(auth.uid(), p_listing->>'kind', trim(p_listing->>'title'), p_listing->>'description',
    p_listing->>'condition', (p_listing->>'quantity_available')::integer, (p_listing->>'price_cents')::integer,
    (p_listing->>'unit_cost_cents')::integer, (p_listing->>'card_id')::uuid, (p_listing->>'collection_id')::uuid,
    coalesce(p_listing->>'status','draft'), p_listing->>'image_url') returning * into listing;
  for item in select value from jsonb_array_elements(p_items) loop
    insert into public.shop_listing_items(listing_id,card_id,quantity,condition)
    values(listing.id,(item->>'card_id')::uuid,(item->>'quantity')::integer,item->>'condition');
  end loop;
  return next listing;
end;
$$;
revoke all on function public.shop_create_listing(jsonb,jsonb) from public, anon;
grant execute on function public.shop_create_listing(jsonb,jsonb) to authenticated;

create or replace function public.shop_guard_listing_allocation()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  collection public.user_collections%rowtype;
  allocated bigint;
  requested bigint;
  previous bigint := 0;
  held bigint := 0;
begin
  if tg_op = 'DELETE' then
    if exists(select 1 from public.inventory_reservations r
      where r.listing_id=old.id and r.status='held' and r.expires_at>now())
      or exists(select 1 from public.shop_order_items i join public.shop_orders o on o.id=i.order_id
        where i.listing_id=old.id and o.status='pending_payment' and o.payment_status='unpaid') then
      raise exception 'listing_has_pending_checkout';
    end if;
    return old;
  end if;
  requested := case when new.status in ('draft', 'active')
    then new.quantity_available::bigint * public.shop_collection_units_per_listing(new.kind)
    else 0 end;

  -- An open Checkout can still consume this listing. Do not release its physical
  -- allocation by archiving it until its pending Checkout has been cancelled.
  if tg_op = 'UPDATE' then
    select coalesce(sum(r.quantity),0) into held from public.inventory_reservations r
    where r.listing_id=old.id and r.status='held' and r.expires_at>now();
    if held > 0 and (new.status='archived' or new.quantity_available < held
       or new.kind is distinct from old.kind or new.card_id is distinct from old.card_id
       or new.collection_id is distinct from old.collection_id or new.owner_user_id is distinct from old.owner_user_id) then
      raise exception 'listing_has_pending_checkout';
    end if;
  end if;
  if requested = 0 then return new; end if;
  if new.collection_id is null then raise exception 'listing_collection_required'; end if;

  if tg_op = 'UPDATE' then
    previous := case when old.status in ('draft', 'active')
      then old.quantity_available::bigint * public.shop_collection_units_per_listing(old.kind)
      else 0 end;
    -- Releasing capacity needs no collection lock. Finalization holds the listing
    -- row first and reduces its allocation before reducing/deleting shelf stock.
    -- Avoid acquiring the opposite lock order on these release-only writes.
    if new.collection_id is not distinct from old.collection_id
       and new.owner_user_id = old.owner_user_id
       and new.card_id is not distinct from old.card_id
       and requested <= previous then
      return new;
    end if;
  end if;

  select * into collection from public.user_collections c
  where c.id = new.collection_id for no key update;
  if not found or collection.user_id <> new.owner_user_id
     or collection.card_id is distinct from new.card_id then
    raise exception 'listing_collection_mismatch';
  end if;

  -- This VOLATILE trigger obtains a fresh READ COMMITTED snapshot after the
  -- collection lock. Do not call the existing STABLE display-total helper here.
  select coalesce(sum(l.quantity_available::bigint * public.shop_collection_units_per_listing(l.kind)), 0)
  into allocated from public.shop_listings l
  where l.collection_id = new.collection_id and l.id <> new.id
    and l.status in ('draft', 'active');
  if allocated + requested > collection.quantity then
    raise exception 'insufficient_collection_stock';
  end if;
  return new;
end;
$$;
revoke all on function public.shop_guard_listing_allocation() from public, anon, authenticated;
drop trigger if exists shop_listings_guard_allocation on public.shop_listings;
create trigger shop_listings_guard_allocation
  before insert or update of collection_id, owner_user_id, card_id, kind, quantity_available, status or delete
  on public.shop_listings for each row execute function public.shop_guard_listing_allocation();

-- Prevent collector edits or FK deletion from bypassing listing capacity. The
-- UPDATE/DELETE already holds this collection row; concurrent allocations wait.
create or replace function public.shop_guard_collection_stock()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare allocated bigint;
begin
  select coalesce(sum(l.quantity_available::bigint * public.shop_collection_units_per_listing(l.kind)), 0)
  into allocated from public.shop_listings l
  where l.collection_id = old.id and l.status in ('draft', 'active');
  if tg_op = 'DELETE' then
    if allocated > 0 then raise exception 'collection_stock_allocated'; end if;
    return old;
  end if;
  if new.quantity < allocated or (allocated > 0 and (
    new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.card_id is distinct from old.card_id
  )) then
    raise exception 'collection_stock_allocated';
  end if;
  return new;
end;
$$;
revoke all on function public.shop_guard_collection_stock() from public, anon, authenticated;
drop trigger if exists user_collections_guard_shop_stock on public.user_collections;
create trigger user_collections_guard_shop_stock
  before update of id, user_id, card_id, quantity or delete on public.user_collections
  for each row execute function public.shop_guard_collection_stock();

-- Existing allocations may predate the guard. Never consume missing or insufficient shelf stock.
create or replace function public.shop_finalize_verified_order(
  p_order_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_buyer_email text,
  p_shipping_name text,
  p_shipping_address jsonb,
  p_currency text,
  p_amount_subtotal_cents integer,
  p_amount_total_cents integer,
  p_tax_cents integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ord public.shop_orders%rowtype;
  item public.shop_order_items%rowtype;
  listing public.shop_listings%rowtype;
  units integer;
  dest_state text;
  coll_qty integer;
begin
  select * into ord from public.shop_orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if length(trim(p_stripe_checkout_session_id)) < 5
     or lower(p_currency) <> lower(ord.currency)
     or p_amount_subtotal_cents <> ord.subtotal_cents + ord.shipping_cents
     or p_tax_cents < 0
     or (
       p_amount_total_cents <> p_amount_subtotal_cents
       and p_amount_total_cents <> p_amount_subtotal_cents + p_tax_cents
     ) then
    raise exception 'payment_amount_mismatch';
  end if;

  if ord.stripe_checkout_session_id is not null
     and ord.stripe_checkout_session_id <> p_stripe_checkout_session_id then
    raise exception 'checkout_session_mismatch';
  end if;

  -- Idempotent after a verified payment.
  if ord.payment_status in ('paid', 'refunded') then
    return;
  end if;

  if ord.status <> 'pending_payment' or ord.payment_status <> 'unpaid' then
    raise exception 'order_not_pending';
  end if;

  update public.shop_orders
  set status = 'paid',
      payment_status = 'paid',
      fulfillment_status = 'unfulfilled',
      paid_at = now(),
      stripe_checkout_session_id = p_stripe_checkout_session_id,
      stripe_payment_intent_id = coalesce(nullif(p_stripe_payment_intent_id, ''), stripe_payment_intent_id),
      buyer_email = coalesce(nullif(lower(trim(p_buyer_email)), ''), buyer_email),
      shipping_name = coalesce(nullif(trim(p_shipping_name), ''), shipping_name),
      shipping_address = coalesce(p_shipping_address, shipping_address),
      tax_cents = p_tax_cents,
      total_cents = p_amount_total_cents
  where id = p_order_id;

  dest_state := nullif(
    trim(coalesce(p_shipping_address->>'state', p_shipping_address->>'stateCode', '')),
    ''
  );

  update public.inventory_reservations set status='consumed'
  where order_id=p_order_id and status='held';

  for item in
    select * from public.shop_order_items where order_id = p_order_id order by listing_id, id
  loop
    if item.listing_id is null then raise exception 'listing_missing'; end if;
    if item.listing_id is not null then
      select * into listing
      from public.shop_listings
      where id = item.listing_id
      for update;

      if not found then
        raise exception 'listing_missing';
      end if;
      if listing.quantity_available < item.quantity then
        raise exception 'insufficient_stock';
      end if;

      update public.shop_listings
      set quantity_available = quantity_available - item.quantity,
          status = case
            when quantity_available - item.quantity = 0 then 'archived'
            else status
          end
      where id = listing.id;

      units := public.shop_collection_units_per_listing(listing.kind) * item.quantity;
      if units > 0 then
        if listing.collection_id is null then
          raise exception 'listing_collection_required';
        end if;
        select quantity into coll_qty
        from public.user_collections
        where id = listing.collection_id
        for update;

        if coll_qty is null or coll_qty < units then
          raise exception 'insufficient_collection_stock';
        elsif coll_qty = units then
          delete from public.user_collections where id = listing.collection_id;
        else
          update public.user_collections
          set quantity = quantity - units
          where id = listing.collection_id;
        end if;
      end if;
    end if;

    insert into public.sales_ledger (
      order_id, order_item_id, sold_at, listing_id, card_id, title,
      quantity, revenue_cents, cogs_cents, shipping_destination_state
    ) values (
      p_order_id, item.id, now(), item.listing_id, item.card_id, item.title,
      item.quantity, item.unit_price_cents * item.quantity,
      coalesce(item.unit_cost_cents, 0) * item.quantity, dest_state
    );
  end loop;

end;
$$;

revoke all on function public.shop_finalize_verified_order(uuid, text, text, text, text, jsonb, text, integer, integer, integer) from public;
grant execute on function public.shop_finalize_verified_order(uuid, text, text, text, text, jsonb, text, integer, integer, integer) to service_role;
