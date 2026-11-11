-- ════════════════════════════════════════════════════════════════
-- ClientOutfy / LeadOutfy — Supabase PostgreSQL Schema
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
  method          text, -- bkash | nagad | rocket | manual
  status          text default 'pending', -- pending | confirmed | rejected
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
  duration    int default 30, -- duration in days
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
  channel         text, -- gmail | custom | brevo
  subject         text,
  status          text default 'sent', -- sent | failed
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

-- Enable Row Level Security (RLS)
alter table public.licenses enable row level security;
alter table public.payments enable row level security;
alter table public.plans enable row level security;
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.email_events enable row level security;

-- Policies for public / anon read & write where needed
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
