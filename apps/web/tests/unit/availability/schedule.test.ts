import { describe, expect, it } from "vitest";
import { muscatWeekdayKey, windowsForWeekday } from "@/lib/availability/schedule";

describe("muscatWeekdayKey", () => {
  it("maps known dates to their weekday key", () => {
    expect(muscatWeekdayKey("2026-06-01")).toBe("mon");
    expect(muscatWeekdayKey("2026-06-05")).toBe("fri");
    expect(muscatWeekdayKey("2026-06-07")).toBe("sun");
  });

  it("throws on a malformed date", () => {
    expect(() => muscatWeekdayKey("nope")).toThrow();
  });
});

describe("windowsForWeekday", () => {
  const hours = {
    mon: [{ open: "09:00", close: "22:00" }],
    fri: [{ open: "14:00", close: "22:00" }],
    tue: [
      { open: "09:00", close: "13:00" },
      { open: "16:00", close: "22:00" },
    ],
  };

  it("returns the window for an open day as minute ranges", () => {
    expect(windowsForWeekday(hours, "mon")).toEqual([{ openMin: 540, closeMin: 1320 }]);
    expect(windowsForWeekday(hours, "fri")).toEqual([{ openMin: 840, closeMin: 1320 }]);
  });

  it("returns multiple windows for a split day", () => {
    expect(windowsForWeekday(hours, "tue")).toEqual([
      { openMin: 540, closeMin: 780 },
      { openMin: 960, closeMin: 1320 },
    ]);
  });

  it("returns [] for a day with no configured window (closed)", () => {
    expect(windowsForWeekday(hours, "wed")).toEqual([]);
  });

  it("treats null/undefined hours as fully closed", () => {
    expect(windowsForWeekday(null, "mon")).toEqual([]);
    expect(windowsForWeekday(undefined, "mon")).toEqual([]);
  });

  it("throws when a window's open is not strictly before its close", () => {
    expect(() => windowsForWeekday({ mon: [{ open: "22:00", close: "09:00" }] }, "mon")).toThrow(
      RangeError,
    );
    expect(() => windowsForWeekday({ mon: [{ open: "09:00", close: "09:00" }] }, "mon")).toThrow(
      RangeError,
    );
  });

  it("throws on a malformed hours shape", () => {
    expect(() => windowsForWeekday({ mon: [{ open: "9am", close: "22:00" }] }, "mon")).toThrow();
    expect(() => windowsForWeekday({ mon: "09:00-22:00" }, "mon")).toThrow();
  });
});
