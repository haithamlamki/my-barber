-- migration: 0001_init.sql
-- summary: Auth foundation — businesses (tenant root), locations, users, user_identities, user_roles. RLS enabled on every table.
-- rollback: drop table public.user_roles, public.user_identities, public.locations, public.users, public.businesses cascade; drop type public.app_role; drop type public.user_type;
-- conventions:
--   * snake_case identifiers
--   * id uuid default gen_random_uuid()
--   * created_at / updated_at timestamptz, default now()
--   * money in *_minor integer columns (none in this migration)
--   * RLS enabled on every business-scoped table

create extension if not exists "pgcrypto";

-- ---------- enums ----------

create type public.user_type as enum ('customer', 'staff', 'owner', 'platform_admin');

create type public.app_role as enum (
  'customer',
  'barber',
  'receptionist',
  'owner',
  'area_manager',
  'accountant',
  'platform_support',
  'platform_admin'
);

-- ---------- businesses (tenant root) ----------

create table public.businesses (
  id              uuid primary key default gen_random_uuid(),
  legal_name      text not null,
  trade_name      text not null,
  default_locale  text not null default 'ar' check (default_locale in ('ar', 'en')),
  vat_status      text not null default 'not_registered'
                  check (vat_status in ('not_registered', 'voluntary', 'mandatory')),
  cr_number       text,
  timezone        text not null default 'Asia/Muscat',
  status          text not null default 'active'
                  check (status in ('pending', 'active', 'suspended', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.businesses is 'Tenant root. All business-scoped data references this row.';

-- ---------- locations ----------

create table public.locations (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  name             text not null,
  address_json     jsonb not null default '{}'::jsonb,
  lat              numeric(9, 6),
  lng              numeric(9, 6),
  hours_json       jsonb not null default '{}'::jsonb,
  map_place_id     text,
  status           text not null default 'active'
                   check (status in ('pending', 'active', 'archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index locations_business_id_idx on public.locations(business_id);

comment on table public.locations is 'Operational unit (a single shop). Hours, services, staff, inventory all scope to a location.';

-- ---------- users (mirrors auth.users) ----------
-- We do NOT replace auth.users. We keep a thin profile table linked 1:1 to auth.users by id.
-- This avoids storing passwords / sessions here and lets RLS use auth.uid() naturally.

create table public.users (
  id                uuid primary key references auth.users(id) on delete cascade,
  type              public.user_type not null default 'customer',
  display_name      text,
  phone             text,
  email             text,
  preferred_locale  text not null default 'ar' check (preferred_locale in ('ar', 'en')),
  status            text not null default 'active'
                    check (status in ('active', 'disabled')),
  last_login_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.users is 'Application profile for each auth.users row. Never stores credentials.';

-- ---------- user_identities (provider-based identities) ----------

create table public.user_identities (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  provider      text not null check (provider in ('email', 'phone', 'apple', 'google')),
  provider_uid  text not null,
  verified_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (provider, provider_uid)
);

create index user_identities_user_id_idx on public.user_identities(user_id);

-- ---------- user_roles (RBAC scoping) ----------

create table public.user_roles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  role           public.app_role not null,
  business_id    uuid references public.businesses(id) on delete cascade,
  location_id    uuid references public.locations(id) on delete cascade,
  scope_json     jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  -- A role row must scope to either the platform (no business/location), a business, or a location within a business.
  check (
    (role in ('platform_admin', 'platform_support') and business_id is null and location_id is null)
    or (role = 'customer' and business_id is null and location_id is null)
    or (role in ('owner', 'area_manager', 'accountant') and business_id is not null)
    or (role in ('barber', 'receptionist') and business_id is not null)
  )
);

create index user_roles_user_id_idx on public.user_roles(user_id);
create index user_roles_business_id_idx on public.user_roles(business_id);
create index user_roles_location_id_idx on public.user_roles(location_id);

-- ---------- updated_at trigger ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger trg_locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ---------- helper: current user's businesses (cached at SQL level via STABLE) ----------

create or replace function public.current_user_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct business_id
  from public.user_roles
  where user_id = auth.uid()
    and business_id is not null;
$$;

create or replace function public.current_user_has_role_in_business(target_business uuid, target_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and business_id = target_business
      and role = target_role
  );
$$;

create or replace function public.current_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('platform_admin', 'platform_support')
  );
$$;

-- ---------- RLS ----------

alter table public.businesses        enable row level security;
alter table public.locations         enable row level security;
alter table public.users             enable row level security;
alter table public.user_identities   enable row level security;
alter table public.user_roles        enable row level security;

-- businesses: a member of the business can SELECT it. Only owners can UPDATE.
create policy businesses_select_member on public.businesses
  for select
  using (
    public.current_user_is_platform_admin()
    or id in (select public.current_user_business_ids())
  );

create policy businesses_update_owner on public.businesses
  for update
  using (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(id, 'owner')
  )
  with check (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(id, 'owner')
  );

-- locations: same business members can SELECT; owners can manage.
create policy locations_select_member on public.locations
  for select
  using (
    public.current_user_is_platform_admin()
    or business_id in (select public.current_user_business_ids())
  );

create policy locations_modify_owner on public.locations
  for all
  using (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(business_id, 'owner')
  )
  with check (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(business_id, 'owner')
  );

-- users: read self; platform admin reads all. Updates: self only (or platform admin).
create policy users_select_self on public.users
  for select
  using (id = auth.uid() or public.current_user_is_platform_admin());

create policy users_update_self on public.users
  for update
  using (id = auth.uid() or public.current_user_is_platform_admin())
  with check (id = auth.uid() or public.current_user_is_platform_admin());

-- user_identities: read/write own only.
create policy user_identities_select_self on public.user_identities
  for select
  using (user_id = auth.uid() or public.current_user_is_platform_admin());

create policy user_identities_insert_self on public.user_identities
  for insert
  with check (user_id = auth.uid() or public.current_user_is_platform_admin());

-- user_roles: read your own; platform admin reads all. Insert/update by platform admin or business owners (for their business).
create policy user_roles_select_self_or_admin on public.user_roles
  for select
  using (
    user_id = auth.uid()
    or public.current_user_is_platform_admin()
    or (business_id is not null and public.current_user_has_role_in_business(business_id, 'owner'))
  );

create policy user_roles_manage_owner_or_admin on public.user_roles
  for all
  using (
    public.current_user_is_platform_admin()
    or (business_id is not null and public.current_user_has_role_in_business(business_id, 'owner'))
  )
  with check (
    public.current_user_is_platform_admin()
    or (business_id is not null and public.current_user_has_role_in_business(business_id, 'owner'))
  );
