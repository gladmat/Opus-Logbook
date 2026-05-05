import { describe, it, expect } from "vitest";
import {
  calculateCraniofacialCompleteness,
  getOutcomeSectionVisibility,
  getEdgeCaseNote,
} from "../craniofacialConfig";
import { CLEFT_CRANIO_DIAGNOSES } from "../diagnosisPicklists/cleftCranioDiagnoses";
import { PROCEDURE_PICKLIST } from "../procedurePicklist";
import type {
  CraniofacialAssessmentData,
  CraniofacialSubcategory,
} from "@/types/craniofacial";

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function makeAssessment(
  overrides: Partial<CraniofacialAssessmentData> = {},
): CraniofacialAssessmentData {
  return {
    operativeDetails: {},
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// calculateCraniofacialCompleteness
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculateCraniofacialCompleteness", () => {
  it("returns 0% for empty assessment with no subcategory", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment(),
      undefined,
    );
    expect(result.percentage).toBe(0);
    expect(result.filled).toBe(0);
    expect(result.total).toBe(1); // operative details always counted
    expect(result.missingSections).toContain("Pathway stage");
  });

  it("returns 100% when pathway stage is set and no subcategory", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({ operativeDetails: { pathwayStage: "primary" } }),
      undefined,
    );
    expect(result.percentage).toBe(100);
    expect(result.filled).toBe(1);
    expect(result.total).toBe(1);
    expect(result.missingSections).toHaveLength(0);
  });

  it("marks operative details incomplete when pathwayStage is missing", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment(),
      "Cleft Lip",
    );
    expect(result.missingSections).toContain("Pathway stage");
  });

  it("marks operative details complete when pathwayStage is set", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({ operativeDetails: { pathwayStage: "revision" } }),
      "Craniofacial Conditions",
    );
    expect(result.missingSections).not.toContain("Pathway stage");
  });

  it("counts cleft classification for cleft lip subcategory", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({ operativeDetails: { pathwayStage: "primary" } }),
      "Cleft Lip",
    );
    // Operative details (complete) + cleft classification (incomplete)
    expect(result.total).toBe(2);
    expect(result.filled).toBe(1);
    expect(result.missingSections).toContain("LAHSHAL classification");
  });

  it("marks cleft classification complete when LAHSHAL has non-none position", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({
        operativeDetails: { pathwayStage: "primary" },
        cleftClassification: {
          lahshal: {
            rightLip: "complete",
            rightAlveolus: "none",
            hardPalate: "none",
            softPalate: "none",
            leftAlveolus: "none",
            leftLip: "none",
          },
        },
      }),
      "Cleft Lip",
    );
    expect(result.percentage).toBe(100);
    expect(result.missingSections).not.toContain("LAHSHAL classification");
  });

  it("marks cleft classification incomplete when all LAHSHAL positions are none", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({
        operativeDetails: { pathwayStage: "primary" },
        cleftClassification: {
          lahshal: {
            rightLip: "none",
            rightAlveolus: "none",
            hardPalate: "none",
            softPalate: "none",
            leftAlveolus: "none",
            leftLip: "none",
          },
        },
      }),
      "Cleft Palate",
    );
    expect(result.missingSections).toContain("LAHSHAL classification");
  });

  it("excludes cleft classification from total for craniosynostosis subcategory", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({ operativeDetails: { pathwayStage: "primary" } }),
      "Non-Syndromic Craniosynostosis",
    );
    // Operative details + craniosynostosis
    expect(result.total).toBe(2);
    expect(result.missingSections).not.toContain("LAHSHAL classification");
    expect(result.missingSections).toContain("Sutures involved");
  });

  it("marks craniosynostosis complete when sutures selected", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({
        operativeDetails: { pathwayStage: "primary" },
        craniosynostosisDetails: {
          suturesInvolved: ["sagittal"],
          syndromic: false,
        },
      }),
      "Non-Syndromic Craniosynostosis",
    );
    expect(result.percentage).toBe(100);
    expect(result.missingSections).toHaveLength(0);
  });

  it("marks craniosynostosis incomplete with empty sutures array", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({
        operativeDetails: { pathwayStage: "primary" },
        craniosynostosisDetails: {
          suturesInvolved: [],
          syndromic: false,
        },
      }),
      "Syndromic Craniosynostosis",
    );
    expect(result.missingSections).toContain("Sutures involved");
  });

  it("counts OMENS for Craniofacial Conditions subcategory", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({ operativeDetails: { pathwayStage: "primary" } }),
      "Craniofacial Conditions",
    );
    // Operative details + OMENS
    expect(result.total).toBe(2);
    expect(result.missingSections).toContain("OMENS+ classification");
  });

  it("marks OMENS complete when object present", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({
        operativeDetails: { pathwayStage: "primary" },
        omensClassification: {
          orbit: 0,
          mandible: "I",
          ear: 0,
          nerve: 0,
          softTissue: 0,
          laterality: "left",
        },
      }),
      "Craniofacial Conditions",
    );
    expect(result.percentage).toBe(100);
  });

  it("excludes OMENS from total for non-craniofacial subcategories", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({ operativeDetails: { pathwayStage: "primary" } }),
      "Cleft Lip & Palate",
    );
    expect(result.missingSections).not.toContain("OMENS+ classification");
  });

  it("returns correct counts for Cleft Lip & Palate with all sections filled", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({
        operativeDetails: { pathwayStage: "primary" },
        cleftClassification: {
          lahshal: {
            rightLip: "none",
            rightAlveolus: "none",
            hardPalate: "incomplete",
            softPalate: "complete",
            leftAlveolus: "none",
            leftLip: "none",
          },
        },
      }),
      "Cleft Lip & Palate",
    );
    expect(result.filled).toBe(2);
    expect(result.total).toBe(2);
    expect(result.percentage).toBe(100);
  });

  it("handles VPI subcategory (no cleft, no cranio, no OMENS)", () => {
    const result = calculateCraniofacialCompleteness(
      makeAssessment({ operativeDetails: { pathwayStage: "secondary" } }),
      "Velopharyngeal Insufficiency",
    );
    // Only operative details
    expect(result.total).toBe(1);
    expect(result.filled).toBe(1);
    expect(result.percentage).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getOutcomeSectionVisibility
// ═══════════════════════════════════════════════════════════════════════════════

describe("getOutcomeSectionVisibility", () => {
  it("shows speech for Cleft Lip subcategory", () => {
    const result = getOutcomeSectionVisibility("Cleft Lip");
    expect(result.showSpeech).toBe(true);
  });

  it("shows speech for Velopharyngeal Insufficiency", () => {
    const result = getOutcomeSectionVisibility("Velopharyngeal Insufficiency");
    expect(result.showSpeech).toBe(true);
  });

  it("does not show speech for Non-Syndromic Craniosynostosis", () => {
    const result = getOutcomeSectionVisibility(
      "Non-Syndromic Craniosynostosis",
    );
    expect(result.showSpeech).toBe(false);
  });

  it("shows dental for Alveolar & Maxillary", () => {
    const result = getOutcomeSectionVisibility("Alveolar & Maxillary");
    expect(result.showDental).toBe(true);
  });

  it("shows dental for Cleft Palate", () => {
    const result = getOutcomeSectionVisibility("Cleft Palate");
    expect(result.showDental).toBe(true);
  });

  it("shows hearing and feeding for cleft subcategories only", () => {
    const cleftResult = getOutcomeSectionVisibility("Cleft Lip & Palate");
    expect(cleftResult.showHearing).toBe(true);
    expect(cleftResult.showFeeding).toBe(true);

    const cranioResult = getOutcomeSectionVisibility(
      "Non-Syndromic Craniosynostosis",
    );
    expect(cranioResult.showHearing).toBe(false);
    expect(cranioResult.showFeeding).toBe(false);
  });

  it("shows genetic testing for Syndromic Craniosynostosis", () => {
    const result = getOutcomeSectionVisibility("Syndromic Craniosynostosis");
    expect(result.showGeneticTesting).toBe(true);
  });

  it("shows genetic testing when associatedSyndrome is truthy", () => {
    const result = getOutcomeSectionVisibility("Cleft Lip", "22q11.2 deletion");
    expect(result.showGeneticTesting).toBe(true);
  });

  it("does not show genetic testing for cleft without syndrome", () => {
    const result = getOutcomeSectionVisibility("Cleft Lip");
    expect(result.showGeneticTesting).toBe(false);
  });

  it("handles undefined subcategory with associatedSyndrome", () => {
    const result = getOutcomeSectionVisibility(undefined, "Van der Woude");
    expect(result.showGeneticTesting).toBe(true);
    expect(result.showSpeech).toBe(false);
    expect(result.showDental).toBe(false);
  });

  it("returns all false for undefined subcategory without syndrome", () => {
    const result = getOutcomeSectionVisibility(undefined);
    expect(result.showSpeech).toBe(false);
    expect(result.showDental).toBe(false);
    expect(result.showHearing).toBe(false);
    expect(result.showFeeding).toBe(false);
    expect(result.showGeneticTesting).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getEdgeCaseNote
// ═══════════════════════════════════════════════════════════════════════════════

describe("getEdgeCaseNote", () => {
  it("returns consultation note for positional plagiocephaly with no procedures", () => {
    const result = getEdgeCaseNote("cc_dx_positional_plagiocephaly", []);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("Consultation only");
    expect(result!.icon).toBe("info");
  });

  it("returns null for positional plagiocephaly with procedures selected", () => {
    const result = getEdgeCaseNote("cc_dx_positional_plagiocephaly", [
      "cc_helmet_therapy",
    ]);
    expect(result).toBeNull();
  });

  it("returns NAM note when NAM procedure selected", () => {
    const result = getEdgeCaseNote("cc_dx_cleft_lip_unilateral_complete", [
      "cc_presurgical_nam",
    ]);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("Non-surgical procedure");
    expect(result!.icon).toBe("info");
  });

  it("returns null for regular diagnosis/procedure combinations", () => {
    const result = getEdgeCaseNote("cc_dx_cleft_lip_unilateral_complete", [
      "cc_lip_repair_unilateral",
    ]);
    expect(result).toBeNull();
  });

  it("returns null for undefined diagnosisId", () => {
    const result = getEdgeCaseNote(undefined, []);
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Cross-reference validation (SNOMED audit)
// ═══════════════════════════════════════════════════════════════════════════════

describe("craniofacial data integrity", () => {
  const procedureIds = new Set(PROCEDURE_PICKLIST.map((p) => p.id));

  it("all suggestedProcedures reference existing procedure picklist entries", () => {
    const broken: string[] = [];
    for (const dx of CLEFT_CRANIO_DIAGNOSES) {
      for (const sp of dx.suggestedProcedures ?? []) {
        if (!procedureIds.has(sp.procedurePicklistId)) {
          broken.push(`${dx.id} → ${sp.procedurePicklistId}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("all diagnoses have non-empty SNOMED CT codes", () => {
    const missing = CLEFT_CRANIO_DIAGNOSES.filter(
      (dx) => !dx.snomedCtCode || dx.snomedCtCode.trim() === "",
    ).map((dx) => dx.id);
    expect(missing).toEqual([]);
  });

  it("all diagnoses have non-empty SNOMED CT display names", () => {
    const missing = CLEFT_CRANIO_DIAGNOSES.filter(
      (dx) => !dx.snomedCtDisplay || dx.snomedCtDisplay.trim() === "",
    ).map((dx) => dx.id);
    expect(missing).toEqual([]);
  });

  it("no duplicate diagnosis IDs", () => {
    const ids = CLEFT_CRANIO_DIAGNOSES.map((dx) => dx.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
  });

  it("all cc_* procedures have non-empty SNOMED CT codes (except NAM)", () => {
    // cc_presurgical_nam is a non-surgical orthotic — no SNOMED procedure code exists
    const KNOWN_NO_CODE = new Set(["cc_presurgical_nam"]);
    const ccProcs = PROCEDURE_PICKLIST.filter((p) => p.id.startsWith("cc_"));
    const missing = ccProcs
      .filter(
        (p) =>
          !KNOWN_NO_CODE.has(p.id) &&
          (!p.snomedCtCode || p.snomedCtCode.trim() === ""),
      )
      .map((p) => p.id);
    expect(missing).toEqual([]);
  });
});
