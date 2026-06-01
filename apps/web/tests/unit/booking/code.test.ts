import { describe, expect, it } from "vitest";
import {
  BOOKING_CODE_ALPHABET,
  BOOKING_CODE_LENGTH,
  generateBookingCode,
} from "@/lib/booking/code";

const allZeros = (size: number): Uint8Array => new Uint8Array(size);
const ramp = (size: number): Uint8Array =>
  Uint8Array.from({ length: size }, (_, i) => i);

describe("generateBookingCode", () => {
  it("maps zero bytes to the first alphabet character", () => {
    expect(generateBookingCode(allZeros)).toBe(BOOKING_CODE_ALPHABET[0]!.repeat(8));
  });

  it("maps each byte to alphabet[byte % len] deterministically", () => {
    const code = generateBookingCode(ramp);
    const expected = Array.from({ length: BOOKING_CODE_LENGTH }, (_, i) =>
      BOOKING_CODE_ALPHABET[i % BOOKING_CODE_ALPHABET.length],
    ).join("");
    expect(code).toBe(expected);
  });

  it("returns a code of the configured length using only alphabet chars", () => {
    const code = generateBookingCode();
    expect(code).toHaveLength(BOOKING_CODE_LENGTH);
    expect(code).toMatch(new RegExp(`^[${BOOKING_CODE_ALPHABET}]+$`));
  });

  it("omits visually ambiguous characters (0/O/1/I/L/U)", () => {
    expect(BOOKING_CODE_ALPHABET).not.toMatch(/[01ILOU]/);
  });

  it("is unbiased: 32-char alphabet divides 256 evenly", () => {
    expect(256 % BOOKING_CODE_ALPHABET.length).toBe(0);
  });

  it("throws when the RNG returns too few bytes", () => {
    expect(() => generateBookingCode(() => new Uint8Array(3))).toThrow(/bytes/i);
  });

  it("draws fresh randomness on the default path", () => {
    expect(generateBookingCode()).not.toBe(generateBookingCode());
  });
});
