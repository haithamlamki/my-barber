"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOwnerContext } from "@/lib/auth/owner";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { parseServiceScope, parseStaffEmail, parseStaffProfile } from "@/lib/staff/schema";
import { uploadBusinessImage } from "@/lib/storage/upload";

export interface StaffFormState {
  readonly ok: boolean;
  readonly errors?: Record<string, string>;
}

function resolveLocale(value: FormDataEntryValue | null): Locale {
  return typeof value === "string" && isLocale(value) ? value : DEFAULT_LOCALE;
}

function toProfileRaw(formData: FormData): Record<string, unknown> {
  return {
    display_name: formData.get("display_name"),
    bio_ar: formData.get("bio_ar"),
    bio_en: formData.get("bio_en"),
    employment_type: formData.get("employment_type"),
    languages: formData.getAll("languages").map(String),
  };
}

async function firstLocationId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  businessId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("locations")
    .select("id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Provisions a new barber: an auth user (so they can later OTP-login), a profile
 * mirror in public.users, the staff_profiles row, and a default location
 * assignment. RLS-enforced writes use the owner's session; only the auth/user
 * provisioning uses the service-role client.
 */
export async function createStaff(
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const locale = resolveLocale(formData.get("locale"));
  const profile = parseStaffProfile(toProfileRaw(formData));
  const email = parseStaffEmail(formData.get("email"));
  if (!profile.success || !email.success) {
    return {
      ok: false,
      errors: { ...(profile.success ? {} : profile.errors), ...(email.success ? {} : email.errors) },
    };
  }

  const owner = await getOwnerContext();
  if (!owner) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();
  const locationId = await firstLocationId(supabase, owner.businessId);
  if (!locationId) return { ok: false, errors: { _form: "save_failed" } };

  const upload = await uploadBusinessImage(supabase, owner.businessId, "staff", formData.get("image"));
  if (!upload.ok) return { ok: false, errors: { image: upload.error } };

  const admin = createSupabaseAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: email.data,
    email_confirm: true,
    user_metadata: { display_name: profile.data.display_name },
  });
  if (authError || !created.user) {
    const taken = authError?.message?.toLowerCase().includes("already");
    return { ok: false, errors: taken ? { email: "taken" } : { _form: "save_failed" } };
  }

  const userId = created.user.id;
  const { error: profileMirrorError } = await admin.from("users").insert({
    id: userId,
    type: "staff",
    display_name: profile.data.display_name,
    email: email.data,
    preferred_locale: "ar",
  });
  if (profileMirrorError) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, errors: { _form: "save_failed" } };
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_profiles")
    .insert({
      user_id: userId,
      business_id: owner.businessId,
      display_name: profile.data.display_name,
      bio_ar: profile.data.bio_ar,
      bio_en: profile.data.bio_en,
      languages_json: [...profile.data.languages],
      employment_type: profile.data.employment_type,
      image_path: upload.path,
    })
    .select("id")
    .single();
  if (staffError || !staff) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, errors: { _form: "save_failed" } };
  }

  await supabase.from("staff_assignments").insert({
    staff_profile_id: staff.id,
    location_id: locationId,
    service_scope_json: { all: true },
  });

  revalidatePath(`/${locale}/dashboard/staff`);
  redirect(`/${locale}/dashboard/staff`);
}

/** Updates an existing barber's profile. RLS scopes the row to the owner's business. */
export async function updateStaff(
  id: string,
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const locale = resolveLocale(formData.get("locale"));
  const profile = parseStaffProfile(toProfileRaw(formData));
  if (!profile.success) return { ok: false, errors: profile.errors };

  const owner = await getOwnerContext();
  if (!owner) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();

  const upload = await uploadBusinessImage(supabase, owner.businessId, "staff", formData.get("image"));
  if (!upload.ok) return { ok: false, errors: { image: upload.error } };

  const { error } = await supabase
    .from("staff_profiles")
    .update({
      display_name: profile.data.display_name,
      bio_ar: profile.data.bio_ar,
      bio_en: profile.data.bio_en,
      languages_json: [...profile.data.languages],
      employment_type: profile.data.employment_type,
      ...(upload.path ? { image_path: upload.path } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, errors: { _form: "save_failed" } };

  revalidatePath(`/${locale}/dashboard/staff`);
  redirect(`/${locale}/dashboard/staff`);
}

/** Archives or restores a barber via its status column. */
export async function setStaffStatus(formData: FormData): Promise<void> {
  const locale = resolveLocale(formData.get("locale"));
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || (status !== "active" && status !== "archived")) return;

  const owner = await getOwnerContext();
  if (!owner) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();
  await supabase.from("staff_profiles").update({ status }).eq("id", id);

  revalidatePath(`/${locale}/dashboard/staff`);
}

/** Sets which services a barber can perform at the business location. */
export async function updateStaffServices(
  staffProfileId: string,
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const locale = resolveLocale(formData.get("locale"));
  const all = formData.get("all_services") === "on";
  const serviceIds = formData.getAll("service_ids").map(String);
  const scope = parseServiceScope(all, serviceIds);
  const scopeJson = scope.all
    ? { all: true }
    : { all: false, service_ids: [...scope.service_ids] };

  const owner = await getOwnerContext();
  if (!owner) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();
  const locationId = await firstLocationId(supabase, owner.businessId);
  if (!locationId) return { ok: false, errors: { _form: "save_failed" } };

  const { error } = await supabase.from("staff_assignments").upsert(
    {
      staff_profile_id: staffProfileId,
      location_id: locationId,
      service_scope_json: scopeJson,
    },
    { onConflict: "staff_profile_id,location_id" },
  );
  if (error) return { ok: false, errors: { _form: "save_failed" } };

  revalidatePath(`/${locale}/dashboard/staff`);
  redirect(`/${locale}/dashboard/staff`);
}
