import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { formatOMR } from "@/lib/i18n/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ServiceCard } from "@/components/booking/ServiceCard";

export default async function BookServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name_ar, name_en, duration_min, price_minor, status")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const t = await getTranslations("booking");
  const rows = services ?? [];

  return (
    <section>
      <h1 className="text-title-lg font-display text-ink">{t("title")}</h1>
      <p className="mt-xxs text-body-sm text-muted">{t("choose_service")}</p>

      {rows.length === 0 ? (
        <p className="mt-xl rounded-lg border border-hairline bg-surface-soft px-lg py-xl text-body-sm text-muted">
          {t("no_services")}
        </p>
      ) : (
        <div className="mt-lg flex flex-col gap-sm">
          {rows.map((service) => (
            <ServiceCard
              key={service.id}
              href={`/${locale}/book/${service.id}`}
              name={locale === "ar" ? service.name_ar : service.name_en}
              durationLabel={t("minutes", { n: service.duration_min })}
              priceLabel={formatOMR(service.price_minor, locale)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
