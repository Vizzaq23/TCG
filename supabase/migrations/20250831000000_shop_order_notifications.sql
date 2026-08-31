-- Durable, retryable order email outbox. Stripe webhook retries can safely
-- resume a failed notification without sending a second copy.

create table if not exists public.shop_order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  kind text not null
    check (kind in ('customer_order_confirmation', 'owner_new_order')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_message_id text,
  last_error text,
  processing_started_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, kind)
);

create index if not exists shop_order_notifications_status_idx
  on public.shop_order_notifications (status, updated_at)
  where sent_at is null;

alter table public.shop_order_notifications enable row level security;
revoke all on table public.shop_order_notifications from anon, authenticated;
grant all on table public.shop_order_notifications to service_role;

create or replace function public.shop_enqueue_paid_order_notifications(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.shop_orders
    where id = p_order_id and payment_status = 'paid'
  ) then
    raise exception 'paid_order_not_found';
  end if;

  insert into public.shop_order_notifications (order_id, kind)
  values
    (p_order_id, 'customer_order_confirmation'),
    (p_order_id, 'owner_new_order')
  on conflict (order_id, kind) do nothing;
end;
$$;

revoke all on function public.shop_enqueue_paid_order_notifications(uuid) from public;
grant execute on function public.shop_enqueue_paid_order_notifications(uuid) to service_role;

create or replace function public.shop_claim_order_notification(
  p_order_id uuid,
  p_kind text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
begin
  update public.shop_order_notifications
  set status = 'processing',
      attempts = attempts + 1,
      processing_started_at = now(),
      last_error = null,
      updated_at = now()
  where order_id = p_order_id
    and kind = p_kind
    and sent_at is null
    and (
      status in ('pending', 'failed')
      or (
        status = 'processing'
        and processing_started_at < now() - interval '15 minutes'
      )
    )
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

revoke all on function public.shop_claim_order_notification(uuid, text) from public;
grant execute on function public.shop_claim_order_notification(uuid, text) to service_role;

create or replace function public.shop_complete_order_notification(
  p_order_id uuid,
  p_kind text,
  p_provider_message_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shop_order_notifications
  set status = 'sent',
      provider_message_id = nullif(trim(p_provider_message_id), ''),
      sent_at = coalesce(sent_at, now()),
      processing_started_at = null,
      last_error = null,
      updated_at = now()
  where order_id = p_order_id
    and kind = p_kind
    and status = 'processing'
    and sent_at is null;

  if not found then
    raise exception 'order_notification_not_claimed';
  end if;
end;
$$;

revoke all on function public.shop_complete_order_notification(uuid, text, text) from public;
grant execute on function public.shop_complete_order_notification(uuid, text, text) to service_role;

create or replace function public.shop_release_order_notification(
  p_order_id uuid,
  p_kind text,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shop_order_notifications
  set status = 'failed',
      processing_started_at = null,
      last_error = left(coalesce(p_error, 'notification_failed'), 1000),
      updated_at = now()
  where order_id = p_order_id
    and kind = p_kind
    and status = 'processing'
    and sent_at is null;
end;
$$;

revoke all on function public.shop_release_order_notification(uuid, text, text) from public;
grant execute on function public.shop_release_order_notification(uuid, text, text) to service_role;

