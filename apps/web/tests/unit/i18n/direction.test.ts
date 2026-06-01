import { describe, expect, it } from "vitest";
import { getDirection } from "@/lib/i18n/direction";

describe("getDirection", () => {
  it("returns 'rtl' for Arabic", () => {
    expect(getDirection("ar")).toBe("rtl");
  });

  it("returns 'ltr' for English", () => {
    expect(getDirection("en")).toBe("ltr");
  });

  it("falls back to the default locale's direction for an unknown locale", () => {
    // DEFAULT_LOCALE is 'ar' -> 'rtl'
    // @ts-expect-error — runtime fallback must not crash on bad input
    expect(getDirection("zz")).toBe("rtl");
  });
});
