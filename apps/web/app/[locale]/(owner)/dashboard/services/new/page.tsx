import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { ServiceForm } from "../ServiceForm";
import { createService } from "../actions";

export default async function NewServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("owner.services.form");

  return (
    <section>
      <h1 className="text-title-lg font-display text-ink">{t("new_title")}</h1>
      <div className="mt-lg">
        <ServiceForm
          locale={locale}
          action={createService}
          cancelHref={`/${locale}/dashboard/services`}
        />
      </div>
    </section>
  );
}
