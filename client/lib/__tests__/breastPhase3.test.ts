import { describe, expect, it } from "vitest";
import type { ProcedurePicklistEntry } from "@/lib/procedurePicklist";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type { BreastSideAssessment, LipofillingData } from "@/types/breast";
import {
  calculateBreastCompletion,
  getBreastClinicalContext,
  getBreastAssessmentSummary,
  getBreastDiagnosisBuckets,
  getBreastDiagnosesForContext,
  getBreastModuleFlags,
  getBreastSideVisibility,
  getLipofillingSummary,
} from "@/lib/breastConfig";
import { getDiagnosesForSpecialty } from "@/lib/diagnosisPicklists";

function proc(id: string, tags?: string[]): ProcedurePicklistEntry {
  return {
    id,
    label: id,
    snomedCtCodes: [],
    specialties: ["breast"],
    subcategory: "",
    tags: tags ?? [],
  };
}

describe("getBreastClinicalContext", () => {
  it("defaults to reconstructive when no diagnosis is selected", () => {
    expect(getBreastClinicalContext(undefined)).toBe("reconstructive");
  });

  it("maps diagnosis clinical groups to the expected context", () => {
    expect(
      getBreastClinicalContext({ clinicalGroup: "aesthetic" } as any),
    ).toBe("aesthetic");
    expect(
      getBreastClinicalContext({ clinicalGroup: "gender_affirming" } as any),
    ).toBe("gender_affirming");
    expect(getBreastClinicalContext({ clinicalGroup: "oncology" } as any)).toBe(
      "reconstructive",
    );
  });
});

describe("getBreastModuleFlags", () => {
  it("computes shared procedure modules without depending on side context", () => {
    const flags = getBreastModuleFlags([
      proc("breast_impl_dti"),
      proc("breast_fat_primary", ["lipofilling"]),
      proc("breast_nipple_reconstruction"),
    ]);

    expect(flags).toMatchObject({
      showImplantDetails: true,
      showBreastFlapDetails: false,
      showPedicledFlapDetails: false,
      showLipofilling: true,
      showChestMasculinisation: false,
      showNippleDetails: true,
    });
  });

  it("distinguishes free and pedicled flap procedures", () => {
    expect(
      getBreastModuleFlags([
        proc("breast_autologous_diep", ["free_flap", "microsurgery"]),
      ]).showBreastFlapDetails,
    ).toBe(true);

    const pedicledFlags = getBreastModuleFlags([
      proc("breast_autologous_ldflap", ["pedicled_flap"]),
    ]);
    expect(pedicledFlags.showPedicledFlapDetails).toBe(true);
    expect(pedicledFlags.showBreastFlapDetails).toBe(false);
  });
});

describe("getBreastSideVisibility", () => {
  const sharedFlags = getBreastModuleFlags([
    proc("breast_impl_dti"),
    proc("breast_fat_primary", ["lipofilling"]),
  ]);

  it("keeps shared modules stable while context visibility changes per side", () => {
    const reconstructive = getBreastSideVisibility(
      { side: "left", clinicalContext: "reconstructive" },
      sharedFlags,
    );
    const aesthetic = getBreastSideVisibility(
      { side: "right", clinicalContext: "aesthetic" },
      sharedFlags,
    );

    expect(reconstructive.showImplantDetails).toBe(true);
    expect(aesthetic.showImplantDetails).toBe(true);
    expect(reconstructive.showReconstructionEpisode).toBe(true);
    expect(aesthetic.showReconstructionEpisode).toBe(true);
    expect(reconstructive.showGenderAffirmingContext).toBe(false);
    expect(aesthetic.showGenderAffirmingContext).toBe(false);
  });
});

describe("calculateBreastCompletion", () => {
  const sharedFlags = getBreastModuleFlags([
    proc("breast_impl_dti"),
    proc("breast_fat_primary", ["lipofilling"]),
    proc("breast_nipple_reconstruction"),
  ]);

  it("returns 0% for an undefined side", () => {
    const visibility = getBreastSideVisibility(undefined, sharedFlags);
    expect(
      calculateBreastCompletion(undefined, visibility, undefined)
        .overallPercentage,
    ).toBe(0);
  });

  it("requires reconstructive timing for reconstructive sides", () => {
    const side: BreastSideAssessment = {
      side: "left",
      clinicalContext: "reconstructive",
      implantDetails: {
        deviceType: "permanent_implant",
        implantPlane: "subpectoral",
      },
      nippleDetails: {
        technique: "cv_flap",
      },
    };
    const visibility = getBreastSideVisibility(side, sharedFlags);

    const incomplete = calculateBreastCompletion(side, visibility, {
      harvestSites: ["abdomen"],
      injections: { left: { volumeInjectedMl: 120 } },
    });
    const complete = calculateBreastCompletion(
      {
        ...side,
        reconstructionTiming: "immediate",
      },
      visibility,
      {
        harvestSites: ["abdomen"],
        injections: { left: { volumeInjectedMl: 120 } },
      },
    );

    expect(incomplete.contextComplete).toBe(false);
    expect(complete.contextComplete).toBe(true);
    expect(complete.overallPercentage).toBeGreaterThan(
      incomplete.overallPercentage,
    );
  });

  it("marks shared lipofilling complete only when the active side has injection volume", () => {
    const side: BreastSideAssessment = {
      side: "right",
      clinicalContext: "aesthetic",
    };
    const visibility = getBreastSideVisibility(side, sharedFlags);

    expect(
      calculateBreastCompletion(side, visibility, {
        harvestSites: ["abdomen"],
        injections: { left: { volumeInjectedMl: 100 } },
      }).lipofillingComplete,
    ).toBe(false);

    expect(
      calculateBreastCompletion(side, visibility, {
        harvestSites: ["abdomen"],
        injections: { right: { volumeInjectedMl: 100 } },
      }).lipofillingComplete,
    ).toBe(true);
  });
});

describe("getLipofillingSummary", () => {
  it("summarizes per-side injections from the shared lipofilling shape", () => {
    const data: LipofillingData = {
      harvestSites: ["abdomen", "flanks"],
      totalVolumeHarvestedMl: 600,
      injections: {
        left: { volumeInjectedMl: 180 },
        right: { volumeInjectedMl: 200 },
      },
    };

    expect(getLipofillingSummary(data)).toBe(
      "2 sites, 600ml harvested, 180ml (L), 200ml (R)",
    );
  });
});

describe("getBreastAssessmentSummary", () => {
  it("summarizes a unilateral reconstructive assessment", () => {
    expect(
      getBreastAssessmentSummary({
        laterality: "left",
        sides: {
          left: {
            side: "left",
            clinicalContext: "reconstructive",
            reconstructionTiming: "immediate",
          },
        },
      }),
    ).toBe("Left · Reconstructive · Immediate");
  });

  it("keeps bilateral mixed-context timing side-specific", () => {
    expect(
      getBreastAssessmentSummary({
        laterality: "bilateral",
        sides: {
          left: {
            side: "left",
            clinicalContext: "reconstructive",
            reconstructionTiming: "immediate",
          },
          right: {
            side: "right",
            clinicalContext: "aesthetic",
          },
        },
      }),
    ).toBe("Bilateral · L: Reconstructive · R: Aesthetic · L: Immediate");
  });
});

describe("getBreastDiagnosisBuckets", () => {
  it("prioritizes oncological and reconstruction diagnoses for reconstructive cases", () => {
    expect(
      getBreastDiagnosisBuckets({
        laterality: "left",
        sides: {
          left: {
            side: "left",
            clinicalContext: "reconstructive",
            reconstructionTiming: "immediate",
          },
        },
      }),
    ).toEqual({
      prioritizedSubcategories: ["Oncological", "Reconstruction"],
      overflowSubcategories: [
        "Implant Complications",
        "Aesthetic / Functional",
        "Gender-Affirming",
        "Post-Treatment",
        "Congenital & Other",
      ],
    });
  });

  it("prioritizes aesthetic diagnoses for aesthetic cases", () => {
    expect(
      getBreastDiagnosisBuckets({
        laterality: "right",
        sides: {
          right: {
            side: "right",
            clinicalContext: "aesthetic",
          },
        },
      }).prioritizedSubcategories,
    ).toEqual(["Aesthetic / Functional", "Implant Complications"]);
  });

  it("shows only gender-affirming diagnoses for all-GA cases", () => {
    expect(
      getBreastDiagnosisBuckets({
        laterality: "left",
        sides: {
          left: {
            side: "left",
            clinicalContext: "gender_affirming",
          },
        },
      }),
    ).toEqual({
      prioritizedSubcategories: ["Gender-Affirming"],
      overflowSubcategories: [],
    });
  });

  it("uses active-side union priority ordering for mixed bilateral cases", () => {
    expect(
      getBreastDiagnosisBuckets({
        laterality: "bilateral",
        sides: {
          left: {
            side: "left",
            clinicalContext: "reconstructive",
            reconstructionTiming: "immediate",
          },
          right: {
            side: "right",
            clinicalContext: "aesthetic",
          },
        },
      }).prioritizedSubcategories,
    ).toEqual([
      "Oncological",
      "Reconstruction",
      "Aesthetic / Functional",
      "Implant Complications",
    ]);
  });
});

// ─── Cross-Context Visibility ────────────────────────────────────────────────

function dx(
  overrides: Partial<DiagnosisPicklistEntry>,
): DiagnosisPicklistEntry {
  return {
    id: "test_dx",
    displayName: "Test",
    snomedCtCode: "0",
    snomedCtDisplay: "Test",
    specialty: "breast",
    subcategory: "Test",
    hasStaging: false,
    suggestedProcedures: [],
    sortOrder: 0,
    ...overrides,
  };
}

describe("getBreastDiagnosesForContext — crossContextVisible", () => {
  it("includes crossContextVisible diagnoses in reconstructive context", () => {
    const diagnoses = [
      dx({ id: "a", clinicalGroup: "elective", crossContextVisible: true }),
      dx({ id: "b", clinicalGroup: "elective" }),
    ];
    const result = getBreastDiagnosesForContext("reconstructive", diagnoses);
    expect(result.map((d) => d.id)).toContain("a");
    expect(result.map((d) => d.id)).not.toContain("b");
  });

  it("includes crossContextVisible diagnoses in aesthetic context", () => {
    const diagnoses = [
      dx({
        id: "a",
        clinicalGroup: "reconstructive",
        crossContextVisible: true,
      }),
      dx({ id: "b", clinicalGroup: "reconstructive" }),
    ];
    const result = getBreastDiagnosesForContext("aesthetic", diagnoses);
    expect(result.map((d) => d.id)).toContain("a");
    expect(result.map((d) => d.id)).not.toContain("b");
  });

  it("excludes crossContextVisible diagnoses from gender_affirming context", () => {
    const diagnoses = [
      dx({
        id: "a",
        clinicalGroup: "reconstructive",
        crossContextVisible: true,
      }),
      dx({ id: "b", clinicalGroup: "gender_affirming" }),
    ];
    const result = getBreastDiagnosesForContext("gender_affirming", diagnoses);
    expect(result.map((d) => d.id)).not.toContain("a");
    expect(result.map((d) => d.id)).toContain("b");
  });

  it("does not include non-crossContextVisible diagnoses across contexts", () => {
    const diagnoses = [
      dx({ id: "a", clinicalGroup: "elective" }),
      dx({ id: "b", clinicalGroup: "reconstructive" }),
    ];
    const recon = getBreastDiagnosesForContext("reconstructive", diagnoses);
    expect(recon.map((d) => d.id)).toContain("b");
    expect(recon.map((d) => d.id)).not.toContain("a");

    const aes = getBreastDiagnosesForContext("aesthetic", diagnoses);
    expect(aes.map((d) => d.id)).toContain("a");
    expect(aes.map((d) => d.id)).not.toContain("b");
  });

  it("all 9 implant complication entries appear in both reconstructive and aesthetic", () => {
    const allBreast = getDiagnosesForSpecialty("breast");
    const implantIds = [
      "breast_dx_capsular_contracture",
      "breast_dx_implant_rupture",
      "breast_dx_bia_alcl",
      "breast_dx_implant_illness",
      "breast_dx_implant_malposition",
      "breast_dx_animation_deformity",
      "breast_dx_symmastia",
      "breast_dx_implant_infection",
      "breast_dx_capsule_calcification",
    ];

    const recon = getBreastDiagnosesForContext("reconstructive", allBreast);
    const aesthetic = getBreastDiagnosesForContext("aesthetic", allBreast);
    const ga = getBreastDiagnosesForContext("gender_affirming", allBreast);

    const reconIds = recon.map((d) => d.id);
    const aestheticIds = aesthetic.map((d) => d.id);
    const gaIds = ga.map((d) => d.id);

    for (const id of implantIds) {
      expect(reconIds).toContain(id);
      expect(aestheticIds).toContain(id);
      expect(gaIds).not.toContain(id);
    }
  });
});
