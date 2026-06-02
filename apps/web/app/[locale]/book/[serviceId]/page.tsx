import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BarberCard } from "@/components/booking/BarberCard";

export default async function BookBarberPage({
  params,
}: {
  params: Promise<{ locale: string; serviceId: string }>;
}) {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, location_id, status")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service || service.status !== "active") notFound();

  const { data: assignments } = await supabase
    .from("staff_assignments")
    .select("staff_profile_id, staff_profiles(id, display_name, bio_ar, bio_en, status)")
    .eq("location_id", service.location_id)
    .eq("visibility_status", "public");

  const t = await getTranslations("booking");
  const barbers = (assignments ?? [])
    .map((row) => row.staff_profiles)
    .filter((p): p is NonNullable<typeof p> => Boolean(p) && p.status === "active");

  return (
    <section>
      <Link href={`/${locale}/book`} className="text-caption text-muted hover:text-ink">
        {t("step_service")}
      </Link>
      <h1 className="mt-xs text-title-lg font-display text-ink">{t("choose_barber")}</h1>

      {barbers.length === 0 ? (
        <p className="mt-xl rounded-lg border border-hairline bg-surface-soft px-lg py-xl text-body-sm text-muted">
          {t("no_barbers")}
        </p>
      ) : (
        <div className="mt-lg flex flex-col gap-sm">
          {barbers.map((barber) => (
            <BarberCard
              key={barber.id}
              href={`/${locale}/book/${serviceId}/${barber.id}`}
              name={barber.display_name}
              bio={locale === "ar" ? barber.bio_ar : barber.bio_en}
            />
          ))}
        </div>
      )}
    </section>
  );
}
