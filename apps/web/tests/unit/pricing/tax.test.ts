import { describe, expect, it } from "vitest";
import { taxRateBps, computeTaxMinor } from "@/lib/pricing/tax";

describe("taxRateBps", () => {
  it("returns 500 bps (5%) for the Oman standard rate", () => {
    expect(taxRateBps("OMR_VAT_STANDARD")).toBe(500);
  });

  it("returns 0 bps for zero-rated supplies", () => {
    expect(taxRateBps("OMR_VAT_ZERO")).toBe(0);
  });

  it("returns 0 bps for exempt supplies", () => {
    expect(taxRateBps("OMR_VAT_EXEMPT")).toBe(0);
  });
});

describe("computeTaxMinor", () => {
  it("computes 5% of 2.500 OMR as 125 baisa", () => {
    expect(computeTaxMinor(2500, "OMR_VAT_STANDARD")).toBe(125);
  });

  it("returns 0 tax for zero-rated supplies", () => {
    expect(computeTaxMinor(2500, "OMR_VAT_ZERO")).toBe(0);
  });

  it("returns 0 tax for exempt supplies", () => {
    expect(computeTaxMinor(2500, "OMR_VAT_EXEMPT")).toBe(0);
  });

  it("returns 0 tax on a zero subtotal", () => {
    expect(computeTaxMinor(0, "OMR_VAT_STANDARD")).toBe(0);
  });

  it("rounds half up: 5% of 10 baisa (0.5) becomes 1", () => {
    expect(computeTaxMinor(10, "OMR_VAT_STANDARD")).toBe(1);
  });

  it("rounds down below the half: 5% of 9 baisa (0.45) becomes 0", () => {
    expect(computeTaxMinor(9, "OMR_VAT_STANDARD")).toBe(0);
  });

  it("rejects a non-integer subtotal", () => {
    expect(() => computeTaxMinor(2500.5, "OMR_VAT_STANDARD")).toThrow(TypeError);
  });

  it("rejects a negative subtotal", () => {
    expect(() => computeTaxMinor(-1, "OMR_VAT_STANDARD")).toThrow(RangeError);
  });
});
