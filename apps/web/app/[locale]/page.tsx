import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { notFound } from "next/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("home");

  return (
    <main className="min-h-screen bg-canvas">
      <section className="px-lg py-section md:px-section">
        <h1 className="text-display-lg text-ink font-display">{t("title")}</h1>
        <p className="mt-lg text-body-md text-body max-w-xl">{t("tagline")}</p>
        <div className="mt-xl">
          <a
            href="#book"
            className="inline-flex items-center justify-center rounded-md bg-primary text-on-primary px-lg py-sm text-button h-10 hover:bg-primary-active transition-colors"
          >
            {t("cta_book")}
          </a>
        </div>
      </section>
    </main>
  );
}
