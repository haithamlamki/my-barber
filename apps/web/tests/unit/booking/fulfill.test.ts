import { describe, expect, it, vi } from "vitest";
import { fulfillBooking } from "@/lib/booking/fulfill";
import type { FulfillBookingInput } from "@/lib/booking/fulfill";
import type { PaymentAdapter, PaymentResult } from "@/lib/payments/types";
import type {
  NotificationAdapter,
  NotificationResult,
} from "@/lib/notifications/types";

const paidResult: PaymentResult = {
  ok: true,
  provider: "fake",
  status: "paid",
  reference: "fake_ref",
  amountMinor: 2500,
};

const sentResult: NotificationResult = { ok: true, channel: "console" };

const input: FulfillBookingInput = {
  bookingCode: "ABCD2345",
  amountMinor: 2500,
  confirmation: {
    bookingCode: "ABCD2345",
    customerName: "Salim",
    customerPhone: "91234567",
    customerEmail: null,
    serviceNameAr: "قص شعر",
    serviceNameEn: "Haircut",
    startsAtIso: "2030-03-01T06:00:00.000Z",
    totalMinor: 2500,
    locale: "en",
  },
};

function deps() {
  const charge = vi.fn(async (): Promise<PaymentResult> => paidResult);
  const sendBookingConfirmation = vi.fn(async (): Promise<NotificationResult> => sentResult);
  const payment: PaymentAdapter = { provider: "fake", charge };
  const notification: NotificationAdapter = { channel: "console", sendBookingConfirmation };
  return { payment, notification, charge, sendBookingConfirmation };
}

describe("fulfillBooking", () => {
  it("charges payment once with the OMR amount and booking code", async () => {
    const d = deps();
    await fulfillBooking({ payment: d.payment, notification: d.notification }, input);

    expect(d.charge).toHaveBeenCalledTimes(1);
    expect(d.charge).toHaveBeenCalledWith({
      bookingCode: "ABCD2345",
      amountMinor: 2500,
      currency: "OMR",
    });
  });

  it("sends exactly one confirmation notification with the payload", async () => {
    const d = deps();
    await fulfillBooking({ payment: d.payment, notification: d.notification }, input);

    expect(d.sendBookingConfirmation).toHaveBeenCalledTimes(1);
    expect(d.sendBookingConfirmation).toHaveBeenCalledWith(input.confirmation);
  });

  it("returns both the payment and notification results", async () => {
    const d = deps();
    const result = await fulfillBooking(
      { payment: d.payment, notification: d.notification },
      input,
    );

    expect(result).toEqual({ payment: paidResult, notification: sentResult });
  });

  it("skips the notification when payment fails", async () => {
    const failedPayment: PaymentResult = {
      ok: false,
      provider: "fake",
      status: "failed",
      reference: "",
      amountMinor: 2500,
      error: "invalid_amount",
    };
    const d = deps();
    d.charge.mockResolvedValueOnce(failedPayment);

    const result = await fulfillBooking(
      { payment: d.payment, notification: d.notification },
      input,
    );

    expect(d.sendBookingConfirmation).not.toHaveBeenCalled();
    expect(result).toEqual({
      payment: failedPayment,
      notification: { ok: false, channel: "console", error: "payment_failed" },
    });
  });
});
