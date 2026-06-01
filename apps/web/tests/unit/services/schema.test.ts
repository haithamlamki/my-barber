import { describe, expect, it } from "vitest";
import { parseServiceInput } from "@/lib/services/schema";

const valid = {
  name_ar: "قص شعر",
  name_en: "Haircut",
  duration_min: "30",
  buffer_before_min: "0",
  buffer_after_min: "5",
  price_minor: "2500",
  tax_code: "OMR_VAT_STANDARD",
};

describe("parseServiceInput", () => {
  it("accepts a well-formed service and coerces numerics to integers", () => {
    const result = parseServiceInput(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name_ar: "قص شعر",
        name_en: "Haircut",
        duration_min: 30,
        buffer_before_min: 0,
        buffer_after_min: 5,
        price_minor: 2500,
        tax_code: "OMR_VAT_STANDARD",
      });
    }
  });

  it("trims surrounding whitespace from names", () => {
    const result = parseServiceInput({ ...valid, name_en: "  Haircut  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name_en).toBe("Haircut");
  });

  it("rejects an empty Arabic name", () => {
    const result = parseServiceInput({ ...valid, name_ar: "   " });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.name_ar).toBeDefined();
  });

  it("rejects a zero or negative duration", () => {
    expect(parseServiceInput({ ...valid, duration_min: "0" }).success).toBe(false);
    expect(parseServiceInput({ ...valid, duration_min: "-5" }).success).toBe(false);
  });

  it("rejects a duration above the 480-minute ceiling", () => {
    expect(parseServiceInput({ ...valid, duration_min: "481" }).success).toBe(false);
  });

  it("rejects a non-integer price (money is integer minor units)", () => {
    const result = parseServiceInput({ ...valid, price_minor: "25.5" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.price_minor).toBeDefined();
  });

  it("rejects a negative price", () => {
    expect(parseServiceInput({ ...valid, price_minor: "-1" }).success).toBe(false);
  });

  it("rejects a negative buffer", () => {
    expect(parseServiceInput({ ...valid, buffer_after_min: "-1" }).success).toBe(false);
  });

  it("rejects an unknown tax code", () => {
    expect(parseServiceInput({ ...valid, tax_code: "VAT_42" }).success).toBe(false);
  });
});
