/**
 * Payment adapter contract. v0.1 ships a single fake provider that auto-succeeds
 * (no real Thawani/PayTabs yet); the interface is the seam those gateways slot
 * into later. Amounts are integer minor units (OMR baisa).
 */

export type PaymentProvider = "fake";

export type PaymentStatus = "paid" | "failed";

export interface PaymentRequest {
  readonly bookingCode: string;
  readonly amountMinor: number;
  readonly currency: "OMR";
}

export interface PaymentResult {
  readonly ok: boolean;
  readonly provider: PaymentProvider;
  readonly status: PaymentStatus;
  readonly reference: string;
  readonly amountMinor: number;
  readonly error?: string;
}

export type PaymentReferenceGenerator = () => string;

export interface PaymentAdapter {
  readonly provider: PaymentProvider;
  charge(request: PaymentRequest): Promise<PaymentResult>;
}
