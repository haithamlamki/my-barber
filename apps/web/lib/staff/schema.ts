import { z } from "zod";

export const EMPLOYMENT_TYPES = ["employee", "chair_rent", "commission_only"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const STAFF_LANGUAGES = ["ar", "en", "hi", "ur"] as const;
export type StaffLanguage = (typeof STAFF_LANGUAGES)[number];

export interface StaffProfileInput {
  readonly display_name: string;
  readonly bio_ar: string | null;
  readonly bio_en: string | null;
  readonly employment_type: EmploymentType;
  readonly languages: readonly StaffLanguage[];
}

export type ParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: Record<string, string> };

const blankToNull = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

const languagesField = z
  .array(z.string())
  .transform((values) =>
    STAFF_LANGUAGES.filter((lang) => values.includes(lang)),
  )
  .pipe(z.array(z.enum(STAFF_LANGUAGES)).min(1));

const staffProfileSchema = z.object({
  display_name: z.string().trim().min(1),
  bio_ar: blankToNull,
  bio_en: blankToNull,
  employment_type: z.enum(EMPLOYMENT_TYPES),
  languages: languagesField,
});

function collectErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Validates the editable profile fields shared by create and update. */
export function parseStaffProfile(raw: Record<string, unknown>): ParseResult<StaffProfileInput> {
  const result = staffProfileSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: collectErrors(result.error) };
}

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email();

/** Validates the barber's login email (create only — used to provision the auth user). */
export function parseStaffEmail(raw: unknown): ParseResult<string> {
  const result = emailSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: { email: "invalid" } };
}

export type ServiceScope =
  | { readonly all: true }
  | { readonly all: false; readonly service_ids: readonly string[] };

/** Builds a service scope from the assignment form's "all" toggle + checked ids. */
export function parseServiceScope(all: boolean, serviceIds: readonly string[]): ServiceScope {
  if (all) return { all: true };
  return { all: false, service_ids: [...new Set(serviceIds)] };
}

/** Reads a stored service_scope_json blob, defaulting to all=true when malformed. */
export function normalizeServiceScope(raw: unknown): ServiceScope {
  if (raw && typeof raw === "object" && "all" in raw) {
    const scope = raw as { all?: unknown; service_ids?: unknown };
    if (scope.all === true) return { all: true };
    if (scope.all === false && Array.isArray(scope.service_ids)) {
      return {
        all: false,
        service_ids: scope.service_ids.filter((id): id is string => typeof id === "string"),
      };
    }
  }
  return { all: true };
}
