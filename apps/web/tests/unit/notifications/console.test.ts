import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildBookingConfirmationRecord,
  createConsoleNotificationAdapter,
} from "@/lib/notifications/console";
import type {
  BookingConfirmationPayload,
  NotificationLogRecord,
} from "@/lib/notifications/types";

const payload = (
  overrides: Partial<BookingConfirmationPayload> = {},
): BookingConfirmationPayload => ({
  bookingCode: "ABCD2345",
  customerName: "Salim",
  customerPhone: "91234567",
  customerEmail: null,
  serviceNameAr: "قص شعر",
  serviceNameEn: "Haircut",
  startsAtIso: "2030-03-01T06:00:00.000Z",
  totalMinor: 2500,
  locale: "en",
  ...overrides,
});

describe("buildBookingConfirmationRecord", () => {
  it("uses the English service name for the en locale", () => {
    const record = buildBookingConfirmationRecord(payload({ locale: "en" }));
    expect(record.serviceName).toBe("Haircut");
  });

  it("uses the Arabic service name for the ar locale", () => {
    const record = buildBookingConfirmationRecord(payload({ locale: "ar" }));
    expect(record.serviceName).toBe("قص شعر");
  });

  it("addresses the customer's phone and tags the event channel", () => {
    const record = buildBookingConfirmationRecord(payload());
    expect(record).toMatchObject<Partial<NotificationLogRecord>>({
      channel: "console",
      event: "booking_confirmation",
      bookingCode: "ABCD2345",
      to: "91234567",
      totalMinor: 2500,
    });
  });
});

describe("createConsoleNotificationAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("exposes the console channel", () => {
    expect(createConsoleNotificationAdapter().channel).toBe("console");
  });

  it("sends exactly one record through the sink and reports success", async () => {
    const sink = vi.fn();
    const adapter = createConsoleNotificationAdapter(sink);

    const result = await adapter.sendBookingConfirmation(payload());

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith(buildBookingConfirmationRecord(payload()));
    expect(result).toEqual({ ok: true, channel: "console" });
  });

  it("reports failure (never throws) when the sink throws", async () => {
    const adapter = createConsoleNotificationAdapter(() => {
      throw new Error("sink down");
    });

    const result = await adapter.sendBookingConfirmation(payload());

    expect(result.ok).toBe(false);
    expect(result.channel).toBe("console");
    expect(result.error).toMatch(/sink down/);
  });

  it("falls back to a generic error when the sink throws a non-Error", async () => {
    const adapter = createConsoleNotificationAdapter(() => {
      throw "boom";
    });

    const result = await adapter.sendBookingConfirmation(payload());

    expect(result.ok).toBe(false);
    expect(result.error).toBe("notification_failed");
  });

  it("default adapter writes the record to console.info", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const adapter = createConsoleNotificationAdapter();

    const result = await adapter.sendBookingConfirmation(payload());

    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toContain("ABCD2345");
  });
});
