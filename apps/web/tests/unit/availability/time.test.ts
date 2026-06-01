import { describe, expect, it } from "vitest";
import { hmToMinutes, minutesToHm } from "@/lib/availability/time";

describe("hmToMinutes", () => {
  it("parses midnight", () => {
    expect(hmToMinutes("00:00")).toBe(0);
  });

  it("parses 09:00 as 540", () => {
    expect(hmToMinutes("09:00")).toBe(540);
  });

  it("parses 14:30 as 870", () => {
    expect(hmToMinutes("14:30")).toBe(870);
  });

  it("parses the last minute of the day", () => {
    expect(hmToMinutes("23:59")).toBe(1439);
  });

  it("rejects a malformed string", () => {
    expect(() => hmToMinutes("9am")).toThrow(TypeError);
  });

  it("rejects an out-of-range hour", () => {
    expect(() => hmToMinutes("24:00")).toThrow(RangeError);
  });

  it("rejects an out-of-range minute", () => {
    expect(() => hmToMinutes("10:60")).toThrow(RangeError);
  });
});

describe("minutesToHm", () => {
  it("formats midnight", () => {
    expect(minutesToHm(0)).toBe("00:00");
  });

  it("formats 540 as 09:00", () => {
    expect(minutesToHm(540)).toBe("09:00");
  });

  it("formats 870 as 14:30", () => {
    expect(minutesToHm(870)).toBe("14:30");
  });

  it("rejects a non-integer", () => {
    expect(() => minutesToHm(10.5)).toThrow(TypeError);
  });

  it("rejects a negative value", () => {
    expect(() => minutesToHm(-1)).toThrow(RangeError);
  });

  it("rejects a value past the end of the day", () => {
    expect(() => minutesToHm(1440)).toThrow(RangeError);
  });
});
