-- migration: 0003_appointments.sql
-- summary: Booking core — appointments (with double-booking prevention), appointment_items (booking-time snapshot), appointment_events (append-only timeline), blockouts. All RLS-protected and business + location scoped.
-- rollback: drop table public.appointment_events, public.appointment_items, public.blockouts, public.appointments cascade; drop extension if exists btree_gist;
-- money: every price column is *_minor integer in OMR baisa (1 OMR = 1000 baisa). Never floats, never division at the SQL layer.

-- gist exclusion constraints over time ranges require btree_gist for the equality (=) operator on uuid.
create extension if not exists btree_gist;

-- ---------- appointments ----------

create table public.appointments (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  location_id        uuid not null references public.locations(id) on delete cascade,
  staff_profile_id   uuid not null references public.staff_profiles(id) on delete cascade,
  service_id         uuid not null references public.services(id) on delete cascade,
  customer_name      text not null,
  customer_phone     text not null,
  customer_email     text,
  locale             text not null default 'ar' check (locale in ('ar', 'en')),
  booking_code       text not null unique,
  status             text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'arrived', 'completed', 'no_show', 'cancelled')),
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  price_minor        integer not null check (price_minor >= 0),
  tax_minor          integer not null default 0 check (tax_minor >= 0),
  total_minor        integer not null check (total_minor >= 0),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (ends_at > starts_at),
  -- No two active appointments may overlap for the same staff member.
  -- Cancelled / no_show rows are excluded so a freed slot can be rebooked.
  exclude using gist (
    staff_profile_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending', 'confirmed', 'arrived', 'completed'))
);

create index appointments_business_id_idx on public.appointments(business_id);
create index appointments_location_id_idx on public.appointments(location_id);
create index appointments_staff_starts_at_idx on public.appointments(staff_profile_id, starts_at);
create index appointments_booking_code_idx on public.appointments(booking_code);

create trigger trg_appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

comment on table public.appointments is 'Booking root. One row per booked slot. Overlapping active slots per staff are blocked by an EXCLUDE constraint.';

-- ---------- appointment_items (snapshot of service + addons at booking time) ----------

create table public.appointment_items (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  kind            text not null check (kind in ('service', 'addon')),
  ref_id          uuid,
  name_ar         text not null,
  name_en         text not null,
  duration_min    integer not null check (duration_min >= 0),
  price_minor     integer not null check (price_minor >= 0),
  created_at      timestamptz not null default now()
);

create index appointment_items_appointment_id_idx on public.appointment_items(appointment_id);

comment on table public.appointment_items is 'Immutable snapshot of the service and add-ons priced at booking time. Decoupled from live catalog edits.';

-- ---------- appointment_events (append-only immutable timeline) ----------

create table public.appointment_events (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  event_type      text not null,
  from_status     text,
  to_status       text,
  actor_user_id   uuid references public.users(id),
  payload_json    jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index appointment_events_appointment_id_created_at_idx
  on public.appointment_events(appointment_id, created_at);

comment on table public.appointment_events is 'Append-only audit timeline of appointment state changes. Rows are immutable: updates and deletes are blocked by a trigger.';

-- Append-only enforcement: block any UPDATE or DELETE at the row level.
create or replace function public.appointment_events_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'appointment_events is append-only';
end;
$$;

create trigger trg_appointment_events_append_only
  before update or delete on public.appointment_events
  for each row execute function public.appointment_events_block_mutation();

-- ---------- blockouts ----------

create table public.blockouts (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  location_id        uuid not null references public.locations(id) on delete cascade,
  staff_profile_id   uuid references public.staff_profiles(id) on delete cascade,
  reason             text,
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index blockouts_location_starts_at_idx on public.blockouts(location_id, starts_at);
create index blockouts_staff_starts_at_idx on public.blockouts(staff_profile_id, starts_at);

create trigger trg_blockouts_updated_at before update on public.blockouts
  for each row execute function public.set_updated_at();

comment on table public.blockouts is 'Time ranges where a staff member (or, when staff_profile_id is null, the whole location) is unavailable.';

-- ---------- RLS ----------

alter table public.appointments        enable row level security;
alter table public.appointment_items   enable row level security;
alter table public.appointment_events  enable row level security;
alter table public.blockouts           enable row level security;

-- appointments: business members (or platform admin) can read.
-- Customer-by-code lookup uses the service-role key server-side in v0.1, which bypasses RLS.
create policy appointments_select_member on public.appointments
  for select
  using (
    public.current_user_is_platform_admin()
    or business_id in (select public.current_user_business_ids())
  );

create policy appointments_manage_staff on public.appointments
  for all
  using (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(business_id, 'owner')
    or public.current_user_has_role_in_business(business_id, 'barber')
    or public.current_user_has_role_in_business(business_id, 'receptionist')
  )
  with check (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(business_id, 'owner')
    or public.current_user_has_role_in_business(business_id, 'barber')
    or public.current_user_has_role_in_business(business_id, 'receptionist')
  );

-- appointment_items: visible / manageable iff the parent appointment is.
create policy appointment_items_select on public.appointment_items
  for select
  using (
    public.current_user_is_platform_admin()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_items.appointment_id
        and a.business_id in (select public.current_user_business_ids())
    )
  );

create policy appointment_items_manage_staff on public.appointment_items
  for all
  using (
    public.current_user_is_platform_admin()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_items.appointment_id
        and (
          public.current_user_has_role_in_business(a.business_id, 'owner')
          or public.current_user_has_role_in_business(a.business_id, 'barber')
          or public.current_user_has_role_in_business(a.business_id, 'receptionist')
        )
    )
  )
  with check (
    public.current_user_is_platform_admin()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_items.appointment_id
        and (
          public.current_user_has_role_in_business(a.business_id, 'owner')
          or public.current_user_has_role_in_business(a.business_id, 'barber')
          or public.current_user_has_role_in_business(a.business_id, 'receptionist')
        )
    )
  );

-- appointment_events: read iff parent appointment is visible; insert iff parent appointment is manageable.
-- No UPDATE / DELETE policy: those operations are blocked by the append-only trigger regardless.
create policy appointment_events_select on public.appointment_events
  for select
  using (
    public.current_user_is_platform_admin()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_events.appointment_id
        and a.business_id in (select public.current_user_business_ids())
    )
  );

create policy appointment_events_insert_staff on public.appointment_events
  for insert
  with check (
    public.current_user_is_platform_admin()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_events.appointment_id
        and (
          public.current_user_has_role_in_business(a.business_id, 'owner')
          or public.current_user_has_role_in_business(a.business_id, 'barber')
          or public.current_user_has_role_in_business(a.business_id, 'receptionist')
        )
    )
  );

-- blockouts: business members (or platform admin) can read; staff roles manage.
create policy blockouts_select_member on public.blockouts
  for select
  using (
    public.current_user_is_platform_admin()
    or business_id in (select public.current_user_business_ids())
  );

create policy blockouts_manage_staff on public.blockouts
  for all
  using (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(business_id, 'owner')
    or public.current_user_has_role_in_business(business_id, 'barber')
    or public.current_user_has_role_in_business(business_id, 'receptionist')
  )
  with check (
    public.current_user_is_platform_admin()
    or public.current_user_has_role_in_business(business_id, 'owner')
    or public.current_user_has_role_in_business(business_id, 'barber')
    or public.current_user_has_role_in_business(business_id, 'receptionist')
  );
