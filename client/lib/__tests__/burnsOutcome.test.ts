/**
 * Burns Phase 5 Tests — Outcome helpers (VSS, POSAS, export).
 */

import { describe, it, expect } from "vitest";
import {
  calculateVSSTotal,
  getVSSSeverity,
  calculatePOSASTotal,
  calculateROMImprovement,
} from "../burnsConfig";

// ═══════════════════════════════════════════════════════════════════════════════
// Vancouver Scar Scale
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculateVSSTotal", () => {
  it("sums all 4 dimensions", () => {
    expect(
      calculateVSSTotal({
        vascularity: 2,
        pigmentation: 1,
        pliability: 3,
        height: 2,
      }),
    ).toBe(8);
  });

  it("treats missing dimensions as 0", () => {
    expect(calculateVSSTotal({ vascularity: 3 })).toBe(3);
  });

  it("returns 0 for empty input", () => {
    expect(calculateVSSTotal({})).toBe(0);
  });

  it("returns max 13 for worst scores", () => {
    expect(
      calculateVSSTotal({
        vascularity: 3,
        pigmentation: 2,
        pliability: 5,
        height: 3,
      }),
    ).toBe(13);
  });
});

describe("getVSSSeverity", () => {
  it("returns minimal for ≤4", () => {
    expect(getVSSSeverity(0)).toBe("minimal");
    expect(getVSSSeverity(4)).toBe("minimal");
  });

  it("returns moderate for 5-8", () => {
    expect(getVSSSeverity(5)).toBe("moderate");
    expect(getVSSSeverity(8)).toBe("moderate");
  });

  it("returns severe for ≥9", () => {
    expect(getVSSSeverity(9)).toBe("severe");
    expect(getVSSSeverity(13)).toBe("severe");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POSAS Observer
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculatePOSASTotal", () => {
  it("sums all 7 dimensions", () => {
    expect(
      calculatePOSASTotal({
        vascularity: 3,
        pigmentation: 4,
        thickness: 5,
        relief: 6,
        pliability: 2,
        surfaceArea: 3,
        overallOpinion: 7,
      }),
    ).toBe(30);
  });

  it("treats missing dimensions as 0", () => {
    expect(calculatePOSASTotal({ vascularity: 5, thickness: 3 })).toBe(8);
  });

  it("returns 0 for empty input", () => {
    expect(calculatePOSASTotal({})).toBe(0);
  });

  it("returns max 70 for worst scores", () => {
    expect(
      calculatePOSASTotal({
        vascularity: 10,
        pigmentation: 10,
        thickness: 10,
        relief: 10,
        pliability: 10,
        surfaceArea: 10,
        overallOpinion: 10,
      }),
    ).toBe(70);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROM Improvement (from burnsConfig, tested in context of outcomes)
// ═══════════════════════════════════════════════════════════════════════════════

describe("ROM improvement in outcome context", () => {
  it("good improvement for contracture release", () => {
    // Typical contracture: pre 30°, post 120° = +90° improvement
    expect(calculateROMImprovement(30, 120)).toBe(90);
  });

  it("moderate improvement", () => {
    // Moderate: pre 60°, post 80° = +20°
    expect(calculateROMImprovement(60, 80)).toBe(20);
  });

  it("zero when no change", () => {
    expect(calculateROMImprovement(90, 90)).toBe(0);
  });
});
