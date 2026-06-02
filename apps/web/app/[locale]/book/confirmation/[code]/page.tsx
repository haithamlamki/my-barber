import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { formatOMR } from "@/lib/i18n/money";
import { formatBookingDateTime } from "@/lib/i18n/datetime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("booking.confirmation");

  // The booking_code is the unguessable secret that lets a guest see their own
  // confirmation. Read it server-side with the service role; appointments RLS
  // otherwise hides it from anonymous visitors.
  const admin = createSupabaseAdminClient();
  const { data: booking } = await admin
    .from("appointments")
    .select(
      "booking_code, status, starts_at, total_minor, staff_profiles(display_name), appointment_items(kind, name_ar, name_en)",
    )
    .eq("booking_code", code)
    .maybeSingle();

  if (!booking) {
    return (
      <section>
        <h1 className="text-title-lg font-display text-ink">{t("not_found_title")}</h1>
        <p className="mt-xs text-body-sm text-muted">{t("not_found_body")}</p>
        <Link
          href={`/${locale}`}
          className="mt-lg inline-flex h-10 items-center justify-center rounded-md bg-primary px-lg text-button text-on-primary hover:bg-primary-active"
        >
          {t("back_home")}
        </Link>
      </section>
    );
  }

  const serviceItem =
    booking.appointment_items.find((item) => item.kind === "service") ??
    booking.appointment_items[0];
  const serviceName = serviceItem
    ? locale === "ar"
      ? serviceItem.name_ar
      : serviceItem.name_en
    : "";

  return (
    <section>
      <h1 className="text-title-lg font-display text-ink">{t("title")}</h1>
      <p className="mt-xs text-body-sm text-muted">{t("subtitle")}</p>

      <dl className="mt-lg flex flex-col gap-sm rounded-lg border border-hairline bg-surface-card px-lg py-md">
        <Row label={t("code_label")} value={booking.booking_code} mono />
        <Row label={t("service_label")} value={serviceName} />
        {booking.staff_profiles ? (
          <Row label={t("barber_label")} value={booking.staff_profiles.display_name} />
        ) : null}
        <Row label={t("when_label")} value={formatBookingDateTime(booking.starts_at, locale)} />
        <Row label={t("total_label")} value={formatOMR(booking.total_minor, locale)} />
        <Row label={t("status_label")} value={t("status_confirmed")} />
      </dl>

      <p className="mt-sm text-caption text-muted">{t("notice")}</p>

      <Link
        href={`/${locale}`}
        className="mt-lg inline-flex h-10 items-center justify-center rounded-md border border-hairline px-lg text-button text-ink hover:border-ink"
      >
        {t("back_home")}
      </Link>
    </section>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-md">
      <dt className="text-caption text-muted">{label}</dt>
      <dd className={`text-body-sm text-ink ${mono ? "font-mono tracking-wider" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
