/**
 * Timezone boundary for availability. The product is Oman-only and Asia/Muscat observes a
 * fixed UTC+4 offset with NO daylight saving, so wall-clock <-> UTC conversion is a constant
 * shift. Keeping it explicit (rather than via Intl) keeps the slot math pure and deterministic.
 */

export const MUSCAT_UTC_OFFSET_MIN = 240; // +04:00, no DST.
export const MINUTES_PER_DAY = 1440;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface LocalDate {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number; // 1-31
}

/** Parse a "YYYY-MM-DD" shop-local calendar date. Throws on malformed or impossible dates. */
export function parseLocalDate(dateLocal: string): LocalDate {
  const match = DATE_PATTERN.exec(dateLocal);
  if (!match) {
    throw new TypeError(`expected a "YYYY-MM-DD" date, got ${dateLocal}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Round-trip through UTC to reject impossible dates like 2026-02-30.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new RangeError(`invalid calendar date: ${dateLocal}`);
  }
  return { year, month, day };
}

function assertMinuteOfDay(minutesFromMidnight: number): void {
  if (!Number.isInteger(minutesFromMidnight)) {
    throw new TypeError(`expected integer minutes from midnight, got ${minutesFromMidnight}`);
  }
  if (minutesFromMidnight < 0 || minutesFromMidnight > MINUTES_PER_DAY) {
    throw new RangeError(`minutes from midnight out of range: ${minutesFromMidnight}`);
  }
}

/** Convert a shop-local date + minutes-from-midnight into the absolute UTC instant. */
export function muscatLocalToUtc(dateLocal: string, minutesFromMidnight: number): Date {
  assertMinuteOfDay(minutesFromMidnight);
  const { year, month, day } = parseLocalDate(dateLocal);
  const ms =
    Date.UTC(year, month - 1, day) +
    (minutesFromMidnight - MUSCAT_UTC_OFFSET_MIN) * 60_000;
  return new Date(ms);
}

export interface MuscatWallClock {
  readonly dateLocal: string; // YYYY-MM-DD
  readonly minutesFromMidnight: number; // 0..1439
}

/** Convert an absolute UTC instant into the shop-local date + minutes-from-midnight. */
export function utcToMuscatLocal(instant: Date): MuscatWallClock {
  const shifted = new Date(instant.getTime() + MUSCAT_UTC_OFFSET_MIN * 60_000);
  const dateLocal = `${pad(shifted.getUTCFullYear(), 4)}-${pad(
    shifted.getUTCMonth() + 1,
    2,
  )}-${pad(shifted.getUTCDate(), 2)}`;
  const minutesFromMidnight = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return { dateLocal, minutesFromMidnight };
}

function pad(value: number, width: number): string {
  return value.toString().padStart(width, "0");
}
