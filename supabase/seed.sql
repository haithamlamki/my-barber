-- seed.sql — v0.1 demo tenant
-- Run by `supabase db reset` after migrations apply.
-- Content: 1 business, 1 location, 3 services, 2 barbers, 1 owner account.
-- Idempotent: every INSERT uses ON CONFLICT DO NOTHING.

-- ---------- auth users ----------
-- Three auth.users rows: 1 owner + 2 barbers. Email-OTP only — no password column is required.
-- The Supabase Auth admin API normally creates these, but for local seeding we insert directly.
-- IDs are fixed UUIDs so tests can reference them without lookups.

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, is_super_admin)
values
  ('00000000-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'authenticated', 'authenticated',
   'owner@demo.local',
   now(), now(), now(),
   '{"display_name":"Demo Owner"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb,
   false),
  ('00000000-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'authenticated', 'authenticated',
   'barber1@demo.local',
   now(), now(), now(),
   '{"display_name":"Khalid"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb,
   false),
  ('00000000-0000-0000-0000-000000000003'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'authenticated', 'authenticated',
   'barber2@demo.local',
   now(), now(), now(),
   '{"display_name":"Yousuf"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb,
   false)
on conflict (id) do nothing;

-- GoTrue scans these token columns into non-nullable Go strings; NULLs cause a
-- "Database error finding user" at OTP time. Direct inserts leave them NULL, so
-- normalize to empty strings (the value the Auth admin API would have written).
update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where email in ('owner@demo.local', 'barber1@demo.local', 'barber2@demo.local');

-- ---------- app users (profile rows mirroring auth.users) ----------

insert into public.users (id, type, display_name, email, preferred_locale)
values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'owner',    'Demo Owner', 'owner@demo.local',    'ar'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'staff',    'Khalid',     'barber1@demo.local',  'ar'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'staff',    'Yousuf',     'barber2@demo.local',  'ar')
on conflict (id) do nothing;

-- ---------- business ----------

insert into public.businesses (id, legal_name, trade_name, default_locale, vat_status, timezone, status)
values (
  '10000000-0000-0000-0000-000000000001'::uuid,
  'Demo Barbershop LLC',
  'حلاقي Demo Barbershop',
  'ar',
  'not_registered',
  'Asia/Muscat',
  'active'
)
on conflict (id) do nothing;

-- ---------- location ----------

insert into public.locations (id, business_id, name, address_json, lat, lng, hours_json, status)
values (
  '20000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  'Muscat — Al Khuwair',
  '{"line1":"Al Khuwair","city":"Muscat","country":"OM"}'::jsonb,
  23.5859,
  58.4059,
  '{"mon":[{"open":"09:00","close":"22:00"}],"tue":[{"open":"09:00","close":"22:00"}],"wed":[{"open":"09:00","close":"22:00"}],"thu":[{"open":"09:00","close":"22:00"}],"fri":[{"open":"14:00","close":"22:00"}],"sat":[{"open":"09:00","close":"22:00"}],"sun":[{"open":"09:00","close":"22:00"}]}'::jsonb,
  'active'
)
on conflict (id) do nothing;

-- ---------- roles ----------

insert into public.user_roles (id, user_id, role, business_id)
values
  ('30000000-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   'owner',
   '10000000-0000-0000-0000-000000000001'::uuid),
  ('30000000-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000002'::uuid,
   'barber',
   '10000000-0000-0000-0000-000000000001'::uuid),
  ('30000000-0000-0000-0000-000000000003'::uuid,
   '00000000-0000-0000-0000-000000000003'::uuid,
   'barber',
   '10000000-0000-0000-0000-000000000001'::uuid)
on conflict (id) do nothing;

-- ---------- services ----------
-- Prices in baisa (1 OMR = 1000 baisa).
-- Classic cut: 2.500 OMR / 30 min
-- Beard trim:  1.500 OMR / 20 min
-- Cut + beard combo: 3.500 OMR / 45 min

insert into public.services (id, business_id, location_id, name_ar, name_en, duration_min, buffer_before_min, buffer_after_min, price_minor, tax_code, status)
values
  ('40000000-0000-0000-0000-000000000001'::uuid,
   '10000000-0000-0000-0000-000000000001'::uuid,
   '20000000-0000-0000-0000-000000000001'::uuid,
   'قص شعر كلاسيكي', 'Classic cut', 30, 0, 5, 2500, 'OMR_VAT_ZERO', 'active'),
  ('40000000-0000-0000-0000-000000000002'::uuid,
   '10000000-0000-0000-0000-000000000001'::uuid,
   '20000000-0000-0000-0000-000000000001'::uuid,
   'تشذيب اللحية', 'Beard trim', 20, 0, 5, 1500, 'OMR_VAT_ZERO', 'active'),
  ('40000000-0000-0000-0000-000000000003'::uuid,
   '10000000-0000-0000-0000-000000000001'::uuid,
   '20000000-0000-0000-0000-000000000001'::uuid,
   'قص شعر + لحية', 'Cut + beard combo', 45, 0, 5, 3500, 'OMR_VAT_ZERO', 'active')
on conflict (id) do nothing;

-- ---------- staff profiles + assignments ----------

insert into public.staff_profiles (id, user_id, business_id, display_name, bio_ar, bio_en, languages_json, employment_type, status)
values
  ('50000000-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000002'::uuid,
   '10000000-0000-0000-0000-000000000001'::uuid,
   'خالد', 'حلاق بخبرة 10 سنوات في القصات الكلاسيكية.', 'Master barber, 10 years on classic cuts.',
   '["ar","en"]'::jsonb, 'employee', 'active'),
  ('50000000-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000003'::uuid,
   '10000000-0000-0000-0000-000000000001'::uuid,
   'يوسف', 'متخصص في القصات الحديثة وتشذيب اللحى.', 'Modern cuts and beard styling specialist.',
   '["ar","en","hi"]'::jsonb, 'employee', 'active')
on conflict (id) do nothing;

insert into public.staff_assignments (id, staff_profile_id, location_id, visibility_status, service_scope_json)
values
  ('60000000-0000-0000-0000-000000000001'::uuid,
   '50000000-0000-0000-0000-000000000001'::uuid,
   '20000000-0000-0000-0000-000000000001'::uuid,
   'public', '{"all": true}'::jsonb),
  ('60000000-0000-0000-0000-000000000002'::uuid,
   '50000000-0000-0000-0000-000000000002'::uuid,
   '20000000-0000-0000-0000-000000000001'::uuid,
   'public', '{"all": true}'::jsonb)
on conflict (id) do nothing;
