/**
 * Availability is computed in integer minutes-from-midnight (local shop time) to keep
 * the slot math pure and free of timezone/DST hazards. Callers convert real timestamps
 * to/from minutes at the boundary.
 */

export interface Interval {
  readonly startMin: number;
  readonly endMin: number;
}

export interface WorkingWindow {
  readonly openMin: number;
  readonly closeMin: number;
}

export interface SlotRequest {
  /** Working hours for the day. Multiple windows model breaks (e.g. a midday closure). */
  readonly windows: readonly WorkingWindow[];
  readonly durationMin: number;
  readonly bufferBeforeMin: number;
  readonly bufferAfterMin: number;
  /** Granularity of candidate start times. */
  readonly stepMin: number;
  /** Existing appointments and blockouts, already flattened to busy [start, end) intervals. */
  readonly busy: readonly Interval[];
}
