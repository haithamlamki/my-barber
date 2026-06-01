import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { formatOMR } from "@/lib/i18n/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listBookableDates } from "@/lib/availability/day";
import { BookingWidget } from "@/components/booking/BookingWidget";

export default async function BookDateTimePage({
  params,
}: {
  params: Promise<{ locale: string; serviceId: string; staffId: string }>;
}) {
  const { locale, serviceId, staffId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();
  const [{ data: service }, { data: staff }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name_ar, name_en, duration_min, price_minor, status")
      .eq("id", serviceId)
      .maybeSingle(),
    supabase
      .from("staff_profiles")
      .select("id, display_name, status")
      .eq("id", staffId)
      .maybeSingle(),
  ]);

  if (!service || service.status !== "active") notFound();
  if (!staff || staff.status !== "active") notFound();

  const t = await getTranslations("booking");
  const serviceName = locale === "ar" ? service.name_ar : service.name_en;
  const bookableDates = listBookableDates(new Date());

  return (
    <section>
      <Link
        href={`/${locale}/book/${serviceId}`}
        className="text-caption text-muted hover:text-ink"
      >
        {t("step_barber")}
      </Link>
      <h1 className="mt-xs text-title-lg font-display text-ink">{t("step_time")}</h1>

      <div className="mt-sm flex flex-col gap-xxs rounded-lg border border-hairline bg-surface-card px-lg py-md">
        <span className="text-body-md text-ink">{serviceName}</span>
        <span className="text-caption text-muted">
          {staff.display_name} · {t("minutes", { n: service.duration_min })} ·{" "}
          {formatOMR(service.price_minor, locale)}
        </span>
      </div>

      <div className="mt-lg">
        <BookingWidget
          locale={locale}
          serviceId={service.id}
          staffProfileId={staff.id}
          bookableDates={bookableDates}
        />
      </div>
    </section>
  );
}
