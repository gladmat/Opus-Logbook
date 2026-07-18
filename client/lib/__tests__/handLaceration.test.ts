/**
 * Hand laceration / wound-exploration pathway — SNOMED freeze, pure
 * descriptor⇄state helpers, and stored-case title regression.
 *
 * SNOMED codes verified live against CSIRO Ontoserver (AU + International
 * editions, 2026-07-18): 284549007 active in both; 284023006 active in both
 * (7614005 and 47289006 are inactive duplicates of the same concept).
 */

import { describe, it, expect } from "vitest";
import { HAND_SURGERY_DIAGNOSES } from "@/lib/diagnosisPicklists/handSurgeryDiagnoses";
import { PROCEDURE_PICKLIST } from "@/lib/procedurePicklist";
import {
  deriveLacerationSites,
  lacerationSitesToDescriptors,
} from "@/lib/handTraumaSoftTissueState";
import { getDiagnosisGroupTitle } from "@/lib/caseDiagnosisSummary";
import type { DiagnosisGroup, SoftTissueDescriptor } from "@/types/case";

describe("hand laceration SNOMED freeze", () => {
  it("hand soft-tissue trauma procedures exist with verified codes", () => {
    const expectations: Record<string, { code: string; display: string }> = {
      hand_trauma_wound_exploration_closure: {
        code: "302438004",
        display: "Exploration of wound of skin (procedure)",
      },
      hand_trauma_lac_direct_closure: {
        code: "302410007",
        display: "Primary suture of skin (procedure)",
      },
      hand_trauma_washout_delayed_closure: {
        code: "225116006",
        display: "Irrigation of wound (procedure)",
      },
      hand_trauma_muscle_repair: {
        code: "284023006",
        display: "Repair of muscle of hand by suture (procedure)",
      },
    };

    for (const [id, expected] of Object.entries(expectations)) {
      const proc = PROCEDURE_PICKLIST.find((p) => p.id === id);
      expect(proc, `procedure ${id} should exist`).toBeDefined();
      expect(proc!.snomedCtCode).toBe(expected.code);
      expect(proc!.snomedCtDisplay).toBe(expected.display);
      expect(proc!.specialties).toContain("hand_wrist");
      expect(proc!.subcategory).toBe("Soft Tissue Trauma");
      expect(proc!.tags).toContain("trauma");
    }
  });

  it("hand_dx_hand_laceration exists with verified code and suggestion wiring", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find(
      (d) => d.id === "hand_dx_hand_laceration",
    );
    expect(dx).toBeDefined();
    expect(dx!.snomedCtCode).toBe("284549007");
    expect(dx!.snomedCtDisplay).toBe("Laceration of hand (disorder)");
    expect(dx!.specialty).toBe("hand_wrist");
    expect(dx!.clinicalGroup).toBe("trauma");
    expect(dx!.subcategory).toBe("Soft Tissue Injuries");

    const suggestionIds = (dx!.suggestedProcedures ?? []).map(
      (s) => s.procedurePicklistId,
    );
    expect(suggestionIds).toEqual([
      "hand_trauma_wound_exploration_closure",
      "hand_trauma_lac_direct_closure",
      "hand_trauma_washout_delayed_closure",
      "hand_trauma_muscle_repair",
    ]);
    const defaults = (dx!.suggestedProcedures ?? []).filter((s) => s.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]!.procedurePicklistId).toBe(
      "hand_trauma_wound_exploration_closure",
    );
  });
});

describe("laceration descriptor ⇄ state helpers", () => {
  it("round-trips sites through descriptors losslessly", () => {
    const descriptors: SoftTissueDescriptor[] = [
      {
        type: "laceration",
        digits: ["I", "II"],
        zone: "web_space",
        intactStructures: ["flexor_tendon", "nerve"],
        muscleInvolved: true,
      },
      { type: "laceration", zone: "palm" },
      // Non-laceration descriptors must be ignored
      { type: "defect", zone: "fingertip", surfaces: ["palmar"] },
    ];

    const sites = deriveLacerationSites(descriptors);
    expect(sites).toHaveLength(2);
    expect(sites[0]).toEqual({
      digits: ["I", "II"],
      zone: "web_space",
      surfaces: [],
      intactStructures: ["flexor_tendon", "nerve"],
      muscleInvolved: true,
    });
    expect(sites[1]).toEqual({
      digits: [],
      zone: "palm",
      surfaces: [],
      intactStructures: [],
      muscleInvolved: false,
    });

    const roundTripped = lacerationSitesToDescriptors(sites, undefined);
    expect(roundTripped).toEqual([
      {
        type: "laceration",
        digits: ["I", "II"],
        zone: "web_space",
        surfaces: undefined,
        intactStructures: ["flexor_tendon", "nerve"],
        muscleInvolved: true,
      },
      {
        type: "laceration",
        digits: undefined,
        zone: "palm",
        surfaces: undefined,
        intactStructures: undefined,
        muscleInvolved: undefined,
      },
    ]);
  });

  it("sorts intactStructures on serialization for signature stability", () => {
    const [descriptor] = lacerationSitesToDescriptors(
      [
        {
          digits: [],
          surfaces: [],
          intactStructures: ["vessel", "flexor_tendon", "nerve"],
          muscleInvolved: false,
        },
      ],
      undefined,
    );
    expect(descriptor!.intactStructures).toEqual([
      "flexor_tendon",
      "nerve",
      "vessel",
    ]);
  });

  it("falls back to one default-digits descriptor when active with zero sites", () => {
    const descriptors = lacerationSitesToDescriptors([], ["III"]);
    expect(descriptors).toHaveLength(1);
    expect(descriptors[0]).toMatchObject({
      type: "laceration",
      digits: ["III"],
    });
  });
});

describe("stored laceration case title regression", () => {
  it("regenerates the laceration title from a stored diagnosis group", () => {
    const group = {
      id: "g1",
      sequenceOrder: 1,
      specialty: "hand_wrist",
      procedures: [],
      diagnosisPicklistId: "hand_dx_hand_laceration",
      diagnosis: {
        displayName: "Hand / wrist laceration",
        snomedCtCode: "284549007",
      },
      diagnosisClinicalDetails: {
        laterality: "left",
        injuryMechanism: "saw_blade",
        handTrauma: {
          affectedDigits: ["I", "II"],
          softTissueDescriptors: [
            {
              type: "laceration",
              digits: ["I", "II"],
              zone: "web_space",
              intactStructures: ["flexor_tendon", "nerve"],
              muscleInvolved: true,
            },
          ],
        },
      },
    } as unknown as DiagnosisGroup;

    expect(getDiagnosisGroupTitle(group)).toBe(
      "Left hand saw/blade injury - first web space laceration with muscle involvement — explored: flexor tendons + nerves intact",
    );
  });
});
