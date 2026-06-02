/**
 * Notification adapter contract. v0.1 ships a single console channel (no real
 * WhatsApp/SMS yet); the interface is the seam those providers slot into later.
 * Money stays in integer minor units (OMR baisa).
 */

export type NotificationChannel = "console";

/** Everything a booking-confirmation message needs, locale-resolved at format time. */
export interface BookingConfirmationPayload {
  readonly bookingCode: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerEmail: string | null;
  readonly serviceNameAr: string;
  readonly serviceNameEn: string;
  readonly startsAtIso: string;
  readonly totalMinor: number;
  readonly locale: "ar" | "en";
}

/** The structured line a channel emits. The localized service name is pre-resolved. */
export interface NotificationLogRecord {
  readonly channel: NotificationChannel;
  readonly event: "booking_confirmation";
  readonly bookingCode: string;
  readonly to: string;
  readonly locale: "ar" | "en";
  readonly serviceName: string;
  readonly startsAtIso: string;
  readonly totalMinor: number;
}

export interface NotificationResult {
  readonly ok: boolean;
  readonly channel: NotificationChannel;
  readonly error?: string;
}

export type NotificationSink = (record: NotificationLogRecord) => void;

export interface NotificationAdapter {
  readonly channel: NotificationChannel;
  sendBookingConfirmation(payload: BookingConfirmationPayload): Promise<NotificationResult>;
}
