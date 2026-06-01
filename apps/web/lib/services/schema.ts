import { z } from "zod";
import type { TaxCode } from "@/lib/pricing/types";

export const TAX_CODES = [
  "OMR_VAT_STANDARD",
  "OMR_VAT_ZERO",
  "OMR_VAT_EXEMPT",
] as const satisfies readonly TaxCode[];

export interface ServiceInput {
  readonly name_ar: string;
  readonly name_en: string;
  readonly duration_min: number;
  readonly buffer_before_min: number;
  readonly buffer_after_min: number;
  readonly price_minor: number;
  readonly tax_code: TaxCode;
}

export type ParseResult =
  | { readonly success: true; readonly data: ServiceInput }
  | { readonly success: false; readonly errors: Record<string, string> };

const nonEmpty = z.string().trim().min(1);
// Integer strings only — reject decimals so money/durations never arrive as floats.
const intString = z
  .string()
  .trim()
  .regex(/^-?\d+$/)
  .transform((value) => Number.parseInt(value, 10));

const serviceSchema = z.object({
  name_ar: nonEmpty,
  name_en: nonEmpty,
  duration_min: intString.pipe(z.number().int().min(1).max(480)),
  buffer_before_min: intString.pipe(z.number().int().min(0)),
  buffer_after_min: intString.pipe(z.number().int().min(0)),
  price_minor: intString.pipe(z.number().int().min(0)),
  tax_code: z.enum(TAX_CODES),
});

/** Validates raw form values into a typed ServiceInput, or returns field errors. */
export function parseServiceInput(raw: Record<string, unknown>): ParseResult {
  const result = serviceSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}
