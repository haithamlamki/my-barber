import { describe, expect, it } from "vitest";
import { formatOMR } from "@/lib/i18n/money";

describe("formatOMR", () => {
  it("formats zero as OMR 0.000 in English", () => {
    expect(formatOMR(0, "en")).toContain("0.000");
    expect(formatOMR(0, "en")).toContain("OMR");
  });

  it("formats 1500 baisa as 1.500 OMR in English", () => {
    const out = formatOMR(1500, "en");
    expect(out).toContain("1.500");
    expect(out).toContain("OMR");
  });

  it("formats 1500 baisa in Arabic with OMR code", () => {
    const out = formatOMR(1500, "ar");
    // The exact digit shape depends on the ICU build, but the OMR code must appear.
    expect(out).toContain("OMR");
  });

  it("rejects non-integer input", () => {
    expect(() => formatOMR(1.5, "en")).toThrow(TypeError);
  });

  it("formats one baisa as 0.001", () => {
    expect(formatOMR(1, "en")).toContain("0.001");
  });

  it("formats one million baisa as 1,000.000", () => {
    const out = formatOMR(1_000_000, "en");
    expect(out).toMatch(/1[\.,]000[\.,]000/);
  });
});
