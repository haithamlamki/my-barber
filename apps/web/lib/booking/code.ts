/**
 * Human-friendly booking codes. 8 chars from a 32-symbol Crockford-style alphabet with
 * the visually ambiguous letters/digits removed (0/O/1/I/L/U). The alphabet length (32)
 * divides 256 evenly, so `byte % 32` maps bytes to symbols with no modulo bias.
 */

export const BOOKING_CODE_LENGTH = 8;
export const BOOKING_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789ab"; // 32 symbols

export type RandomBytes = (size: number) => Uint8Array;

function cryptoRandomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** Generate a booking code. Pass a deterministic `randomBytes` in tests. */
export function generateBookingCode(randomBytes: RandomBytes = cryptoRandomBytes): string {
  const bytes = randomBytes(BOOKING_CODE_LENGTH);
  if (bytes.length < BOOKING_CODE_LENGTH) {
    throw new RangeError(
      `randomBytes returned ${bytes.length} bytes, need ${BOOKING_CODE_LENGTH}`,
    );
  }
  let code = "";
  for (let i = 0; i < BOOKING_CODE_LENGTH; i += 1) {
    code += BOOKING_CODE_ALPHABET[bytes[i]! % BOOKING_CODE_ALPHABET.length];
  }
  return code;
}
