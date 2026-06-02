import { describe, expect, it } from "vitest";
import {
  BOOKING_STATUSES,
  INITIAL_STATUS,
  TERMINAL_STATUSES,
  buildEvent,
  canTransition,
} from "@/lib/booking/state-machine";
import type { BookingStatus } from "@/lib/booking/types";

describe("status sets", () => {
  it("lists the six lifecycle statuses", () => {
    expect([...BOOKING_STATUSES]).toEqual([
      "pending",
      "confirmed",
      "arrived",
      "completed",
      "no_show",
      "cancelled",
    ]);
  });

  it("treats completed/no_show/cancelled as terminal", () => {
    expect([...TERMINAL_STATUSES]).toEqual(["completed", "no_show", "cancelled"]);
  });

  it("creates guest bookings directly as confirmed", () => {
    expect(INITIAL_STATUS).toBe("confirmed");
  });
});

describe("canTransition", () => {
  it("allows forward lifecycle moves", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "arrived")).toBe(true);
    expect(canTransition("arrived", "completed")).toBe(true);
    expect(canTransition("confirmed", "completed")).toBe(true);
  });

  it("allows cancellation/no-show from any active status", () => {
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "no_show")).toBe(true);
    expect(canTransition("arrived", "cancelled")).toBe(true);
  });

  it("forbids leaving a terminal status", () => {
    for (const from of TERMINAL_STATUSES) {
      for (const to of BOOKING_STATUSES) {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });

  it("forbids no-op and backward moves", () => {
    expect(canTransition("confirmed", "confirmed")).toBe(false);
    expect(canTransition("arrived", "pending")).toBe(false);
    expect(canTransition("completed", "arrived")).toBe(false);
  });
});

describe("buildEvent", () => {
  it("builds the created event from a null prior status", () => {
    const event = buildEvent({ from: null, to: "confirmed", payload: { source: "guest" } });
    expect(event).toEqual({
      eventType: "created",
      fromStatus: null,
      toStatus: "confirmed",
      actorUserId: null,
      payload: { source: "guest" },
    });
  });

  it("builds a status_changed event for a valid transition", () => {
    const event = buildEvent({ from: "confirmed", to: "arrived", actorUserId: "owner-1" });
    expect(event).toEqual({
      eventType: "status_changed",
      fromStatus: "confirmed",
      toStatus: "arrived",
      actorUserId: "owner-1",
      payload: {},
    });
  });

  it("throws when the transition is not allowed", () => {
    expect(() => buildEvent({ from: "completed", to: "arrived" })).toThrow(
      /invalid transition/i,
    );
  });

  it("does not mutate the supplied payload", () => {
    const payload: Record<string, unknown> = { note: "x" };
    const event = buildEvent({ from: null, to: "confirmed", payload });
    expect(event.payload).not.toBe(payload);
    expect(event.payload).toEqual({ note: "x" });
  });
});

// Type-level guard so the table stays exhaustive if a status is added.
const _exhaustive: readonly BookingStatus[] = BOOKING_STATUSES;
void _exhaustive;
