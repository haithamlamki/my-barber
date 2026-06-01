-- migration: 0002_catalog.sql
-- summary: Catalog — services, service_addons, staff_profiles, staff_assignments. All RLS-protected and scoped to a business + location.
-- rollback: drop table public.staff_assignments, public.staff_profiles, public.service_addons, public.services cascade;
-- money: every price column is *_minor integer in OMR baisa (1 OMR = 1000 baisa). Never floats, never division at the SQL layer.

-- ---------- services ----------

create table public.services (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  location_id         uuid not null references public.locations(id) on delete cascade,
  name_ar             text not null,
  name_en             text not null,
  duration_min        integer not null check (duration_min > 0 and duration_min <= 480),
  buffer_before_min   integer not null default 0 check (buffer_before_min >= 0),
  buffer_after_min    integer not null default 0 check (buffer_after_min >= 0),
  price_minor         integer not null check (price_minor >= 0),
  tax_code            text not null default 'OMR_VAT_STANDARD' check (tax_code in ('OMR_VAT_STANDARD', 'OMR_VAT_ZERO', 'OMR_VAT_EXEMPT')),
  status              text not null default 'active' check (status in ('active', 'archived')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index services_business_id_idx on public.services(business_id);
create index services_location_id_idx on public.services(location_id);

create trigger trg_services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- ---------- service_addons ----------

create table public.service_addons (
  id              uuid primary key default gen_random_uuid(),
  service_id      uuid not null references public.services(id) on delete cascade,
  name_ar         text not null,
  name_en         text not null,
  duration_min    integer not null check (duration_min >= 0),
  price_minor     integer not null check (price_minor >= 0),
  status          text not null default 'active' check (status in ('active', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index service_addons_service_id_idx on public.service_addons(service_id);

create trigger trg_service_addons_updated_at before update on public.service_addons
  for each row execute function public.set_updated_at();

-- ---------- staff_profiles ----------

create table public.staff_profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  business_id        uuid not null references public.businesses(id) on delete cascade,
  display_name       text not null,
  bio_ar             text,
  bio_en             text,
  languages_json     jsonb not null default '["ar","en"]'::jsonb,
  employment_type    text not null default 'employee' check (employment_type in ('employee', 'chair_rent', 'commission_only')),
  status             text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index staff_profiles_user_id_idx on public.staff_profiles(user_id);
create index staff_profiles_business_id_idx on public.staff_profiles(business_id);

create trigger trg_staff_profiles_updated_at before update on public.staff_profiles
  for each row execute function public.set_updated_at();

-- ---------- staff_assignments ----------

create table public.staff_assignments (
  id                  uuid primary key default gen_random_uuid(),
  staff_profile_id    uuid not null references public.staff_profiles(id) on delete cascade,
  location_id         uuid not null references public.locations(id) on delete cascade,
  visibility_status   text not null default 'public' check (visibility_status in ('public', 'private', 'archived')),
  service_scope_json  jsonb not null default '{"all": true}'::jsonb,
  created_at          timestamptz not null default now(),
  unique (staff_profile_id, location_id)
);

create index staff_assignments_location_id_idx on public.staff_assignments(location_id);

-- ---------- RLS ----------

alter table public.services           enable row level security;
alter table public.service_addons     enable row level security;
alter table public.staff_profiles     enable row level security;
alter table public.staff_assignments  enable row level security;

-- services: public read for active rows (so unauthenticated booking flow can browse). Mutations: owner.
create policy services_select_public on public.services
  for select
  using (status = 'active' or public.current_user_is_platform_admin() or business_id in (select public.current_user_business_ids()));

create policy services_manage_owner on public.services
  for all
  using (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(business_id, 'owner')
  )
  with check (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(business_id, 'owner')
  );

-- service_addons: same visibility as their parent service.
create policy service_addons_select_public on public.service_addons
  for select
  using (
    status = 'active'
    or public.current_user_is_platform_admin()
    or exists (
      select 1 from public.services s
      where s.id = service_addons.service_id
        and s.business_id in (select public.current_user_business_ids())
    )
  );

create policy service_addons_manage_owner on public.service_addons
  for all
  using (
    public.current_user_is_platform_admin()
    or exists (
      select 1 from public.services s
      where s.id = service_addons.service_id
        and public.current_user_has_role_in_business(s.business_id, 'owner')
    )
  )
  with check (
    public.current_user_is_platform_admin()
    or exists (
      select 1 from public.services s
      where s.id = service_addons.service_id
        and public.current_user_has_role_in_business(s.business_id, 'owner')
    )
  );

-- staff_profiles: public read (active) for booking discovery. Mutations: owner or the staff member themselves (self-profile edits).
create policy staff_profiles_select_public on public.staff_profiles
  for select
  using (
    status = 'active'
    or user_id = auth.uid()
    or public.current_user_is_platform_admin()
    or business_id in (select public.current_user_business_ids())
  );

create policy staff_profiles_manage_owner on public.staff_profiles
  for all
  using (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(business_id, 'owner')
    or user_id = auth.uid()
  )
  with check (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(business_id, 'owner')
    or user_id = auth.uid()
  );

-- staff_assignments: read with the parent profile; owner-only mutations.
create policy staff_assignments_select on public.staff_assignments
  for select
  using (
    public.current_user_is_platform_admin()
    or exists (
      select 1 from public.staff_profiles sp
      where sp.id = staff_assignments.staff_profile_id
        and (sp.business_id in (select public.current_user_business_ids()) or sp.status = 'active')
    )
  );

create policy staff_assignments_manage_owner on public.staff_assignments
  for all
  using (
    public.current_user_is_platform_admin()
    or exists (
      select 1 from public.staff_profiles sp
      where sp.id = staff_assignments.staff_profile_id
        and public.current_user_has_role_in_business(sp.business_id, 'owner')
    )
  )
  with check (
    public.current_user_is_platform_admin()
    or exists (
      select 1 from public.staff_profiles sp
      where sp.id = staff_assignments.staff_profile_id
        and public.current_user_has_role_in_business(sp.business_id, 'owner')
    )
  );
