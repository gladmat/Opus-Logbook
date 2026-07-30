import { describe, expect, it } from "vitest";
import type { BreastAssessmentData } from "@/types/breast";
import type { BurnsAssessmentData } from "@/types/burns";
import type { FreeFlapDetails } from "@/types/case";
import { buildReportRows, countReportRows } from "@/lib/reports/engine";
import { breastDeviceRegistryReport } from "@/lib/reports/definitions/breastRegistry";
import { burnsRegistryReport } from "@/lib/reports/definitions/burnsRegistry";
import { freeFlapAuditReport } from "@/lib/reports/definitions/freeFlapAudit";
import { makeCase, makeGroup, makeProcedure } from "./reportFixtures";

function cell(
  result: ReturnType<typeof buildReportRows>,
  key: string,
  rowIdx = 0,
): unknown {
  const idx = result.columnKeys.indexOf(key);
  expect(idx).toBeGreaterThanOrEqual(0);
  return result.rows[rowIdx]?.[idx];
}

// ─── Breast device registry ─────────────────────────────────────────────────

const bilateralImplantAssessment: BreastAssessmentData = {
  laterality: "bilateral",
  sides: {
    left: {
      side: "left",
      clinicalContext: "reconstructive",
      reconstructionTiming: "immediate",
      implantDetails: {
        deviceType: "permanent_implant",
        manufacturer: "allergan",
        volumeCc: 350,
        shellSurface: "smooth",
        fillMaterial: "silicone_standard",
        shape: "round",
        profile: "moderate_plus",
        implantPlane: "dual_plane",
        incisionSite: "inframammary",
        admUsed: true,
        admDetails: { productName: "Strattice" },
      },
    },
    right: {
      side: "right",
      clinicalContext: "aesthetic",
      implantDetails: {
        deviceType: "permanent_implant",
        manufacturer: "mentor",
        volumeCc: 370,
        shellSurface: "microtextured",
        fillMaterial: "silicone_highly_cohesive",
        shape: "anatomical",
        profile: "high",
        implantPlane: "subpectoral",
        incisionSite: "mastectomy_wound",
        admUsed: false,
      },
    },
  },
} as BreastAssessmentData;

function breastImplantCase() {
  return makeCase({
    specialty: "breast",
    patientFirstName: "Ada",
    patientLastName: "Lovelace",
    patientDateOfBirth: "1987-03-12",
    patientNhi: "ABC1234",
    diagnosisGroups: [
      makeGroup({
        specialty: "breast",
        breastAssessment: bilateralImplantAssessment,
      }),
    ],
  });
}

describe("breast device registry report", () => {
  it("includes only implant-bearing breast cases", () => {
    const lipofillingOnly = makeCase({
      specialty: "breast",
      diagnosisGroups: [
        makeGroup({
          specialty: "breast",
          breastAssessment: {
            laterality: "left",
            sides: {
              left: { side: "left", clinicalContext: "reconstructive" },
            },
          } as BreastAssessmentData,
        }),
      ],
    });
    const noBreast = makeCase();
    const counts = countReportRows(breastDeviceRegistryReport, [
      breastImplantCase(),
      lipofillingOnly,
      noBreast,
    ]);
    expect(counts.caseCount).toBe(1);
    expect(counts.rowCount).toBe(1);
  });

  it("extracts left/right device pairs and identity", () => {
    const result = buildReportRows(
      breastDeviceRegistryReport,
      [breastImplantCase()],
      null,
      { includePatientId: true },
    );
    expect(cell(result, "patient_first_name")).toBe("Ada");
    expect(cell(result, "patient_nhi")).toBe("ABC1234");
    expect(cell(result, "left_manufacturer")).toBe("Allergan");
    expect(cell(result, "left_volume_cc")).toBe(350);
    expect(cell(result, "left_adm_used")).toBe("Yes");
    expect(cell(result, "left_adm_product")).toBe("Strattice");
    expect(cell(result, "right_manufacturer")).toBe("Mentor");
    expect(cell(result, "right_volume_cc")).toBe(370);
    expect(cell(result, "right_adm_used")).toBe("No");
  });

  it("strips the identity block when identifiers are off", () => {
    const result = buildReportRows(
      breastDeviceRegistryReport,
      [breastImplantCase()],
      null,
      { includePatientId: false },
    );
    for (const key of [
      "patient_first_name",
      "patient_last_name",
      "patient_dob",
      "patient_nhi",
      "patient_identifier",
    ]) {
      expect(result.columnKeys).not.toContain(key);
    }
  });
});

// ─── Burns registry ──────────────────────────────────────────────────────────

describe("burns registry report", () => {
  const burnsAssessment: BurnsAssessmentData = {
    tbsa: { totalTBSA: 25, partialThicknessTBSA: 15, fullThicknessTBSA: 10 },
    injuryEvent: { mechanism: "thermal", inhalationInjury: true },
  } as BurnsAssessmentData;

  it("includes only cases with a burns assessment", () => {
    const burns = makeCase({
      specialty: "burns",
      diagnosisGroups: [
        makeGroup({
          specialty: "burns",
          diagnosisPicklistId: "burns_dx_acute",
          burnsAssessment,
        }),
      ],
    });
    const counts = countReportRows(burnsRegistryReport, [burns, makeCase()]);
    expect(counts.caseCount).toBe(1);
  });

  it("spreads the burnsExport fields keyed by BURNS_CSV_HEADERS", () => {
    const burns = makeCase({
      specialty: "burns",
      diagnosisGroups: [
        makeGroup({
          specialty: "burns",
          diagnosisPicklistId: "burns_dx_acute",
          burnsAssessment,
        }),
      ],
    });
    const result = buildReportRows(burnsRegistryReport, [burns], null, {
      includePatientId: true,
    });
    expect(cell(result, "burn_phase")).toBe("Acute");
    expect(cell(result, "burn_tbsa_total")).toBe("25");
    expect(cell(result, "burn_mechanism")).toBe("Thermal");
    expect(cell(result, "burn_inhalation")).toBe("Yes");
  });
});

// ─── Free flap audit ─────────────────────────────────────────────────────────

describe("free flap audit report", () => {
  const flapDetails: Partial<FreeFlapDetails> = {
    harvestSide: "left",
    flapType: "alt",
    flapDisplayName: "ALT Flap",
    indication: "trauma",
    recipientSiteRegion: "lower_leg",
    ischemiaTimeMinutes: 74,
    anastomoses: [
      { id: "a1" } as FreeFlapDetails["anastomoses"][number],
      { id: "a2" } as FreeFlapDetails["anastomoses"][number],
    ],
    couplerSizeMm: 2.5,
    veinGraftUsed: true,
    veinGraftSource: "great_saphenous",
    anticoagulationProtocol: "aspirin_only",
    flapOutcome: {
      flapSurvival: "partial_loss",
      partialLossPercentage: 15,
      monitoringProtocol: "clinical_only",
      reExploration: {
        reExplored: true,
        events: [
          {
            id: "e1",
            hoursPostOp: 18,
            finding: "venous_thrombosis",
            intervention: "thrombectomy_reanastomosis",
            salvageOutcome: "salvaged_partial_loss",
          },
        ],
      },
      donorSiteComplications: ["seroma", "infection"],
      recipientSiteComplications: ["wound_dehiscence"],
    },
  };

  function flapCase() {
    return makeCase({
      specialty: "orthoplastic",
      priorRadiotherapy: false,
      defaultOperativeRole: "SURGEON",
      diagnosisGroups: [
        makeGroup({
          specialty: "orthoplastic",
          procedures: [
            makeProcedure({
              procedureName: "Free ALT flap",
              tags: ["free_flap"],
              clinicalDetails: flapDetails as FreeFlapDetails,
            }),
            makeProcedure({ procedureName: "Debridement" }),
          ],
        }),
      ],
    });
  }

  it("includes only free_flap-tagged procedures with clinical details", () => {
    const counts = countReportRows(freeFlapAuditReport, [
      flapCase(),
      makeCase(),
    ]);
    expect(counts.caseCount).toBe(1);
    expect(counts.rowCount).toBe(1);
  });

  it("extracts flap, protocol and outcome fields", () => {
    const result = buildReportRows(freeFlapAuditReport, [flapCase()], null, {
      includePatientId: true,
    });
    expect(result.rowCount).toBe(1);
    expect(cell(result, "flap_type")).toBe("ALT Flap");
    expect(cell(result, "indication")).toBe("Trauma");
    expect(cell(result, "ischaemia_minutes")).toBe(74);
    expect(cell(result, "anastomosis_count")).toBe(2);
    expect(cell(result, "vein_graft")).toBe("Yes");
    expect(cell(result, "anticoagulation_protocol")).toBe("Aspirin Only");
    expect(cell(result, "monitoring_protocol")).toBe(
      "Clinical Observation Only",
    );
    expect(cell(result, "flap_survival")).toBe("Partial Loss");
    expect(cell(result, "partial_loss_pct")).toBe(15);
    expect(cell(result, "re_explored")).toBe("Yes");
    expect(cell(result, "re_exploration_finding")).toBe("Venous Thrombosis");
    expect(cell(result, "salvage_outcome")).toBe("Salvaged — Partial Loss");
    expect(cell(result, "donor_site_complications")).toBe("Seroma; Infection");
    expect(cell(result, "operative_role")).toBe("Surgeon");
  });

  it("renders single-region recipient_region via the canonical label", () => {
    const result = buildReportRows(freeFlapAuditReport, [flapCase()], null, {
      includePatientId: true,
    });
    expect(cell(result, "recipient_region")).toBe("Lower Leg");
  });

  it("joins multi-region recipient_region with ' + ', primary first", () => {
    const multiDetails: Partial<FreeFlapDetails> = {
      ...flapDetails,
      recipientSiteRegion: "hand",
      recipientSiteRegions: ["hand", "forearm"],
    };
    const multiCase = makeCase({
      specialty: "orthoplastic",
      diagnosisGroups: [
        makeGroup({
          specialty: "orthoplastic",
          procedures: [
            makeProcedure({
              procedureName: "Free ALT flap",
              tags: ["free_flap"],
              clinicalDetails: multiDetails as FreeFlapDetails,
            }),
          ],
        }),
      ],
    });
    const result = buildReportRows(freeFlapAuditReport, [multiCase], null, {
      includePatientId: true,
    });
    expect(cell(result, "recipient_region")).toBe("Hand + Forearm");
  });
});
