-- ════════════════════════════════════════════════════════════════
-- ClientOutfy / LeadOutfy — Initial Seed Data
-- ════════════════════════════════════════════════════════════════

-- 1. Default Admin Account
-- Default password is 'admin123'. Change it immediately after initial login via Dashboard Settings!
insert into public.admins (username, password_hash)
values ('admin', 'admin123')
on conflict (username) do nothing;

-- 2. Default Plans
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

-- 3. Default Global Settings
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

