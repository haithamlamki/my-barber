import { z } from "zod";
import type { WorkingWindow } from "./types";
import { hmToMinutes } from "./time";
import { parseLocalDate } from "./tz";

/**
 * Weekly working hours are stored as untrusted JSONB on locations.hours_json:
 *   { "mon": [{ "open": "09:00", "close": "22:00" }], ... }
 * Days may be missing (closed) and a day may hold multiple windows (e.g. a midday break).
 */

export const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

const hmString = z.string().regex(/^([0-9]{2}):([0-9]{2})$/);
const windowSchema = z.object({ open: hmString, close: hmString });
const hoursSchema = z.record(z.string(), z.array(windowSchema)).default({});

/** The weekday key ("mon".."sun") for a shop-local "YYYY-MM-DD" date. */
export function muscatWeekdayKey(dateLocal: string): WeekdayKey {
  const { year, month, day } = parseLocalDate(dateLocal);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAY_KEYS[weekday]!; // getUTCDay() is always 0..6
}

/**
 * Parse hours_json and return the working windows for one weekday as minute ranges.
 * Returns [] when the shop is closed that day. Throws on malformed JSON shape or a
 * window whose open is not strictly before its close.
 */
export function windowsForWeekday(hoursJson: unknown, weekday: WeekdayKey): WorkingWindow[] {
  const parsed = hoursSchema.parse(hoursJson ?? {});
  const dayWindows = parsed[weekday] ?? [];
  return dayWindows.map(({ open, close }) => {
    const openMin = hmToMinutes(open);
    const closeMin = hmToMinutes(close);
    if (!(openMin < closeMin)) {
      throw new RangeError(`working window open must be before close: ${open}-${close}`);
    }
    return { openMin, closeMin };
  });
}
