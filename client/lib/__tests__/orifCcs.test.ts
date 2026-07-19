/**
 * ORIF + headless compression screw pathway — every fracture family
 * (metacarpal, phalanx, carpal) offers an explicit open-reduction CCS
 * fixation chip alongside the generic ORIF, mirroring the CRIF + CCS set.
 * Also freezes the carpal ORIF miscode repair: hand_fx_carpal_orif,
 * hand_fx_scaphoid_orif, and hand_fx_carpal_other previously carried
 * 608784006 ("Open reduction of fracture of METACARPAL bone with internal
 * fixation") — the correct carpal concept is 608783000.
 */

import { describe, it, expect } from "vitest";
import { resolveTraumaDiagnosis } from "@/lib/handTraumaMapping";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import {
  isFixationHardwareProcedure,
  getSuggestedHardwareSections,
} from "@/types/fixationHardware";

const ORIF_CCS_IDS = [
  "hand_fx_metacarpal_orif_ccs",
  "hand_fx_phalanx_orif_ccs",
  "hand_fx_carpal_orif_ccs",
] as const;

describe("ORIF CCS picklist entries", () => {
  it("carry the family-specific open-reduction SNOMED codes (frozen)", () => {
    // Verified active on Ontoserver (AU + Intl) 2026-07-19
    expect(findPicklistEntry("hand_fx_metacarpal_orif_ccs")?.snomedCtCode).toBe(
      "608784006",
    );
    expect(findPicklistEntry("hand_fx_phalanx_orif_ccs")?.snomedCtCode).toBe(
      "847251000168106",
    );
    expect(findPicklistEntry("hand_fx_carpal_orif_ccs")?.snomedCtCode).toBe(
      "608783000",
    );
    for (const id of ORIF_CCS_IDS) {
      const entry = findPicklistEntry(id);
      expect(entry?.displayName).toContain("headless compression screw");
      expect(entry?.subcategory).toBe("Fracture & Joint Fixation");
    }
  });

  it("carpal ORIF miscode repair holds: carpal/scaphoid open reduction uses the carpal concept", () => {
    // 608784006 is "...of metacarpal bone..." — must not appear on carpal entries
    expect(findPicklistEntry("hand_fx_carpal_orif")?.snomedCtCode).toBe(
      "608783000",
    );
    expect(findPicklistEntry("hand_fx_scaphoid_orif")?.snomedCtCode).toBe(
      "608783000",
    );
    expect(findPicklistEntry("hand_fx_carpal_other")?.snomedCtCode).toBe(
      "608783000",
    );
  });
});

describe("ORIF CCS diagnosis suggestions", () => {
  const CASES: [string, string][] = [
    ["hand_dx_metacarpal_fx", "hand_fx_metacarpal_orif_ccs"],
    ["hand_dx_phalanx_fx", "hand_fx_phalanx_orif_ccs"],
    ["hand_dx_carpal_fracture_other", "hand_fx_carpal_orif_ccs"],
  ];

  it("each fracture family offers ORIF CCS, keeps plain ORIF as the sole default, and all suggestions resolve", () => {
    for (const [diagnosisId, orifCcsId] of CASES) {
      const diagnosis = findDiagnosisById(diagnosisId);
      const suggestions = diagnosis?.suggestedProcedures ?? [];
      const ids = suggestions.map((s) => s.procedurePicklistId);
      expect(ids, `${diagnosisId} must offer ${orifCcsId}`).toContain(
        orifCcsId,
      );
      for (const suggestion of suggestions) {
        expect(
          findPicklistEntry(suggestion.procedurePicklistId),
          `suggestion ${suggestion.procedurePicklistId} must resolve`,
        ).toBeTruthy();
      }
      const defaults = suggestions.filter((s) => s.isDefault);
      expect(defaults, `${diagnosisId} default`).toHaveLength(1);
      expect(defaults[0]?.procedurePicklistId).toMatch(/_orif$/);
    }
  });
});

describe("ORIF CCS fixation hardware gating", () => {
  it("triggers the fixation hardware card with a screws hint", () => {
    for (const id of ORIF_CCS_IDS) {
      expect(isFixationHardwareProcedure(id), id).toBe(true);
      expect(getSuggestedHardwareSections(id), id).toEqual(["screws"]);
    }
  });
});

describe("ORIF CCS mapping pairs", () => {
  it("metacarpal fracture pair offers the ORIF CCS chip with ORIF still default", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["III"],
      activeCategories: ["fracture"],
      fractures: [
        {
          id: "fx-1",
          boneId: "mc3",
          boneName: "Middle Metacarpal",
          aoCode: "77.3.2A",
          details: { familyCode: "77", finger: "3", segment: "2", type: "A" },
        },
      ],
    });

    const pair = result?.pairs.find((p) => p.source === "fracture");
    const ids = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(ids).toContain("hand_fx_metacarpal_orif_ccs");
    const defaults = (pair?.suggestedProcedures ?? []).filter(
      (s) => s.isDefault,
    );
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.procedurePicklistId).toBe("hand_fx_metacarpal_orif");
  });

  it("trapezium pair offers all four fixation chips", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: [],
      activeCategories: ["fracture"],
      fractures: [
        {
          id: "fx-1",
          boneId: "trapezium",
          boneName: "Trapezium",
          aoCode: "75B",
          details: { familyCode: "75", type: "B", openStatus: "closed" },
        },
      ],
    });

    const pair = result?.pairs.find((p) => p.source === "fracture");
    const ids = (pair?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        "hand_fx_carpal_orif",
        "hand_fx_carpal_orif_ccs",
        "hand_fx_carpal_crif",
        "hand_fx_carpal_crif_ccs",
      ]),
    );
  });
});
