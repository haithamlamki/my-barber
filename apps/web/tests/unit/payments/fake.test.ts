import { describe, expect, it, vi } from "vitest";
import { createFakePaymentAdapter } from "@/lib/payments/fake";
import type { PaymentRequest } from "@/lib/payments/types";

const request = (overrides: Partial<PaymentRequest> = {}): PaymentRequest => ({
  bookingCode: "ABCD2345",
  amountMinor: 2500,
  currency: "OMR",
  ...overrides,
});

describe("createFakePaymentAdapter", () => {
  it("exposes the fake provider", () => {
    expect(createFakePaymentAdapter().provider).toBe("fake");
  });

  it("auto-succeeds a normal charge and echoes the amount", async () => {
    const adapter = createFakePaymentAdapter(() => "fake_ref_1");
    const result = await adapter.charge(request());

    expect(result).toEqual({
      ok: true,
      provider: "fake",
      status: "paid",
      reference: "fake_ref_1",
      amountMinor: 2500,
    });
  });

  it("treats a zero-amount (free) service as paid", async () => {
    const adapter = createFakePaymentAdapter(() => "fake_ref_2");
    const result = await adapter.charge(request({ amountMinor: 0 }));

    expect(result.ok).toBe(true);
    expect(result.status).toBe("paid");
  });

  it("rejects a negative amount", async () => {
    const result = await createFakePaymentAdapter().charge(request({ amountMinor: -1 }));

    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("invalid_amount");
  });

  it("rejects a non-integer amount (money is whole baisa)", async () => {
    const result = await createFakePaymentAdapter().charge(request({ amountMinor: 2500.5 }));

    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("invalid_amount");
  });

  it("calls the reference generator exactly once per successful charge", async () => {
    const ref = vi.fn(() => "fake_ref_3");
    await createFakePaymentAdapter(ref).charge(request());

    expect(ref).toHaveBeenCalledTimes(1);
  });

  it("default reference generator yields distinct, prefixed references", async () => {
    const adapter = createFakePaymentAdapter();
    const a = await adapter.charge(request());
    const b = await adapter.charge(request());

    expect(a.reference).toMatch(/^fake_/);
    expect(b.reference).toMatch(/^fake_/);
    expect(a.reference).not.toBe(b.reference);
  });
});
