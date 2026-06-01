import type { Locale } from "./locales";

/**
 * OMR uses 1000 baisa per omani rial. Money is stored as integer minor units (baisa).
 * This is the ONLY place that converts minor units to a display string. Never divide by 1000 elsewhere.
 */
export function formatOMR(amountMinor: number, locale: Locale): string {
  if (!Number.isInteger(amountMinor)) {
    throw new TypeError(`formatOMR expects integer minor units, got ${amountMinor}`);
  }

  const bcp47 = locale === "ar" ? "ar-OM" : "en-OM";
  return new Intl.NumberFormat(bcp47, {
    style: "currency",
    currency: "OMR",
    currencyDisplay: "code",
    // OMR has 3 fraction digits at the unit level; baisa are 1/1000 of a rial.
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amountMinor / 1000);
}
