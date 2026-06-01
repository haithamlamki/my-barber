import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default async function BookLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-canvas">
      <header className="flex items-center justify-end px-lg py-sm md:px-section">
        <LocaleSwitcher current={locale} />
      </header>
      <div className="mx-auto w-full max-w-xl px-lg pb-section">{children}</div>
    </main>
  );
}
