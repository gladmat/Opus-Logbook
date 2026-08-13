/**
 * tenolysis — data model for the TenolysisDetails inline card (which tendons
 * were released per digit + zone level(s), per flexor/extensor side), the
 * side-specific procedure entries, and their export surfaces.
 */

import { describe, it, expect } from "vitest";
import {
  TENOLYSIS_PROCEDURE_IDS,
  FLEXOR_TENOLYSIS_ZONES,
  EXTENSOR_TENOLYSIS_ZONES,
  createEmptyTenolysisData,
  createEmptyTenolysisSideData,
  getForcedTenolysisSide,
  isTenolysisProcedure,
  normalizeTenolysisDetails,
  getTenolysisDigits,
  getTenolysisSingleDigit,
  getTenolysisSummary,
  getTenolysisTitleSuffix,
  type TenolysisData,
} from "@/types/tenolysis";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import { HAND_SURGERY_DIAGNOSES } from "@/lib/diagnosisPicklists/handSurgeryDiagnoses";
import {
  FLEXOR_ZONES_DIGIT,
  FLEXOR_ZONES_THUMB,
  EXTENSOR_ZONES_DIGIT,
  EXTENSOR_ZONES_THUMB,
} from "@/components/hand-trauma/structureConfig";
import { exportCasesAsCsv } from "@/lib/exportCsv";
import { exportSingleCaseAsFhir } from "@/lib/exportFhir";

// ── SNOMED freeze ─────────────────────────────────────────────────────────────

describe("tenolysis procedure SNOMED codes", () => {
  it("generic entry keeps the International umbrella code", () => {
    const entry = findPicklistEntry("hand_tend_tenolysis");
    expect(entry?.snomedCtCode).toBe("5419008");
    expect(entry?.snomedCtDisplay).toBe("Tenolysis of hand (procedure)");
  });

  it("flexor entry carries the AU side-specific code", () => {
    const entry = findPicklistEntry("hand_tend_tenolysis_flexor");
    expect(entry?.snomedCtCode).toBe("5061000032107");
    expect(entry?.snomedCtDisplay).toBe(
      "Tenolysis of flexor tendon of hand (procedure)",
    );
    expect(entry?.subcategory).toBe("Tendon Surgery");
  });

  it("extensor entry carries the AU side-specific code", () => {
    const entry = findPicklistEntry("hand_tend_tenolysis_extensor");
    expect(entry?.snomedCtCode).toBe("5051000032109");
    expect(entry?.snomedCtDisplay).toBe(
      "Tenolysis of extensor tendon of hand (procedure)",
    );
    expect(entry?.subcategory).toBe("Tendon Surgery");
  });
});

// ── Suggestion integrity ──────────────────────────────────────────────────────

describe("tenolysis suggestion wiring", () => {
  const byId = (id: string) => HAND_SURGERY_DIAGNOSES.find((d) => d.id === id);

  it("flexor adhesion suggests the flexor entry as default", () => {
    const dx = byId("hand_dx_flexor_tendon_adhesion");
    const suggestion = dx?.suggestedProcedures?.find(
      (s) => s.procedurePicklistId === "hand_tend_tenolysis_flexor",
    );
    expect(suggestion).toBeTruthy();
    expect(suggestion?.isDefault).toBe(true);
  });

  it("extensor adhesion suggests the extensor entry as default", () => {
    const dx = byId("hand_dx_extensor_tendon_adhesion");
    const suggestion = dx?.suggestedProcedures?.find(
      (s) => s.procedurePicklistId === "hand_tend_tenolysis_extensor",
    );
    expect(suggestion).toBeTruthy();
    expect(suggestion?.isDefault).toBe(true);
  });

  it("chronic boutonnière suggests the extensor entry (non-default)", () => {
    const dx = byId("hand_dx_chronic_boutonniere");
    const suggestion = dx?.suggestedProcedures?.find(
      (s) => s.procedurePicklistId === "hand_tend_tenolysis_extensor",
    );
    expect(suggestion).toBeTruthy();
    expect(suggestion?.isDefault).toBe(false);
  });

  it("no diagnosis suggests the retired generic-only wiring by accident", () => {
    // The generic entry stays browsable, but no curated suggestion should
    // point at it now that the side-specific entries exist.
    for (const dx of HAND_SURGERY_DIAGNOSES) {
      for (const s of dx.suggestedProcedures ?? []) {
        expect(
          s.procedurePicklistId,
          `${dx.id} should not suggest the generic tenolysis entry`,
        ).not.toBe("hand_tend_tenolysis");
      }
    }
  });
});

// ── Gate ──────────────────────────────────────────────────────────────────────

describe("TENOLYSIS_PROCEDURE_IDS", () => {
  it("every gate ID resolves to a real procedure picklist entry", () => {
    for (const id of TENOLYSIS_PROCEDURE_IDS) {
      const entry = findPicklistEntry(id);
      expect(entry, `gate ID ${id} must resolve`).toBeTruthy();
    }
  });

  it("isTenolysisProcedure accepts gate IDs and rejects others", () => {
    expect(isTenolysisProcedure("hand_tend_tenolysis")).toBe(true);
    expect(isTenolysisProcedure("hand_tend_tenolysis_flexor")).toBe(true);
    expect(isTenolysisProcedure("hand_tend_tenolysis_extensor")).toBe(true);
    expect(isTenolysisProcedure("hand_tend_flexor_primary")).toBe(false);
    expect(isTenolysisProcedure(undefined)).toBe(false);
    expect(isTenolysisProcedure(null)).toBe(false);
  });

  it("forced side maps side-specific entries, generic shows both", () => {
    expect(getForcedTenolysisSide("hand_tend_tenolysis_flexor")).toBe("flexor");
    expect(getForcedTenolysisSide("hand_tend_tenolysis_extensor")).toBe(
      "extensor",
    );
    expect(getForcedTenolysisSide("hand_tend_tenolysis")).toBeNull();
    expect(getForcedTenolysisSide(undefined)).toBeNull();
  });
});

// ── Zone table drift guard ────────────────────────────────────────────────────

describe("zone order tables", () => {
  it("flexor zones mirror structureConfig digit + thumb zones", () => {
    expect([...FLEXOR_TENOLYSIS_ZONES]).toEqual([
      ...FLEXOR_ZONES_DIGIT,
      ...FLEXOR_ZONES_THUMB,
    ]);
  });

  it("extensor zones mirror structureConfig digit + thumb zones", () => {
    expect([...EXTENSOR_TENOLYSIS_ZONES]).toEqual([
      ...EXTENSOR_ZONES_DIGIT,
      ...EXTENSOR_ZONES_THUMB,
    ]);
  });
});

// ── Normalization ─────────────────────────────────────────────────────────────

describe("normalizeTenolysisDetails", () => {
  it("returns undefined for empty / null / all-empty data", () => {
    expect(normalizeTenolysisDetails(undefined)).toBeUndefined();
    expect(normalizeTenolysisDetails(null)).toBeUndefined();
    expect(
      normalizeTenolysisDetails(createEmptyTenolysisData()),
    ).toBeUndefined();
    expect(
      normalizeTenolysisDetails({
        flexor: createEmptyTenolysisSideData(),
        extensor: createEmptyTenolysisSideData(),
      }),
    ).toBeUndefined();
  });

  it("drops an empty side but keeps the substantive one", () => {
    const result = normalizeTenolysisDetails({
      flexor: {
        selections: [{ digit: "III", tendon: "FDP" }],
        zones: [],
      },
      extensor: createEmptyTenolysisSideData(),
    });
    expect(result?.flexor?.selections).toEqual([
      { digit: "III", tendon: "FDP" },
    ]);
    expect(result?.extensor).toBeNull();
  });

  it("keeps a zones-only side (level recorded before tendons)", () => {
    const result = normalizeTenolysisDetails({
      flexor: { selections: [], zones: ["II"] },
      extensor: null,
    });
    expect(result?.flexor?.zones).toEqual(["II"]);
  });

  it("dedupes and canonically sorts selections and zones", () => {
    const result = normalizeTenolysisDetails({
      flexor: {
        selections: [
          { digit: "IV", tendon: "FDS" },
          { digit: "III", tendon: "FDS" },
          { digit: "III", tendon: "FDP" },
          { digit: "III", tendon: "FDP" },
          { digit: "I", tendon: "FPL" },
        ],
        zones: ["III", "II", "III", "T2"],
      },
      extensor: null,
    });
    expect(result?.flexor?.selections).toEqual([
      { digit: "I", tendon: "FPL" },
      { digit: "III", tendon: "FDP" },
      { digit: "III", tendon: "FDS" },
      { digit: "IV", tendon: "FDS" },
    ]);
    expect(result?.flexor?.zones).toEqual(["II", "III", "T2"]);
  });
});

// ── Derived digits ────────────────────────────────────────────────────────────

describe("tenolysis digits", () => {
  it("collects distinct digits across both sides in anatomic order", () => {
    const data: TenolysisData = {
      flexor: {
        selections: [{ digit: "IV", tendon: "FDP" }],
        zones: [],
      },
      extensor: {
        selections: [
          { digit: "II", tendon: "EDC" },
          { digit: "IV", tendon: "EDC" },
        ],
        zones: [],
      },
    };
    expect(getTenolysisDigits(data)).toEqual(["II", "IV"]);
    expect(getTenolysisSingleDigit(data)).toBeUndefined();
  });

  it("returns the single digit when exactly one is involved", () => {
    const data: TenolysisData = {
      flexor: {
        selections: [
          { digit: "III", tendon: "FDP" },
          { digit: "III", tendon: "FDS" },
        ],
        zones: ["II"],
      },
      extensor: null,
    };
    expect(getTenolysisSingleDigit(data)).toBe("III");
  });
});

// ── Summary matrix ────────────────────────────────────────────────────────────

describe("getTenolysisSummary", () => {
  it("renders a single-digit flexor release", () => {
    const data: TenolysisData = {
      flexor: {
        selections: [
          { digit: "III", tendon: "FDP" },
          { digit: "III", tendon: "FDS" },
        ],
        zones: ["II", "III"],
      },
      extensor: null,
    };
    expect(getTenolysisSummary(data)).toBe(
      "Flexor: FDP+FDS — Dig. III · Zones II, III",
    );
  });

  it("groups digits sharing an identical tendon set", () => {
    const data: TenolysisData = {
      flexor: {
        selections: [
          { digit: "III", tendon: "FDP" },
          { digit: "III", tendon: "FDS" },
          { digit: "IV", tendon: "FDP" },
          { digit: "IV", tendon: "FDS" },
        ],
        zones: ["II"],
      },
      extensor: null,
    };
    expect(getTenolysisSummary(data)).toBe(
      "Flexor: FDP+FDS — Dig. III+IV · Zone II",
    );
  });

  it("splits digits with different tendon sets", () => {
    const data: TenolysisData = {
      flexor: {
        selections: [
          { digit: "III", tendon: "FDP" },
          { digit: "III", tendon: "FDS" },
          { digit: "IV", tendon: "FDP" },
        ],
        zones: [],
      },
      extensor: null,
    };
    expect(getTenolysisSummary(data)).toBe(
      "Flexor: FDP+FDS — Dig. III, FDP — Dig. IV",
    );
  });

  it("joins both sides with a semicolon", () => {
    const data: TenolysisData = {
      flexor: {
        selections: [{ digit: "I", tendon: "FPL" }],
        zones: ["T2"],
      },
      extensor: {
        selections: [{ digit: "I", tendon: "EPL" }],
        zones: ["TIII"],
      },
    };
    expect(getTenolysisSummary(data)).toBe(
      "Flexor: FPL — Dig. I · Zone T2; Extensor: EPL — Dig. I · Zone TIII",
    );
  });

  it("returns empty string for empty data", () => {
    expect(getTenolysisSummary(undefined)).toBe("");
    expect(getTenolysisSummary(createEmptyTenolysisData())).toBe("");
  });
});

describe("getTenolysisTitleSuffix", () => {
  it("renders digits + zones for a single side", () => {
    const data: TenolysisData = {
      flexor: {
        selections: [{ digit: "III", tendon: "FDP" }],
        zones: ["II"],
      },
      extensor: null,
    };
    expect(getTenolysisTitleSuffix(data)).toBe("Dig. III, zone II");
  });

  it("renders plural zones", () => {
    const data: TenolysisData = {
      flexor: {
        selections: [{ digit: "III", tendon: "FDP" }],
        zones: ["II", "III"],
      },
      extensor: null,
    };
    expect(getTenolysisTitleSuffix(data)).toBe("Dig. III, zones II, III");
  });

  it("omits zones when both sides are involved", () => {
    const data: TenolysisData = {
      flexor: {
        selections: [{ digit: "III", tendon: "FDP" }],
        zones: ["II"],
      },
      extensor: {
        selections: [{ digit: "III", tendon: "EDC" }],
        zones: ["V"],
      },
    };
    expect(getTenolysisTitleSuffix(data)).toBe("Dig. III");
  });

  it("returns null for empty data", () => {
    expect(getTenolysisTitleSuffix(undefined)).toBeNull();
    expect(getTenolysisTitleSuffix(createEmptyTenolysisData())).toBeNull();
  });
});

// ── Export integration ────────────────────────────────────────────────────────

const flexorTenolysisCase = {
  id: "case-teno-1",
  patientIdentifier: "PAT-1",
  procedureDate: "2026-08-01",
  facility: "Test Hospital",
  specialty: "hand_wrist",
  ownerId: "owner-1",
  caseStatus: "active",
  diagnosisGroups: [
    {
      id: "group-1",
      specialty: "hand_wrist",
      diagnosis: {
        displayName: "Flexor tendon adhesion / stiffness",
        snomedCtCode: "239172002",
      },
      diagnosisPicklistId: "hand_dx_flexor_tendon_adhesion",
      procedures: [
        {
          id: "proc-1",
          sequenceOrder: 1,
          procedureName: "Flexor tenolysis — hand",
          picklistEntryId: "hand_tend_tenolysis_flexor",
          surgeonRole: "PS",
          snomedCtCode: "5061000032107",
          digitId: "III",
          tenolysisDetails: {
            flexor: {
              selections: [
                { digit: "III", tendon: "FDP" },
                { digit: "III", tendon: "FDS" },
              ],
              zones: ["II", "III"],
            },
            extensor: null,
          },
        },
      ],
    },
  ],
} as const;

describe("tenolysis CSV export", () => {
  it("emits the four tenolysis columns between fixation and planned_date", () => {
    const csv = exportCasesAsCsv([flexorTenolysisCase as any], {
      includePatientId: false,
    });
    const header = csv.split("\n")[0] ?? "";
    expect(header).toContain(
      "fixation_plate_profile_mm,tenolysis_flexor_tendons,tenolysis_flexor_zones,tenolysis_extensor_tendons,tenolysis_extensor_zones,planned_date",
    );
  });

  it("emits digit-annotated tendons and zones for the flexor fixture", () => {
    const csv = exportCasesAsCsv([flexorTenolysisCase as any], {
      includePatientId: false,
    });
    const row = csv.split("\n")[1] ?? "";
    expect(row).toContain("FDP (Dig. III), FDS (Dig. III)");
    expect(row).toContain("II, III");
  });
});

describe("tenolysis FHIR export", () => {
  it("emits the urn:opus:tenolysis extension and per-digit bodySite", () => {
    const bundle = exportSingleCaseAsFhir(flexorTenolysisCase as any, {
      includePatientId: false,
    });
    const json = JSON.stringify(bundle);
    expect(json).toContain("urn:opus:tenolysis");
    expect(json).toContain("FDP (Dig. III), FDS (Dig. III)");
    // digitId → SNOMED body structure for the middle finger
    expect(json).toContain("43825001");
  });
});
