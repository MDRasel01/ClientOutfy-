-- ════════════════════════════════════════════════════════════════
-- ClientOutfy / LeadOutfy — Complete One-Click Supabase Setup
-- Copy and paste this ENTIRE file into the Supabase SQL Editor and click RUN.
-- ════════════════════════════════════════════════════════════════

-- 1. Licenses Table
create table if not exists public.licenses (
  id                uuid primary key default gen_random_uuid(),
  license_key       text unique not null,
  customer_name     text,
  customer_phone    text,
  customer_email    text,
  plan_id           text,
  plan_name         text,
  credits           int default 0,
  credits_total     int default 0,
  credits_used      int default 0,
  credits_remaining int default 0,
  status            text default 'active', -- active | blocked | expired
  notes             text,
  activated_at      timestamptz default now(),
  expires_at        timestamptz,
  created_at        timestamptz default now()
);

create index if not exists idx_licenses_key on public.licenses (license_key);
create index if not exists idx_licenses_status on public.licenses (status);

-- 2. Payments Table
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  customer_name   text,
  customer_phone  text,
  plan_id         text,
  plan_name       text,
  amount          numeric default 0,
  tx_id           text,
  method          text,
  status          text default 'pending',
  license_key     text,
  credits         int default 0,
  note            text,
  created_at      timestamptz default now(),
  confirmed_at    timestamptz
);

create index if not exists idx_payments_status on public.payments (status);
create index if not exists idx_payments_tx on public.payments (tx_id);

-- 3. Plans Table
create table if not exists public.plans (
  id          text primary key,
  name        text not null,
  credits     int default 0,
  price       numeric default 0,
  duration    int default 30,
  is_active   boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- 4. Admins Table
create table if not exists public.admins (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  password_hash text not null,
  created_at    timestamptz default now()
);

-- 5. Global Settings Table
create table if not exists public.settings (
  id            text primary key default 'global',
  bkash_number  text default '',
  nagad_number  text default '',
  rocket_number text default '',
  bank_details  text default '',
  support_wa    text default '',
  brand_name    text default 'ClientOutfy Ai Pro',
  plans         jsonb default '[]'::jsonb,
  updated_at    timestamptz default now()
);

-- 6. Email Tracking Events Table
create table if not exists public.email_events (
  id              uuid primary key default gen_random_uuid(),
  tracking_id     text unique not null,
  license_key     text not null,
  recipient       text,
  channel         text,
  subject         text,
  status          text default 'sent',
  error           text,
  opened          boolean default false,
  open_count      int default 0,
  replied         boolean default false,
  sent_at         timestamptz default now(),
  first_opened_at timestamptz,
  last_opened_at  timestamptz,
  replied_at      timestamptz
);

create index if not exists email_events_license_idx  on public.email_events (license_key);
create index if not exists email_events_tracking_idx on public.email_events (tracking_id);

-- Enable RLS
alter table public.licenses enable row level security;
alter table public.payments enable row level security;
alter table public.plans enable row level security;
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.email_events enable row level security;

-- Policies
create policy "Allow anon select licenses" on public.licenses for select using (true);
create policy "Allow anon insert licenses" on public.licenses for insert with check (true);
create policy "Allow anon update licenses" on public.licenses for update using (true);
create policy "Allow anon delete licenses" on public.licenses for delete using (true);

create policy "Allow anon select payments" on public.payments for select using (true);
create policy "Allow anon insert payments" on public.payments for insert with check (true);
create policy "Allow anon update payments" on public.payments for update using (true);

create policy "Allow anon select plans" on public.plans for select using (true);
create policy "Allow anon select admins" on public.admins for select using (true);
create policy "Allow anon update admins" on public.admins for update using (true);

create policy "Allow anon select settings" on public.settings for select using (true);
create policy "Allow anon update settings" on public.settings for update using (true);

create policy "Allow service role full access on email_events" on public.email_events for all using (true);

-- ════════════════════════════════════════════════════════════════
-- STORED FUNCTIONS & RPC
-- ════════════════════════════════════════════════════════════════

-- 1. Deduct Credit RPC
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

-- 2. Track Open RPC
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

-- 4. Date-wise Tracking Buckets RPC
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

-- 5. Email Daily Trend RPC
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

-- ════════════════════════════════════════════════════════════════
-- SEED DATA
-- ════════════════════════════════════════════════════════════════

-- Default Admin Account (password: admin123)
insert into public.admins (username, password_hash)
values ('admin', 'admin123')
on conflict (username) do nothing;

-- Default Plans
insert into public.plans (id, name, credits, price, duration, sort_order, is_active) values
  ('starter',  'Starter Plan',    500,   299,   30, 1, true),
  ('pro',      'Pro Plan',       2000,   799,   30, 2, true),
  ('business', 'Business Plan',  5000,  1499,   30, 3, true),
  ('lifetime', 'Lifetime Plan', 99999,  4999, 3650, 4, true)
on conflict (id) do update set
  name = excluded.name,
  credits = excluded.credits,
  price = excluded.price,
  duration = excluded.duration,
  sort_order = excluded.sort_order;

-- Default Global Settings
insert into public.settings (
  id, bkash_number, nagad_number, rocket_number, bank_details, support_wa, brand_name, plans
) values (
  'global',
  '01XXXXXXXXX',
  '01XXXXXXXXX',
  '01XXXXXXXXX',
  'Bank Name: City Bank, A/C: 123456789, Branch: Dhanmondi',
  '8801XXXXXXXXX',
  'ClientOutfy Ai Pro',
  '[
    {"id":"starter","name":"Starter Plan","credits":500,"price":299,"duration":30},
    {"id":"pro","name":"Pro Plan","credits":2000,"price":799,"duration":30},
    {"id":"business","name":"Business Plan","credits":5000,"price":1499,"duration":30},
    {"id":"lifetime","name":"Lifetime Plan","credits":99999,"price":4999,"duration":3650}
  ]'::jsonb
)
on conflict (id) do nothing;
