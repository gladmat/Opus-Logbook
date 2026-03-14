import { describe, expect, it } from "vitest";
import type { ProcedurePicklistEntry } from "@/lib/procedurePicklist";
import type { BreastSideAssessment, LipofillingData } from "@/types/breast";
import {
  calculateBreastCompletion,
  getBreastClinicalContext,
  getBreastModuleFlags,
  getBreastSideVisibility,
  getLipofillingSummary,
} from "@/lib/breastConfig";

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
