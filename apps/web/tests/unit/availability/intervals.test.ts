import { describe, expect, it } from "vitest";
import { overlaps } from "@/lib/availability/intervals";

describe("overlaps", () => {
  it("is false for adjacent (touching) intervals", () => {
    expect(overlaps({ startMin: 0, endMin: 10 }, { startMin: 10, endMin: 20 })).toBe(false);
  });

  it("is true when the second starts inside the first", () => {
    expect(overlaps({ startMin: 0, endMin: 10 }, { startMin: 5, endMin: 15 })).toBe(true);
  });

  it("is symmetric", () => {
    expect(overlaps({ startMin: 5, endMin: 15 }, { startMin: 0, endMin: 10 })).toBe(true);
  });

  it("is false for fully disjoint intervals", () => {
    expect(overlaps({ startMin: 0, endMin: 10 }, { startMin: 20, endMin: 30 })).toBe(false);
  });

  it("is false when the first is entirely after the second", () => {
    expect(overlaps({ startMin: 20, endMin: 30 }, { startMin: 0, endMin: 10 })).toBe(false);
  });

  it("is true when one fully contains the other", () => {
    expect(overlaps({ startMin: 0, endMin: 100 }, { startMin: 40, endMin: 50 })).toBe(true);
  });
});
