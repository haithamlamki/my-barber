import type { Interval } from "./types";
import { computeAvailableSlots } from "./slots";
import { minutesToHm } from "./time";
import { muscatWeekdayKey, windowsForWeekday } from "./schedule";
import { MINUTES_PER_DAY, muscatLocalToUtc, parseLocalDate, utcToMuscatLocal } from "./tz";

export const DEFAULT_STEP_MIN = 15;
export const DEFAULT_HORIZON_DAYS = 14;

/** A busy range coming from the DB (staff_busy_intervals), as absolute UTC instants. */
export interface BusyRange {
  readonly startsAt: string | Date;
  readonly endsAt: string | Date;
}

export interface DaySlotRequest {
  readonly hoursJson: unknown;
  readonly dateLocal: string; // YYYY-MM-DD, shop-local
  readonly durationMin: number;
  readonly bufferBeforeMin: number;
  readonly bufferAfterMin: number;
  readonly busy: readonly BusyRange[];
  /** Slots starting before `now` are dropped (no past bookings). */
  readonly now: Date;
  readonly stepMin?: number;
}

export interface DaySlot {
  readonly startMin: number; // minutes from shop-local midnight
  readonly startsAtUtc: Date;
  readonly label: string; // "HH:MM" shop-local
}

/**
 * Compute the bookable slots for one shop-local day. Bridges absolute UTC busy ranges and
 * working hours into the pure minute-based slot engine, then maps results back to UTC
 * instants and drops any start already in the past.
 */
export function availableSlotsForDate(request: DaySlotRequest): DaySlot[] {
  const stepMin = request.stepMin ?? DEFAULT_STEP_MIN;
  const windows = windowsForWeekday(request.hoursJson, muscatWeekdayKey(request.dateLocal));
  if (windows.length === 0) return [];

  const dayStartUtc = muscatLocalToUtc(request.dateLocal, 0).getTime();
  const busy = toBusyIntervals(request.busy, dayStartUtc);

  const starts = computeAvailableSlots({
    windows,
    durationMin: request.durationMin,
    bufferBeforeMin: request.bufferBeforeMin,
    bufferAfterMin: request.bufferAfterMin,
    stepMin,
    busy,
  });

  const nowMs = request.now.getTime();
  const slots: DaySlot[] = [];
  for (const startMin of starts) {
    const startsAtUtc = muscatLocalToUtc(request.dateLocal, startMin);
    if (startsAtUtc.getTime() < nowMs) continue;
    slots.push({ startMin, startsAtUtc, label: minutesToHm(startMin) });
  }
  return slots;
}

/** Clip absolute busy ranges to the target day and express them as minute intervals. */
function toBusyIntervals(busy: readonly BusyRange[], dayStartMs: number): Interval[] {
  const dayEndMs = dayStartMs + MINUTES_PER_DAY * 60_000;
  const intervals: Interval[] = [];
  for (const range of busy) {
    const startMs = new Date(range.startsAt).getTime();
    const endMs = new Date(range.endsAt).getTime();
    const clampedStart = Math.max(startMs, dayStartMs);
    const clampedEnd = Math.min(endMs, dayEndMs);
    if (!(clampedStart < clampedEnd)) continue; // no overlap with this day
    intervals.push({
      startMin: Math.floor((clampedStart - dayStartMs) / 60_000),
      endMin: Math.ceil((clampedEnd - dayStartMs) / 60_000),
    });
  }
  return intervals;
}

/** The shop-local dates a customer may book, from today through the horizon (inclusive). */
export function listBookableDates(
  now: Date,
  horizonDays: number = DEFAULT_HORIZON_DAYS,
): string[] {
  if (!Number.isInteger(horizonDays) || horizonDays < 0) {
    throw new RangeError(`horizonDays must be a non-negative integer, got ${horizonDays}`);
  }
  const today = muscatTodayLocal(now);
  const { year, month, day } = parseLocalDate(today);
  const dates: string[] = [];
  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const d = new Date(Date.UTC(year, month - 1, day + offset));
    dates.push(
      `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}`,
    );
  }
  return dates;
}

/** True when `startsAtUtc` is from now through the booking horizon (shop-local days). */
export function isWithinHorizon(
  startsAtUtc: Date,
  now: Date,
  horizonDays: number = DEFAULT_HORIZON_DAYS,
): boolean {
  if (startsAtUtc.getTime() < now.getTime()) return false;
  const allowed = listBookableDates(now, horizonDays);
  const { dateLocal } = utcToMuscatLocal(startsAtUtc);
  return allowed.includes(dateLocal);
}

function muscatTodayLocal(now: Date): string {
  return utcToMuscatLocal(now).dateLocal;
}

function pad(value: number, width: number): string {
  return value.toString().padStart(width, "0");
}
