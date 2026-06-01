import { describe, expect, it } from "vitest";
import {
  parseStaffProfile,
  parseStaffEmail,
  parseServiceScope,
  normalizeServiceScope,
} from "@/lib/staff/schema";

describe("parseStaffProfile", () => {
  const valid = {
    display_name: "Khalid",
    bio_ar: "حلاق",
    bio_en: "Barber",
    employment_type: "employee",
    languages: ["ar", "en"],
  };

  it("accepts a complete valid profile", () => {
    const result = parseStaffProfile(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.display_name).toBe("Khalid");
      expect(result.data.bio_ar).toBe("حلاق");
      expect(result.data.employment_type).toBe("employee");
      expect(result.data.languages).toEqual(["ar", "en"]);
    }
  });

  it("trims the display name", () => {
    const result = parseStaffProfile({ ...valid, display_name: "  Yousuf  " });
    expect(result.success && result.data.display_name).toBe("Yousuf");
  });

  it("rejects an empty display name", () => {
    const result = parseStaffProfile({ ...valid, display_name: "  " });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.display_name).toBeDefined();
  });

  it("coerces blank bios to null", () => {
    const result = parseStaffProfile({ ...valid, bio_ar: "", bio_en: "   " });
    expect(result.success && result.data.bio_ar).toBeNull();
    expect(result.success && result.data.bio_en).toBeNull();
  });

  it("rejects an unknown employment type", () => {
    const result = parseStaffProfile({ ...valid, employment_type: "freelance" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.employment_type).toBeDefined();
  });

  it("drops unknown languages and dedups", () => {
    const result = parseStaffProfile({ ...valid, languages: ["ar", "ar", "fr", "en"] });
    expect(result.success && result.data.languages).toEqual(["ar", "en"]);
  });

  it("requires at least one language", () => {
    const result = parseStaffProfile({ ...valid, languages: ["fr"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.languages).toBeDefined();
  });
});

describe("parseStaffEmail", () => {
  it("accepts and lowercases a valid email", () => {
    const result = parseStaffEmail("Barber@Demo.Local");
    expect(result.success && result.data).toBe("barber@demo.local");
  });

  it("rejects a malformed email", () => {
    const result = parseStaffEmail("not-an-email");
    expect(result.success).toBe(false);
  });
});

describe("parseServiceScope", () => {
  it("returns all=true when the all flag is set", () => {
    expect(parseServiceScope(true, ["a", "b"])).toEqual({ all: true });
  });

  it("returns the selected ids when all flag is off", () => {
    expect(parseServiceScope(false, ["a", "b", "a"])).toEqual({
      all: false,
      service_ids: ["a", "b"],
    });
  });
});

describe("normalizeServiceScope", () => {
  it("reads an explicit all=true scope", () => {
    expect(normalizeServiceScope({ all: true })).toEqual({ all: true });
  });

  it("reads an explicit id list", () => {
    expect(normalizeServiceScope({ all: false, service_ids: ["x", "y"] })).toEqual({
      all: false,
      service_ids: ["x", "y"],
    });
  });

  it("defaults to all=true for malformed scope", () => {
    expect(normalizeServiceScope(null)).toEqual({ all: true });
    expect(normalizeServiceScope({ foo: 1 })).toEqual({ all: true });
  });
});
