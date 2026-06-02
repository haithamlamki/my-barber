import { Client } from "pg";

const DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/**
 * A dedicated tenant used ONLY by the customer-booking E2E. Keeping it separate from
 * the demo seed tenant means the journey can create real (append-only) appointments
 * without ever polluting seed data, and teardown can blanket-delete by business_id.
 * IDs are fixed so the spec can target the test service by URL.
 */
export const E2E_TENANT = {
  staffUser: "000000e2-0000-0000-0000-000000000001",
  business: "100000e2-0000-0000-0000-000000000001",
  location: "200000e2-0000-0000-0000-000000000001",
  service: "400000e2-0000-0000-0000-000000000001",
  staff: "500000e2-0000-0000-0000-000000000001",
  assignment: "600000e2-0000-0000-0000-000000000001",
} as const;

const HOURS_JSON =
  '{"mon":[{"open":"09:00","close":"22:00"}],"tue":[{"open":"09:00","close":"22:00"}],"wed":[{"open":"09:00","close":"22:00"}],"thu":[{"open":"09:00","close":"22:00"}],"fri":[{"open":"09:00","close":"22:00"}],"sat":[{"open":"09:00","close":"22:00"}],"sun":[{"open":"09:00","close":"22:00"}]}';

export function dbUrl(): string {
  return process.env.SUPABASE_DB_URL ?? DEFAULT_DB_URL;
}

export async function connectAdmin(): Promise<Client> {
  const client = new Client({ connectionString: dbUrl() });
  await client.connect();
  return client;
}

/**
 * Delete every appointment (and its append-only children) for the E2E business.
 * `session_replication_role = replica` is set on THIS maintenance connection only —
 * it skips the append-only guard and FK cascade triggers so the rows can be removed.
 * It is session-local and never alters trigger behavior for the running app.
 */
async function purgeAppointments(client: Client): Promise<void> {
  await client.query("set session_replication_role = replica");
  try {
    await client.query(
      `delete from public.appointment_events
         where appointment_id in (select id from public.appointments where business_id = $1)`,
      [E2E_TENANT.business],
    );
    await client.query(
      `delete from public.appointment_items
         where appointment_id in (select id from public.appointments where business_id = $1)`,
      [E2E_TENANT.business],
    );
    await client.query("delete from public.appointments where business_id = $1", [
      E2E_TENANT.business,
    ]);
  } finally {
    await client.query("set session_replication_role = default");
  }
}

/** Create the isolated E2E tenant. Idempotent: safe to re-run after a crashed teardown. */
export async function createE2ETenant(client: Client): Promise<void> {
  await purgeAppointments(client);

  await client.query(
    `insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, is_super_admin)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             'e2e-barber@test.local', now(), now(), now(),
             '{"display_name":"E2E Barber"}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, false)
     on conflict (id) do nothing`,
    [E2E_TENANT.staffUser],
  );
  await client.query(
    `update auth.users set
       confirmation_token = '', recovery_token = '', email_change = '',
       email_change_token_new = '', email_change_token_current = '',
       phone_change = '', phone_change_token = '', reauthentication_token = ''
     where id = $1`,
    [E2E_TENANT.staffUser],
  );
  await client.query(
    `insert into public.users (id, type, display_name, email, preferred_locale)
     values ($1, 'staff', 'E2E Barber', 'e2e-barber@test.local', 'en')
     on conflict (id) do nothing`,
    [E2E_TENANT.staffUser],
  );
  await client.query(
    `insert into public.businesses (id, legal_name, trade_name, default_locale, vat_status, timezone, status)
     values ($1, 'E2E Test LLC', 'E2E Test Shop', 'en', 'not_registered', 'Asia/Muscat', 'active')
     on conflict (id) do nothing`,
    [E2E_TENANT.business],
  );
  await client.query(
    `insert into public.locations (id, business_id, name, hours_json, status)
     values ($1, $2, 'E2E Test Location', $3::jsonb, 'active')
     on conflict (id) do nothing`,
    [E2E_TENANT.location, E2E_TENANT.business, HOURS_JSON],
  );
  await client.query(
    `insert into public.services (id, business_id, location_id, name_ar, name_en, duration_min, buffer_before_min, buffer_after_min, price_minor, tax_code, status)
     values ($1, $2, $3, 'خدمة الاختبار', 'E2E Test Service', 30, 0, 0, 2000, 'OMR_VAT_ZERO', 'active')
     on conflict (id) do nothing`,
    [E2E_TENANT.service, E2E_TENANT.business, E2E_TENANT.location],
  );
  await client.query(
    `insert into public.staff_profiles (id, user_id, business_id, display_name, bio_ar, bio_en, employment_type, status)
     values ($1, $2, $3, 'E2E Barber', 'حلاق الاختبار', 'Test barber', 'employee', 'active')
     on conflict (id) do nothing`,
    [E2E_TENANT.staff, E2E_TENANT.staffUser, E2E_TENANT.business],
  );
  await client.query(
    `insert into public.staff_assignments (id, staff_profile_id, location_id, visibility_status, service_scope_json)
     values ($1, $2, $3, 'public', '{"all": true}'::jsonb)
     on conflict (id) do nothing`,
    [E2E_TENANT.assignment, E2E_TENANT.staff, E2E_TENANT.location],
  );
}

/** Remove the E2E tenant and every booking it produced, restoring the DB to seed-only. */
export async function destroyE2ETenant(client: Client): Promise<void> {
  await purgeAppointments(client);
  await client.query("delete from public.staff_assignments where id = $1", [E2E_TENANT.assignment]);
  await client.query("delete from public.staff_profiles where id = $1", [E2E_TENANT.staff]);
  await client.query("delete from public.services where id = $1", [E2E_TENANT.service]);
  await client.query("delete from public.locations where id = $1", [E2E_TENANT.location]);
  await client.query("delete from public.businesses where id = $1", [E2E_TENANT.business]);
  await client.query("delete from public.users where id = $1", [E2E_TENANT.staffUser]);
  await client.query("delete from auth.users where id = $1", [E2E_TENANT.staffUser]);
}
