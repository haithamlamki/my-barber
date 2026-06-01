import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { StaffForm } from "../StaffForm";
import { createStaff } from "../actions";

export default async function NewStaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("owner.staff.form");

  return (
    <section>
      <h1 className="text-title-lg font-display text-ink">{t("new_title")}</h1>
      <div className="mt-lg">
        <StaffForm
          locale={locale}
          action={createStaff}
          showEmail
          cancelHref={`/${locale}/dashboard/staff`}
        />
      </div>
    </section>
  );
}
