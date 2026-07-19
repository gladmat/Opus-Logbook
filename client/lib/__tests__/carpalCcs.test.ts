/**
 * Carpal fracture CRIF + CCS pathway — closes the gap where a closed carpal
 * fracture fixed with a headless compression screw (e.g. trapezium + CCS)
 * could only be logged as ORIF (open) or CRIF K-wires (wrong hardware).
 * Also covers the carpal machine-title polish (lowercase English, Latin
 * genitive "ossis trapezii" instead of the raw picker name).
 */

import { describe, it, expect } from "vitest";
import { resolveTraumaDiagnosis } from "@/lib/handTraumaMapping";
import { generateHandTraumaDiagnosis } from "@/lib/handTraumaDiagnosis";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import {
  isFixationHardwareProcedure,
  getSuggestedHardwareSections,
} from "@/types/fixationHardware";
import type { FractureEntry } from "@/types/case";

function createTrapeziumFracture(
  options: Partial<FractureEntry["details"]> = {},
): FractureEntry {
  return {
    id: "fx-1",
    boneId: "trapezium",
    boneName: "Trapezium",
    aoCode: "75B",
    details: {
      familyCode: "75",
      type: "B",
      openStatus: "closed",
      ...options,
    },
  };
}

describe("carpal CRIF CCS picklist entry", () => {
  it("hand_fx_carpal_crif_ccs carries the verified carpal-specific SNOMED code", () => {
    const entry = findPicklistEntry("hand_fx_carpal_crif_ccs");
    expect(entry).toBeTruthy();
    // Frozen: verified active on Ontoserver (AU extension) 2026-07-19
    expect(entry?.snomedCtCode).toBe("781311000168103");
    expect(entry?.snomedCtDisplay).toContain(
      "Closed reduction of fracture of carpal bone with internal fixation",
    );
    expect(entry?.subcategory).toBe("Fracture & Joint Fixation");
  });

  it("hand_dx_carpal_fracture_other suggestions all resolve, keep ORIF default, and include CCS", () => {
    const diagnosis = findDiagnosisById("hand_dx_carpal_fracture_other");
    expect(diagnosis).toBeTruthy();

    const suggestions = diagnosis?.suggestedProcedures ?? [];
    expect(suggestions.map((s) => s.procedurePicklistId)).toEqual([
      "hand_fx_carpal_orif",
      "hand_fx_carpal_orif_ccs",
      "hand_fx_carpal_crif",
      "hand_fx_carpal_crif_ccs",
    ]);
    for (const suggestion of suggestions) {
      expect(
        findPicklistEntry(suggestion.procedurePicklistId),
        `suggestion ${suggestion.procedurePicklistId} must resolve`,
      ).toBeTruthy();
    }

    const defaults = suggestions.filter((s) => s.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.procedurePicklistId).toBe("hand_fx_carpal_orif");
  });
});

describe("carpal CCS fixation hardware gating", () => {
  it("triggers the fixation hardware card", () => {
    expect(isFixationHardwareProcedure("hand_fx_carpal_crif_ccs")).toBe(true);
  });

  it("pre-highlights the screws section", () => {
    expect(getSuggestedHardwareSections("hand_fx_carpal_crif_ccs")).toEqual([
      "screws",
    ]);
  });
});

describe("carpal fracture mapping pair", () => {
  it("offers ORIF / CRIF K-wire / CRIF CCS as single-select chips for a trapezium fracture", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: [],
      activeCategories: ["fracture"],
      fractures: [createTrapeziumFracture()],
    });

    const pair = result?.pairs.find((p) => p.source === "fracture");
    expect(pair).toBeTruthy();
    expect(pair?.diagnosis.diagnosisPicklistId).toBe(
      "hand_dx_carpal_fracture_other",
    );
    expect(pair?.diagnosis.snomedCtCode).toBe("82065001");
    expect(pair?.selectionMode).toBe("single");

    const suggestionIds = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(suggestionIds).toContain("hand_fx_carpal_orif");
    expect(suggestionIds).toContain("hand_fx_carpal_crif");
    expect(suggestionIds).toContain("hand_fx_carpal_crif_ccs");

    const defaults = (pair?.suggestedProcedures ?? []).filter(
      (s) => s.isDefault,
    );
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.procedurePicklistId).toBe("hand_fx_carpal_orif");
  });
});

describe("carpal machine titles", () => {
  const selection = {
    laterality: "left" as const,
    affectedDigits: [],
    fractures: [createTrapeziumFracture()],
  };

  it("renders the lowercase bone name in shorthand English", () => {
    const result = generateHandTraumaDiagnosis(selection, "shorthand_english");
    expect(result?.diagnosisTextShort).toContain("fracture of trapezium");
    expect(result?.diagnosisTextShort).toContain("(AO: 75B)");
  });

  it("renders the Latin genitive", () => {
    const result = generateHandTraumaDiagnosis(selection, "latin_medical");
    expect(result?.diagnosisTextShort).toContain("Fractura");
    expect(result?.diagnosisTextShort).toContain("ossis trapezii");
    expect(result?.diagnosisTextShort).not.toContain("Trapezium");
  });

  it("declines every carpal bone correctly in Latin", () => {
    const cases: [string, string][] = [
      ["Scaphoid", "ossis scaphoidei"],
      ["Lunate", "ossis lunati"],
      ["Triquetrum", "ossis triquetri"],
      ["Pisiform", "ossis pisiformis"],
      ["Trapezium", "ossis trapezii"],
      ["Trapezoid", "ossis trapezoidei"],
      ["Capitate", "ossis capitati"],
      ["Hamate", "ossis hamati"],
    ];
    for (const [boneName, latin] of cases) {
      const result = generateHandTraumaDiagnosis(
        {
          ...selection,
          fractures: [createTrapeziumFracture()].map((f) => ({
            ...f,
            boneName,
            boneId: boneName.toLowerCase(),
          })),
        },
        "latin_medical",
      );
      expect(
        result?.diagnosisTextShort,
        `${boneName} must decline to ${latin}`,
      ).toContain(latin);
    }
  });

  it("leaves non-carpal bone names untouched (regression)", () => {
    const result = generateHandTraumaDiagnosis(
      {
        laterality: "left" as const,
        affectedDigits: ["III" as const],
        fractures: [
          {
            id: "fx-1",
            boneId: "mc3",
            boneName: "Middle Metacarpal",
            aoCode: "77.3.2C",
            details: { familyCode: "77", finger: "3", segment: "2", type: "C" },
          },
        ],
      },
      "shorthand_english",
    );
    expect(result?.diagnosisTextShort).toContain("MC III");
  });
});
