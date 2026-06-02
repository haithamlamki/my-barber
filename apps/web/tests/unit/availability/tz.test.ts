import { describe, expect, it } from "vitest";
import {
  MINUTES_PER_DAY,
  MUSCAT_UTC_OFFSET_MIN,
  muscatLocalToUtc,
  parseLocalDate,
  utcToMuscatLocal,
} from "@/lib/availability/tz";

describe("constants", () => {
  it("models Asia/Muscat as a fixed UTC+4 offset with no DST", () => {
    expect(MUSCAT_UTC_OFFSET_MIN).toBe(240);
    expect(MINUTES_PER_DAY).toBe(1440);
  });
});

describe("parseLocalDate", () => {
  it("parses a well-formed YYYY-MM-DD date", () => {
    expect(parseLocalDate("2026-06-01")).toEqual({ year: 2026, month: 6, day: 1 });
  });

  it("rejects a malformed string", () => {
    expect(() => parseLocalDate("2026-6-1")).toThrow(TypeError);
    expect(() => parseLocalDate("not-a-date")).toThrow(TypeError);
    expect(() => parseLocalDate("2026/06/01")).toThrow(TypeError);
  });

  it("rejects an impossible calendar date", () => {
    expect(() => parseLocalDate("2026-02-30")).toThrow(RangeError);
    expect(() => parseLocalDate("2026-13-01")).toThrow(RangeError);
    expect(() => parseLocalDate("2026-00-10")).toThrow(RangeError);
  });

  it("accepts a leap-year Feb 29", () => {
    expect(parseLocalDate("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
  });
});

describe("muscatLocalToUtc", () => {
  it("subtracts the +4 offset to reach the UTC instant", () => {
    // 12:00 local (720 min) on 2026-06-01 == 08:00Z.
    const utc = muscatLocalToUtc("2026-06-01", 720);
    expect(utc.toISOString()).toBe("2026-06-01T08:00:00.000Z");
  });

  it("maps local midnight to the prior day 20:00Z", () => {
    const utc = muscatLocalToUtc("2026-06-01", 0);
    expect(utc.toISOString()).toBe("2026-05-31T20:00:00.000Z");
  });

  it("accepts the end-of-day boundary (1440)", () => {
    const utc = muscatLocalToUtc("2026-06-01", MINUTES_PER_DAY);
    expect(utc.toISOString()).toBe("2026-06-01T20:00:00.000Z");
  });

  it("rejects non-integer minutes", () => {
    expect(() => muscatLocalToUtc("2026-06-01", 12.5)).toThrow(TypeError);
  });

  it("rejects minutes out of the 0..1440 range", () => {
    expect(() => muscatLocalToUtc("2026-06-01", -1)).toThrow(RangeError);
    expect(() => muscatLocalToUtc("2026-06-01", 1441)).toThrow(RangeError);
  });
});

describe("utcToMuscatLocal", () => {
  it("adds the +4 offset to derive the wall clock", () => {
    const wall = utcToMuscatLocal(new Date("2026-06-01T08:00:00.000Z"));
    expect(wall).toEqual({ dateLocal: "2026-06-01", minutesFromMidnight: 720 });
  });

  it("rolls the local date forward when the offset crosses midnight", () => {
    // 21:00Z == 01:00 next local day.
    const wall = utcToMuscatLocal(new Date("2026-06-01T21:00:00.000Z"));
    expect(wall).toEqual({ dateLocal: "2026-06-02", minutesFromMidnight: 60 });
  });

  it("round-trips with muscatLocalToUtc", () => {
    const utc = muscatLocalToUtc("2026-12-31", 930); // 15:30 local
    expect(utcToMuscatLocal(utc)).toEqual({
      dateLocal: "2026-12-31",
      minutesFromMidnight: 930,
    });
  });
});
