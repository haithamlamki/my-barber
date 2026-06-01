import { describe, expect, it } from "vitest";
import {
  formatBookingDate,
  formatBookingDateTime,
  formatBookingTime,
} from "@/lib/i18n/datetime";

// 2026-06-09 05:30 UTC = 09:30 in Asia/Muscat (fixed UTC+4, no DST). The wall date
// is Tuesday, June 9.
const INSTANT_UTC = "2026-06-09T05:30:00Z";

describe("formatBookingDate", () => {
  it("renders the shop-local weekday, day and month in English", () => {
    const out = formatBookingDate("2026-06-09", "en");
    expect(out).toContain("Jun");
    expect(out).toContain("9");
    expect(out).toContain("Tue");
  });

  it("keeps the wall-clock date stable at the UTC day boundary", () => {
    // Local midnight-adjacent date must not roll back to the previous day.
    expect(formatBookingDate("2026-06-09", "en")).toContain("9");
  });

  it("localizes to Arabic distinctly from English", () => {
    const ar = formatBookingDate("2026-06-09", "ar");
    expect(ar.length).toBeGreaterThan(0);
    expect(ar).not.toBe(formatBookingDate("2026-06-09", "en"));
  });
});

describe("formatBookingTime", () => {
  it("renders a 24-hour shop-local time from a UTC instant string", () => {
    expect(formatBookingTime(INSTANT_UTC, "en")).toBe("09:30");
  });

  it("accepts a Date instance", () => {
    expect(formatBookingTime(new Date(INSTANT_UTC), "en")).toBe("09:30");
  });

  it("localizes Arabic time distinctly from English", () => {
    const ar = formatBookingTime(INSTANT_UTC, "ar");
    expect(ar.length).toBeGreaterThan(0);
    expect(ar).not.toBe(formatBookingTime(INSTANT_UTC, "en"));
  });
});

describe("formatBookingDateTime", () => {
  it("renders a full English date and 24-hour time", () => {
    const out = formatBookingDateTime(INSTANT_UTC, "en");
    expect(out).toContain("June");
    expect(out).toContain("09:30");
  });

  it("accepts a Date instance", () => {
    expect(formatBookingDateTime(new Date(INSTANT_UTC), "en")).toContain("09:30");
  });

  it("localizes Arabic date-time distinctly from English", () => {
    const ar = formatBookingDateTime(INSTANT_UTC, "ar");
    expect(ar.length).toBeGreaterThan(0);
    expect(ar).not.toBe(formatBookingDateTime(INSTANT_UTC, "en"));
  });
});
