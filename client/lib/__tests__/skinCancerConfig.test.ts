import { describe, it, expect } from "vitest";
import {
  getMarginRecommendation,
  shouldOfferSLNB,
  canConsiderSLNB,
  getClinicalPathway,
  toQuickMarginStatus,
  getSkinCancerProcedureSuggestions,
  getSkinCancerDiagnosisAutoConfig,
  getDefaultSkinCancerSelectedProcedureIds,
  getSkinCancerPathwayStageForCategory,
  getSkinCancerPrimaryHistology,
  resolveSkinCancerDiagnosis,
} from "@/lib/skinCancerConfig";
import type {
  SkinCancerHistology,
  SkinCancerLesionAssessment,
  DetailedMarginStatus,
} from "@/types/skinCancer";

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function makeHistology(
  overrides: Partial<SkinCancerHistology> & {
    pathologyCategory: SkinCancerHistology["pathologyCategory"];
  },
): SkinCancerHistology {
  return {
    source: "own_biopsy",
    marginStatus: "pending",
    ...overrides,
  } as SkinCancerHistology;
}

function makeAssessment(
  overrides: Partial<SkinCancerLesionAssessment> & {
    pathwayStage: SkinCancerLesionAssessment["pathwayStage"];
  },
): SkinCancerLesionAssessment {
  return overrides as SkinCancerLesionAssessment;
}

// ═══════════════════════════════════════════════════════════
// getMarginRecommendation
// ═══════════════════════════════════════════════════════════

describe("getMarginRecommendation", () => {
  it("melanoma in situ (Breslow 0) → 5mm", () => {
    const r = getMarginRecommendation(
      makeHistology({ pathologyCategory: "melanoma", melanomaBreslowMm: 0 }),
    );
    expect(r?.recommendedText).toBe("5mm");
    expect(r?.guidelineSource).toBe("NCCN");
  });

  it("melanoma Breslow 0.8mm → 10mm", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "melanoma",
        melanomaBreslowMm: 0.8,
      }),
    );
    expect(r?.recommendedText).toBe("1cm");
  });

  it("melanoma Breslow 1.5mm → 10mm (1–2cm range)", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "melanoma",
        melanomaBreslowMm: 1.5,
      }),
    );
    expect(r?.recommendedText).toBe("1-2cm");
    expect(r?.maximumMm).toBe(20);
  });

  it("melanoma Breslow 3.0mm → 20mm", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "melanoma",
        melanomaBreslowMm: 3.0,
      }),
    );
    expect(r?.recommendedText).toBe("2cm");
  });

  it("melanoma without Breslow → undefined", () => {
    const r = getMarginRecommendation(
      makeHistology({ pathologyCategory: "melanoma" }),
    );
    expect(r).toBeUndefined();
  });

  it("BCC nodular → 4mm", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "bcc",
        bccSubtype: "nodular",
      }),
    );
    expect(r?.recommendedText).toBe("3-4mm");
    expect(r?.guidelineSource).toBe("BAD");
  });

  it("BCC morphoeic → 5mm (aggressive)", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "bcc",
        bccSubtype: "morphoeic",
      }),
    );
    expect(r?.recommendedText).toBe("5mm");
  });

  it("BCC no subtype → 4mm (standard default)", () => {
    const r = getMarginRecommendation(
      makeHistology({ pathologyCategory: "bcc" }),
    );
    expect(r?.recommendedText).toBe("3-4mm");
  });

  it("SCC low-risk → 5mm", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "scc",
        sccRiskLevel: "low",
      }),
    );
    expect(r?.recommendedText).toBe("4-6mm");
  });

  it("SCC high-risk → 6mm", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "scc",
        sccRiskLevel: "high",
      }),
    );
    expect(r?.recommendedText).toBe("6-10mm");
  });

  it("MCC → 20mm", () => {
    const r = getMarginRecommendation(
      makeHistology({ pathologyCategory: "merkel_cell" }),
    );
    expect(r?.recommendedText).toBe("1-2cm");
    expect(r?.guidelineSource).toBe("NCCN");
  });

  it("DFSP → 30mm", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "rare_malignant",
        rareSubtype: "dfsp",
      }),
    );
    expect(r?.recommendedText).toBe("2-3cm");
  });

  it("Angiosarcoma → 30mm", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "rare_malignant",
        rareSubtype: "angiosarcoma",
      }),
    );
    expect(r?.recommendedText).toBe("\u22653cm");
  });

  it("EMPD → 50mm", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "rare_malignant",
        rareSubtype: "empd",
      }),
    );
    expect(r?.recommendedText).toBe("\u22655cm");
  });

  it("MPNST → 20mm", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "rare_malignant",
        rareSubtype: "mpnst",
      }),
    );
    expect(r?.recommendedText).toBe("\u22652cm");
    expect(r?.minimumMm).toBe(20);
  });

  it("unknown rare type → null (no guideline)", () => {
    const r = getMarginRecommendation(
      makeHistology({
        pathologyCategory: "rare_malignant",
        rareSubtype: "other_nos",
      }),
    );
    expect(r?.recommendedText).toBe("No established guideline");
  });

  it("benign → undefined", () => {
    const r = getMarginRecommendation(
      makeHistology({ pathologyCategory: "benign" }),
    );
    expect(r).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// shouldOfferSLNB
// ═══════════════════════════════════════════════════════════

describe("shouldOfferSLNB", () => {
  it("melanoma Breslow 1.0mm → true", () => {
    expect(
      shouldOfferSLNB(
        makeHistology({
          pathologyCategory: "melanoma",
          melanomaBreslowMm: 1.0,
        }),
      ),
    ).toBe(true);
  });

  it("melanoma Breslow 0.5mm, no ulceration → false", () => {
    expect(
      shouldOfferSLNB(
        makeHistology({
          pathologyCategory: "melanoma",
          melanomaBreslowMm: 0.5,
          melanomaUlceration: false,
        }),
      ),
    ).toBe(false);
  });

  it("melanoma Breslow 0.7mm, ulceration true → true", () => {
    expect(
      shouldOfferSLNB(
        makeHistology({
          pathologyCategory: "melanoma",
          melanomaBreslowMm: 0.7,
          melanomaUlceration: true,
        }),
      ),
    ).toBe(true);
  });

  it("MCC → true (always)", () => {
    expect(
      shouldOfferSLNB(makeHistology({ pathologyCategory: "merkel_cell" })),
    ).toBe(true);
  });

  it("BCC → false", () => {
    expect(shouldOfferSLNB(makeHistology({ pathologyCategory: "bcc" }))).toBe(
      false,
    );
  });

  it("SCC → false", () => {
    expect(shouldOfferSLNB(makeHistology({ pathologyCategory: "scc" }))).toBe(
      false,
    );
  });
});

// ═══════════════════════════════════════════════════════════
// canConsiderSLNB
// ═══════════════════════════════════════════════════════════

describe("canConsiderSLNB", () => {
  it("high-risk SCC → true", () => {
    expect(
      canConsiderSLNB(
        makeHistology({
          pathologyCategory: "scc",
          sccRiskLevel: "high",
        }),
      ),
    ).toBe(true);
  });

  it("porocarcinoma → true", () => {
    expect(
      canConsiderSLNB(
        makeHistology({
          pathologyCategory: "rare_malignant",
          rareSubtype: "porocarcinoma",
        }),
      ),
    ).toBe(true);
  });

  it("epithelioid sarcoma → true", () => {
    expect(
      canConsiderSLNB(
        makeHistology({
          pathologyCategory: "rare_malignant",
          rareSubtype: "epithelioid_sarcoma",
        }),
      ),
    ).toBe(true);
  });

  it("BCC → false", () => {
    expect(canConsiderSLNB(makeHistology({ pathologyCategory: "bcc" }))).toBe(
      false,
    );
  });

  it("melanoma >0.8mm → true (via shouldOfferSLNB)", () => {
    expect(
      canConsiderSLNB(
        makeHistology({
          pathologyCategory: "melanoma",
          melanomaBreslowMm: 1.0,
        }),
      ),
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// getClinicalPathway
// ═══════════════════════════════════════════════════════════

describe("getClinicalPathway", () => {
  it("melanoma → melanoma_like", () => {
    expect(getClinicalPathway("melanoma")).toBe("melanoma_like");
  });

  it("merkel_cell → melanoma_like", () => {
    expect(getClinicalPathway("merkel_cell")).toBe("melanoma_like");
  });

  it("bcc → bcc_scc_like", () => {
    expect(getClinicalPathway("bcc")).toBe("bcc_scc_like");
  });

  it("scc → bcc_scc_like", () => {
    expect(getClinicalPathway("scc")).toBe("bcc_scc_like");
  });

  it("rare_malignant + dfsp → complex_mdt", () => {
    expect(getClinicalPathway("rare_malignant", "dfsp")).toBe("complex_mdt");
  });

  it("rare_malignant + afx → bcc_scc_like", () => {
    expect(getClinicalPathway("rare_malignant", "afx")).toBe("bcc_scc_like");
  });

  it("rare_malignant + angiosarcoma → complex_mdt", () => {
    expect(getClinicalPathway("rare_malignant", "angiosarcoma")).toBe(
      "complex_mdt",
    );
  });

  it("rare_malignant + mpnst → complex_mdt", () => {
    expect(getClinicalPathway("rare_malignant", "mpnst")).toBe("complex_mdt");
  });
});

// ═══════════════════════════════════════════════════════════
// toQuickMarginStatus
// ═══════════════════════════════════════════════════════════

describe("toQuickMarginStatus", () => {
  const cases: [DetailedMarginStatus | undefined, string][] = [
    ["complete", "clear"],
    ["incomplete", "involved"],
    ["close", "involved"],
    ["pending", "pending"],
    ["unknown", "pending"],
    [undefined, "pending"],
  ];

  it.each(cases)("%s → %s", (input, expected) => {
    expect(toQuickMarginStatus(input)).toBe(expected);
  });
});

// ═══════════════════════════════════════════════════════════
// getSkinCancerProcedureSuggestions
// ═══════════════════════════════════════════════════════════

describe("getSkinCancerProcedureSuggestions", () => {
  it("Biopsy + excision_biopsy type includes biopsy plus graft suggestions", () => {
    const r = getSkinCancerProcedureSuggestions(
      makeAssessment({
        pathwayStage: "excision_biopsy",
        clinicalSuspicion: "uncertain",
        biopsyType: "excision_biopsy",
        site: "Nose",
      }),
    );
    expect(r).toEqual([
      "gen_skin_excision_biopsy",
      "orth_ftsg",
      "orth_ssg_sheet",
    ]);
  });

  it("Biopsy + punch type → gen_skin_biopsy_punch", () => {
    const r = getSkinCancerProcedureSuggestions(
      makeAssessment({
        pathwayStage: "excision_biopsy",
        clinicalSuspicion: "uncertain",
        biopsyType: "punch_biopsy",
        site: "Back",
      }),
    );
    expect(r).toEqual(["gen_skin_biopsy_punch"]);
  });

  it("Biopsy + shave type → gen_skin_shave_curette", () => {
    const r = getSkinCancerProcedureSuggestions(
      makeAssessment({
        pathwayStage: "excision_biopsy",
        clinicalSuspicion: "uncertain",
        biopsyType: "shave_biopsy",
        site: "Thigh",
      }),
    );
    expect(r).toEqual(["gen_skin_shave_curette"]);
  });

  it("Biopsy + incisional type → gen_skin_biopsy_punch", () => {
    const r = getSkinCancerProcedureSuggestions(
      makeAssessment({
        pathwayStage: "excision_biopsy",
        clinicalSuspicion: "uncertain",
        biopsyType: "incisional_biopsy",
        site: "Back",
      }),
    );
    expect(r).toEqual(["gen_skin_biopsy_punch"]);
  });

  it("Biopsy + no biopsyType → empty suggestions", () => {
    const r = getSkinCancerProcedureSuggestions(
      makeAssessment({
        pathwayStage: "excision_biopsy",
        clinicalSuspicion: "uncertain",
        site: "Back",
      }),
    );
    expect(r).toEqual([]);
  });

  it("Pathway B + melanoma histo + body → gen_mel_wle_body", () => {
    const r = getSkinCancerProcedureSuggestions(
      makeAssessment({
        pathwayStage: "histology_known",
        site: "Forearm",
        priorHistology: makeHistology({
          pathologyCategory: "melanoma",
          melanomaBreslowMm: 1.5,
        }),
      }),
    );
    expect(r[0]).toBe("gen_mel_wle_body");
    // Coverage options for body sites
    expect(r).toContain("orth_ftsg");
    expect(r).toContain("orth_ssg_sheet");
  });

  it("Pathway B + merkel histo → gen_mel_merkel_excision", () => {
    const r = getSkinCancerProcedureSuggestions(
      makeAssessment({
        pathwayStage: "histology_known",
        site: "Forearm",
        priorHistology: makeHistology({ pathologyCategory: "merkel_cell" }),
      }),
    );
    expect(r[0]).toBe("gen_mel_merkel_excision");
    expect(r).toContain("orth_ftsg");
  });

  it("site-specific head and neck cases still include graft options", () => {
    const r = getSkinCancerProcedureSuggestions(
      makeAssessment({
        pathwayStage: "histology_known",
        site: "Ear",
        priorHistology: makeHistology({ pathologyCategory: "bcc" }),
      }),
    );
    expect(r).toContain("hn_skin_bcc_excision");
    expect(r).toContain("hn_recon_ear_partial");
    expect(r).toContain("orth_ftsg");
    expect(r).toContain("orth_ssg_sheet");
  });

  it("Pathway B + DFSP → gen_mel_dfsp_excision", () => {
    const r = getSkinCancerProcedureSuggestions(
      makeAssessment({
        pathwayStage: "histology_known",
        site: "Back",
        priorHistology: makeHistology({
          pathologyCategory: "rare_malignant",
          rareSubtype: "dfsp",
        }),
      }),
    );
    expect(r[0]).toBe("gen_mel_dfsp_excision");
    expect(r).toContain("orth_ftsg");
  });

  it("SLNB performed + head → includes hn_skin_slnb", () => {
    const r = getSkinCancerProcedureSuggestions(
      makeAssessment({
        pathwayStage: "histology_known",
        site: "Scalp",
        priorHistology: makeHistology({
          pathologyCategory: "melanoma",
          melanomaBreslowMm: 2.0,
        }),
        slnb: {
          offered: true,
          performed: true,
          sites: ["cervical"],
          result: "negative",
        },
      }),
    );
    expect(r).toContain("hn_skin_melanoma_wle");
    expect(r).toContain("hn_skin_slnb");
  });

  it("Pathway B + no histology → []", () => {
    const r = getSkinCancerProcedureSuggestions(
      makeAssessment({
        pathwayStage: "histology_known",
        site: "Back",
      }),
    );
    expect(r).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════
// getDefaultSkinCancerSelectedProcedureIds
// ═══════════════════════════════════════════════════════════

describe("getDefaultSkinCancerSelectedProcedureIds", () => {
  it("defaults to the primary excision procedure and leaves graft options unchecked", () => {
    const assessment = makeAssessment({
      pathwayStage: "excision_biopsy",
      clinicalSuspicion: "uncertain",
      biopsyType: "excision_biopsy",
      site: "Nose",
    });
    const suggestions = getSkinCancerProcedureSuggestions(assessment);

    expect(
      getDefaultSkinCancerSelectedProcedureIds(assessment, suggestions),
    ).toEqual(["gen_skin_excision_biopsy"]);
  });

  it("also defaults SLNB when it is explicitly recorded as performed", () => {
    const assessment = makeAssessment({
      pathwayStage: "histology_known",
      site: "Forearm",
      priorHistology: makeHistology({
        pathologyCategory: "melanoma",
        melanomaBreslowMm: 2,
      }),
      slnb: {
        offered: true,
        performed: true,
        sites: ["axillary"],
        result: "negative",
      },
    });
    const suggestions = getSkinCancerProcedureSuggestions(assessment);

    expect(
      getDefaultSkinCancerSelectedProcedureIds(assessment, suggestions),
    ).toEqual(["gen_mel_wle_body", "gen_mel_slnb_body"]);
  });

  it("returns an empty selection when there are no suggestions", () => {
    expect(
      getDefaultSkinCancerSelectedProcedureIds(
        makeAssessment({ pathwayStage: "excision_biopsy" }),
        [],
      ),
    ).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════
// getSkinCancerPathwayStageForCategory
// ═══════════════════════════════════════════════════════════

describe("getSkinCancerPathwayStageForCategory", () => {
  it("routes uncertain lesions to excision_biopsy", () => {
    expect(getSkinCancerPathwayStageForCategory("uncertain")).toBe(
      "excision_biopsy",
    );
  });

  it("routes all other inline diagnosis categories to histology_known", () => {
    expect(getSkinCancerPathwayStageForCategory("bcc")).toBe("histology_known");
    expect(getSkinCancerPathwayStageForCategory("scc")).toBe("histology_known");
    expect(getSkinCancerPathwayStageForCategory("melanoma")).toBe(
      "histology_known",
    );
    expect(getSkinCancerPathwayStageForCategory("merkel_cell")).toBe(
      "histology_known",
    );
    expect(getSkinCancerPathwayStageForCategory("rare_malignant")).toBe(
      "histology_known",
    );
    expect(getSkinCancerPathwayStageForCategory("benign")).toBe(
      "histology_known",
    );
  });

  it("returns undefined when no inline diagnosis category is selected", () => {
    expect(getSkinCancerPathwayStageForCategory(undefined)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// getSkinCancerDiagnosisAutoConfig
// ═══════════════════════════════════════════════════════════

describe("getSkinCancerDiagnosisAutoConfig", () => {
  // ── Unclear Lesion ──
  it("unclear lesion → excision_biopsy only, pathology unlocked", () => {
    const c = getSkinCancerDiagnosisAutoConfig(
      "sc_dx_skin_lesion_excision_biopsy",
    );
    expect(c.autoPathwayStage).toBe("excision_biopsy");
    expect(c.availablePathwayStages).toEqual(["excision_biopsy"]);
    expect(c.lockedPathology).toBe(false);
    expect(c.hideCurrentProcedureSource).toBe(false);
    expect(c.autoPathologyCategory).toBeUndefined();
  });

  // ── Premalignant ──
  it("actinic keratosis → histology_known, pathology unlocked", () => {
    const c = getSkinCancerDiagnosisAutoConfig("sc_dx_actinic_keratosis");
    expect(c.autoPathwayStage).toBe("histology_known");
    expect(c.availablePathwayStages).toContain("histology_known");
    expect(c.availablePathwayStages).not.toContain("excision_biopsy");
    expect(c.lockedPathology).toBe(false);
    expect(c.hideCurrentProcedureSource).toBe(true);
  });

  // ── BCC ──
  it("BCC → histology_known, pathology locked to bcc", () => {
    const c = getSkinCancerDiagnosisAutoConfig("sc_dx_bcc");
    expect(c.autoPathwayStage).toBe("histology_known");
    expect(c.autoPathologyCategory).toBe("bcc");
    expect(c.lockedPathology).toBe(true);
    expect(c.hideCurrentProcedureSource).toBe(true);
  });

  // ── SCC ──
  it("SCC → pathology locked to scc", () => {
    const c = getSkinCancerDiagnosisAutoConfig("sc_dx_scc");
    expect(c.autoPathologyCategory).toBe("scc");
    expect(c.lockedPathology).toBe(true);
  });

  // ── Bowen's disease ──
  it("Bowen's → scc (SCC in situ)", () => {
    const c = getSkinCancerDiagnosisAutoConfig("sc_dx_bowens");
    expect(c.autoPathologyCategory).toBe("scc");
    expect(c.lockedPathology).toBe(true);
  });

  // ── Keratoacanthoma ──
  it("keratoacanthoma → scc (SCC variant)", () => {
    const c = getSkinCancerDiagnosisAutoConfig("sc_dx_keratoacanthoma");
    expect(c.autoPathologyCategory).toBe("scc");
    expect(c.lockedPathology).toBe(true);
  });

  // ── Melanoma ──
  it("melanoma → pathology locked to melanoma", () => {
    const c = getSkinCancerDiagnosisAutoConfig("sc_dx_melanoma");
    expect(c.autoPathologyCategory).toBe("melanoma");
    expect(c.lockedPathology).toBe(true);
    expect(c.hideCurrentProcedureSource).toBe(true);
  });

  it("melanoma_primary → same as melanoma", () => {
    const c = getSkinCancerDiagnosisAutoConfig("sc_dx_melanoma_primary");
    expect(c.autoPathologyCategory).toBe("melanoma");
    expect(c.lockedPathology).toBe(true);
  });

  // ── Merkel cell ──
  it("merkel cell → locked to merkel_cell", () => {
    const c = getSkinCancerDiagnosisAutoConfig("sc_dx_merkel_cell");
    expect(c.autoPathologyCategory).toBe("merkel_cell");
    expect(c.lockedPathology).toBe(true);
  });

  // ── DFSP ──
  it("DFSP → rare_malignant + subtype dfsp", () => {
    const c = getSkinCancerDiagnosisAutoConfig("sc_dx_dfsp");
    expect(c.autoPathologyCategory).toBe("rare_malignant");
    expect(c.autoRareSubtype).toBe("dfsp");
    expect(c.lockedPathology).toBe(true);
  });

  // ── AFX ──
  it("AFX → rare_malignant + subtype afx", () => {
    const c = getSkinCancerDiagnosisAutoConfig("sc_dx_afx");
    expect(c.autoPathologyCategory).toBe("rare_malignant");
    expect(c.autoRareSubtype).toBe("afx");
    expect(c.lockedPathology).toBe(true);
  });

  // ── Default / undefined (inline flow) ──
  it("undefined diagnosisId → all pathways available, unlocked", () => {
    const c = getSkinCancerDiagnosisAutoConfig(undefined);
    expect(c.autoPathwayStage).toBeUndefined();
    expect(c.availablePathwayStages).toEqual([
      "excision_biopsy",
      "histology_known",
    ]);
    expect(c.lockedPathology).toBe(false);
    expect(c.autoPathologyCategory).toBeUndefined();
  });

  it("unknown diagnosisId → all pathways available, unlocked", () => {
    const c = getSkinCancerDiagnosisAutoConfig("some_unknown_id");
    expect(c.autoPathwayStage).toBeUndefined();
    expect(c.lockedPathology).toBe(false);
  });

  // ── All known diagnoses exclude excision_biopsy pathway ──
  it("all known diagnoses hide excision_biopsy pathway", () => {
    const knownIds = [
      "sc_dx_actinic_keratosis",
      "sc_dx_bcc",
      "sc_dx_scc",
      "sc_dx_bowens",
      "sc_dx_keratoacanthoma",
      "sc_dx_melanoma",
      "sc_dx_melanoma_primary",
      "sc_dx_merkel_cell",
      "sc_dx_dfsp",
      "sc_dx_afx",
    ];
    for (const id of knownIds) {
      const c = getSkinCancerDiagnosisAutoConfig(id);
      expect(c.availablePathwayStages).not.toContain("excision_biopsy");
      expect(c.availablePathwayStages).toContain("histology_known");
    }
  });
});

// ═══════════════════════════════════════════════════════════
// resolveSkinCancerDiagnosis
// ═══════════════════════════════════════════════════════════

describe("resolveSkinCancerDiagnosis", () => {
  // ── Pathway A (excision_biopsy) ──
  it("Pathway A without clinical suspicion → generic skin lesion", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({ pathwayStage: "excision_biopsy" }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_skin_lesion_excision_biopsy");
    expect(r!.snomedCtCode).toBe("95324001");
  });

  it("Pathway A with clinical suspicion BCC stays generic until histology returns", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "excision_biopsy",
        clinicalSuspicion: "bcc",
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_skin_lesion_excision_biopsy");
  });

  it("Pathway A with clinical suspicion melanoma stays generic until histology returns", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "excision_biopsy",
        clinicalSuspicion: "melanoma",
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_skin_lesion_excision_biopsy");
  });

  it("Pathway A with confirmed current histology resolves from current histology", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "excision_biopsy",
        clinicalSuspicion: "melanoma",
        currentHistology: makeHistology({
          pathologyCategory: "melanoma",
          melanomaBreslowMm: 0.9,
        }),
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_melanoma");
  });

  // ── Histology known with prior histology ──
  it("histology_known + BCC histology → BCC", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "histology_known",
        priorHistology: makeHistology({ pathologyCategory: "bcc" }),
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_bcc");
    expect(r!.snomedCtCode).toBe("254701007");
    expect(r!.displayName).toBe("Basal cell carcinoma (BCC)");
  });

  it("histology_known + SCC histology → SCC", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "histology_known",
        priorHistology: makeHistology({ pathologyCategory: "scc" }),
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_scc");
    expect(r!.snomedCtCode).toBe("254651007");
  });

  it("histology_known + melanoma histology → Melanoma", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "histology_known",
        priorHistology: makeHistology({
          pathologyCategory: "melanoma",
          melanomaBreslowMm: 1.5,
        }),
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_melanoma");
    expect(r!.snomedCtCode).toBe("93655004");
  });

  it("histology_known + merkel_cell → MCC", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "histology_known",
        priorHistology: makeHistology({ pathologyCategory: "merkel_cell" }),
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_merkel_cell");
    expect(r!.snomedCtCode).toBe("253001006");
  });

  // ── Rare subtypes with dedicated entries ──
  it("histology_known + DFSP → DFSP diagnosis", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "histology_known",
        priorHistology: makeHistology({
          pathologyCategory: "rare_malignant",
          rareSubtype: "dfsp",
        }),
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_dfsp");
    expect(r!.snomedCtCode).toBe("276799004");
  });

  it("histology_known + AFX → AFX diagnosis", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "histology_known",
        priorHistology: makeHistology({
          pathologyCategory: "rare_malignant",
          rareSubtype: "afx",
        }),
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_afx");
    expect(r!.snomedCtCode).toBe("254754005");
  });

  it("histology_known + rare_malignant without dedicated subtype flags manual review", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "histology_known",
        priorHistology: makeHistology({
          pathologyCategory: "rare_malignant",
          rareSubtype: "angiosarcoma",
        }),
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBeUndefined();
    expect(r!.requiresManualReview).toBe(true);
    expect(r!.displayName).toContain("Angiosarcoma");
  });

  // ── Benign / uncertain ──
  it("benign → generic skin lesion", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "histology_known",
        priorHistology: makeHistology({ pathologyCategory: "benign" }),
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_skin_lesion_excision_biopsy");
  });

  it("uncertain → generic skin lesion", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "histology_known",
        priorHistology: makeHistology({ pathologyCategory: "uncertain" }),
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_skin_lesion_excision_biopsy");
  });

  // ── No histology, no suspicion ──
  it("histology_known with no histology and no suspicion → null", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({ pathwayStage: "histology_known" }),
    );
    expect(r).toBeNull();
  });

  // ── Histology known with clinical suspicion fallback ──
  it("histology_known with no histology but clinical suspicion → uses suspicion", () => {
    const r = resolveSkinCancerDiagnosis(
      makeAssessment({
        pathwayStage: "histology_known",
        clinicalSuspicion: "scc",
      }),
    );
    expect(r).not.toBeNull();
    expect(r!.diagnosisPicklistId).toBe("sc_dx_scc");
  });

  it("prefers current definitive histology over prior histology", () => {
    const histology = getSkinCancerPrimaryHistology(
      makeAssessment({
        pathwayStage: "histology_known",
        priorHistology: makeHistology({ pathologyCategory: "bcc" }),
        currentHistology: makeHistology({
          pathologyCategory: "melanoma",
          melanomaBreslowMm: 1.1,
        }),
      }),
    );
    expect(histology?.pathologyCategory).toBe("melanoma");
  });
});
