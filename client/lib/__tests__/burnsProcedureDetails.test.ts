/**
 * Burns Phase 4 Tests — Procedure-specific data capture helpers.
 */

import { describe, it, expect } from "vitest";
import {
  getBurnProcedureCategory,
  graftTypeShowsMeshRatio,
  getDefaultIntervalDays,
  calculateROMImprovement,
  getROMImprovementSeverity,
  inferGraftTypeFromProcedure,
  isBurnGraftProcedure,
  isBurnExcisionProcedure,
  isBurnDermalSubstituteProcedure,
  isBurnTemporaryCoverageProcedure,
  isBurnContractureReleaseProcedure,
  isBurnLaserProcedure,
} from "../burnsConfig";

// ═══════════════════════════════════════════════════════════════════════════════
// getBurnProcedureCategory
// ═══════════════════════════════════════════════════════════════════════════════

describe("getBurnProcedureCategory", () => {
  it("returns 'excision' for tangential excision", () => {
    expect(getBurnProcedureCategory("burns_acute_tangential_excision")).toBe(
      "excision",
    );
  });

  it("returns 'excision' for fascial excision", () => {
    expect(getBurnProcedureCategory("burns_acute_fascial_excision")).toBe(
      "excision",
    );
  });

  it("returns 'grafting' for STSG meshed", () => {
    expect(getBurnProcedureCategory("burns_graft_stsg_meshed")).toBe("grafting");
  });

  it("returns 'grafting' for FTSG", () => {
    expect(getBurnProcedureCategory("burns_graft_ftsg")).toBe("grafting");
  });

  it("returns 'grafting' for Meek", () => {
    expect(getBurnProcedureCategory("burns_graft_meek")).toBe("grafting");
  });

  it("returns 'grafting' for CEA", () => {
    expect(getBurnProcedureCategory("burns_graft_cea")).toBe("grafting");
  });

  it("returns 'grafting' for ReCell", () => {
    expect(getBurnProcedureCategory("burns_graft_recell")).toBe("grafting");
  });

  it("returns 'dermalSubstitute' for Integra", () => {
    expect(getBurnProcedureCategory("burns_sub_integra_bilayer")).toBe(
      "dermalSubstitute",
    );
  });

  it("returns 'dermalSubstitute' for BTM", () => {
    expect(getBurnProcedureCategory("burns_sub_btm")).toBe("dermalSubstitute");
  });

  it("returns 'temporaryCoverage' for allograft", () => {
    expect(getBurnProcedureCategory("burns_temp_allograft")).toBe(
      "temporaryCoverage",
    );
  });

  it("returns 'temporaryCoverage' for xenograft", () => {
    expect(getBurnProcedureCategory("burns_temp_xenograft")).toBe(
      "temporaryCoverage",
    );
  });

  it("returns 'contractureRelease' for contracture release", () => {
    expect(getBurnProcedureCategory("burns_recon_contracture_release")).toBe(
      "contractureRelease",
    );
  });

  it("returns 'contractureRelease' for contracture graft", () => {
    expect(getBurnProcedureCategory("burns_recon_contracture_graft")).toBe(
      "contractureRelease",
    );
  });

  it("returns 'laser' for CO2 fractional", () => {
    expect(getBurnProcedureCategory("burns_scar_laser_co2")).toBe("laser");
  });

  it("returns 'laser' for pulsed dye", () => {
    expect(getBurnProcedureCategory("burns_scar_laser_pulsed_dye")).toBe(
      "laser",
    );
  });

  it("returns null for non-burn procedure", () => {
    expect(getBurnProcedureCategory("hand_trauma_orif")).toBeNull();
  });

  it("returns null for burn procedures without specific details", () => {
    expect(getBurnProcedureCategory("burns_acute_escharotomy")).toBeNull();
  });

  it("returns null for free flap (handled by existing free flap module)", () => {
    expect(getBurnProcedureCategory("burns_acute_free_flap")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// graftTypeShowsMeshRatio
// ═══════════════════════════════════════════════════════════════════════════════

describe("graftTypeShowsMeshRatio", () => {
  it("returns true for stsg_meshed", () => {
    expect(graftTypeShowsMeshRatio("stsg_meshed")).toBe(true);
  });

  it("returns true for meek", () => {
    expect(graftTypeShowsMeshRatio("meek")).toBe(true);
  });

  it("returns false for stsg_sheet", () => {
    expect(graftTypeShowsMeshRatio("stsg_sheet")).toBe(false);
  });

  it("returns false for ftsg", () => {
    expect(graftTypeShowsMeshRatio("ftsg")).toBe(false);
  });

  it("returns false for cea", () => {
    expect(graftTypeShowsMeshRatio("cea")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(graftTypeShowsMeshRatio(undefined)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getDefaultIntervalDays
// ═══════════════════════════════════════════════════════════════════════════════

describe("getDefaultIntervalDays", () => {
  it("returns 21 for Integra bilayer", () => {
    expect(getDefaultIntervalDays("integra_bilayer")).toBe(21);
  });

  it("returns 14 for BTM/NovoSorb", () => {
    expect(getDefaultIntervalDays("btm_novosorb")).toBe(14);
  });

  it("returns 0 for Matriderm (simultaneous)", () => {
    expect(getDefaultIntervalDays("matriderm")).toBe(0);
  });

  it("returns undefined for unknown product", () => {
    expect(getDefaultIntervalDays("alloderm")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(getDefaultIntervalDays(undefined)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// calculateROMImprovement
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculateROMImprovement", () => {
  it("returns improvement in degrees", () => {
    expect(calculateROMImprovement(30, 90)).toBe(60);
  });

  it("returns 0 for no change", () => {
    expect(calculateROMImprovement(45, 45)).toBe(0);
  });

  it("returns negative for worsened ROM", () => {
    expect(calculateROMImprovement(90, 60)).toBe(-30);
  });

  it("returns undefined when pre is missing", () => {
    expect(calculateROMImprovement(undefined, 90)).toBeUndefined();
  });

  it("returns undefined when post is missing", () => {
    expect(calculateROMImprovement(30, undefined)).toBeUndefined();
  });

  it("returns undefined when both missing", () => {
    expect(calculateROMImprovement(undefined, undefined)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getROMImprovementSeverity
// ═══════════════════════════════════════════════════════════════════════════════

describe("getROMImprovementSeverity", () => {
  it("returns 'good' for ≥30°", () => {
    expect(getROMImprovementSeverity(30)).toBe("good");
    expect(getROMImprovementSeverity(60)).toBe("good");
  });

  it("returns 'moderate' for 10-29°", () => {
    expect(getROMImprovementSeverity(10)).toBe("moderate");
    expect(getROMImprovementSeverity(29)).toBe("moderate");
  });

  it("returns 'minimal' for <10°", () => {
    expect(getROMImprovementSeverity(9)).toBe("minimal");
    expect(getROMImprovementSeverity(0)).toBe("minimal");
    expect(getROMImprovementSeverity(-5)).toBe("minimal");
  });

  it("returns undefined for undefined input", () => {
    expect(getROMImprovementSeverity(undefined)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// inferGraftTypeFromProcedure
// ═══════════════════════════════════════════════════════════════════════════════

describe("inferGraftTypeFromProcedure", () => {
  it("infers stsg_sheet", () => {
    expect(inferGraftTypeFromProcedure("burns_graft_stsg_sheet")).toBe(
      "stsg_sheet",
    );
  });

  it("infers stsg_meshed", () => {
    expect(inferGraftTypeFromProcedure("burns_graft_stsg_meshed")).toBe(
      "stsg_meshed",
    );
  });

  it("infers ftsg", () => {
    expect(inferGraftTypeFromProcedure("burns_graft_ftsg")).toBe("ftsg");
  });

  it("infers meek", () => {
    expect(inferGraftTypeFromProcedure("burns_graft_meek")).toBe("meek");
  });

  it("infers cea", () => {
    expect(inferGraftTypeFromProcedure("burns_graft_cea")).toBe("cea");
  });

  it("infers recell", () => {
    expect(inferGraftTypeFromProcedure("burns_graft_recell")).toBe("recell");
  });

  it("returns undefined for non-graft procedure", () => {
    expect(
      inferGraftTypeFromProcedure("burns_acute_tangential_excision"),
    ).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Legacy individual detection helpers (backward compat)
// ═══════════════════════════════════════════════════════════════════════════════

describe("individual procedure detection helpers", () => {
  it("isBurnGraftProcedure detects graft procedures", () => {
    expect(isBurnGraftProcedure("burns_graft_stsg_sheet")).toBe(true);
    expect(isBurnGraftProcedure("burns_graft_meek")).toBe(true);
    expect(isBurnGraftProcedure("burns_acute_escharotomy")).toBe(false);
  });

  it("isBurnExcisionProcedure detects excision procedures", () => {
    expect(isBurnExcisionProcedure("burns_acute_tangential_excision")).toBe(
      true,
    );
    expect(isBurnExcisionProcedure("burns_acute_fascial_excision")).toBe(true);
    expect(isBurnExcisionProcedure("burns_graft_stsg_sheet")).toBe(false);
  });

  it("isBurnDermalSubstituteProcedure detects dermal subs", () => {
    expect(isBurnDermalSubstituteProcedure("burns_sub_integra_bilayer")).toBe(
      true,
    );
    expect(isBurnDermalSubstituteProcedure("burns_sub_btm")).toBe(true);
    expect(isBurnDermalSubstituteProcedure("burns_graft_stsg_sheet")).toBe(
      false,
    );
  });

  it("isBurnTemporaryCoverageProcedure detects temp coverage", () => {
    expect(isBurnTemporaryCoverageProcedure("burns_temp_allograft")).toBe(true);
    expect(isBurnTemporaryCoverageProcedure("burns_sub_btm")).toBe(false);
  });

  it("isBurnContractureReleaseProcedure detects contracture release", () => {
    expect(
      isBurnContractureReleaseProcedure("burns_recon_contracture_release"),
    ).toBe(true);
    expect(
      isBurnContractureReleaseProcedure("burns_recon_contracture_graft"),
    ).toBe(true);
    expect(isBurnContractureReleaseProcedure("burns_recon_zplasty")).toBe(
      false,
    );
  });

  it("isBurnLaserProcedure detects laser procedures", () => {
    expect(isBurnLaserProcedure("burns_scar_laser_co2")).toBe(true);
    expect(isBurnLaserProcedure("burns_scar_laser_pulsed_dye")).toBe(true);
    expect(isBurnLaserProcedure("burns_scar_steroid_injection")).toBe(false);
  });
});
