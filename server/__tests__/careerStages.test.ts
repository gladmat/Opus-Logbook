/**
 * Server-side seniority tier resolution (shared/careerStages.ts).
 *
 * The share-time EPA push in POST /api/share decides whether to notify a
 * recipient purely from getSeniorityTierForStage(owner) vs (recipient).
 * These tests freeze the contract: every current stage AND every legacy
 * alias must resolve, or the push silently under-fires for legacy-profile
 * users (risk #5 in the per-procedure/EPA plan).
 */
import { describe, it, expect } from "vitest";
import {
  CAREER_STAGE_OPTIONS,
  LEGACY_CAREER_STAGE_TIERS,
  getCareerStageTierMap,
  getSeniorityTierForStage,
} from "@shared/careerStages";

describe("getSeniorityTierForStage", () => {
  it("resolves every CAREER_STAGE_OPTIONS value to its declared tier", () => {
    for (const option of CAREER_STAGE_OPTIONS) {
      expect(getSeniorityTierForStage(option.value)).toBe(option.seniorityTier);
    }
  });

  it("resolves every legacy alias (superset guarantee)", () => {
    for (const [value, tier] of Object.entries(LEGACY_CAREER_STAGE_TIERS)) {
      expect(getSeniorityTierForStage(value)).toBe(tier);
    }
  });

  it("resolves the canonical legacy alias consultant_specialist to tier 5", () => {
    expect(getSeniorityTierForStage("consultant_specialist")).toBe(5);
  });

  it("returns null for unknown, empty, null, and undefined values", () => {
    expect(getSeniorityTierForStage("not_a_stage")).toBeNull();
    expect(getSeniorityTierForStage("")).toBeNull();
    expect(getSeniorityTierForStage(null)).toBeNull();
    expect(getSeniorityTierForStage(undefined)).toBeNull();
  });

  it("distinguishes tiers across a representative supervisor/trainee pair", () => {
    // The exact condition the share-time EPA push checks: both known + different.
    const consultant = getSeniorityTierForStage("nz_consultant");
    const trainee = getSeniorityTierForStage("nz_set_trainee");
    expect(consultant).not.toBeNull();
    expect(trainee).not.toBeNull();
    expect(consultant).not.toBe(trainee);
  });
});

describe("getCareerStageTierMap", () => {
  it("current stage values win over any legacy collision", () => {
    // Map spreads legacy first, then options — an option value reused as a
    // legacy key must resolve to the option's tier.
    const map = getCareerStageTierMap();
    for (const option of CAREER_STAGE_OPTIONS) {
      expect(map[option.value]).toBe(option.seniorityTier);
    }
  });

  it("contains exactly the option values plus the legacy aliases", () => {
    const map = getCareerStageTierMap();
    const expected = new Set([
      ...Object.keys(LEGACY_CAREER_STAGE_TIERS),
      ...CAREER_STAGE_OPTIONS.map((o) => o.value),
    ]);
    expect(new Set(Object.keys(map))).toEqual(expected);
  });
});
