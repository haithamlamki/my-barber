import type { AppointmentEventDraft, BookingStatus } from "./types";

/**
 * The appointment lifecycle. Every status change is appended as an immutable
 * appointment_events row (CLAUDE.md rule 9). No code mutates appointments.status
 * outside the drafts produced here.
 */

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "arrived",
  "completed",
  "no_show",
  "cancelled",
] as const satisfies readonly BookingStatus[];

export const TERMINAL_STATUSES = ["completed", "no_show", "cancelled"] as const satisfies
  readonly BookingStatus[];

/** Guest bookings are created already confirmed (no payment/approval step in v0.1). */
export const INITIAL_STATUS: BookingStatus = "confirmed";

const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["arrived", "completed", "cancelled", "no_show"],
  arrived: ["completed", "cancelled", "no_show"],
  completed: [],
  no_show: [],
  cancelled: [],
};

/** True when `to` is a legal next status from `from`. Terminal statuses go nowhere. */
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface BuildEventParams {
  readonly from: BookingStatus | null;
  readonly to: BookingStatus;
  readonly actorUserId?: string | null;
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * Build an appointment_events draft. A null `from` is the creation event; any other
 * `from` must be a legal transition or this throws (callers must not write illegal moves).
 */
export function buildEvent({
  from,
  to,
  actorUserId = null,
  payload = {},
}: BuildEventParams): AppointmentEventDraft {
  if (from !== null && !canTransition(from, to)) {
    throw new RangeError(`invalid transition: ${from} -> ${to}`);
  }
  return {
    eventType: from === null ? "created" : "status_changed",
    fromStatus: from,
    toStatus: to,
    actorUserId,
    payload: { ...payload },
  };
}
