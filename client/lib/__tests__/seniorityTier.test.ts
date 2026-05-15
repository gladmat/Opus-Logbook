/**
 * Seniority tier — derives career stage → tier for EPA pair derivation,
 * assessor role detection, and 30-day RACS audit. Used by epaDerivation,
 * assessmentRoles, and (indirectly) shared/careerStages.
 *
 * These tests lock in the 6-tier mapping (CLAUDE.md "career stage
 * internationalisation"). If a stage drifts to the wrong tier, EPA
 * pairs would be miscalibrated and trainee/supervisor roles would
 * be miscategorised.
 */

import { describe, it, expect } from "vitest";
import {
  getSeniorityTier,
  isSeniorTo,
  CAREER_STAGE_TIERS,
} from "@/lib/seniorityTier";

describe("getSeniorityTier", () => {
  it("returns null for undefined", () => {
    expect(getSeniorityTier(undefined)).toBeNull();
  });

  it("returns null for null", () => {
    expect(getSeniorityTier(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getSeniorityTier("")).toBeNull();
  });

  it("returns null for unknown stage", () => {
    expect(getSeniorityTier("not_a_real_stage")).toBeNull();
  });

  it("maps NZ consultant to tier 5", () => {
    expect(getSeniorityTier("nz_consultant")).toBe(5);
  });

  it("maps NZ head of department to tier 6", () => {
    expect(getSeniorityTier("nz_head_of_department")).toBe(6);
  });

  it("maps NZ PGY1 (intern) to tier 1", () => {
    expect(getSeniorityTier("nz_pgy1")).toBe(1);
  });

  it("maps UK consultant to tier 5", () => {
    expect(getSeniorityTier("uk_consultant")).toBe(5);
  });

  it("maps DE Chefarzt to tier 6 (department lead equivalent)", () => {
    expect(getSeniorityTier("de_chefarzt")).toBe(6);
  });

  it("maps US attending to tier 5", () => {
    expect(getSeniorityTier("us_attending")).toBe(5);
  });

  it("US fellow is tier 3 (senior trainee, not yet independent)", () => {
    expect(getSeniorityTier("us_fellow")).toBe(3);
  });

  it("legacy values still map correctly (backward compat)", () => {
    // Profiles written before the internationalization migration carry
    // these legacy values; mapping must survive.
    expect(getSeniorityTier("consultant_specialist")).toBe(5);
    expect(getSeniorityTier("fellow")).toBe(4);
    expect(getSeniorityTier("set_trainee")).toBe(3);
    expect(getSeniorityTier("registrar_non_training")).toBe(2);
    expect(getSeniorityTier("junior_house_officer")).toBe(1);
  });
});

describe("isSeniorTo", () => {
  it("returns true when senior tier > junior tier", () => {
    expect(isSeniorTo("nz_consultant", "nz_pgy1")).toBe(true);
    expect(isSeniorTo("uk_consultant", "uk_st_junior")).toBe(true);
  });

  it("returns false when tiers are equal", () => {
    // Same tier — both consultants, neither is senior to the other
    expect(isSeniorTo("nz_consultant", "uk_consultant")).toBe(false);
  });

  it("returns false when senior tier < junior tier", () => {
    expect(isSeniorTo("nz_pgy1", "nz_consultant")).toBe(false);
  });

  it("returns false when either stage is unknown", () => {
    expect(isSeniorTo("not_real", "nz_consultant")).toBe(false);
    expect(isSeniorTo("nz_consultant", "not_real")).toBe(false);
  });

  it("returns false when both are null/undefined", () => {
    expect(isSeniorTo(null, null)).toBe(false);
    expect(isSeniorTo(undefined, undefined)).toBe(false);
    expect(isSeniorTo(null, "nz_consultant")).toBe(false);
  });

  it("respects tier ladder for fellow vs MOSS (both tier 4 — neither senior)", () => {
    expect(isSeniorTo("nz_fellow", "nz_moss")).toBe(false);
    expect(isSeniorTo("nz_moss", "nz_fellow")).toBe(false);
  });

  it("respects tier ladder across countries", () => {
    // NZ PGY1 (tier 1) → UK consultant (tier 5): UK consultant is senior
    expect(isSeniorTo("uk_consultant", "nz_pgy1")).toBe(true);
    expect(isSeniorTo("nz_pgy1", "uk_consultant")).toBe(false);
  });
});

describe("CAREER_STAGE_TIERS coverage", () => {
  it("includes all 6 countries' stages", () => {
    const nz = Object.keys(CAREER_STAGE_TIERS).filter((k) =>
      k.startsWith("nz_"),
    );
    const uk = Object.keys(CAREER_STAGE_TIERS).filter((k) =>
      k.startsWith("uk_"),
    );
    const de = Object.keys(CAREER_STAGE_TIERS).filter((k) =>
      k.startsWith("de_"),
    );
    const ch = Object.keys(CAREER_STAGE_TIERS).filter((k) =>
      k.startsWith("ch_"),
    );
    const pl = Object.keys(CAREER_STAGE_TIERS).filter((k) =>
      k.startsWith("pl_"),
    );
    const us = Object.keys(CAREER_STAGE_TIERS).filter((k) =>
      k.startsWith("us_"),
    );
    expect(nz.length).toBeGreaterThan(0);
    expect(uk.length).toBeGreaterThan(0);
    expect(de.length).toBeGreaterThan(0);
    expect(ch.length).toBeGreaterThan(0);
    expect(pl.length).toBeGreaterThan(0);
    expect(us.length).toBeGreaterThan(0);
  });

  it("every tier 1-6 has at least one stage assigned", () => {
    const tiers = new Set(Object.values(CAREER_STAGE_TIERS));
    for (let i = 1 as const; i <= 6; i++) {
      expect(tiers.has(i as 1 | 2 | 3 | 4 | 5 | 6)).toBe(true);
    }
  });
});
