const HM_PATTERN = /^([0-9]{2}):([0-9]{2})$/;
const MINUTES_PER_DAY = 1440;

/** Parse a "HH:MM" clock string into minutes from midnight (0..1439). */
export function hmToMinutes(hm: string): number {
  const match = HM_PATTERN.exec(hm);
  if (!match) {
    throw new TypeError(`expected a "HH:MM" string, got ${hm}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23) {
    throw new RangeError(`hour out of range in ${hm}`);
  }
  if (minutes > 59) {
    throw new RangeError(`minute out of range in ${hm}`);
  }
  return hours * 60 + minutes;
}

/** Format minutes from midnight (0..1439) back into a "HH:MM" clock string. */
export function minutesToHm(totalMinutes: number): string {
  if (!Number.isInteger(totalMinutes)) {
    throw new TypeError(`expected an integer minute count, got ${totalMinutes}`);
  }
  if (totalMinutes < 0 || totalMinutes >= MINUTES_PER_DAY) {
    throw new RangeError(`minute count out of range: ${totalMinutes}`);
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${pad(hours)}:${pad(minutes)}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}
