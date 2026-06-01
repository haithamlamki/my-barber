import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { formatOMR } from "@/lib/i18n/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerContext } from "@/lib/auth/owner";
import { setServiceStatus } from "./actions";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const owner = await getOwnerContext();
  if (!owner) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();
  const { data: services } = await supabase
    .from("services")
    .select(
      "id, name_ar, name_en, duration_min, price_minor, tax_code, status",
    )
    .eq("business_id", owner.businessId)
    .order("created_at", { ascending: true });

  const t = await getTranslations("owner.services");
  const rows = services ?? [];

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-lg font-display text-ink">{t("title")}</h1>
          <p className="mt-xxs text-body-sm text-muted">{t("subtitle")}</p>
        </div>
        <a
          href={`/${locale}/dashboard/services/new`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-lg text-button text-on-primary hover:bg-primary-active transition-colors"
        >
          {t("add")}
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="mt-xl rounded-lg border border-hairline bg-surface-soft px-lg py-xl text-body-sm text-muted">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-lg overflow-hidden rounded-lg border border-hairline">
          <table className="w-full border-collapse text-start">
            <thead>
              <tr className="border-b border-hairline bg-surface-soft text-start">
                <th className="px-md py-sm text-start text-caption text-muted">{t("col_name")}</th>
                <th className="px-md py-sm text-start text-caption text-muted">{t("col_duration")}</th>
                <th className="px-md py-sm text-start text-caption text-muted">{t("col_price")}</th>
                <th className="px-md py-sm text-start text-caption text-muted">{t("col_tax")}</th>
                <th className="px-md py-sm text-start text-caption text-muted">{t("col_status")}</th>
                <th className="px-md py-sm text-end text-caption text-muted">{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((service) => {
                const name = locale === "ar" ? service.name_ar : service.name_en;
                const isActive = service.status === "active";
                return (
                  <tr key={service.id} className="border-b border-hairline-soft last:border-b-0">
                    <td className="px-md py-sm text-body-sm text-ink">{name}</td>
                    <td className="px-md py-sm text-body-sm text-body">
                      {t("minutes", { n: service.duration_min })}
                    </td>
                    <td className="px-md py-sm text-body-sm text-body" dir="ltr">
                      {formatOMR(service.price_minor, locale)}
                    </td>
                    <td className="px-md py-sm text-body-sm text-body">
                      {t(`tax_${service.tax_code}` as "tax_OMR_VAT_STANDARD")}
                    </td>
                    <td className="px-md py-sm">
                      <span
                        className={`inline-flex items-center rounded-pill px-sm py-xxs text-caption ${
                          isActive
                            ? "bg-surface-card text-ink"
                            : "bg-surface-soft text-muted"
                        }`}
                      >
                        {isActive ? t("status_active") : t("status_archived")}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <div className="flex items-center justify-end gap-sm">
                        <a
                          href={`/${locale}/dashboard/services/${service.id}/edit`}
                          className="text-caption text-body hover:text-ink transition-colors"
                        >
                          {t("edit")}
                        </a>
                        <form action={setServiceStatus}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={service.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={isActive ? "archived" : "active"}
                          />
                          <button
                            type="submit"
                            className="text-caption text-muted hover:text-ink transition-colors"
                          >
                            {isActive ? t("archive") : t("restore")}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
