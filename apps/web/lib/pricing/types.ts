/**
 * Pricing types. All money is integer minor units (OMR baisa, 1 OMR = 1000 baisa).
 * Never floats. The only place minor units become a display string is lib/i18n/money.ts.
 */

export type TaxCode = "OMR_VAT_STANDARD" | "OMR_VAT_ZERO" | "OMR_VAT_EXEMPT";

export interface PriceLine {
  readonly priceMinor: number;
  readonly taxCode: TaxCode;
}

export interface LineTotal {
  readonly subtotalMinor: number;
  readonly taxMinor: number;
  readonly totalMinor: number;
}

export interface OrderTotals {
  readonly subtotalMinor: number;
  readonly taxMinor: number;
  readonly totalMinor: number;
}
