"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerContext } from "@/lib/auth/owner";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { parseServiceInput } from "@/lib/services/schema";
import { uploadBusinessImage } from "@/lib/storage/upload";

export interface ServiceFormState {
  readonly ok: boolean;
  readonly errors?: Record<string, string>;
}

function resolveLocale(value: FormDataEntryValue | null): Locale {
  return typeof value === "string" && isLocale(value) ? value : DEFAULT_LOCALE;
}

function toRaw(formData: FormData): Record<string, unknown> {
  return {
    name_ar: formData.get("name_ar"),
    name_en: formData.get("name_en"),
    duration_min: formData.get("duration_min"),
    buffer_before_min: formData.get("buffer_before_min"),
    buffer_after_min: formData.get("buffer_after_min"),
    price_minor: formData.get("price_minor"),
    tax_code: formData.get("tax_code"),
  };
}

/** Creates a service in the owner's business. RLS rejects any cross-tenant write. */
export async function createService(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const locale = resolveLocale(formData.get("locale"));
  const parsed = parseServiceInput(toRaw(formData));
  if (!parsed.success) return { ok: false, errors: parsed.errors };

  const owner = await getOwnerContext();
  if (!owner) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();

  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id")
    .eq("business_id", owner.businessId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (locationError || !location) return { ok: false, errors: { _form: "save_failed" } };

  const upload = await uploadBusinessImage(supabase, owner.businessId, "services", formData.get("image"));
  if (!upload.ok) return { ok: false, errors: { image: upload.error } };

  const { error } = await supabase.from("services").insert({
    business_id: owner.businessId,
    location_id: location.id,
    image_path: upload.path,
    ...parsed.data,
  });

  if (error) return { ok: false, errors: { _form: "save_failed" } };

  revalidatePath(`/${locale}/dashboard/services`);
  redirect(`/${locale}/dashboard/services`);
}

/** Updates an existing service. RLS scopes the row to the owner's business. */
export async function updateService(
  id: string,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const locale = resolveLocale(formData.get("locale"));
  const parsed = parseServiceInput(toRaw(formData));
  if (!parsed.success) return { ok: false, errors: parsed.errors };

  const owner = await getOwnerContext();
  if (!owner) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();

  const upload = await uploadBusinessImage(supabase, owner.businessId, "services", formData.get("image"));
  if (!upload.ok) return { ok: false, errors: { image: upload.error } };

  const payload = upload.path ? { ...parsed.data, image_path: upload.path } : parsed.data;
  const { error } = await supabase.from("services").update(payload).eq("id", id);

  if (error) return { ok: false, errors: { _form: "save_failed" } };

  revalidatePath(`/${locale}/dashboard/services`);
  redirect(`/${locale}/dashboard/services`);
}

/** Archives or restores a service via its status column. */
export async function setServiceStatus(formData: FormData): Promise<void> {
  const locale = resolveLocale(formData.get("locale"));
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || (status !== "active" && status !== "archived")) return;

  const owner = await getOwnerContext();
  if (!owner) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();
  await supabase.from("services").update({ status }).eq("id", id);

  revalidatePath(`/${locale}/dashboard/services`);
}
