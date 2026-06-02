import { z } from "zod";
import type { BookingInput } from "./types";

export type ParseResult =
  | { readonly success: true; readonly data: BookingInput }
  | { readonly success: false; readonly errors: Record<string, string> };

// Treat a blank/whitespace email the same as an omitted one.
const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email().optional(),
);

// Oman local subscriber number: 8 digits (country code handled at the messaging boundary).
const localPhone = z
  .string()
  .trim()
  .regex(/^\d{8}$/);

const bookingSchema = z.object({
  service_id: z.string().uuid(),
  staff_profile_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  customer_name: z.string().trim().min(1).max(120),
  customer_phone: localPhone,
  customer_email: optionalEmail,
  locale: z.enum(["ar", "en"]),
});

/** Validate raw guest-booking form values into a typed BookingInput, or field errors. */
export function parseBookingInput(raw: Record<string, unknown>): ParseResult {
  const result = bookingSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const data = result.data;
  return {
    success: true,
    data: {
      serviceId: data.service_id,
      staffProfileId: data.staff_profile_id,
      startsAt: data.starts_at,
      customerName: data.customer_name,
      customerPhone: data.customer_phone,
      customerEmail: data.customer_email,
      locale: data.locale,
    },
  };
}
