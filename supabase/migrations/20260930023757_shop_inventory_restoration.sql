-- Preserve the actual physical backing before a paid sellout deletes the shelf row.
alter table public.shop_order_items add column if not exists collection_snapshot jsonb;
-- Restoring shelf stock and listing stock is one transaction. Historical rows
-- without a snapshot require merchant reconciliation rather than guessed stock.
create or replace function public.shop_restock_refunded_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ord public.shop_orders%rowtype;
  item public.shop_order_items%rowtype;
  listing public.shop_listings%rowtype;
  saved public.user_collections%rowtype;
  backing public.user_collections%rowtype;
  units integer;
  per_listing integer;
begin
  select * into ord from public.shop_orders where id = p_order_id for update;
  if not found or ord.payment_status <> 'refunded' then raise exception 'order_not_refunded'; end if;
  if ord.restocked_at is not null then return; end if;

  for item in select * from public.shop_order_items where order_id=p_order_id order by listing_id, id loop
    select * into listing from public.shop_listings where id=item.listing_id for update;
    if not found then raise exception 'refund_listing_missing'; end if;
    if listing.owner_user_id <> ord.owner_user_id or listing.kind is distinct from item.kind then
      raise exception 'refund_listing_backing_changed';
    end if;
    per_listing := public.shop_collection_units_per_listing(item.kind);
    if per_listing > 0 then
      if item.collection_snapshot is null then raise exception 'refund_collection_reconciliation_required'; end if;
      if (item.collection_snapshot->>'units_per_listing')::integer is distinct from per_listing then
        raise exception 'refund_collection_backing_changed';
      end if;
      units := per_listing * item.quantity;
      saved := jsonb_populate_record(null::public.user_collections,item.collection_snapshot->'collection');
      if saved.id is null or saved.user_id is distinct from ord.owner_user_id or saved.card_id is null then
        raise exception 'refund_collection_backing_changed';
      end if;
      if not exists(select 1 from public.cards where id=saved.card_id) then
        raise exception 'refund_collection_backing_missing';
      end if;
      if listing.card_id is distinct from saved.card_id or item.card_id is distinct from saved.card_id then
        raise exception 'refund_listing_backing_changed';
      end if;

      -- A sold-out row no longer exists to lock. Serialize its recreation by
      -- owner/card so separate returned orders cannot create competing rows.
      perform pg_advisory_xact_lock(hashtextextended('shop_collection_return:'||saved.user_id::text||':'||saved.card_id::text,0));
      select * into backing from public.user_collections where id=saved.id for update;
      if not found then
        select * into backing from public.user_collections
        where user_id=saved.user_id and card_id=saved.card_id for update;
      end if;
      if found then
        if backing.user_id is distinct from saved.user_id or backing.card_id is distinct from saved.card_id
           or backing.condition is distinct from saved.condition
           or (to_jsonb(backing)->'is_graded') is distinct from (to_jsonb(saved)->'is_graded')
           or (to_jsonb(backing)->'grading_company') is distinct from (to_jsonb(saved)->'grading_company')
           or (to_jsonb(backing)->'grade') is distinct from (to_jsonb(saved)->'grade')
           or (to_jsonb(backing)->'cert_number') is distinct from (to_jsonb(saved)->'cert_number')
           or (to_jsonb(backing)->'is_black_label') is distinct from (to_jsonb(saved)->'is_black_label') then
          raise exception 'refund_collection_backing_changed';
        end if;
        if listing.collection_id is not null and listing.collection_id <> backing.id then
          raise exception 'refund_listing_backing_changed';
        end if;
        update public.user_collections set quantity=quantity+units where id=backing.id;
      else
        if listing.collection_id is not null then raise exception 'refund_listing_backing_changed'; end if;
        -- Preserve real saved metadata, including notes/grade; do not reclaim a
        -- showcase position that the collector may have filled after selling.
        saved := jsonb_populate_record(saved,jsonb_build_object('quantity',units,'updated_at',now(),'showcase_slot',null));
        insert into public.user_collections select saved.* returning * into backing;
      end if;
      update public.shop_listings set collection_id=backing.id where id=listing.id;
    end if;
    update public.shop_listings set quantity_available=quantity_available+item.quantity,
      status=case when status='archived' then 'active' else status end where id=listing.id;
  end loop;
  update public.shop_orders set restocked_at=now() where id=p_order_id;
end;
$$;
revoke all on function public.shop_restock_refunded_order(uuid) from public,anon,authenticated;
grant execute on function public.shop_restock_refunded_order(uuid) to service_role;

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
  backing public.user_collections%rowtype;
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

  -- Consume this order's holds inside the same transaction before its stock
  -- decrement. Other buyers' remaining holds stay protected by the guard.
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

      units := public.shop_collection_units_per_listing(item.kind) * item.quantity;
      if units > 0 then
        if listing.collection_id is null then
          raise exception 'listing_collection_required';
        end if;
        select * into backing
        from public.user_collections
        where id = listing.collection_id
        for update;

        coll_qty := backing.quantity;
        if backing.user_id is distinct from ord.owner_user_id
           or backing.card_id is distinct from item.card_id
           or listing.kind is distinct from item.kind then
          raise exception 'listing_collection_mismatch';
        end if;
        if coll_qty is null or coll_qty < units then
          raise exception 'insufficient_collection_stock';
        end if;
        update public.shop_order_items
        set collection_snapshot = jsonb_build_object('collection', to_jsonb(backing),
          'units_per_listing', public.shop_collection_units_per_listing(item.kind))
        where id = item.id;
        if coll_qty = units then
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
