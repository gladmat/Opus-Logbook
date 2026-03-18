/**
 * Burns Phase 5 Tests — Export helpers (CSV, FHIR, PDF).
 */

import { describe, it, expect } from "vitest";
import {
  extractBurnsCsvFields,
  BURNS_CSV_HEADERS,
  buildBurnsFhirExtension,
  buildBurnProcedureFhirExtension,
  getBurnsPdfSummary,
} from "../burnsExport";
import type { DiagnosisGroup } from "../../types/case";
import type { BurnsAssessmentData, BurnProcedureDetails } from "../../types/burns";

// ─── Test helpers ───────────────────────────────────────────────────────────

function makeGroup(
  ba: BurnsAssessmentData,
  procedures: Array<{
    id: string;
    picklistEntryId: string;
    procedureName: string;
    burnProcedureDetails?: BurnProcedureDetails;
  }> = [],
): DiagnosisGroup {
  return {
    id: "g1",
    specialty: "burns",
    diagnosis: undefined,
    procedures: procedures.map((p) => ({
      ...p,
      snomedCtCode: "",
      snomedCtDisplay: "",
    })),
    burnsAssessment: ba,
  } as unknown as DiagnosisGroup;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSV Export
// ═══════════════════════════════════════════════════════════════════════════════

describe("extractBurnsCsvFields", () => {
  it("returns empty fields when no burns assessment", () => {
    const result = extractBurnsCsvFields([{} as DiagnosisGroup]);
    expect(result.burn_phase).toBe("");
    expect(result.burn_tbsa_total).toBe("");
  });

  it("extracts assessment-level fields", () => {
    const ba: BurnsAssessmentData = {
      phase: "acute",
      tbsa: { totalTBSA: 25, partialThicknessTBSA: 15, fullThicknessTBSA: 10 },
      injuryEvent: { mechanism: "thermal", inhalationInjury: true },
    };
    const result = extractBurnsCsvFields([makeGroup(ba)]);
    expect(result.burn_phase).toBe("Acute");
    expect(result.burn_tbsa_total).toBe("25");
    expect(result.burn_tbsa_partial).toBe("15");
    expect(result.burn_tbsa_full).toBe("10");
    expect(result.burn_mechanism).toBe("Thermal");
    expect(result.burn_inhalation).toBe("Yes");
  });

  it("extracts procedure-level graft fields", () => {
    const ba: BurnsAssessmentData = { phase: "acute" };
    const group = makeGroup(ba, [
      {
        id: "p1",
        picklistEntryId: "burns_graft_stsg_meshed",
        procedureName: "STSG Meshed",
        burnProcedureDetails: {
          grafting: {
            graftType: "stsg_meshed",
            donorSite: "thigh_anterior",
            meshRatio: "1:1.5",
            graftTakePercentage: 95,
          },
        },
      },
    ]);
    const result = extractBurnsCsvFields([group]);
    expect(result.burn_graft_type).toBe("STSG — Meshed");
    expect(result.burn_graft_donor).toBe("Thigh (Anterior)");
    expect(result.burn_mesh_ratio).toBe("1:1.5");
    expect(result.burn_graft_take_pct).toBe("95");
  });

  it("extracts contracture ROM fields", () => {
    const ba: BurnsAssessmentData = { phase: "reconstructive" };
    const group = makeGroup(ba, [
      {
        id: "p1",
        picklistEntryId: "burns_recon_contracture_release",
        procedureName: "Contracture Release",
        burnProcedureDetails: {
          contractureRelease: {
            joint: "elbow",
            romPreOpDegrees: 30,
            romPostOpDegrees: 120,
          },
        },
      },
    ]);
    const result = extractBurnsCsvFields([group]);
    expect(result.burn_contracture_joint).toBe("Elbow");
    expect(result.burn_rom_pre).toBe("30°");
    expect(result.burn_rom_post).toBe("120°");
  });

  it("extracts outcome fields", () => {
    const ba: BurnsAssessmentData = {
      phase: "acute",
      outcomes: {
        lengthOfStayDays: 14,
        icuDays: 5,
        complications: ["wound_infection", "vte"],
        vancouverScarScale: {
          vascularity: 2,
          pigmentation: 1,
          pliability: 3,
          height: 1,
        },
        posasObserver: {
          vascularity: 4,
          pigmentation: 3,
          thickness: 5,
          relief: 4,
          pliability: 3,
          surfaceArea: 4,
          overallOpinion: 5,
        },
      },
    };
    const result = extractBurnsCsvFields([makeGroup(ba)]);
    expect(result.burn_los_days).toBe("14");
    expect(result.burn_icu_days).toBe("5");
    expect(result.burn_complications).toBe("Wound Infection; VTE");
    expect(result.burn_vss_total).toBe("7");
    expect(result.burn_posas_total).toBe("28");
  });

  it("has correct number of headers", () => {
    expect(BURNS_CSV_HEADERS.length).toBe(20);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FHIR Export
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildBurnsFhirExtension", () => {
  it("builds extensions for full assessment", () => {
    const ba: BurnsAssessmentData = {
      phase: "acute",
      tbsa: { totalTBSA: 20, partialThicknessTBSA: 12, fullThicknessTBSA: 8 },
      injuryEvent: { mechanism: "thermal", inhalationInjury: true },
    };
    const ext = buildBurnsFhirExtension(ba);
    expect(ext).toContainEqual({ url: "phase", valueString: "acute" });
    expect(ext).toContainEqual({ url: "tbsaTotal", valueDecimal: 20 });
    expect(ext).toContainEqual({ url: "tbsaPartial", valueDecimal: 12 });
    expect(ext).toContainEqual({ url: "tbsaFull", valueDecimal: 8 });
    expect(ext).toContainEqual({ url: "mechanism", valueString: "thermal" });
    expect(ext).toContainEqual({ url: "inhalationInjury", valueBoolean: true });
  });

  it("omits undefined fields", () => {
    const ba: BurnsAssessmentData = { phase: "reconstructive" };
    const ext = buildBurnsFhirExtension(ba);
    expect(ext.length).toBe(1); // only phase
  });
});

describe("buildBurnProcedureFhirExtension", () => {
  it("builds extensions for excision procedure", () => {
    const details: BurnProcedureDetails = {
      excision: { tbsaExcised: 8, excisionDepth: "viable_dermis" },
    };
    const ext = buildBurnProcedureFhirExtension(details);
    expect(ext).toContainEqual({ url: "excisionTbsa", valueDecimal: 8 });
    expect(ext).toContainEqual({ url: "excisionDepth", valueString: "viable_dermis" });
  });

  it("builds extensions for graft procedure", () => {
    const details: BurnProcedureDetails = {
      grafting: {
        graftType: "stsg_meshed",
        donorSite: "thigh_anterior",
        meshRatio: "1:1.5",
        graftTakePercentage: 90,
      },
    };
    const ext = buildBurnProcedureFhirExtension(details);
    expect(ext).toContainEqual({ url: "graftType", valueString: "stsg_meshed" });
    expect(ext).toContainEqual({ url: "graftDonorSite", valueString: "thigh_anterior" });
    expect(ext).toContainEqual({ url: "meshRatio", valueString: "1:1.5" });
    expect(ext).toContainEqual({ url: "graftTake", valueDecimal: 90 });
  });

  it("builds extensions for contracture release", () => {
    const details: BurnProcedureDetails = {
      contractureRelease: {
        joint: "neck",
        romPreOpDegrees: 20,
        romPostOpDegrees: 80,
      },
    };
    const ext = buildBurnProcedureFhirExtension(details);
    expect(ext).toContainEqual({ url: "contractureJoint", valueString: "neck" });
    expect(ext).toContainEqual({ url: "romPreOp", valueDecimal: 20 });
    expect(ext).toContainEqual({ url: "romPostOp", valueDecimal: 80 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PDF Export
// ═══════════════════════════════════════════════════════════════════════════════

describe("getBurnsPdfSummary", () => {
  it("generates summary for acute burn", () => {
    const ba: BurnsAssessmentData = {
      phase: "acute",
      tbsa: { totalTBSA: 25 },
      injuryEvent: { mechanism: "thermal", inhalationInjury: true },
    };
    const summary = getBurnsPdfSummary([makeGroup(ba)]);
    expect(summary).toContain("Acute");
    expect(summary).toContain("25% TBSA");
    expect(summary).toContain("Thermal");
    expect(summary).toContain("inhalation");
  });

  it("includes graft details in summary", () => {
    const ba: BurnsAssessmentData = { phase: "acute" };
    const group = makeGroup(ba, [
      {
        id: "p1",
        picklistEntryId: "burns_graft_stsg_meshed",
        procedureName: "STSG Meshed",
        burnProcedureDetails: {
          grafting: {
            graftType: "stsg_meshed",
            meshRatio: "1:1.5",
            donorSite: "thigh_anterior",
          },
        },
      },
    ]);
    const summary = getBurnsPdfSummary([group]);
    expect(summary).toContain("STSG — Meshed");
    expect(summary).toContain("1:1.5");
  });

  it("includes contracture ROM in summary", () => {
    const ba: BurnsAssessmentData = { phase: "reconstructive" };
    const group = makeGroup(ba, [
      {
        id: "p1",
        picklistEntryId: "burns_recon_contracture_release",
        procedureName: "Contracture Release",
        burnProcedureDetails: {
          contractureRelease: {
            joint: "elbow",
            romPreOpDegrees: 30,
            romPostOpDegrees: 120,
          },
        },
      },
    ]);
    const summary = getBurnsPdfSummary([group]);
    expect(summary).toContain("Elbow ROM 30°→120°");
  });

  it("returns empty string when no burns assessment", () => {
    expect(getBurnsPdfSummary([{} as DiagnosisGroup])).toBe("");
  });
});
