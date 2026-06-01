import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/locales";
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
    <main className="min-h-screen bg-canvas flex items-center justify-center px-md py-section">
      <div className="w-full max-w-sm">
        <LoginForm locale={locale} />
      </div>
    </main>
  );
}
