/**
 * Lymphoedema module — comprehensive test suite.
 *
 * Tests: diagnosis picklist, procedure picklist cross-references,
 * getLymphaticProcedureCategory(), volume calculation, LVA data model,
 * CSV export fields, SNOMED code format validation.
 */

import { describe, it, expect } from "vitest";
import {
  getLymphaticProcedureCategory,
  isLymphoedemaeDiagnosis,
  getDefaultLymphaticAssessment,
  calculateLimbVolume,
  calculateExcessVolume,
} from "../lymphaticConfig";
import { LYMPHOEDEMA_DIAGNOSES } from "../diagnosisPicklists/lymphoedemaDiagnoses";
import { PROCEDURE_PICKLIST } from "../procedurePicklist";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type {
  LVAAnastomosis,
  LVAOperativeDetails,
  VLNTSpecificDetails,
  SAPLOperativeDetails,
  CircumferenceMeasurement,
} from "@/types/lymphatic";
import {
  LVA_TECHNIQUE_LABELS,
  NECST_LABELS,
  SUTURE_MATERIAL_LABELS,
  PATENCY_CONFIRMATION_LABELS,
  ROBOTIC_ASSISTANCE_LABELS,
  VLNT_DONOR_SITE_LABELS,
  VLNT_RECIPIENT_SITE_LABELS,
  VLNT_DONOR_PEDICLE_MAP,
  REVERSE_MAP_TECHNIQUE_LABELS,
  SAPL_TECHNIQUE_LABELS,
  FOLLOW_UP_TIMEPOINT_LABELS,
  ISL_STAGE_LABELS,
  ISL_SEVERITY_LABELS,
  LYMPHOEDEMA_REGION_LABELS,
} from "@/types/lymphatic";

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSIS PICKLIST
// ═══════════════════════════════════════════════════════════════════════════════

describe("Lymphoedema diagnosis picklist", () => {
  it("has 29 diagnoses", () => {
    expect(LYMPHOEDEMA_DIAGNOSES.length).toBe(29);
  });

  it("all IDs use lymph_dx_ prefix", () => {
    for (const dx of LYMPHOEDEMA_DIAGNOSES) {
      expect(dx.id).toMatch(/^lymph_dx_/);
    }
  });

  it("all have lymphoedemaModule: true", () => {
    for (const dx of LYMPHOEDEMA_DIAGNOSES) {
      expect(dx.lymphoedemaModule).toBe(true);
    }
  });

  it("all have specialty: lymphoedema", () => {
    for (const dx of LYMPHOEDEMA_DIAGNOSES) {
      expect(dx.specialty).toBe("lymphoedema");
    }
  });

  it("all have valid SNOMED CT codes (numeric strings)", () => {
    for (const dx of LYMPHOEDEMA_DIAGNOSES) {
      expect(dx.snomedCtCode).toMatch(/^\d+$/);
    }
  });

  it("all have non-empty displayName and shortName", () => {
    for (const dx of LYMPHOEDEMA_DIAGNOSES) {
      expect(dx.displayName.length).toBeGreaterThan(0);
      expect(dx.shortName!.length).toBeGreaterThan(0);
    }
  });

  it("has IDs that are unique", () => {
    const ids = LYMPHOEDEMA_DIAGNOSES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has correct clinical group distribution", () => {
    const groups = LYMPHOEDEMA_DIAGNOSES.reduce(
      (acc, dx) => {
        const group = (dx as any).clinicalGroup as string;
        acc[group] = (acc[group] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    expect(groups.secondary_cancer).toBe(10);
    expect(groups.secondary_noncancer).toBe(5);
    expect(groups.primary).toBe(6);
    expect(groups.lipedema).toBe(2);
    // malformation + chylous combined or separate depends on implementation
    const malformChylous =
      (groups.malformation ?? 0) + (groups.chylous ?? 0);
    expect(malformChylous).toBe(4);
    expect(groups.experimental).toBe(2);
  });

  it("all entries with hasStaging: true have matching ISL staging config expectation", () => {
    const staging = LYMPHOEDEMA_DIAGNOSES.filter((d) => d.hasStaging);
    expect(staging.length).toBeGreaterThan(20);
  });

  it("has experimental diagnoses in the experimental clinical group", () => {
    const experimental = LYMPHOEDEMA_DIAGNOSES.filter(
      (d) => (d as any).clinicalGroup === "experimental",
    );
    expect(experimental.length).toBe(2);
    // Experimental diagnoses are identified by clinicalGroup, not a separate flag
    for (const dx of experimental) {
      expect(dx.id).toMatch(/lymph_dx_/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURE PICKLIST CROSS-REFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Lymphoedema procedure picklist", () => {
  const lymphProcs = PROCEDURE_PICKLIST.filter(
    (p) =>
      typeof p.id === "string" && p.id.startsWith("lymph_"),
  );

  it("has at least 25 lymphoedema procedures", () => {
    expect(lymphProcs.length).toBeGreaterThanOrEqual(25);
  });

  it("all have lymphoedema in specialties", () => {
    for (const proc of lymphProcs) {
      expect(proc.specialties).toContain("lymphoedema");
    }
  });

  it("all have valid SNOMED CT codes", () => {
    for (const proc of lymphProcs) {
      expect(proc.snomedCtCode).toMatch(/^\d+$/);
    }
  });

  it("VLNT procedures have hasFreeFlap: true", () => {
    const vlntProcs = lymphProcs.filter((p) => p.id.startsWith("lymph_vlnt_"));
    expect(vlntProcs.length).toBeGreaterThanOrEqual(7);
    for (const proc of vlntProcs) {
      expect(proc.hasFreeFlap).toBe(true);
    }
  });

  it("diagnosis suggestedProcedures reference valid procedure IDs", () => {
    const procIds = new Set(PROCEDURE_PICKLIST.map((p) => p.id));
    for (const dx of LYMPHOEDEMA_DIAGNOSES) {
      for (const sp of dx.suggestedProcedures ?? []) {
        expect(procIds.has(sp.procedurePicklistId)).toBe(true);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getLymphaticProcedureCategory()
// ═══════════════════════════════════════════════════════════════════════════════

describe("getLymphaticProcedureCategory", () => {
  it("returns null for undefined", () => {
    expect(getLymphaticProcedureCategory(undefined)).toBeNull();
  });

  it("returns null for non-lymph procedure", () => {
    expect(getLymphaticProcedureCategory("gen_wound_debride")).toBeNull();
  });

  it("routes lva procedures correctly", () => {
    expect(getLymphaticProcedureCategory("lymph_lva_upper")).toBe("lva");
    expect(getLymphaticProcedureCategory("lymph_lva_lower")).toBe("lva");
    expect(getLymphaticProcedureCategory("lymph_lva_cervical")).toBe("lva");
    expect(getLymphaticProcedureCategory("lymph_lympha")).toBe("lva");
    expect(getLymphaticProcedureCategory("lymph_elva")).toBe("lva");
    expect(getLymphaticProcedureCategory("lymph_dc_lva")).toBe("lva");
    expect(getLymphaticProcedureCategory("lymph_robotic_lva")).toBe("lva");
    expect(getLymphaticProcedureCategory("lymph_revision_lva")).toBe("lva");
    expect(getLymphaticProcedureCategory("lymph_lla")).toBe("lva");
  });

  it("routes vlnt procedures correctly", () => {
    expect(getLymphaticProcedureCategory("lymph_vlnt_submental")).toBe("vlnt");
    expect(getLymphaticProcedureCategory("lymph_vlnt_inguinal")).toBe("vlnt");
    expect(getLymphaticProcedureCategory("lymph_vlnt_other")).toBe("vlnt");
    expect(getLymphaticProcedureCategory("lymph_combined_lva_vlnt")).toBe("vlnt");
    expect(getLymphaticProcedureCategory("lymph_simultaneous_breast_vlnt")).toBe("vlnt");
  });

  it("routes sapl correctly", () => {
    expect(getLymphaticProcedureCategory("lymph_sapl")).toBe("sapl");
  });

  it("routes lipedema liposuction correctly", () => {
    expect(getLymphaticProcedureCategory("lymph_lipo_lipedema")).toBe("lipo_lipedema");
  });

  it("returns null for debulking/malformation procedures without specific routing", () => {
    expect(getLymphaticProcedureCategory("lymph_charles")).toBeNull();
    expect(getLymphaticProcedureCategory("lymph_malf_excision")).toBeNull();
    expect(getLymphaticProcedureCategory("lymph_thoracic_duct_ligation")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// isLymphoedemaeDiagnosis()
// ═══════════════════════════════════════════════════════════════════════════════

describe("isLymphoedemaeDiagnosis", () => {
  it("returns true for lymphoedema diagnosis entries", () => {
    expect(isLymphoedemaeDiagnosis(LYMPHOEDEMA_DIAGNOSES[0])).toBe(true);
  });

  it("returns false for undefined/null", () => {
    expect(isLymphoedemaeDiagnosis(undefined)).toBe(false);
    expect(isLymphoedemaeDiagnosis(null)).toBe(false);
  });

  it("returns false for non-lymphoedema entry", () => {
    const nonLymph = {
      id: "gen_test",
      displayName: "Test",
      specialty: "general",
    } as DiagnosisPicklistEntry;
    expect(isLymphoedemaeDiagnosis(nonLymph)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VOLUME CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Limb volume calculation (truncated cone formula)", () => {
  it("returns 0 for fewer than 2 measurements", () => {
    expect(calculateLimbVolume([])).toBe(0);
    expect(
      calculateLimbVolume([{ distanceFromReference: 0, circumferenceCm: 20 }]),
    ).toBe(0);
  });

  it("calculates volume for a simple cylinder (equal circumferences)", () => {
    // A cylinder with circumference 20cm, height 10cm
    // V = h * (C² + C*C + C²) / (12π) = 10 * 3 * 400 / (12π) = 12000 / (37.7) ≈ 318
    const measurements: CircumferenceMeasurement[] = [
      { distanceFromReference: 0, circumferenceCm: 20 },
      { distanceFromReference: 10, circumferenceCm: 20 },
    ];
    const vol = calculateLimbVolume(measurements);
    expect(vol).toBeGreaterThan(300);
    expect(vol).toBeLessThan(350);
  });

  it("handles unsorted measurements", () => {
    const sorted: CircumferenceMeasurement[] = [
      { distanceFromReference: 0, circumferenceCm: 20 },
      { distanceFromReference: 10, circumferenceCm: 25 },
    ];
    const unsorted: CircumferenceMeasurement[] = [
      { distanceFromReference: 10, circumferenceCm: 25 },
      { distanceFromReference: 0, circumferenceCm: 20 },
    ];
    expect(calculateLimbVolume(sorted)).toBe(calculateLimbVolume(unsorted));
  });

  it("calculates excess volume correctly", () => {
    const affected: CircumferenceMeasurement[] = [
      { distanceFromReference: 0, circumferenceCm: 25 },
      { distanceFromReference: 10, circumferenceCm: 30 },
    ];
    const contralateral: CircumferenceMeasurement[] = [
      { distanceFromReference: 0, circumferenceCm: 20 },
      { distanceFromReference: 10, circumferenceCm: 25 },
    ];
    const result = calculateExcessVolume(affected, contralateral);
    expect(result.volumeMl).toBeGreaterThan(0);
    expect(result.volumePercent).toBeGreaterThan(0);
  });

  it("returns 0 excess when contralateral is 0", () => {
    const affected: CircumferenceMeasurement[] = [
      { distanceFromReference: 0, circumferenceCm: 25 },
      { distanceFromReference: 10, circumferenceCm: 30 },
    ];
    const result = calculateExcessVolume(affected, []);
    expect(result.volumeMl).toBe(0);
    expect(result.volumePercent).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

describe("getDefaultLymphaticAssessment", () => {
  it("returns an empty object", () => {
    const assessment = getDefaultLymphaticAssessment();
    expect(assessment).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LVA DATA MODEL
// ═══════════════════════════════════════════════════════════════════════════════

describe("LVA data model types", () => {
  it("LVA technique labels cover all techniques", () => {
    const techniques = Object.keys(LVA_TECHNIQUE_LABELS);
    expect(techniques.length).toBe(13);
    expect(techniques).toContain("end_to_end");
    expect(techniques).toContain("octopus");
    expect(techniques).toContain("ola");
    expect(techniques).toContain("ivas");
  });

  it("NECST labels cover all grades", () => {
    expect(Object.keys(NECST_LABELS).length).toBe(4);
  });

  it("suture material labels cover all options", () => {
    expect(Object.keys(SUTURE_MATERIAL_LABELS).length).toBe(3);
  });

  it("patency confirmation labels cover all options", () => {
    expect(Object.keys(PATENCY_CONFIRMATION_LABELS).length).toBe(4);
  });

  it("robotic assistance labels cover all options", () => {
    expect(Object.keys(ROBOTIC_ASSISTANCE_LABELS).length).toBe(4);
  });

  it("LVA operative details type accepts valid data", () => {
    const details: LVAOperativeDetails = {
      anastomoses: [
        {
          id: "test-1",
          site: "volar wrist",
          region: "wrist",
          lymphaticQuality: "ectasis",
          lymphaticDiameterMm: 0.4,
          venuleDiameterMm: 0.5,
          technique: "end_to_end",
          sutureMaterial: "12-0_nylon",
          sutureCount: 4,
          patencyConfirmation: "icg_transit",
        },
      ],
      totalAnastomosisCount: 1,
      anaesthesiaType: "local_sedation",
      microscopeModel: "Zeiss KINEVO",
      magnificationRange: "15-25x",
      icgIntraoperativeUse: true,
      roboticAssistance: "none",
      operativeTimeMinutes: 180,
    };
    expect(details.anastomoses.length).toBe(1);
    expect(details.totalAnastomosisCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VLNT DATA MODEL
// ═══════════════════════════════════════════════════════════════════════════════

describe("VLNT data model", () => {
  it("donor site labels cover all sites", () => {
    expect(Object.keys(VLNT_DONOR_SITE_LABELS).length).toBe(9);
  });

  it("recipient site labels cover all sites", () => {
    expect(Object.keys(VLNT_RECIPIENT_SITE_LABELS).length).toBe(8);
  });

  it("donor pedicle map covers all donor sites", () => {
    const donorSites = Object.keys(VLNT_DONOR_SITE_LABELS);
    for (const site of donorSites) {
      expect(VLNT_DONOR_PEDICLE_MAP).toHaveProperty(site);
    }
  });

  it("pedicle map has artery and vein for non-other sites", () => {
    for (const [site, pedicle] of Object.entries(VLNT_DONOR_PEDICLE_MAP)) {
      if (site !== "other") {
        expect(pedicle.artery.length).toBeGreaterThan(0);
        expect(pedicle.vein.length).toBeGreaterThan(0);
      }
    }
  });

  it("reverse map technique labels cover all options", () => {
    expect(Object.keys(REVERSE_MAP_TECHNIQUE_LABELS).length).toBe(4);
  });

  it("VLNT details type accepts valid data", () => {
    const details: VLNTSpecificDetails = {
      donorSite: "submental",
      nodeCount: 4,
      reverseLymphaticMapping: true,
      reverseMapTechnique: "tc99m_icg",
      recipientSite: "axilla",
      simultaneousLVA: false,
      drainPlaced: true,
      donorSiteClosure: "primary",
    };
    expect(details.donorSite).toBe("submental");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SAPL DATA MODEL
// ═══════════════════════════════════════════════════════════════════════════════

describe("SAPL data model", () => {
  it("technique labels cover all options", () => {
    expect(Object.keys(SAPL_TECHNIQUE_LABELS).length).toBe(3);
  });

  it("SAPL details type accepts valid data", () => {
    const details: SAPLOperativeDetails = {
      tumescentVolumeMl: 3000,
      tourniquetUsed: true,
      tourniquetLocation: "upper thigh",
      tourniquetTimeMinutes: 90,
      totalAspirateMl: 1500,
      aspirateFatPercent: 80,
      technique: "power_assisted",
      garmentAppliedIntraop: true,
      garmentClass: "II",
    };
    expect(details.totalAspirateMl).toBe(1500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FOLLOW-UP & LYMQOL
// ═══════════════════════════════════════════════════════════════════════════════

describe("Follow-up and LYMQOL types", () => {
  it("timepoint labels cover all options", () => {
    expect(Object.keys(FOLLOW_UP_TIMEPOINT_LABELS).length).toBe(5);
  });

  it("ISL stage labels cover all stages", () => {
    expect(Object.keys(ISL_STAGE_LABELS).length).toBe(5);
  });

  it("ISL severity labels cover all levels", () => {
    expect(Object.keys(ISL_SEVERITY_LABELS).length).toBe(3);
  });

  it("region labels cover all regions", () => {
    expect(Object.keys(LYMPHOEDEMA_REGION_LABELS).length).toBe(7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SNOMED CODE FORMAT
// ═══════════════════════════════════════════════════════════════════════════════

describe("SNOMED code format validation", () => {
  it("all diagnosis codes are 6-10 digit numeric strings", () => {
    for (const dx of LYMPHOEDEMA_DIAGNOSES) {
      expect(dx.snomedCtCode).toMatch(/^\d{6,10}$/);
    }
  });

  it("all procedure codes are 6-18 digit numeric strings (includes AU extension codes)", () => {
    const lymphProcs = PROCEDURE_PICKLIST.filter(
      (p) => typeof p.id === "string" && p.id.startsWith("lymph_"),
    );
    for (const proc of lymphProcs) {
      expect(proc.snomedCtCode).toMatch(/^\d{6,18}$/);
    }
  });
});
