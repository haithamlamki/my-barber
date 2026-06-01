import type { LineTotal, OrderTotals, PriceLine } from "./types";
import { assertMinor } from "./guards";
import { computeTaxMinor } from "./tax";

export function computeLineTotal(line: PriceLine): LineTotal {
  assertMinor(line.priceMinor, "priceMinor");
  const taxMinor = computeTaxMinor(line.priceMinor, line.taxCode);
  return {
    subtotalMinor: line.priceMinor,
    taxMinor,
    totalMinor: line.priceMinor + taxMinor,
  };
}

/**
 * Order totals = sum of per-line totals. Tax is computed and rounded per line
 * before summing, never by taxing the combined subtotal.
 */
export function computeOrderTotals(lines: readonly PriceLine[]): OrderTotals {
  return lines.reduce<OrderTotals>(
    (acc, line) => {
      const lineTotal = computeLineTotal(line);
      return {
        subtotalMinor: acc.subtotalMinor + lineTotal.subtotalMinor,
        taxMinor: acc.taxMinor + lineTotal.taxMinor,
        totalMinor: acc.totalMinor + lineTotal.totalMinor,
      };
    },
    { subtotalMinor: 0, taxMinor: 0, totalMinor: 0 },
  );
}
