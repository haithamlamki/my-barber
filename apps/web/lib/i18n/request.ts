import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale, DEFAULT_LOCALE } from "./locales";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();

  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
