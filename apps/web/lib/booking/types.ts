/**
 * Booking domain types. Money stays in integer minor units (OMR baisa) end to end;
 * the only string formatting happens in lib/i18n/money.ts.
 */

import type { OrderTotals, TaxCode } from "@/lib/pricing/types";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "arrived"
  | "completed"
  | "no_show"
  | "cancelled";

export type BookingEventType = "created" | "status_changed";

/** A row to append to appointment_events. Built only via lib/booking/state-machine.ts. */
export interface AppointmentEventDraft {
  readonly eventType: BookingEventType;
  readonly fromStatus: BookingStatus | null;
  readonly toStatus: BookingStatus;
  readonly actorUserId: string | null;
  readonly payload: Readonly<Record<string, unknown>>;
}

export type QuoteItemKind = "service" | "addon";

/** A catalog line (service or add-on) priced for a quote. */
export interface QuoteLineInput {
  readonly kind: QuoteItemKind;
  readonly refId: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly durationMin: number;
  readonly priceMinor: number;
  readonly taxCode: TaxCode;
}

/** Immutable snapshot line mirroring an appointment_items row (no tax — tax lives in totals). */
export interface QuoteItem {
  readonly kind: QuoteItemKind;
  readonly refId: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly durationMin: number;
  readonly priceMinor: number;
}

export interface Quote {
  readonly items: readonly QuoteItem[];
  readonly totals: OrderTotals;
  readonly durationMin: number;
}

export interface BookingInput {
  readonly serviceId: string;
  readonly staffProfileId: string;
  readonly startsAt: string; // ISO 8601 UTC instant
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerEmail?: string;
  readonly locale: "ar" | "en";
}
