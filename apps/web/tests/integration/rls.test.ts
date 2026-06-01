import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { asAuthenticated, asPostgres, connect, withRollback } from "./helpers/db";
import { seedTenantB, TENANT_A, TENANT_B } from "./fixtures";

let client: Client;

beforeAll(async () => {
  client = await connect();
});

afterAll(async () => {
  await client.end();
});

const RLS_VIOLATION = "42501";

describe("RLS tenant isolation: services (public-read, owner-write)", () => {
  it("lets owner A update its own service", async () => {
    await withRollback(client, async () => {
      await asAuthenticated(client, TENANT_A.owner);
      const res = await client.query(
        "update public.services set name_en = 'Renamed' where id = $1",
        [TENANT_A.service],
      );
      expect(res.rowCount).toBe(1);
    });
  });

  it("forbids owner A from inserting a service into business B", async () => {
    await withRollback(client, async () => {
      await seedTenantB(client);
      await asAuthenticated(client, TENANT_A.owner);
      await expect(
        client.query(
          `insert into public.services (business_id, location_id, name_ar, name_en, duration_min, price_minor)
           values ($1, $2, 'x', 'x', 30, 1000)`,
          [TENANT_B.business, TENANT_B.location],
        ),
      ).rejects.toMatchObject({ code: RLS_VIOLATION });
    });
  });

  it("forbids owner A from updating business B's service (0 rows affected)", async () => {
    await withRollback(client, async () => {
      await seedTenantB(client);
      await asAuthenticated(client, TENANT_A.owner);
      const res = await client.query(
        "update public.services set price_minor = 1 where id = $1",
        [TENANT_B.service],
      );
      expect(res.rowCount).toBe(0);
    });
  });

  it("forbids owner A from deleting business B's service (0 rows affected)", async () => {
    await withRollback(client, async () => {
      await seedTenantB(client);
      await asAuthenticated(client, TENANT_A.owner);
      const res = await client.query("delete from public.services where id = $1", [
        TENANT_B.service,
      ]);
      expect(res.rowCount).toBe(0);
    });
  });

  it("hides business B's archived (non-active) service from owner A", async () => {
    await withRollback(client, async () => {
      await seedTenantB(client);
      await client.query("update public.services set status = 'archived' where id = $1", [
        TENANT_B.service,
      ]);
      await asAuthenticated(client, TENANT_A.owner);
      const res = await client.query("select id from public.services where id = $1", [
        TENANT_B.service,
      ]);
      expect(res.rowCount).toBe(0);
    });
  });
});

describe("RLS tenant isolation: appointments (no public read)", () => {
  const futureSlot = {
    start: "2026-07-01 10:00:00+04",
    end: "2026-07-01 10:30:00+04",
  };

  it("lets owner A create and read an appointment in its own business", async () => {
    await withRollback(client, async () => {
      await asAuthenticated(client, TENANT_A.owner);
      const insert = await client.query(
        `insert into public.appointments
           (business_id, location_id, staff_profile_id, service_id, customer_name, customer_phone, booking_code, starts_at, ends_at, price_minor, total_minor)
         values ($1, $2, $3, $4, 'Cust', '900', 'CODE-OK', $5, $6, 2500, 2500) returning id`,
        [
          TENANT_A.business,
          TENANT_A.location,
          TENANT_A.staff,
          TENANT_A.service,
          futureSlot.start,
          futureSlot.end,
        ],
      );
      expect(insert.rowCount).toBe(1);
      const read = await client.query("select id from public.appointments where booking_code = $1", [
        "CODE-OK",
      ]);
      expect(read.rowCount).toBe(1);
    });
  });

  it("forbids owner A from inserting an appointment into business B", async () => {
    await withRollback(client, async () => {
      await seedTenantB(client);
      await asAuthenticated(client, TENANT_A.owner);
      await expect(
        client.query(
          `insert into public.appointments
             (business_id, location_id, staff_profile_id, service_id, customer_name, customer_phone, booking_code, starts_at, ends_at, price_minor, total_minor)
           values ($1, $2, $3, $4, 'Cust', '900', 'CODE-BAD', $5, $6, 2500, 2500)`,
          [
            TENANT_B.business,
            TENANT_B.location,
            TENANT_A.staff,
            TENANT_B.service,
            futureSlot.start,
            futureSlot.end,
          ],
        ),
      ).rejects.toMatchObject({ code: RLS_VIOLATION });
    });
  });

  it("hides business B's appointments from owner A", async () => {
    await withRollback(client, async () => {
      await seedTenantB(client);
      // Create an appointment in business B as the superuser (RLS bypassed).
      await client.query(
        `insert into public.appointments
           (business_id, location_id, staff_profile_id, service_id, customer_name, customer_phone, booking_code, starts_at, ends_at, price_minor, total_minor)
         values ($1, $2, $3, $4, 'B Cust', '901', 'CODE-B', $5, $6, 3000, 3000)`,
        [TENANT_B.business, TENANT_B.location, TENANT_A.staff, TENANT_B.service, futureSlot.start, futureSlot.end],
      );
      await asAuthenticated(client, TENANT_A.owner);
      const res = await client.query("select id from public.appointments where booking_code = $1", [
        "CODE-B",
      ]);
      expect(res.rowCount).toBe(0);
    });
  });

  it("lets owner B manage its own business but not business A's services", async () => {
    await withRollback(client, async () => {
      await seedTenantB(client);
      await asAuthenticated(client, TENANT_B.owner);
      const own = await client.query(
        "update public.services set name_en = 'B Renamed' where id = $1",
        [TENANT_B.service],
      );
      expect(own.rowCount).toBe(1);
      const cross = await client.query(
        "update public.services set price_minor = 1 where id = $1",
        [TENANT_A.service],
      );
      expect(cross.rowCount).toBe(0);
    });
  });
});

describe("appointment_events append-only", () => {
  it("rejects UPDATE of an event row", async () => {
    await withRollback(client, async () => {
      await asPostgres(client);
      const appt = await client.query(
        `insert into public.appointments
           (business_id, location_id, staff_profile_id, service_id, customer_name, customer_phone, booking_code, starts_at, ends_at, price_minor, total_minor)
         values ($1, $2, $3, $4, 'Cust', '900', 'CODE-EV', '2026-07-02 10:00:00+04', '2026-07-02 10:30:00+04', 2500, 2500) returning id`,
        [TENANT_A.business, TENANT_A.location, TENANT_A.staff, TENANT_A.service],
      );
      const apptId = appt.rows[0].id as string;
      await client.query(
        "insert into public.appointment_events (appointment_id, event_type, to_status) values ($1, 'created', 'pending')",
        [apptId],
      );
      await expect(
        client.query("update public.appointment_events set event_type = 'tampered' where appointment_id = $1", [
          apptId,
        ]),
      ).rejects.toThrow(/append-only/);
    });
  });
});
