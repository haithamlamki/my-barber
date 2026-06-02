import type { Locale } from "./locales";

const TIME_ZONE = "Asia/Muscat";

function bcp47(locale: Locale): string {
  return locale === "ar" ? "ar-OM" : "en-OM";
}

/** Format a shop-local "YYYY-MM-DD" date as a short weekday + day + month label. */
export function formatBookingDate(dateLocal: string, locale: Locale): string {
  // Anchor at local noon so the wall-clock date never shifts across the UTC boundary.
  const date = new Date(`${dateLocal}T12:00:00+04:00`);
  return new Intl.DateTimeFormat(bcp47(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(date);
}

/** Format a UTC instant as a shop-local 24-hour time (e.g. "09:30"). */
export function formatBookingTime(instant: Date | string, locale: Locale): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat(bcp47(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(date);
}

/** Format a UTC instant as a full shop-local date + time, for confirmations/summaries. */
export function formatBookingDateTime(instant: Date | string, locale: Locale): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat(bcp47(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(date);
}
