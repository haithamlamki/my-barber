import { describe, expect, it } from "vitest";
import { computeLineTotal, computeOrderTotals } from "@/lib/pricing/totals";
import type { PriceLine } from "@/lib/pricing/types";

const zeroRated = (priceMinor: number): PriceLine => ({
  priceMinor,
  taxCode: "OMR_VAT_ZERO",
});

const standard = (priceMinor: number): PriceLine => ({
  priceMinor,
  taxCode: "OMR_VAT_STANDARD",
});

describe("computeLineTotal", () => {
  it("totals a zero-rated line with no tax", () => {
    expect(computeLineTotal(zeroRated(2500))).toEqual({
      subtotalMinor: 2500,
      taxMinor: 0,
      totalMinor: 2500,
    });
  });

  it("totals a standard-rated line with 5% tax added", () => {
    expect(computeLineTotal(standard(2500))).toEqual({
      subtotalMinor: 2500,
      taxMinor: 125,
      totalMinor: 2625,
    });
  });

  it("rejects a non-integer price", () => {
    expect(() => computeLineTotal(zeroRated(2500.5))).toThrow(TypeError);
  });

  it("rejects a negative price", () => {
    expect(() => computeLineTotal(zeroRated(-1))).toThrow(RangeError);
  });
});

describe("computeOrderTotals", () => {
  it("returns all zeros for an empty order", () => {
    expect(computeOrderTotals([])).toEqual({
      subtotalMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
    });
  });

  it("sums a zero-rated service plus a zero-rated addon", () => {
    expect(computeOrderTotals([zeroRated(3500), zeroRated(500)])).toEqual({
      subtotalMinor: 4000,
      taxMinor: 0,
      totalMinor: 4000,
    });
  });

  it("computes tax per line then sums (mixed tax codes)", () => {
    // 2500 standard -> tax 125 ; 1000 zero -> tax 0
    expect(computeOrderTotals([standard(2500), zeroRated(1000)])).toEqual({
      subtotalMinor: 3500,
      taxMinor: 125,
      totalMinor: 3625,
    });
  });

  it("sums per-line rounded tax rather than taxing the combined subtotal", () => {
    // Two lines of 10 baisa standard: each rounds 0.5 -> 1, so tax = 2.
    // Taxing the combined 20 baisa would also give 1.0 -> 1; this proves per-line rounding.
    expect(computeOrderTotals([standard(10), standard(10)])).toEqual({
      subtotalMinor: 20,
      taxMinor: 2,
      totalMinor: 22,
    });
  });
});
