import { describe, expect, it } from "vitest";
import { deriveFollowUpInterval } from "../timelineEventHelpers";
import { toIsoDateValue } from "../dateValues";
import { FOLLOW_UP_INTERVAL_LABELS } from "@/types/case";

const PROCEDURE_DATE = "2026-01-01";
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Date-only value `days` after the fixed procedure date. */
function daysAfter(days: number): string {
  const base = new Date(2026, 0, 1, 12, 0, 0, 0);
  return toIsoDateValue(new Date(base.getTime() + days * MS_PER_DAY));
}

describe("deriveFollowUpInterval", () => {
  it("returns null when the procedure date is missing", () => {
    expect(deriveFollowUpInterval(undefined, daysAfter(10))).toBeNull();
  });

  it("returns null when the procedure date is unparseable", () => {
    expect(deriveFollowUpInterval("not-a-date", daysAfter(10))).toBeNull();
  });

  it("returns null when the event date is unparseable", () => {
    expect(deriveFollowUpInterval(PROCEDURE_DATE, "garbage")).toBeNull();
  });

  it("returns null when the event precedes the procedure", () => {
    expect(deriveFollowUpInterval(PROCEDURE_DATE, daysAfter(-1))).toBeNull();
    expect(deriveFollowUpInterval(PROCEDURE_DATE, daysAfter(-30))).toBeNull();
  });

  it.each([
    [0, "2_weeks"],
    [14, "2_weeks"],
    [28, "2_weeks"],
    [29, "6_weeks"],
    [42, "6_weeks"],
    [66, "6_weeks"],
    [67, "3_months"],
    [91, "3_months"],
    [136, "3_months"],
    [137, "6_months"],
    [182, "6_months"],
    [273, "6_months"],
    [274, "1_year"],
    [365, "1_year"],
    [548, "1_year"],
    [549, "custom"],
    [730, "custom"],
    [1095, "custom"],
  ] as const)("maps a delta of %i days to %s", (days, expected) => {
    expect(deriveFollowUpInterval(PROCEDURE_DATE, daysAfter(days))).toBe(
      expected,
    );
  });

  it("always returns a valid FollowUpInterval for non-negative deltas", () => {
    for (let days = 0; days <= 1200; days += 7) {
      const derived = deriveFollowUpInterval(PROCEDURE_DATE, daysAfter(days));
      expect(derived).not.toBeNull();
      expect(Object.keys(FOLLOW_UP_INTERVAL_LABELS)).toContain(
        derived as string,
      );
    }
  });

  it("accepts timestamp-shaped event dates via date-only normalization", () => {
    expect(
      deriveFollowUpInterval(PROCEDURE_DATE, "2026-02-12T09:30:00.000Z"),
    ).toBe("6_weeks");
  });
});
