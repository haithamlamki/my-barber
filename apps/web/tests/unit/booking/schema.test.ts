import { describe, expect, it } from "vitest";
import { parseBookingInput } from "@/lib/booking/schema";

const VALID = {
  service_id: "11111111-1111-4111-8111-111111111111",
  staff_profile_id: "22222222-2222-4222-8222-222222222222",
  starts_at: "2026-06-02T06:00:00.000Z",
  customer_name: "  Khalid  ",
  customer_phone: "92345678",
  customer_email: "khalid@example.com",
  locale: "ar",
};

describe("parseBookingInput", () => {
  it("accepts a valid guest booking and trims the name", () => {
    const result = parseBookingInput(VALID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerName).toBe("Khalid");
      expect(result.data.serviceId).toBe(VALID.service_id);
      expect(result.data.staffProfileId).toBe(VALID.staff_profile_id);
      expect(result.data.startsAt).toBe(VALID.starts_at);
      expect(result.data.customerEmail).toBe("khalid@example.com");
      expect(result.data.locale).toBe("ar");
    }
  });

  it("treats a blank email as omitted", () => {
    const result = parseBookingInput({ ...VALID, customer_email: "   " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.customerEmail).toBeUndefined();
  });

  it("allows a missing email entirely", () => {
    const { customer_email: _drop, ...rest } = VALID;
    const result = parseBookingInput(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.customerEmail).toBeUndefined();
  });

  it("rejects a non-uuid service id", () => {
    const result = parseBookingInput({ ...VALID, service_id: "nope" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.service_id).toBeDefined();
  });

  it("rejects an empty customer name", () => {
    const result = parseBookingInput({ ...VALID, customer_name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.customer_name).toBeDefined();
  });

  it("rejects a non-ISO starts_at", () => {
    const result = parseBookingInput({ ...VALID, starts_at: "2026-06-02 06:00" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.starts_at).toBeDefined();
  });

  it("rejects an out-of-range locale", () => {
    const result = parseBookingInput({ ...VALID, locale: "fr" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.locale).toBeDefined();
  });

  it("rejects a malformed email when one is provided", () => {
    const result = parseBookingInput({ ...VALID, customer_email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.customer_email).toBeDefined();
  });

  it("rejects a phone that is not 8 local digits", () => {
    const result = parseBookingInput({ ...VALID, customer_phone: "123" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.customer_phone).toBeDefined();
  });

  it("reports only the first error per field", () => {
    const result = parseBookingInput({ ...VALID, customer_phone: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.errors.customer_phone).toBe("string");
    }
  });
});
