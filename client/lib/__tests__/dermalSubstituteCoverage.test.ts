/**
 * Dermal matrix / skin substitute coverage option (BTM / Integra /
 * Matriderm) for degloving injuries and open defects — closes the gap where
 * the only skin-substitute procedures lived inside the burns module and were
 * unreachable from the hand trauma coverage flow.
 *
 * SNOMED frozen 2026-07-23: 1084841000168109 "Application of skin
 * substitute" (AU extension — same concept the burns dermal-substitute
 * entries already use; no specific Intl concept exists).
 */

import { describe, it, expect } from "vitest";
import { resolveTraumaDiagnosis } from "@/lib/handTraumaMapping";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";
import { findPicklistEntry } from "@/lib/procedurePicklist";

describe("dermal substitute picklist entry", () => {
  it("hand_cov_dermal_substitute carries the verified skin substitute SNOMED code", () => {
    const entry = findPicklistEntry("hand_cov_dermal_substitute");
    expect(entry).toBeTruthy();
    expect(entry?.snomedCtCode).toBe("1084841000168109");
    expect(entry?.snomedCtDisplay).toContain("Application of skin substitute");
    expect(entry?.subcategory).toBe("Soft Tissue Coverage");
    expect(entry?.specialties).toContain("hand_wrist");
  });
});

describe("hand trauma coverage pairs", () => {
  it("offers dermal matrix as a non-default chip for a zoned degloving injury", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: [],
      activeCategories: ["soft_tissue"],
      softTissueDescriptors: [
        {
          type: "degloving",
          surfaces: ["dorsal"],
          zone: "dorsum_hand",
          size: "large",
        },
      ],
    });

    const pair = result?.pairs.find((p) =>
      p.key.startsWith("soft_tissue:degloving:"),
    );
    expect(pair).toBeTruthy();
    expect(pair?.diagnosis.diagnosisPicklistId).toBe("hand_dx_hand_degloving");

    const suggestionIds = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(suggestionIds).toContain("hand_cov_dermal_substitute");

    // The zone default (skin graft for dorsum of hand) must keep the
    // default slot — dermal matrix is an option, not the lead suggestion.
    const defaults = (pair?.suggestedProcedures ?? []).filter(
      (s) => s.isDefault,
    );
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.procedurePicklistId).toBe("hand_cov_skin_graft");
  });

  it("offers dermal matrix even when a degloving injury has no zone selected", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      affectedDigits: [],
      activeCategories: ["soft_tissue"],
      softTissueDescriptors: [{ type: "degloving" }],
    });

    const pair = result?.pairs.find((p) =>
      p.key.startsWith("soft_tissue:degloving:"),
    );
    expect(pair).toBeTruthy();
    const suggestionIds = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(suggestionIds).toContain("hand_cov_dermal_substitute");
  });

  it("offers dermal matrix alongside zone suggestions for a plain defect", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["II"],
      activeCategories: ["soft_tissue"],
      softTissueDescriptors: [
        {
          type: "defect",
          surfaces: ["palmar"],
          zone: "fingertip",
          size: "small",
        },
      ],
    });

    const pair = result?.pairs.find((p) =>
      p.key.startsWith("soft_tissue:defect:"),
    );
    const suggestionIds = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(suggestionIds).toContain("hand_cov_vy_advancement");
    expect(suggestionIds).toContain("hand_cov_dermal_substitute");
  });

  it("offers dermal matrix for a contaminated wound (temporising cover)", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: [],
      activeCategories: ["soft_tissue"],
      softTissueDescriptors: [
        { type: "contamination", zone: "palm", size: "medium" },
      ],
    });

    const pair = result?.pairs.find((p) =>
      p.key.startsWith("soft_tissue:contamination:"),
    );
    expect(pair).toBeTruthy();
    const suggestionIds = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(suggestionIds).toContain("hand_cov_dermal_substitute");
  });

  it("does not offer dermal matrix on laceration pairs (regression)", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["III"],
      activeCategories: ["soft_tissue"],
      softTissueDescriptors: [{ type: "laceration", digits: ["III"] }],
    });

    const pair = result?.pairs.find((p) =>
      p.key.startsWith("soft_tissue:laceration:"),
    );
    expect(pair).toBeTruthy();
    const suggestionIds = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(suggestionIds).not.toContain("hand_cov_dermal_substitute");
  });
});

describe("degloving diagnosis suggestions across specialties", () => {
  it.each([
    "hand_dx_hand_degloving",
    "gen_dx_degloving",
    "orth_dx_degloving",
  ] as const)("%s suggests dermal matrix and all suggestions resolve", (id) => {
    const diagnosis = findDiagnosisById(id);
    expect(diagnosis).toBeTruthy();

    const suggestions = diagnosis?.suggestedProcedures ?? [];
    expect(suggestions.map((s) => s.procedurePicklistId)).toContain(
      "hand_cov_dermal_substitute",
    );
    for (const suggestion of suggestions) {
      expect(
        findPicklistEntry(suggestion.procedurePicklistId),
        `suggestion ${suggestion.procedurePicklistId} must resolve`,
      ).toBeTruthy();
    }

    // Dermal matrix must never steal the default slot from the existing
    // primary management suggestion.
    const dermal = suggestions.find(
      (s) => s.procedurePicklistId === "hand_cov_dermal_substitute",
    );
    expect(dermal?.isDefault).toBe(false);
  });
});
