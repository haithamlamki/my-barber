"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";
import type { Database } from "@/lib/db/database.types";
import {
  availableSlotsForDate,
  isWithinHorizon,
  type BusyRange,
  type DaySlot,
} from "@/lib/availability/day";
import { MINUTES_PER_DAY, muscatLocalToUtc, utcToMuscatLocal } from "@/lib/availability/tz";
import { quoteService } from "@/lib/booking/quote";
import { fulfillBooking } from "@/lib/booking/fulfill";
import { createFakePaymentAdapter } from "@/lib/payments/fake";
import { createConsoleNotificationAdapter } from "@/lib/notifications/console";
import { generateBookingCode } from "@/lib/booking/code";
import { parseBookingInput } from "@/lib/booking/schema";
import type { BookingInput } from "@/lib/booking/types";
import type { TaxCode } from "@/lib/pricing/types";

type ServerClient = SupabaseClient<Database>;

/** A bookable service joined with the working hours of its location. */
interface PricedService {
  readonly id: string;
  readonly locationId: string;
  readonly durationMin: number;
  readonly priceMinor: number;
  readonly taxCode: TaxCode;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly hoursJson: unknown;
}

export interface SlotView {
  readonly startMin: number;
  readonly startsAtIso: string;
  readonly label: string;
}

export interface SlotsResult {
  readonly ok: boolean;
  readonly slots: readonly SlotView[];
  readonly error?: string;
}

export interface BookingFormState {
  readonly ok: boolean;
  readonly errors?: Record<string, string>;
}

function resolveLocale(value: FormDataEntryValue | null): Locale {
  return typeof value === "string" && isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Load an active service together with its location's weekly hours, or null. */
async function loadPricedService(
  supabase: ServerClient,
  serviceId: string,
): Promise<PricedService | null> {
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, location_id, duration_min, price_minor, tax_code, name_ar, name_en, status, locations(hours_json)",
    )
    .eq("id", serviceId)
    .maybeSingle();

  if (error || !data || data.status !== "active") return null;

  return {
    id: data.id,
    locationId: data.location_id,
    durationMin: data.duration_min,
    priceMinor: data.price_minor,
    taxCode: data.tax_code as TaxCode,
    nameAr: data.name_ar,
    nameEn: data.name_en,
    hoursJson: data.locations?.hours_json ?? {},
  };
}

/** Fetch a staff member's PII-free busy ranges for one shop-local day. */
async function loadBusyForDate(
  supabase: ServerClient,
  staffProfileId: string,
  dateLocal: string,
): Promise<readonly BusyRange[]> {
  const from = muscatLocalToUtc(dateLocal, 0).toISOString();
  const to = muscatLocalToUtc(dateLocal, MINUTES_PER_DAY).toISOString();
  const { data, error } = await supabase.rpc("staff_busy_intervals", {
    p_staff_profile_id: staffProfileId,
    p_from: from,
    p_to: to,
  });
  if (error || !data) return [];
  return data.map((row) => ({ startsAt: row.starts_at, endsAt: row.ends_at }));
}

/** Compute the bookable slots for a service+staff+day. Shared by getSlots and createBooking. */
async function computeDaySlots(
  supabase: ServerClient,
  service: PricedService,
  staffProfileId: string,
  dateLocal: string,
  now: Date,
): Promise<DaySlot[]> {
  const busy = await loadBusyForDate(supabase, staffProfileId, dateLocal);
  return availableSlotsForDate({
    hoursJson: service.hoursJson,
    dateLocal,
    durationMin: service.durationMin,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    busy,
    now,
  });
}

/** Server action: the bookable slots for a service, staff, and shop-local date. */
export async function getSlots(
  serviceId: string,
  staffProfileId: string,
  dateLocal: string,
): Promise<SlotsResult> {
  const supabase = await createSupabaseServerClient();
  const service = await loadPricedService(supabase, serviceId);
  if (!service) return { ok: false, slots: [], error: "service_unavailable" };

  const slots = await computeDaySlots(supabase, service, staffProfileId, dateLocal, new Date());
  return {
    ok: true,
    slots: slots.map((slot) => ({
      startMin: slot.startMin,
      startsAtIso: slot.startsAtUtc.toISOString(),
      label: slot.label,
    })),
  };
}

function toRawBooking(formData: FormData): Record<string, unknown> {
  return {
    service_id: formData.get("service_id"),
    staff_profile_id: formData.get("staff_profile_id"),
    starts_at: formData.get("starts_at"),
    customer_name: formData.get("customer_name"),
    customer_phone: formData.get("customer_phone"),
    customer_email: formData.get("customer_email"),
    locale: formData.get("locale"),
  };
}

/**
 * Server action: create a guest booking. Re-derives money from the live service row
 * (never trusts the client), re-checks the slot against working hours + horizon, then
 * writes atomically via the create_appointment RPC. The EXCLUDE constraint makes the
 * write the row-level lock; a concurrent winner surfaces as `slot_taken`.
 */
export async function createBooking(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const locale = resolveLocale(formData.get("locale"));
  const parsed = parseBookingInput(toRawBooking(formData));
  if (!parsed.success) return { ok: false, errors: parsed.errors };
  const input = parsed.data;

  const supabase = await createSupabaseServerClient();
  const service = await loadPricedService(supabase, input.serviceId);
  if (!service) return { ok: false, errors: { _form: "service_unavailable" } };

  const startsAt = new Date(input.startsAt);
  const now = new Date();
  if (!isWithinHorizon(startsAt, now)) {
    return { ok: false, errors: { _form: "slot_unavailable" } };
  }

  const dateLocal = utcToMuscatLocal(startsAt).dateLocal;
  const slots = await computeDaySlots(supabase, service, input.staffProfileId, dateLocal, now);
  const startMs = startsAt.getTime();
  if (!slots.some((slot) => slot.startsAtUtc.getTime() === startMs)) {
    return { ok: false, errors: { _form: "slot_unavailable" } };
  }

  const quote = quoteService({
    kind: "service",
    refId: service.id,
    nameAr: service.nameAr,
    nameEn: service.nameEn,
    durationMin: service.durationMin,
    priceMinor: service.priceMinor,
    taxCode: service.taxCode,
  });
  const endsAt = new Date(startMs + service.durationMin * 60_000);

  const result = await writeAppointment({
    input,
    service,
    startsAt,
    endsAt,
    subtotalMinor: quote.totals.subtotalMinor,
    taxMinor: quote.totals.taxMinor,
    totalMinor: quote.totals.totalMinor,
  });
  if (!result.ok) return { ok: false, errors: { _form: result.error } };

  // Post-confirmation side effects: fake payment + console notification. Both
  // adapters report (never throw), so this can't undo the confirmed appointment.
  const fulfillment = await fulfillBooking(
    {
      payment: createFakePaymentAdapter(),
      notification: createConsoleNotificationAdapter(),
    },
    {
      bookingCode: result.code,
      amountMinor: quote.totals.totalMinor,
      confirmation: {
        bookingCode: result.code,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        serviceNameAr: service.nameAr,
        serviceNameEn: service.nameEn,
        startsAtIso: startsAt.toISOString(),
        totalMinor: quote.totals.totalMinor,
        locale: input.locale,
      },
    },
  );

  // Side effects are best-effort, but a failure is still actionable: surface it on
  // the server rather than swallowing it. The appointment itself is already confirmed.
  if (!fulfillment.payment.ok || !fulfillment.notification.ok) {
    // eslint-disable-next-line no-console -- server-side diagnostics until a logger lands
    console.warn(
      `[fulfill] booking ${result.code}: payment=${fulfillment.payment.ok ? "ok" : fulfillment.payment.error} notification=${fulfillment.notification.ok ? "ok" : fulfillment.notification.error}`,
    );
  }

  redirect(`/${locale}/book/confirmation/${result.code}`);
}

interface WriteParams {
  readonly input: BookingInput;
  readonly service: PricedService;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly subtotalMinor: number;
  readonly taxMinor: number;
  readonly totalMinor: number;
}

type WriteResult =
  | { readonly ok: true; readonly code: string }
  | { readonly ok: false; readonly error: string };

/** Call create_appointment as service_role, retrying once on the rare code collision. */
async function writeAppointment(params: WriteParams): Promise<WriteResult> {
  const admin = createSupabaseAdminClient();
  const { input, service, startsAt, endsAt } = params;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const code = generateBookingCode();
    const { data, error } = await admin.rpc("create_appointment", {
      p_service_id: service.id,
      p_staff_profile_id: input.staffProfileId,
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
      p_customer_name: input.customerName,
      p_customer_phone: input.customerPhone,
      p_customer_email: input.customerEmail ?? "",
      p_locale: input.locale,
      p_booking_code: code,
      p_price_minor: params.subtotalMinor,
      p_tax_minor: params.taxMinor,
      p_total_minor: params.totalMinor,
      p_item_name_ar: service.nameAr,
      p_item_name_en: service.nameEn,
      p_item_duration_min: service.durationMin,
    });

    if (!error && data && data.length > 0) {
      return { ok: true, code: data[0]!.booking_code };
    }
    if (error?.message.includes("slot_taken")) return { ok: false, error: "slot_taken" };
    if (error?.message.includes("booking_code_collision")) continue; // retry with a fresh code
    // TODO(v0.2): under a true booking race the EXCLUDE loser is sometimes aborted by
    // Postgres as a deadlock (40P01) instead of raising our mapped `slot_taken`, so it
    // falls through here to the generic `save_failed`. Detect the deadlock (and ideally
    // retry once) to surface the friendlier `slot_taken` message. See CLAUDE.md "Known issues".
    return { ok: false, error: "save_failed" };
  }
  return { ok: false, error: "save_failed" };
}
