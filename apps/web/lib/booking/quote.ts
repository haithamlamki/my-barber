import { computeOrderTotals } from "@/lib/pricing/totals";
import type { PriceLine } from "@/lib/pricing/types";
import type { Quote, QuoteItem, QuoteLineInput } from "./types";

/**
 * Price a service (plus optional add-ons) into an immutable quote: per-line snapshot
 * items, summed duration, and order totals. Tax is computed per line by lib/pricing
 * (Oman VAT 5%, half-up), the single source of truth for money.
 */
export function quoteService(
  service: QuoteLineInput,
  addons: readonly QuoteLineInput[] = [],
): Quote {
  const lines: readonly QuoteLineInput[] = [service, ...addons];
  const priceLines: readonly PriceLine[] = lines.map((line) => ({
    priceMinor: line.priceMinor,
    taxCode: line.taxCode,
  }));

  const items: readonly QuoteItem[] = lines.map((line) => ({
    kind: line.kind,
    refId: line.refId,
    nameAr: line.nameAr,
    nameEn: line.nameEn,
    durationMin: line.durationMin,
    priceMinor: line.priceMinor,
  }));

  const durationMin = lines.reduce((sum, line) => sum + line.durationMin, 0);

  return {
    items,
    totals: computeOrderTotals(priceLines),
    durationMin,
  };
}
