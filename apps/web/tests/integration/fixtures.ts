import type { Client } from "pg";

/** Seeded tenant A (from supabase/seed.sql). */
export const TENANT_A = {
  owner: "00000000-0000-0000-0000-000000000001",
  business: "10000000-0000-0000-0000-000000000001",
  location: "20000000-0000-0000-0000-000000000001",
  service: "40000000-0000-0000-0000-000000000001",
  staff: "50000000-0000-0000-0000-000000000001",
} as const;

/** Tenant B is created on the fly inside each test transaction (rolled back). */
export const TENANT_B = {
  owner: "00000000-0000-0000-0000-0000000000b2",
  business: "10000000-0000-0000-0000-0000000000b2",
  location: "20000000-0000-0000-0000-0000000000b2",
  service: "40000000-0000-0000-0000-0000000000b2",
} as const;

/**
 * Create a full second tenant (owner + business + location + role + one service)
 * as the superuser. Call inside a transaction; it is rolled back by the caller.
 */
export async function seedTenantB(client: Client): Promise<void> {
  await client.query(
    `insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, is_super_admin)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ownerb@demo.local', now(), now(), now(), '{}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, false)`,
    [TENANT_B.owner],
  );
  await client.query(
    `insert into public.users (id, type, display_name, email, preferred_locale)
     values ($1, 'owner', 'Owner B', 'ownerb@demo.local', 'ar')`,
    [TENANT_B.owner],
  );
  await client.query(
    `insert into public.businesses (id, legal_name, trade_name) values ($1, 'Tenant B LLC', 'Tenant B')`,
    [TENANT_B.business],
  );
  await client.query(
    `insert into public.locations (id, business_id, name) values ($1, $2, 'B Location')`,
    [TENANT_B.location, TENANT_B.business],
  );
  await client.query(
    `insert into public.user_roles (user_id, role, business_id) values ($1, 'owner', $2)`,
    [TENANT_B.owner, TENANT_B.business],
  );
  await client.query(
    `insert into public.services (id, business_id, location_id, name_ar, name_en, duration_min, price_minor, status)
     values ($1, $2, $3, 'خدمة بي', 'B Service', 30, 3000, 'active')`,
    [TENANT_B.service, TENANT_B.business, TENANT_B.location],
  );
}
