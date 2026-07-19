/**
 * Bony mallet finger pathway — surgeon-selected fracture `pattern` refinement
 * that routes the trauma fracture flow to the named `hand_dx_bony_mallet`
 * diagnosis (SNOMED 208459000), renders "bony mallet" machine titles, and
 * leads with the DIP-specific Ishiguro extension-block procedure.
 *
 * Deliberately NOT auto-derived from AO coding: 78.x.3.1B cannot distinguish
 * a dorsal base fragment (bony mallet) from a volar one (bony jersey).
 */

import { describe, it, expect } from "vitest";
import { resolveTraumaDiagnosis } from "@/lib/handTraumaMapping";
import { generateHandTraumaDiagnosis } from "@/lib/handTraumaDiagnosis";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import type { FractureEntry } from "@/types/case";

function createDistalPhalanxFracture(
  options: Partial<FractureEntry["details"]> = {},
): FractureEntry {
  return {
    id: "fx-1",
    boneId: "dp4",
    boneName: "Ring Distal Phalanx",
    aoCode: "78.4.3.1B",
    details: {
      familyCode: "78",
      finger: "4",
      phalanx: "3",
      segment: "1",
      type: "B",
      ...options,
    },
  };
}

describe("bony mallet picklist entries", () => {
  it("hand_fx_mallet_extension_block carries the verified DIP-specific SNOMED code", () => {
    const entry = findPicklistEntry("hand_fx_mallet_extension_block");
    expect(entry).toBeTruthy();
    // Frozen: verified active in AU (20260630) + Intl (20260601) editions
    expect(entry?.snomedCtCode).toBe("439323003");
    expect(entry?.snomedCtDisplay).toContain("distal phalangeal fracture");
    expect(entry?.subcategory).toBe("Fracture & Joint Fixation");
  });

  it("hand_dx_bony_mallet suggestions all resolve and lead with the DIP extension block", () => {
    const diagnosis = findDiagnosisById("hand_dx_bony_mallet");
    expect(diagnosis).toBeTruthy();
    expect(diagnosis?.snomedCtCode).toBe("208459000");

    const suggestions = diagnosis?.suggestedProcedures ?? [];
    expect(suggestions.length).toBeGreaterThanOrEqual(4);
    for (const suggestion of suggestions) {
      expect(
        findPicklistEntry(suggestion.procedurePicklistId),
        `suggestion ${suggestion.procedurePicklistId} must resolve`,
      ).toBeTruthy();
    }

    const defaults = suggestions.filter((s) => s.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.procedurePicklistId).toBe(
      "hand_fx_mallet_extension_block",
    );

    // The PIP-labelled dislocation procedure must no longer be suggested
    // for a DIP injury
    expect(suggestions.map((s) => s.procedurePicklistId)).not.toContain(
      "hand_disloc_pip_extension_block_kwire",
    );
  });
});

describe("bony mallet mapping pair", () => {
  it("routes the pattern-flagged fracture to hand_dx_bony_mallet with Ishiguro default", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["IV"],
      activeCategories: ["fracture"],
      fractures: [createDistalPhalanxFracture({ pattern: "bony_mallet" })],
    });

    const pair = result?.pairs.find((p) => p.source === "fracture");
    expect(pair).toBeTruthy();
    expect(pair?.diagnosis.diagnosisPicklistId).toBe("hand_dx_bony_mallet");
    expect(pair?.diagnosis.snomedCtCode).toBe("208459000");
    expect(pair?.selectionMode).toBe("single");

    const suggestionIds = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(suggestionIds).toContain("hand_fx_mallet_extension_block");
    expect(suggestionIds).toContain("hand_tend_mallet_finger");
    expect(suggestionIds).toContain("hand_fx_phalanx_crif");
    expect(suggestionIds).toContain("hand_fx_phalanx_orif");

    const defaults = (pair?.suggestedProcedures ?? []).filter(
      (s) => s.isDefault,
    );
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.procedurePicklistId).toBe(
      "hand_fx_mallet_extension_block",
    );
  });

  it("keeps the generic phalanx pair when no pattern is set (regression)", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["IV"],
      activeCategories: ["fracture"],
      fractures: [createDistalPhalanxFracture()],
    });

    const pair = result?.pairs.find((p) => p.source === "fracture");
    expect(pair?.diagnosis.diagnosisPicklistId).toBe("hand_dx_phalanx_fx");
    const suggestionIds = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(suggestionIds).not.toContain("hand_fx_mallet_extension_block");
  });

  it("groups a mallet fracture separately from a plain fracture on the same phalanx level", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["III", "IV"],
      activeCategories: ["fracture"],
      fractures: [
        createDistalPhalanxFracture({ pattern: "bony_mallet" }),
        {
          id: "fx-2",
          boneId: "dp3",
          boneName: "Middle Distal Phalanx",
          aoCode: "78.3.3.1B",
          details: {
            familyCode: "78",
            finger: "3",
            phalanx: "3",
            segment: "1",
            type: "B",
          },
        },
      ],
    });

    const fracturePairs =
      result?.pairs.filter((p) => p.source === "fracture") ?? [];
    expect(fracturePairs).toHaveLength(2);
    const malletPair = fracturePairs.find(
      (p) => p.diagnosis.diagnosisPicklistId === "hand_dx_bony_mallet",
    );
    const genericPair = fracturePairs.find(
      (p) => p.diagnosis.diagnosisPicklistId === "hand_dx_phalanx_fx",
    );
    expect(malletPair).toBeTruthy();
    expect(genericPair).toBeTruthy();
  });
});

describe("bony mallet machine titles", () => {
  const selection = {
    laterality: "left" as const,
    affectedDigits: ["IV" as const],
    fractures: [createDistalPhalanxFracture({ pattern: "bony_mallet" })],
  };

  it("renders the named entity in shorthand English", () => {
    const result = generateHandTraumaDiagnosis(selection, "shorthand_english");
    expect(result?.diagnosisTextShort).toContain("bony mallet fracture");
    expect(result?.diagnosisTextShort).toContain("Dig. IV");
  });

  it("renders the dorsal base avulsion wording in full English", () => {
    const result = generateHandTraumaDiagnosis(selection, "full_english");
    expect(result?.diagnosisTextLong).toContain(
      "bony mallet fracture (dorsal base avulsion) of distal phalanx",
    );
  });

  it("renders mallet osseum in Latin", () => {
    const result = generateHandTraumaDiagnosis(selection, "latin_medical");
    expect(result?.diagnosisTextShort).toContain("phalangis distalis");
    expect(result?.diagnosisTextShort).toContain("(mallet osseum)");
  });

  it("keeps the topographic label without the pattern flag (regression)", () => {
    const result = generateHandTraumaDiagnosis(
      {
        ...selection,
        fractures: [createDistalPhalanxFracture()],
      },
      "shorthand_english",
    );
    expect(result?.diagnosisTextShort).not.toContain("bony mallet");
    // Shorthand topographic label: "fracture of Distal, Dig. IV base"
    expect(result?.diagnosisTextShort.toLowerCase()).toContain(
      "fracture of distal",
    );
  });
});
