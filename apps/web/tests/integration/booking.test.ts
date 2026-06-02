import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { asPostgres, connect, withRollback } from "./helpers/db";
import { TENANT_A } from "./fixtures";

let client: Client;

beforeAll(async () => {
  client = await connect();
});

afterAll(async () => {
  await client.end();
});

/** A far-future window unlikely to collide with seeded or other test appointments. */
const SLOT = {
  start: "2030-03-01 10:00:00+04",
  end: "2030-03-01 10:30:00+04",
} as const;

async function callCreateAppointment(
  c: Client,
  bookingCode: string,
  slot: { start: string; end: string } = SLOT,
): Promise<{ appointment_id: string; booking_code: string }> {
  const res = await c.query(
    `select * from public.create_appointment(
       $1::uuid, $2::uuid, $3::timestamptz, $4::timestamptz,
       $5, $6, $7, $8, $9,
       $10::int, $11::int, $12::int, $13, $14, $15::int
     )`,
    [
      TENANT_A.service,
      TENANT_A.staff,
      slot.start,
      slot.end,
      "Test Customer",
      "91234567",
      "",
      "ar",
      bookingCode,
      2500,
      0,
      2500,
      "قص شعر",
      "Haircut",
      30,
    ],
  );
  return res.rows[0] as { appointment_id: string; booking_code: string };
}

describe("create_appointment RPC", () => {
  it("writes appointment + item snapshot + created event atomically and returns the code", async () => {
    await withRollback(client, async () => {
      await asPostgres(client);
      const out = await callCreateAppointment(client, "BOOK-OK1");
      expect(out.booking_code).toBe("BOOK-OK1");
      expect(out.appointment_id).toMatch(/^[0-9a-f-]{36}$/);

      const appt = await client.query(
        "select status, total_minor, customer_name from public.appointments where id = $1",
        [out.appointment_id],
      );
      expect(appt.rowCount).toBe(1);
      expect(appt.rows[0].status).toBe("confirmed");
      expect(appt.rows[0].total_minor).toBe(2500);

      const items = await client.query(
        "select kind, name_en, duration_min, price_minor from public.appointment_items where appointment_id = $1",
        [out.appointment_id],
      );
      expect(items.rowCount).toBe(1);
      expect(items.rows[0].kind).toBe("service");
      expect(items.rows[0].name_en).toBe("Haircut");

      const events = await client.query(
        "select event_type, from_status, to_status from public.appointment_events where appointment_id = $1",
        [out.appointment_id],
      );
      expect(events.rowCount).toBe(1);
      expect(events.rows[0].event_type).toBe("created");
      expect(events.rows[0].from_status).toBeNull();
      expect(events.rows[0].to_status).toBe("confirmed");
    });
  });

  it("rejects an inactive service with service_not_bookable", async () => {
    await withRollback(client, async () => {
      await asPostgres(client);
      await client.query("update public.services set status = 'archived' where id = $1", [
        TENANT_A.service,
      ]);
      await expect(callCreateAppointment(client, "BOOK-ARCH")).rejects.toThrow(
        /service_not_bookable/,
      );
    });
  });
});

describe("booking concurrency (CLAUDE.md rule 8: row-level lock)", () => {
  it("fires two identical bookings and exactly one succeeds", async () => {
    const a = await connect();
    const b = await connect();
    const cleanup = await connect();
    try {
      const results = await Promise.allSettled([
        callCreateAppointment(a, "RACE-A"),
        callCreateAppointment(b, "RACE-B"),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      // The loser is aborted by the EXCLUDE constraint. Depending on race timing
      // Postgres surfaces this as either the mapped slot_taken error or a deadlock;
      // both prove the row-level lock prevented a double booking.
      const reason = (rejected[0] as PromiseRejectedResult).reason as Error;
      expect(reason.message).toMatch(/slot_taken|deadlock detected/);
    } finally {
      // The winning booking is committed. Its appointment_events rows are append-only,
      // so a plain cascade delete is blocked; replica role skips triggers for cleanup.
      await cleanup.query("set session_replication_role = replica");
      await cleanup.query(
        "delete from public.appointments where booking_code in ('RACE-A', 'RACE-B')",
      );
      await cleanup.query("set session_replication_role = default");
      await a.end();
      await b.end();
      await cleanup.end();
    }
  });
});

describe("staff_busy_intervals RPC (no PII leak)", () => {
  it("returns only time ranges, never customer identity", async () => {
    await withRollback(client, async () => {
      await asPostgres(client);
      await callCreateAppointment(client, "BUSY-1");

      const res = await client.query(
        `select * from public.staff_busy_intervals($1::uuid, $2::timestamptz, $3::timestamptz)`,
        [TENANT_A.staff, "2030-03-01 00:00:00+04", "2030-03-02 00:00:00+04"],
      );
      expect(res.rowCount).toBe(1);
      expect(Object.keys(res.rows[0]).sort()).toEqual(["ends_at", "starts_at"]);
    });
  });

  it("excludes cancelled appointments from busy ranges", async () => {
    await withRollback(client, async () => {
      await asPostgres(client);
      const out = await callCreateAppointment(client, "BUSY-CXL");
      await client.query("update public.appointments set status = 'cancelled' where id = $1", [
        out.appointment_id,
      ]);

      const res = await client.query(
        `select * from public.staff_busy_intervals($1::uuid, $2::timestamptz, $3::timestamptz)`,
        [TENANT_A.staff, "2030-03-01 00:00:00+04", "2030-03-02 00:00:00+04"],
      );
      expect(res.rowCount).toBe(0);
    });
  });
});
