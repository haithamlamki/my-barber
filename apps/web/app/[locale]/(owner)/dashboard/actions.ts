"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

/** Ends the owner session and returns to the localized login page. */
export async function signOut(formData: FormData): Promise<void> {
  const rawLocale = formData.get("locale");
  const locale = typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect(`/${locale}/login`);
}
