"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n/locales";

const LABEL_KEY: Record<Locale, "locale_switch_to_ar" | "locale_switch_to_en"> = {
  ar: "locale_switch_to_ar",
  en: "locale_switch_to_en",
};

/**
 * Switches the active locale while preserving the current path. With
 * localePrefix "always", the pathname starts with `/ar` or `/en`; we swap that
 * first segment for the other locale and link to it.
 */
export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const t = useTranslations("common");

  const target = LOCALES.find((l) => l !== current) ?? current;
  const segments = pathname.split("/");
  const first = segments[1];
  if (first !== undefined && isLocale(first)) {
    segments[1] = target;
  } else {
    segments.splice(1, 0, target);
  }
  const href = segments.join("/") || `/${target}`;

  return (
    <Link
      href={href}
      lang={target}
      hrefLang={target}
      className="text-nav-link text-muted hover:text-ink transition-colors"
    >
      {t(LABEL_KEY[target])}
    </Link>
  );
}
