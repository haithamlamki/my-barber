import { describe, expect, it } from "vitest";
import { computeAvailableSlots } from "@/lib/availability/slots";
import type { SlotRequest } from "@/lib/availability/types";

const base: SlotRequest = {
  windows: [{ openMin: 540, closeMin: 1020 }], // 09:00 - 17:00
  durationMin: 30,
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  stepMin: 30,
  busy: [],
};

describe("computeAvailableSlots", () => {
  it("fills an empty calendar at the step granularity", () => {
    const slots = computeAvailableSlots(base);
    expect(slots[0]).toBe(540); // 09:00
    expect(slots[slots.length - 1]).toBe(990); // 16:30, last that fits before 17:00
    expect(slots).toHaveLength(16);
  });

  it("rejects a start where the service would run past closing time", () => {
    const slots = computeAvailableSlots(base);
    expect(slots).not.toContain(1020); // 17:00 — no room for a 30-min service
    expect(slots).not.toContain(1000);
  });

  it("returns no slots when the service is longer than the window", () => {
    expect(computeAvailableSlots({ ...base, durationMin: 600 })).toEqual([]);
  });

  it("excludes a slot that overlaps an existing appointment", () => {
    const slots = computeAvailableSlots({
      ...base,
      busy: [{ startMin: 600, endMin: 630 }], // 10:00 - 10:30 booked
    });
    expect(slots).not.toContain(600);
    expect(slots).toContain(570); // 09:30 ends exactly at 10:00 — allowed
    expect(slots).toContain(630); // 10:30 starts when the booking ends — allowed
  });

  it("applies buffer-after when checking conflicts", () => {
    const slots = computeAvailableSlots({
      ...base,
      bufferAfterMin: 15,
      busy: [{ startMin: 600, endMin: 630 }],
    });
    // 09:30 + 30 + 15 buffer = ends 10:15, overlaps the 10:00 booking.
    expect(slots).not.toContain(570);
  });

  it("applies buffer-before when checking conflicts", () => {
    const slots = computeAvailableSlots({
      ...base,
      bufferBeforeMin: 15,
      busy: [{ startMin: 600, endMin: 630 }],
    });
    // 10:30 with 15 buffer-before occupies from 10:15, overlaps the 10:00-10:30 booking.
    expect(slots).not.toContain(630);
    expect(slots).toContain(660); // 11:00 occupies from 10:45 — clear of the booking
  });

  it("honours multiple working windows (a midday break)", () => {
    const slots = computeAvailableSlots({
      ...base,
      windows: [
        { openMin: 540, closeMin: 720 }, // 09:00 - 12:00
        { openMin: 780, closeMin: 1020 }, // 13:00 - 17:00
      ],
    });
    expect(slots).toContain(690); // 11:30 fits before 12:00
    expect(slots).not.toContain(720); // 12:00 closed (break)
    expect(slots).not.toContain(750); // 12:30 inside the break
    expect(slots).toContain(780); // 13:00 reopens
  });

  it("treats a blockout interval the same as a booking", () => {
    const slots = computeAvailableSlots({
      ...base,
      busy: [{ startMin: 540, endMin: 600 }], // 09:00 - 10:00 blocked
    });
    expect(slots).not.toContain(540);
    expect(slots).not.toContain(570);
    expect(slots).toContain(600);
  });

  it("returns starts sorted ascending across unordered windows", () => {
    const slots = computeAvailableSlots({
      ...base,
      windows: [
        { openMin: 780, closeMin: 1020 },
        { openMin: 540, closeMin: 720 },
      ],
    });
    const sorted = [...slots].sort((a, b) => a - b);
    expect(slots).toEqual(sorted);
  });

  it("rejects a non-positive duration", () => {
    expect(() => computeAvailableSlots({ ...base, durationMin: 0 })).toThrow(RangeError);
  });

  it("rejects a non-positive step", () => {
    expect(() => computeAvailableSlots({ ...base, stepMin: 0 })).toThrow(RangeError);
  });

  it("rejects a negative buffer", () => {
    expect(() => computeAvailableSlots({ ...base, bufferBeforeMin: -1 })).toThrow(RangeError);
  });

  it("rejects a window whose open is not before its close", () => {
    expect(() =>
      computeAvailableSlots({ ...base, windows: [{ openMin: 600, closeMin: 600 }] }),
    ).toThrow(RangeError);
  });

  it("rejects a busy interval whose start is not before its end", () => {
    expect(() =>
      computeAvailableSlots({ ...base, busy: [{ startMin: 600, endMin: 600 }] }),
    ).toThrow(RangeError);
  });
});
