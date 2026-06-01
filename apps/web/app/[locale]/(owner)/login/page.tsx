import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { LoginForm } from "./LoginForm";

export default async function OwnerLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-canvas flex flex-col px-md py-section">
      <header className="flex items-center justify-end">
        <LocaleSwitcher current={locale} />
      </header>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm">
          <LoginForm locale={locale} />
        </div>
      </div>
    </main>
  );
}
