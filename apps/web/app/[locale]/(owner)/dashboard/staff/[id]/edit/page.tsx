import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signedImageUrl } from "@/lib/storage/upload";
import { STAFF_LANGUAGES, type StaffLanguage } from "@/lib/staff/schema";
import { StaffForm } from "../../StaffForm";
import { updateStaff } from "../../actions";

function toLanguages(raw: unknown): StaffLanguage[] {
  if (!Array.isArray(raw)) return [];
  return STAFF_LANGUAGES.filter((lang) => raw.includes(lang));
}

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();
  const { data: member } = await supabase
    .from("staff_profiles")
    .select("id, display_name, bio_ar, bio_en, employment_type, languages_json, image_path")
    .eq("id", id)
    .maybeSingle();

  if (!member) notFound();

  const t = await getTranslations("owner.staff.form");
  const action = updateStaff.bind(null, member.id);
  const imageUrl = await signedImageUrl(supabase, member.image_path);

  return (
    <section>
      <h1 className="text-title-lg font-display text-ink">{t("edit_title")}</h1>
      <div className="mt-lg">
        <StaffForm
          locale={locale}
          action={action}
          cancelHref={`/${locale}/dashboard/staff`}
          imageUrl={imageUrl}
          defaults={{
            display_name: member.display_name,
            email: "",
            bio_ar: member.bio_ar ?? "",
            bio_en: member.bio_en ?? "",
            employment_type: member.employment_type,
            languages: toLanguages(member.languages_json),
          }}
        />
      </div>
    </section>
  );
}
