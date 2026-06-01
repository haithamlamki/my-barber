import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

export type Direction = "rtl" | "ltr";

const DIRECTION_BY_LOCALE: Record<Locale, Direction> = {
  ar: "rtl",
  en: "ltr",
};

export function getDirection(locale: string): Direction {
  if (isLocale(locale)) {
    return DIRECTION_BY_LOCALE[locale];
  }
  return DIRECTION_BY_LOCALE[DEFAULT_LOCALE];
}
