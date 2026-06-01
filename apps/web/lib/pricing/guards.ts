/**
 * Boundary guards for money values. Money must always be a non-negative integer
 * number of minor units (baisa). Fail fast and loud on anything else.
 */
export function assertMinor(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer minor-unit amount, got ${value}`);
  }
  if (value < 0) {
    throw new RangeError(`${label} must be non-negative, got ${value}`);
  }
}
