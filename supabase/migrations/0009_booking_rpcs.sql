-- migration: 0009_booking_rpcs.sql
-- summary: Guest-booking access layer. Two RPCs, no table/column changes.
--   1. staff_busy_intervals — PII-free busy time ranges for a staff member, so the
--      anonymous slot picker can compute availability without SELECT on appointments.
--   2. create_appointment — atomic booking write (appointment + item snapshot +
--      created/confirmed event) in one transaction. Maps the double-booking EXCLUDE
--      violation to a typed `slot_taken` error. Money is supplied by the trusted
--      server action (derived from the live services row via lib/pricing); only
--      service_role may execute it, so callers can never spoof prices.
-- rollback: drop function public.create_appointment(uuid,uuid,timestamptz,timestamptz,text,text,text,text,text,integer,integer,integer,text,text,integer);
--           drop function public.staff_busy_intervals(uuid,timestamptz,timestamptz);

-- ---------- staff_busy_intervals ----------
-- Returns only [starts_at, ends_at) ranges for ACTIVE appointments plus blockouts of a
-- staff member within a window. No customer name/phone/email is exposed. SECURITY DEFINER
-- so it can read past the staff-only RLS on appointments; granted to anon for the public
-- booking flow.

create or replace function public.staff_busy_intervals(
  p_staff_profile_id uuid,
  p_from timestamptz,
  p_to   timestamptz
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select a.starts_at, a.ends_at
  from public.appointments a
  where a.staff_profile_id = p_staff_profile_id
    and a.status in ('pending', 'confirmed', 'arrived', 'completed')
    and a.starts_at < p_to
    and a.ends_at   > p_from
  union all
  select b.starts_at, b.ends_at
  from public.blockouts b
  where b.staff_profile_id = p_staff_profile_id
    and b.starts_at < p_to
    and b.ends_at   > p_from;
$$;

comment on function public.staff_busy_intervals is
  'PII-free busy ranges (active appointments + blockouts) for a staff member. Safe for anonymous booking-flow availability.';

revoke all on function public.staff_busy_intervals(uuid, timestamptz, timestamptz) from public;
grant execute on function public.staff_busy_intervals(uuid, timestamptz, timestamptz) to anon, authenticated;

-- ---------- create_appointment ----------
-- Atomic guest booking. Derives business_id/location_id from the service row, validates
-- the staff belongs to the same business, inserts the appointment (status 'confirmed'),
-- the item snapshot, and the created->confirmed event. The appointments EXCLUDE
-- constraint is the row-level lock: a concurrent booking for the same staff+range raises
-- exclusion_violation, which we surface as `slot_taken`. Only service_role executes this;
-- the server action passes money it computed server-side from the live services row.

create or replace function public.create_appointment(
  p_service_id        uuid,
  p_staff_profile_id  uuid,
  p_starts_at         timestamptz,
  p_ends_at           timestamptz,
  p_customer_name     text,
  p_customer_phone    text,
  p_customer_email    text,
  p_locale            text,
  p_booking_code      text,
  p_price_minor       integer,
  p_tax_minor         integer,
  p_total_minor       integer,
  p_item_name_ar      text,
  p_item_name_en      text,
  p_item_duration_min integer
)
returns table (appointment_id uuid, booking_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id  uuid;
  v_location_id  uuid;
  v_status       text;
  v_staff_biz    uuid;
  v_appt_id      uuid;
begin
  select s.business_id, s.location_id, s.status
    into v_business_id, v_location_id, v_status
  from public.services s
  where s.id = p_service_id;

  if v_business_id is null then
    raise exception 'service_not_found';
  end if;
  if v_status <> 'active' then
    raise exception 'service_not_bookable';
  end if;

  select sp.business_id into v_staff_biz
  from public.staff_profiles sp
  where sp.id = p_staff_profile_id and sp.status = 'active';

  if v_staff_biz is null then
    raise exception 'staff_not_found';
  end if;
  if v_staff_biz <> v_business_id then
    raise exception 'staff_mismatch';
  end if;

  begin
    insert into public.appointments (
      business_id, location_id, staff_profile_id, service_id,
      customer_name, customer_phone, customer_email, locale,
      booking_code, status, starts_at, ends_at,
      price_minor, tax_minor, total_minor
    ) values (
      v_business_id, v_location_id, p_staff_profile_id, p_service_id,
      p_customer_name, p_customer_phone, p_customer_email, p_locale,
      p_booking_code, 'confirmed', p_starts_at, p_ends_at,
      p_price_minor, p_tax_minor, p_total_minor
    )
    returning id into v_appt_id;
  exception
    when exclusion_violation then
      raise exception 'slot_taken';
    when unique_violation then
      -- booking_code collision (astronomically unlikely); let the caller retry.
      raise exception 'booking_code_collision';
  end;

  insert into public.appointment_items (
    appointment_id, kind, ref_id, name_ar, name_en, duration_min, price_minor
  ) values (
    v_appt_id, 'service', p_service_id, p_item_name_ar, p_item_name_en,
    p_item_duration_min, p_price_minor
  );

  insert into public.appointment_events (
    appointment_id, event_type, from_status, to_status, actor_user_id, payload_json
  ) values (
    v_appt_id, 'created', null, 'confirmed', null,
    jsonb_build_object('source', 'guest_booking', 'booking_code', p_booking_code)
  );

  appointment_id := v_appt_id;
  booking_code := p_booking_code;
  return next;
end;
$$;

comment on function public.create_appointment is
  'Atomic guest booking write: appointment (confirmed) + item snapshot + created event. Maps double-booking to slot_taken. service_role only.';

revoke all on function public.create_appointment(
  uuid, uuid, timestamptz, timestamptz, text, text, text, text, text,
  integer, integer, integer, text, text, integer
) from public;
grant execute on function public.create_appointment(
  uuid, uuid, timestamptz, timestamptz, text, text, text, text, text,
  integer, integer, integer, text, text, integer
) to service_role;
