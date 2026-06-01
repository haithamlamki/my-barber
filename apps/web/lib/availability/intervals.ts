import type { Interval } from "./types";

/** True when two half-open [start, end) intervals overlap. Adjacent (touching) is not overlap. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}
