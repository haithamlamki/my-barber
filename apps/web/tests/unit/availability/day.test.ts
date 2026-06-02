import { describe, expect, it } from "vitest";
import {
  DEFAULT_HORIZON_DAYS,
  DEFAULT_STEP_MIN,
  availableSlotsForDate,
  isWithinHorizon,
  listBookableDates,
  type DaySlotRequest,
} from "@/lib/availability/day";

const MONDAY = "2026-06-01"; // Asia/Muscat local date

const baseRequest: DaySlotRequest = {
  hoursJson: { mon: [{ open: "09:00", close: "22:00" }] },
  dateLocal: MONDAY,
  durationMin: 30,
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  busy: [],
  now: new Date("2026-06-01T00:00:00.000Z"), // before any slot today
  stepMin: 30,
};

describe("defaults", () => {
  it("exposes the agreed step and horizon", () => {
    expect(DEFAULT_STEP_MIN).toBe(15);
    expect(DEFAULT_HORIZON_DAYS).toBe(14);
  });
});

describe("availableSlotsForDate", () => {
  it("returns slots spanning the working window mapped to UTC instants", () => {
    const slots = availableSlotsForDate(baseRequest);
    expect(slots[0]).toEqual({
      startMin: 540,
      startsAtUtc: new Date("2026-06-01T05:00:00.000Z"), // 09:00 local
      label: "09:00",
    });
    // Last 30-min slot that fits before 22:00 is 21:30 (1290).
    expect(slots[slots.length - 1]!.startMin).toBe(1290);
    expect(slots[slots.length - 1]!.label).toBe("21:30");
    expect(slots).toHaveLength(26);
  });

  it("returns [] when the shop is closed that weekday", () => {
    // 2026-06-03 is a Wednesday; only mon is configured.
    expect(availableSlotsForDate({ ...baseRequest, dateLocal: "2026-06-03" })).toEqual([]);
  });

  it("drops slots whose start is already in the past", () => {
    const slots = availableSlotsForDate({
      ...baseRequest,
      now: new Date("2026-06-01T06:00:00.000Z"), // 10:00 local
    });
    expect(slots[0]!.startMin).toBe(600); // 10:00 kept (start == now)
    expect(slots.some((s) => s.startMin < 600)).toBe(false);
  });

  it("clips an absolute busy range to the day and removes overlapping slots", () => {
    const slots = availableSlotsForDate({
      ...baseRequest,
      busy: [
        {
          startsAt: "2026-06-01T06:00:00.000Z", // 10:00 local
          endsAt: "2026-06-01T07:00:00.000Z", // 11:00 local
        },
      ],
    });
    const starts = slots.map((s) => s.startMin);
    expect(starts).toContain(570); // 09:30 ends 10:00, no overlap
    expect(starts).not.toContain(600); // 10:00 overlaps busy
    expect(starts).not.toContain(630); // 10:30 overlaps busy
    expect(starts).toContain(660); // 11:00 free again
  });

  it("ignores busy ranges that fall entirely outside the day", () => {
    const slots = availableSlotsForDate({
      ...baseRequest,
      busy: [{ startsAt: "2026-06-05T06:00:00.000Z", endsAt: "2026-06-05T07:00:00.000Z" }],
    });
    expect(slots).toHaveLength(26);
  });

  it("accepts Date instances for busy bounds", () => {
    const slots = availableSlotsForDate({
      ...baseRequest,
      busy: [
        {
          startsAt: new Date("2026-06-01T06:00:00.000Z"),
          endsAt: new Date("2026-06-01T07:00:00.000Z"),
        },
      ],
    });
    expect(slots.map((s) => s.startMin)).not.toContain(600);
  });

  it("defaults to a 15-minute step when none is given", () => {
    const { stepMin: _omit, ...rest } = baseRequest;
    const slots = availableSlotsForDate(rest);
    expect(slots[1]!.startMin - slots[0]!.startMin).toBe(15);
  });
});

describe("listBookableDates", () => {
  it("lists today through the horizon inclusive in shop-local dates", () => {
    const now = new Date("2026-06-01T08:00:00.000Z"); // 12:00 local 2026-06-01
    expect(listBookableDates(now, 2)).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
  });

  it("uses the local calendar day, not the UTC day", () => {
    const now = new Date("2026-06-01T21:00:00.000Z"); // 01:00 local 2026-06-02
    expect(listBookableDates(now, 0)).toEqual(["2026-06-02"]);
  });

  it("defaults the horizon to 14 days (15 dates inclusive)", () => {
    expect(listBookableDates(new Date("2026-06-01T08:00:00.000Z"))).toHaveLength(15);
  });

  it("rejects a negative or non-integer horizon", () => {
    expect(() => listBookableDates(new Date(), -1)).toThrow(RangeError);
    expect(() => listBookableDates(new Date(), 1.5)).toThrow(RangeError);
  });
});

describe("isWithinHorizon", () => {
  const now = new Date("2026-06-01T08:00:00.000Z"); // 12:00 local 2026-06-01

  it("is false for an instant already in the past", () => {
    expect(isWithinHorizon(new Date("2026-06-01T07:00:00.000Z"), now)).toBe(false);
  });

  it("is true for a future instant inside the horizon", () => {
    expect(isWithinHorizon(new Date("2026-06-02T06:00:00.000Z"), now)).toBe(true);
  });

  it("is false for an instant beyond the horizon", () => {
    expect(isWithinHorizon(new Date("2026-06-30T06:00:00.000Z"), now, 14)).toBe(false);
  });
});
