/**
 * Hook of hamate pathway — AO 74A ("Hook fracture", the only carpal sub-site
 * the AO hand classification names directly) routes to the dedicated
 * `hand_dx_hook_of_hamate_fracture` diagnosis whose procedure set leads with
 * fragment excision (the workhorse operation) instead of the generic carpal
 * fixation chips. 74B/C (body fractures) keep the generic carpal pair.
 *
 * SNOMED frozen 2026-07-23 (verified active AU + Intl):
 * - 449363000 "Excision of part of carpal bone" (no hook-specific procedure
 *   concept exists; this is the nearest exact parent)
 * - 85922006 "Fracture of hamate bone of wrist" (no open/closed-neutral hook
 *   fracture concept exists — 208369005/208379007 are the closed/open pair)
 */

import { describe, it, expect } from "vitest";
import { resolveTraumaDiagnosis } from "@/lib/handTraumaMapping";
import {
  generateHandTraumaDiagnosis,
  isHamateHookFracture,
} from "@/lib/handTraumaDiagnosis";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import { isFixationHardwareProcedure } from "@/types/fixationHardware";
import type { FractureEntry } from "@/types/case";

function createHamateFracture(
  aoType: "A" | "B" | "C" = "A",
  options: Partial<FractureEntry["details"]> = {},
): FractureEntry {
  return {
    id: `fx-hamate-${aoType}`,
    boneId: "hamate",
    boneName: "Hamate",
    aoCode: `74${aoType}`,
    details: {
      familyCode: "74",
      type: aoType,
      openStatus: "closed",
      ...options,
    },
  };
}

describe("hook of hamate picklist entries", () => {
  it("hand_fx_hamate_hook_excision carries the verified carpal excision SNOMED code", () => {
    const entry = findPicklistEntry("hand_fx_hamate_hook_excision");
    expect(entry).toBeTruthy();
    expect(entry?.snomedCtCode).toBe("449363000");
    expect(entry?.snomedCtDisplay).toContain("Excision of part of carpal bone");
    expect(entry?.subcategory).toBe("Fracture & Joint Fixation");
  });

  it("excision does not trigger the fixation hardware card", () => {
    expect(isFixationHardwareProcedure("hand_fx_hamate_hook_excision")).toBe(
      false,
    );
  });

  it("hand_dx_hook_of_hamate_fracture suggestions all resolve and lead with excision", () => {
    const diagnosis = findDiagnosisById("hand_dx_hook_of_hamate_fracture");
    expect(diagnosis).toBeTruthy();
    expect(diagnosis?.snomedCtCode).toBe("85922006");

    const suggestions = diagnosis?.suggestedProcedures ?? [];
    expect(suggestions.map((s) => s.procedurePicklistId)).toEqual([
      "hand_fx_hamate_hook_excision",
      "hand_fx_carpal_orif",
      "hand_fx_carpal_orif_ccs",
    ]);
    for (const suggestion of suggestions) {
      expect(
        findPicklistEntry(suggestion.procedurePicklistId),
        `suggestion ${suggestion.procedurePicklistId} must resolve`,
      ).toBeTruthy();
    }

    const defaults = suggestions.filter((s) => s.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.procedurePicklistId).toBe(
      "hand_fx_hamate_hook_excision",
    );
  });
});

describe("isHamateHookFracture", () => {
  it("matches only the hamate A subtype", () => {
    expect(isHamateHookFracture({ familyCode: "74", aoCode: "74A" })).toBe(
      true,
    );
    expect(isHamateHookFracture({ familyCode: "74", aoCode: "74B" })).toBe(
      false,
    );
    expect(isHamateHookFracture({ familyCode: "75", aoCode: "75A" })).toBe(
      false,
    );
  });
});

describe("hook of hamate mapping pair", () => {
  it("routes 74A to the hook diagnosis with excision as the single default", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: [],
      activeCategories: ["fracture"],
      fractures: [createHamateFracture("A")],
    });

    const pair = result?.pairs.find((p) => p.source === "fracture");
    expect(pair).toBeTruthy();
    expect(pair?.diagnosis.diagnosisPicklistId).toBe(
      "hand_dx_hook_of_hamate_fracture",
    );
    expect(pair?.diagnosis.snomedCtCode).toBe("85922006");
    expect(pair?.selectionMode).toBe("single");

    const suggestionIds = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(suggestionIds).toContain("hand_fx_hamate_hook_excision");
    expect(suggestionIds).toContain("hand_fx_carpal_orif");
    expect(suggestionIds).toContain("hand_fx_carpal_orif_ccs");

    const defaults = (pair?.suggestedProcedures ?? []).filter(
      (s) => s.isDefault,
    );
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.procedurePicklistId).toBe(
      "hand_fx_hamate_hook_excision",
    );
  });

  it("keeps the generic carpal pair for a 74B body fracture (regression)", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: [],
      activeCategories: ["fracture"],
      fractures: [createHamateFracture("B")],
    });

    const pair = result?.pairs.find((p) => p.source === "fracture");
    expect(pair?.diagnosis.diagnosisPicklistId).toBe(
      "hand_dx_carpal_fracture_other",
    );
    const suggestionIds = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(suggestionIds).not.toContain("hand_fx_hamate_hook_excision");
    expect(suggestionIds).toContain("hand_fx_carpal_orif");
  });

  it("splits a hook fracture from a body fracture in the same case", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      affectedDigits: [],
      activeCategories: ["fracture"],
      fractures: [createHamateFracture("A"), createHamateFracture("B")],
    });

    const fracturePairs =
      result?.pairs.filter((p) => p.source === "fracture") ?? [];
    expect(fracturePairs).toHaveLength(2);
    expect(
      fracturePairs.map((p) => p.diagnosis.diagnosisPicklistId).sort(),
    ).toEqual([
      "hand_dx_carpal_fracture_other",
      "hand_dx_hook_of_hamate_fracture",
    ]);
  });
});

describe("hook of hamate machine titles", () => {
  const selection = {
    laterality: "left" as const,
    affectedDigits: [],
    fractures: [createHamateFracture("A")],
  };

  it("renders the hook wording in shorthand English", () => {
    const result = generateHandTraumaDiagnosis(selection, "shorthand_english");
    expect(result?.diagnosisTextShort).toContain("fracture of hook of hamate");
    expect(result?.diagnosisTextShort).toContain("(AO: 74A)");
  });

  it("renders the Latin genitive of the hamulus", () => {
    const result = generateHandTraumaDiagnosis(selection, "latin_medical");
    expect(result?.diagnosisTextShort).toContain("Fractura");
    expect(result?.diagnosisTextShort).toContain("hamuli ossis hamati");
  });

  it("keeps the whole-bone wording for a 74B body fracture (regression)", () => {
    const result = generateHandTraumaDiagnosis(
      { ...selection, fractures: [createHamateFracture("B")] },
      "shorthand_english",
    );
    expect(result?.diagnosisTextShort).toContain("fracture of hamate");
    expect(result?.diagnosisTextShort).not.toContain("hook");
  });
});
