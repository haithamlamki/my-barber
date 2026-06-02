import { describe, expect, it } from "vitest";
import { quoteService } from "@/lib/booking/quote";
import type { QuoteLineInput } from "@/lib/booking/types";

const haircut: QuoteLineInput = {
  kind: "service",
  refId: "svc-1",
  nameAr: "قص شعر",
  nameEn: "Haircut",
  durationMin: 30,
  priceMinor: 5000, // 5.000 OMR
  taxCode: "OMR_VAT_STANDARD",
};

const beardTrim: QuoteLineInput = {
  kind: "addon",
  refId: "add-1",
  nameAr: "تهذيب اللحية",
  nameEn: "Beard trim",
  durationMin: 15,
  priceMinor: 2000,
  taxCode: "OMR_VAT_STANDARD",
};

describe("quoteService", () => {
  it("quotes a single service with 5% VAT and a snapshot item", () => {
    const quote = quoteService(haircut);
    expect(quote.totals).toEqual({ subtotalMinor: 5000, taxMinor: 250, totalMinor: 5250 });
    expect(quote.durationMin).toBe(30);
    expect(quote.items).toEqual([
      {
        kind: "service",
        refId: "svc-1",
        nameAr: "قص شعر",
        nameEn: "Haircut",
        durationMin: 30,
        priceMinor: 5000,
      },
    ]);
  });

  it("sums duration and totals across service plus add-ons", () => {
    const quote = quoteService(haircut, [beardTrim]);
    expect(quote.durationMin).toBe(45);
    // Tax rounded per line: 250 + 100 = 350.
    expect(quote.totals).toEqual({ subtotalMinor: 7000, taxMinor: 350, totalMinor: 7350 });
    expect(quote.items.map((i) => i.refId)).toEqual(["svc-1", "add-1"]);
  });

  it("produces a zero-tax receipt for a VAT-exempt service (PRD edge case)", () => {
    const quote = quoteService({ ...haircut, taxCode: "OMR_VAT_EXEMPT" });
    expect(quote.totals).toEqual({ subtotalMinor: 5000, taxMinor: 0, totalMinor: 5000 });
  });

  it("treats an empty add-on list the same as none", () => {
    expect(quoteService(haircut, [])).toEqual(quoteService(haircut));
  });

  it("does not carry the tax code into the snapshot items", () => {
    const quote = quoteService(haircut);
    expect(quote.items[0]).not.toHaveProperty("taxCode");
  });
});
