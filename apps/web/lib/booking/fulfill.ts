import type {
  BookingConfirmationPayload,
  NotificationAdapter,
  NotificationResult,
} from "@/lib/notifications/types";
import type { PaymentAdapter, PaymentResult } from "@/lib/payments/types";

export interface FulfillDeps {
  readonly payment: PaymentAdapter;
  readonly notification: NotificationAdapter;
}

export interface FulfillBookingInput {
  readonly bookingCode: string;
  readonly amountMinor: number;
  readonly confirmation: BookingConfirmationPayload;
}

export interface FulfillResult {
  readonly payment: PaymentResult;
  readonly notification: NotificationResult;
}

/**
 * Post-confirmation side effects for a guest booking: take (fake) payment, then —
 * only if it succeeds — send exactly one confirmation notification. Best-effort by
 * construction: both adapters report failure rather than throwing, so a hiccup here
 * never undoes the already-confirmed appointment. Gating the notification on payment
 * keeps the seam honest for v0.2, when a declined real charge must not tell the
 * customer they're "confirmed".
 */
export async function fulfillBooking(
  deps: FulfillDeps,
  input: FulfillBookingInput,
): Promise<FulfillResult> {
  const payment = await deps.payment.charge({
    bookingCode: input.bookingCode,
    amountMinor: input.amountMinor,
    currency: "OMR",
  });

  const notification: NotificationResult = payment.ok
    ? await deps.notification.sendBookingConfirmation(input.confirmation)
    : { ok: false, channel: deps.notification.channel, error: "payment_failed" };

  return { payment, notification };
}
