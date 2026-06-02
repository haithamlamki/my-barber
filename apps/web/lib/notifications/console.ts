import type {
  BookingConfirmationPayload,
  NotificationAdapter,
  NotificationLogRecord,
  NotificationResult,
  NotificationSink,
} from "./types";

/** Flatten a confirmation payload into the structured record a channel emits. */
export function buildBookingConfirmationRecord(
  payload: BookingConfirmationPayload,
): NotificationLogRecord {
  return {
    channel: "console",
    event: "booking_confirmation",
    bookingCode: payload.bookingCode,
    to: payload.customerPhone,
    locale: payload.locale,
    serviceName: payload.locale === "ar" ? payload.serviceNameAr : payload.serviceNameEn,
    startsAtIso: payload.startsAtIso,
    totalMinor: payload.totalMinor,
  };
}

// For v0.1 the console IS the delivery channel — there is no WhatsApp/SMS yet.
const defaultSink: NotificationSink = (record) => {
  // eslint-disable-next-line no-console -- console output is this adapter's purpose
  console.info(`[notification] ${JSON.stringify(record)}`);
};

/**
 * Build a console notification adapter. The sink is injectable so tests can
 * capture records without writing to stdout. Failures are reported, never thrown:
 * the appointment is already confirmed before this runs.
 */
export function createConsoleNotificationAdapter(
  sink: NotificationSink = defaultSink,
): NotificationAdapter {
  return {
    channel: "console",
    async sendBookingConfirmation(
      payload: BookingConfirmationPayload,
    ): Promise<NotificationResult> {
      try {
        sink(buildBookingConfirmationRecord(payload));
        return { ok: true, channel: "console" };
      } catch (error) {
        return {
          ok: false,
          channel: "console",
          error: error instanceof Error ? error.message : "notification_failed",
        };
      }
    },
  };
}
