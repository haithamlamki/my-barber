import { randomUUID } from "node:crypto";
import type {
  PaymentAdapter,
  PaymentReferenceGenerator,
  PaymentRequest,
  PaymentResult,
} from "./types";

const defaultReference: PaymentReferenceGenerator = () => `fake_${randomUUID()}`;

/** Money is whole baisa; a fractional or negative amount is a programming error. */
function isValidAmount(amountMinor: number): boolean {
  return Number.isInteger(amountMinor) && amountMinor >= 0;
}

/**
 * Build the v0.1 fake payment adapter. Any valid amount auto-succeeds as `paid`
 * (booking is already confirmed without real payment in v0.1). The reference
 * generator is injectable so tests can assert a deterministic reference.
 */
export function createFakePaymentAdapter(
  reference: PaymentReferenceGenerator = defaultReference,
): PaymentAdapter {
  return {
    provider: "fake",
    async charge(request: PaymentRequest): Promise<PaymentResult> {
      if (!isValidAmount(request.amountMinor)) {
        return {
          ok: false,
          provider: "fake",
          status: "failed",
          reference: "",
          amountMinor: request.amountMinor,
          error: "invalid_amount",
        };
      }
      return {
        ok: true,
        provider: "fake",
        status: "paid",
        reference: reference(),
        amountMinor: request.amountMinor,
      };
    },
  };
}
