-- ════════════════════════════════════════════════════════════════
-- ClientOutfy / LeadOutfy — Stored Functions & RPC Procedures
-- ════════════════════════════════════════════════════════════════

-- 1. Deduct Credit RPC (Handles both credits and credits_remaining)
create or replace function public.deduct_credit(p_license_key text, p_amount int default 1)
returns json
language plpgsql
security definer
as $$
declare
  v_rec record;
  v_remaining int;
  v_new_remaining int;
begin
  select * into v_rec
  from public.licenses
  where license_key = p_license_key
  for update;

  if not found then
    return json_build_object('ok', false, 'error', 'License not found');
  end if;

  if v_rec.status != 'active' then
    return json_build_object('ok', false, 'error', 'License is ' || v_rec.status);
  end if;

  if v_rec.expires_at is not null and v_rec.expires_at < now() then
    return json_build_object('ok', false, 'error', 'License expired');
  end if;

  -- Read remaining credits from credits_remaining or fallback to credits
  v_remaining := coalesce(v_rec.credits_remaining, v_rec.credits, 0);

  if v_remaining < p_amount then
    return json_build_object('ok', false, 'error', 'Insufficient credits', 'credits_remaining', v_remaining);
  end if;

  v_new_remaining := v_remaining - p_amount;

  update public.licenses
  set credits_remaining = v_new_remaining,
      credits_used      = coalesce(credits_used, 0) + p_amount,
      credits           = v_new_remaining
  where license_key = p_license_key;

  return json_build_object('ok', true, 'credits_remaining', v_new_remaining);
end;
$$;

-- 2. Track Open RPC (with 12s machine-prefetch filter)
create or replace function public.track_open(p_tracking_id text)
returns void
language plpgsql
security definer
as $$
begin
  update public.email_events
  set opened          = true,
      open_count      = open_count + 1,
      first_opened_at = coalesce(first_opened_at, now()),
      last_opened_at  = now()
  where tracking_id = p_tracking_id
    and (now() - sent_at > interval '12 seconds' or first_opened_at is not null);
end;
$$;

-- 3. Email Stats RPC
create or replace function public.email_stats(p_license_key text)
returns json
language sql
security definer
as $$
  select json_build_object(
    'total',   count(*),
    'sent',    count(*) filter (where status = 'sent'),
    'failed',  count(*) filter (where status = 'failed'),
    'opened',  count(*) filter (where opened = true),
    'replied', count(*) filter (where replied = true)
  )
  from public.email_events
  where license_key = p_license_key;
$$;

-- 4. Date-wise Tracking Buckets RPC (Dhaka Timezone)
create or replace function public.email_stats_buckets(p_license_key text)
returns json
language sql
security definer
as $$
  with e as (
    select status, opened, replied, sent_at,
           (sent_at at time zone 'Asia/Dhaka')::date as d
    from public.email_events
    where license_key = p_license_key
  ),
  cur as ( select (now() at time zone 'Asia/Dhaka')::date as today )
  select json_build_object(
    'today', (
      select json_build_object(
        'total',  count(*),
        'sent',   count(*) filter (where status = 'sent'),
        'failed', count(*) filter (where status = 'failed'),
        'opened', count(*) filter (where opened),
        'replied',count(*) filter (where replied))
      from e, cur where e.d = cur.today),
    'yesterday', (
      select json_build_object(
        'total',  count(*),
        'sent',   count(*) filter (where status = 'sent'),
        'failed', count(*) filter (where status = 'failed'),
        'opened', count(*) filter (where opened),
        'replied',count(*) filter (where replied))
      from e, cur where e.d = cur.today - 1),
    'week', (
      select json_build_object(
        'total',  count(*),
        'sent',   count(*) filter (where status = 'sent'),
        'failed', count(*) filter (where status = 'failed'),
        'opened', count(*) filter (where opened),
        'replied',count(*) filter (where replied))
      from e where sent_at >= now() - interval '7 days'),
    'month', (
      select json_build_object(
        'total',  count(*),
        'sent',   count(*) filter (where status = 'sent'),
        'failed', count(*) filter (where status = 'failed'),
        'opened', count(*) filter (where opened),
        'replied',count(*) filter (where replied))
      from e where sent_at >= now() - interval '30 days'),
    'all', (
      select json_build_object(
        'total',  count(*),
        'sent',   count(*) filter (where status = 'sent'),
        'failed', count(*) filter (where status = 'failed'),
        'opened', count(*) filter (where opened),
        'replied',count(*) filter (where replied))
      from e)
  );
$$;

-- 5. Email Daily Chart Data RPC
create or replace function public.email_daily(
  p_license_key text,
  p_days int default 7,
  p_offset_min int default 0
)
returns json
language sql
security definer
as $$
  with days as (
    select generate_series(
      ((now() - (p_offset_min || ' minutes')::interval)::date - (p_days - 1)),
      ( now() - (p_offset_min || ' minutes')::interval)::date,
      interval '1 day'
    )::date as d
  ),
  agg as (
    select ((sent_at - (p_offset_min || ' minutes')::interval))::date as d,
           count(*) filter (where status = 'sent')   as sent,
           count(*) filter (where opened = true)     as opened
    from public.email_events
    where license_key = p_license_key
      and sent_at >= (now() - (p_offset_min || ' minutes')::interval) - ((p_days) || ' days')::interval
    group by 1
  )
  select coalesce(json_agg(json_build_object(
    'day',    to_char(days.d, 'YYYY-MM-DD'),
    'sent',   coalesce(agg.sent, 0),
    'opened', coalesce(agg.opened, 0)
  ) order by days.d), '[]'::json)
  from days left join agg on agg.d = days.d;
$$;

