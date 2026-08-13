import { describe, expect, it } from "vitest";

import {
  buildDefaultFlapOutcome,
  deriveAssessedDaysPostOp,
} from "@/lib/flapOutcomeDefaults";

describe("deriveAssessedDaysPostOp", () => {
  it("derives the day delta between procedure and assessment", () => {
    expect(deriveAssessedDaysPostOp("2026-08-01", "2026-08-01")).toBe(0);
    expect(deriveAssessedDaysPostOp("2026-08-01", "2026-08-06")).toBe(5);
    expect(deriveAssessedDaysPostOp("2026-07-01", "2026-08-01")).toBe(31);
  });

  it("returns null when the assessment precedes the procedure", () => {
    expect(deriveAssessedDaysPostOp("2026-08-10", "2026-08-01")).toBeNull();
  });

  it("returns null when either date is missing or unparseable", () => {
    expect(deriveAssessedDaysPostOp(undefined, "2026-08-01")).toBeNull();
    expect(deriveAssessedDaysPostOp("2026-08-01", undefined)).toBeNull();
    expect(deriveAssessedDaysPostOp("garbage", "2026-08-01")).toBeNull();
    expect(deriveAssessedDaysPostOp("2026-08-01", "garbage")).toBeNull();
  });

  it("spans a DST boundary without off-by-one (local-noon parsing)", () => {
    // NZ DST starts late September — local-noon dates keep the delta exact.
    expect(deriveAssessedDaysPostOp("2026-09-25", "2026-09-29")).toBe(4);
  });
});

describe("buildDefaultFlapOutcome", () => {
  it("defaults to complete survival", () => {
    expect(buildDefaultFlapOutcome().flapSurvival).toBe("complete_survival");
  });
});
