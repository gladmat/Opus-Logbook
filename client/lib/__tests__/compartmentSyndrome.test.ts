/**
 * Compartment syndrome / compartment release pathway.
 *
 * Closes the 2026-08-01 oncall gap: compartment syndrome was unreachable from
 * the acute hand flow, no forearm or lower-limb diagnosis existed, and two
 * live miscodes shipped for months:
 * - handTraumaMapping emitted 111254007 for hand compartment syndrome — that
 *   code is "Osteitis deformans without bone neoplasm" (Paget's disease).
 * - 397737001's real FSN is "Fasciotomy of hand", yet it was carried (with
 *   doctored display strings) by the "forearm / hand" fasciotomy entry and
 *   the burns fasciotomy entry.
 *
 * SNOMED frozen 2026-08-01 (verified active AU + Intl on CSIRO Ontoserver):
 * - 212382003 "Compartment syndrome of hand due to traumatic injury"
 * - 212381005 "Compartment syndrome of forearm due to traumatic injury"
 * - 263269000 "Compartment syndrome of lower leg due to traumatic injury"
 * - 53259005  "Decompressive fasciotomy of hand"
 * - 178071007 "Fasciotomy forearm"
 * - 363051003 "Decompressive fasciotomy"
 * - 1304090006 "Decompression fasciotomy of four compartments of lower leg"
 * - 281785005 "Decompression fasciotomy of compartment of lower limb"
 */

import { describe, it, expect } from "vitest";
import {
  HAND_SURGERY_DIAGNOSES,
  HAND_ACUTE_COMPARTMENT_CROSS_REF_IDS,
} from "@/lib/diagnosisPicklists/handSurgeryDiagnoses";
import { ORTHOPLASTIC_DIAGNOSES } from "@/lib/diagnosisPicklists/orthoplasticDiagnoses";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";
import { PROCEDURE_PICKLIST, findPicklistEntry } from "@/lib/procedurePicklist";
import { resolveTraumaDiagnosis } from "@/lib/handTraumaMapping";
import { buildSoftTissueBullets } from "@/lib/handTraumaDiagnosis";
import { getDiagnosisGroupTitle } from "@/lib/caseDiagnosisSummary";
import type { DiagnosisGroup } from "@/types/case";

describe("compartment syndrome SNOMED freeze", () => {
  const frozenProcedures: [string, string, string][] = [
    ["hand_other_fasciotomy", "178071007", "Fasciotomy forearm"],
    [
      "hand_other_hand_compartment_release",
      "53259005",
      "Decompressive fasciotomy of hand",
    ],
    ["burns_acute_fasciotomy", "363051003", "Decompressive fasciotomy"],
    [
      "orth_fasciotomy_lower_leg",
      "1304090006",
      "Decompression fasciotomy of four compartments of lower leg",
    ],
    [
      "orth_fasciotomy_limb_single",
      "281785005",
      "Decompression fasciotomy of compartment of lower limb",
    ],
  ];

  it.each(frozenProcedures)("%s carries %s", (id, code, displayFragment) => {
    const entry = findPicklistEntry(id);
    expect(entry).toBeTruthy();
    expect(entry?.snomedCtCode).toBe(code);
    expect(entry?.snomedCtDisplay).toContain(displayFragment);
  });

  const frozenDiagnoses: [string, string][] = [
    ["hand_dx_compartment_syndrome_hand", "212382003"],
    ["hand_dx_compartment_syndrome_forearm", "212381005"],
    ["orth_dx_compartment_syndrome_lower_limb", "263269000"],
  ];

  it.each(frozenDiagnoses)("%s carries %s", (id, code) => {
    const dx = findDiagnosisById(id);
    expect(dx).toBeTruthy();
    expect(dx?.snomedCtCode).toBe(code);
  });

  it("no procedure entry carries the retired hand-only fasciotomy code 397737001", () => {
    const offenders = PROCEDURE_PICKLIST.filter(
      (p) => p.snomedCtCode === "397737001",
    );
    expect(offenders.map((p) => p.id)).toEqual([]);
  });

  it("no diagnosis carries the Paget's disease miscode 111254007", () => {
    const offenders = [...HAND_SURGERY_DIAGNOSES, ...ORTHOPLASTIC_DIAGNOSES]
      .filter((d) => d.snomedCtCode === "111254007")
      .map((d) => d.id);
    expect(offenders).toEqual([]);
  });

  it("both hand compartment release procedures are tagged acute + trauma", () => {
    for (const id of [
      "hand_other_fasciotomy",
      "hand_other_hand_compartment_release",
    ]) {
      const entry = findPicklistEntry(id);
      expect(entry?.tags, id).toContain("acute");
      expect(entry?.tags, id).toContain("trauma");
    }
  });
});

describe("compartment syndrome suggestion integrity", () => {
  it("hand CS defaults to hand release, forearm fasciotomy offered non-default", () => {
    const dx = findDiagnosisById("hand_dx_compartment_syndrome_hand");
    const suggestions = dx?.suggestedProcedures ?? [];
    expect(suggestions.map((s) => s.procedurePicklistId)).toEqual([
      "hand_other_hand_compartment_release",
      "hand_other_fasciotomy",
    ]);
    expect(suggestions.filter((s) => s.isDefault)).toHaveLength(1);
    expect(suggestions[0]?.isDefault).toBe(true);
  });

  it("forearm CS defaults to forearm fasciotomy, hand release offered non-default", () => {
    const dx = findDiagnosisById("hand_dx_compartment_syndrome_forearm");
    const suggestions = dx?.suggestedProcedures ?? [];
    expect(suggestions.map((s) => s.procedurePicklistId)).toEqual([
      "hand_other_fasciotomy",
      "hand_other_hand_compartment_release",
    ]);
    expect(suggestions.filter((s) => s.isDefault)).toHaveLength(1);
    expect(suggestions[0]?.isDefault).toBe(true);
  });

  it("lower limb CS suggestions all resolve, four-compartment release is the sole default", () => {
    const dx = findDiagnosisById("orth_dx_compartment_syndrome_lower_limb");
    const suggestions = dx?.suggestedProcedures ?? [];
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    for (const suggestion of suggestions) {
      expect(
        findPicklistEntry(suggestion.procedurePicklistId),
        `suggestion ${suggestion.procedurePicklistId} must resolve`,
      ).toBeTruthy();
    }
    const defaults = suggestions.filter((s) => s.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.procedurePicklistId).toBe("orth_fasciotomy_lower_leg");
  });

  it("open fracture lower leg offers the four-compartment fasciotomy non-default", () => {
    const dx = findDiagnosisById("orth_dx_open_fx_lower_leg");
    const fasciotomy = dx?.suggestedProcedures.find(
      (s) => s.procedurePicklistId === "orth_fasciotomy_lower_leg",
    );
    expect(fasciotomy).toBeTruthy();
    expect(fasciotomy?.isDefault).toBe(false);
  });

  it("NSTI of the hand now suggests the NSTI fasciotomy, not the forearm compartment release", () => {
    const dx = findDiagnosisById("hand_dx_necrotising_fasciitis_hand");
    const ids = (dx?.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(ids).toContain("gen_nsti_fasciotomy");
    expect(ids).not.toContain("hand_other_fasciotomy");
  });
});

describe("acute hand flow reachability", () => {
  it("every cross-ref id resolves and stays trauma-tagged (machine title rule)", () => {
    for (const id of HAND_ACUTE_COMPARTMENT_CROSS_REF_IDS) {
      const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === id);
      expect(dx, `${id} must exist in HAND_SURGERY_DIAGNOSES`).toBeTruthy();
      // Must stay "trauma": caseDiagnosisSummary suppresses the trauma machine
      // title when the resolved entry's clinicalGroup is set and non-trauma.
      expect(dx?.clinicalGroup, id).toBe("trauma");
    }
  });
});

describe("compartment syndrome trauma mapping pairs", () => {
  const baseSelection = {
    laterality: "left" as const,
    injuryMechanism: "crush",
    affectedDigits: [],
    activeCategories: ["special" as const],
    isCompartmentSyndrome: true,
  };

  it("no sites (legacy) resolves the hand diagnosis with hand release default", () => {
    const result = resolveTraumaDiagnosis(baseSelection);
    const pairs =
      result?.pairs.filter((p) => p.key.startsWith("special:compartment")) ??
      [];
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.diagnosis.diagnosisPicklistId).toBe(
      "hand_dx_compartment_syndrome_hand",
    );
    expect(pairs[0]?.diagnosis.snomedCtCode).toBe("212382003");
    const defaults = (pairs[0]?.suggestedProcedures ?? []).filter(
      (s) => s.isDefault,
    );
    expect(defaults.map((s) => s.procedurePicklistId)).toEqual([
      "hand_other_hand_compartment_release",
    ]);
  });

  it("forearm site resolves the forearm diagnosis with forearm fasciotomy default", () => {
    const result = resolveTraumaDiagnosis({
      ...baseSelection,
      compartmentSites: ["forearm"],
    });
    const pairs =
      result?.pairs.filter((p) => p.key.startsWith("special:compartment")) ??
      [];
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.diagnosis.diagnosisPicklistId).toBe(
      "hand_dx_compartment_syndrome_forearm",
    );
    expect(pairs[0]?.diagnosis.snomedCtCode).toBe("212381005");
    expect(pairs[0]?.diagnosis.displayName).toContain("forearm");
    const defaults = (pairs[0]?.suggestedProcedures ?? []).filter(
      (s) => s.isDefault,
    );
    expect(defaults.map((s) => s.procedurePicklistId)).toEqual([
      "hand_other_fasciotomy",
    ]);
  });

  it("hand + forearm yields two pairs with distinct diagnoses", () => {
    const result = resolveTraumaDiagnosis({
      ...baseSelection,
      compartmentSites: ["hand", "forearm"],
    });
    const pairs =
      result?.pairs.filter((p) => p.key.startsWith("special:compartment")) ??
      [];
    expect(pairs).toHaveLength(2);
    expect(pairs.map((p) => p.diagnosis.diagnosisPicklistId).sort()).toEqual([
      "hand_dx_compartment_syndrome_forearm",
      "hand_dx_compartment_syndrome_hand",
    ]);
  });

  it("HPI + compartment syndrome resolve independently (cross-contamination regression)", () => {
    const result = resolveTraumaDiagnosis({
      ...baseSelection,
      isHighPressureInjection: true,
    });
    const compartmentPair = result?.pairs.find((p) =>
      p.key.startsWith("special:compartment"),
    );
    const hpiPair = result?.pairs.find((p) => p.key.startsWith("special:hpi"));
    // Pre-refactor, the flag-priority early-return made the compartment pair
    // carry the HPI diagnosis.
    expect(compartmentPair?.diagnosis.diagnosisPicklistId).toBe(
      "hand_dx_compartment_syndrome_hand",
    );
    expect(hpiPair?.diagnosis.diagnosisPicklistId).toBe(
      "hand_dx_high_pressure_injection",
    );
  });

  it("fight bite + HPI resolve independently", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      injuryMechanism: "punch_assault",
      affectedDigits: [],
      activeCategories: ["special" as const],
      isFightBite: true,
      isHighPressureInjection: true,
    });
    const fightBitePair = result?.pairs.find((p) =>
      p.key.startsWith("special:fight_bite"),
    );
    expect(fightBitePair?.diagnosis.diagnosisPicklistId).toBe(
      "hand_dx_fight_bite",
    );
  });
});

describe("compartment syndrome rendering", () => {
  it("renders hand vs forearm bullets in English and Latin", () => {
    expect(
      buildSoftTissueBullets(
        [{ type: "compartment_syndrome" }],
        "shorthand_english",
        "short",
      ),
    ).toEqual(["Compartment syndrome of hand"]);
    expect(
      buildSoftTissueBullets(
        [{ type: "compartment_syndrome", zone: "wrist_forearm" }],
        "latin_medical",
        "short",
      ),
    ).toEqual(["Syndroma compartmenti antebrachii"]);
    expect(
      buildSoftTissueBullets(
        [{ type: "compartment_syndrome" }],
        "latin_medical",
        "short",
      ),
    ).toEqual(["Syndroma compartmenti manus"]);
  });

  it("regenerates the forearm title from a stored diagnosis group", () => {
    const group = {
      id: "g1",
      sequenceOrder: 1,
      specialty: "hand_wrist",
      procedures: [],
      diagnosisPicklistId: "hand_dx_compartment_syndrome_forearm",
      diagnosis: {
        displayName: "Compartment syndrome of forearm",
        snomedCtCode: "212381005",
      },
      diagnosisClinicalDetails: {
        laterality: "left",
        injuryMechanism: "crush",
        handTrauma: {
          affectedDigits: [],
          isCompartmentSyndrome: true,
          compartmentSites: ["forearm"],
        },
      },
    } as unknown as DiagnosisGroup;

    expect(getDiagnosisGroupTitle(group)?.toLowerCase()).toContain(
      "compartment syndrome of forearm",
    );
  });

  it("promotes a combined hand + forearm compartment syndrome into the title", () => {
    const group = {
      id: "g2",
      sequenceOrder: 1,
      specialty: "hand_wrist",
      procedures: [],
      diagnosisPicklistId: "hand_dx_compartment_syndrome_hand",
      diagnosis: {
        displayName: "Compartment syndrome of hand",
        snomedCtCode: "212382003",
      },
      diagnosisClinicalDetails: {
        laterality: "right",
        injuryMechanism: "crush",
        handTrauma: {
          affectedDigits: [],
          isCompartmentSyndrome: true,
          compartmentSites: ["hand", "forearm"],
        },
      },
    } as unknown as DiagnosisGroup;

    expect(getDiagnosisGroupTitle(group)?.toLowerCase()).toContain(
      "compartment syndrome of hand and forearm",
    );
  });
});
