import type { Interval, SlotRequest } from "./types";
import { overlaps } from "./intervals";

/**
 * Compute every bookable start time (minutes from midnight) for a service on a given day.
 * A candidate is offered when the service body fits inside a working window and the
 * candidate's occupied span (service + buffers) does not overlap any busy interval.
 */
export function computeAvailableSlots(request: SlotRequest): number[] {
  validate(request);
  const { durationMin, bufferBeforeMin, bufferAfterMin, stepMin, busy } = request;
  const starts: number[] = [];

  for (const window of request.windows) {
    for (let start = window.openMin; start + durationMin <= window.closeMin; start += stepMin) {
      const occupied: Interval = {
        startMin: start - bufferBeforeMin,
        endMin: start + durationMin + bufferAfterMin,
      };
      const conflict = busy.some((interval) => overlaps(occupied, interval));
      if (!conflict) {
        starts.push(start);
      }
    }
  }

  return starts.sort((a, b) => a - b);
}

function validate(request: SlotRequest): void {
  assertPositiveInt(request.durationMin, "durationMin");
  assertPositiveInt(request.stepMin, "stepMin");
  assertNonNegativeInt(request.bufferBeforeMin, "bufferBeforeMin");
  assertNonNegativeInt(request.bufferAfterMin, "bufferAfterMin");

  for (const window of request.windows) {
    if (!(window.openMin < window.closeMin)) {
      throw new RangeError(`window open must be before close: ${JSON.stringify(window)}`);
    }
  }

  for (const interval of request.busy) {
    if (!(interval.startMin < interval.endMin)) {
      throw new RangeError(`busy interval start must be before end: ${JSON.stringify(interval)}`);
    }
  }
}

function assertPositiveInt(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer, got ${value}`);
  }
}

function assertNonNegativeInt(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer, got ${value}`);
  }
}
