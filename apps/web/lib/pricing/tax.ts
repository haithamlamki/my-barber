import type { TaxCode } from "./types";
import { assertMinor } from "./guards";

/** Oman VAT standard rate is 5% = 500 basis points. Zero-rated and exempt are 0. */
const TAX_RATE_BPS: Record<TaxCode, number> = {
  OMR_VAT_STANDARD: 500,
  OMR_VAT_ZERO: 0,
  OMR_VAT_EXEMPT: 0,
};

const BPS_DENOMINATOR = 10_000;

export function taxRateBps(taxCode: TaxCode): number {
  return TAX_RATE_BPS[taxCode];
}

/**
 * Tax on a subtotal, in integer minor units, rounded half-up.
 * Per-line rounding is intentional and matches how VAT is applied to line items.
 */
export function computeTaxMinor(subtotalMinor: number, taxCode: TaxCode): number {
  assertMinor(subtotalMinor, "subtotalMinor");
  const bps = taxRateBps(taxCode);
  if (bps === 0) {
    return 0;
  }
  return roundHalfUp(subtotalMinor * bps, BPS_DENOMINATOR);
}

function roundHalfUp(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}
