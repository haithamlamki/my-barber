import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { getOwnerContext } from "@/lib/auth/owner";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { signOut } from "./actions";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const owner = await getOwnerContext();
  if (!owner) redirect(`/${locale}/login`);

  const t = await getTranslations("owner.nav");

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline bg-canvas">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-md py-sm">
          <div className="flex items-center gap-lg">
            <span className="text-title-sm font-display text-ink">{t("brand")}</span>
            <nav className="flex items-center gap-md">
              <a
                href={`/${locale}/dashboard/services`}
                className="text-nav-link text-body hover:text-ink transition-colors"
              >
                {t("services")}
              </a>
              <a
                href={`/${locale}/dashboard/staff`}
                className="text-nav-link text-body hover:text-ink transition-colors"
              >
                {t("staff")}
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-md">
            <LocaleSwitcher current={locale} />
            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="text-nav-link text-muted hover:text-ink transition-colors"
              >
                {t("sign_out")}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-md py-lg">{children}</main>
    </div>
  );
}
