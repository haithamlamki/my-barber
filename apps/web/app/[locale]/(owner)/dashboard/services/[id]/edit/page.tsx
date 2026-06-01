import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ServiceForm } from "../../ServiceForm";
import { updateService } from "../../actions";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();
  const { data: service } = await supabase
    .from("services")
    .select(
      "id, name_ar, name_en, duration_min, buffer_before_min, buffer_after_min, price_minor, tax_code",
    )
    .eq("id", id)
    .maybeSingle();

  if (!service) notFound();

  const t = await getTranslations("owner.services.form");
  const action = updateService.bind(null, service.id);

  return (
    <section>
      <h1 className="text-title-lg font-display text-ink">{t("edit_title")}</h1>
      <div className="mt-lg">
        <ServiceForm
          locale={locale}
          action={action}
          cancelHref={`/${locale}/dashboard/services`}
          defaults={{
            name_ar: service.name_ar,
            name_en: service.name_en,
            duration_min: service.duration_min,
            buffer_before_min: service.buffer_before_min,
            buffer_after_min: service.buffer_after_min,
            price_minor: service.price_minor,
            tax_code: service.tax_code,
          }}
        />
      </div>
    </section>
  );
}
