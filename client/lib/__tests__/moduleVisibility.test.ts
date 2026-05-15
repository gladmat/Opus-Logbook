/**
 * Module visibility — activation logic guarding all specialty modules.
 *
 * These tests lock in the diagnosis-driven / specialty-gated / procedure-tag
 * driven activation contract documented in CLAUDE.md. Each module has a
 * specific activation rule and getting it wrong means a hand surgeon sees
 * breast fields or a skin cancer surgeon doesn't see SLNB.
 */

import { describe, it, expect } from "vitest";
import {
  getModuleVisibility,
  procedureHasFreeFlap,
  procedureHasPedicledFlap,
  caseHasFlapProcedure,
  caseHasFreeFlap,
  caseNeedsJointContext,
} from "@/lib/moduleVisibility";
import type { DiagnosisGroup, CaseProcedure, Specialty } from "@/types/case";

// ─── Test fixture helpers ────────────────────────────────────────────────

function makeProcedure(overrides: Partial<CaseProcedure> = {}): CaseProcedure {
  return {
    id: "p1",
    sequenceOrder: 1,
    procedureName: "Test procedure",
    specialty: "general",
    surgeonRole: "PS",
    ...overrides,
  };
}

function makeGroup(
  specialty: Specialty,
  overrides: Partial<DiagnosisGroup> = {},
): DiagnosisGroup {
  return {
    id: "g1",
    sequenceOrder: 1,
    specialty,
    procedures: [makeProcedure({ specialty })],
    ...overrides,
  };
}

// ─── Procedure-level flap predicates ─────────────────────────────────────

describe("procedureHasFreeFlap", () => {
  it("detects via PICKLIST_TO_FLAP_TYPE", () => {
    // ALT free flap (orth_ff_alt) is the canonical orthoplastic free-flap ID
    expect(procedureHasFreeFlap({ picklistEntryId: "orth_ff_alt" })).toBe(true);
    expect(procedureHasFreeFlap({ picklistEntryId: "breast_recon_diep" })).toBe(
      true,
    );
  });

  it("detects via free_flap tag", () => {
    expect(procedureHasFreeFlap({ tags: ["free_flap"] })).toBe(true);
  });

  it("returns false for non-flap procedures", () => {
    expect(
      procedureHasFreeFlap({ picklistEntryId: "hand_carpal_tunnel" }),
    ).toBe(false);
    expect(procedureHasFreeFlap({ tags: ["complex_wound"] })).toBe(false);
    expect(procedureHasFreeFlap({})).toBe(false);
  });
});

describe("procedureHasPedicledFlap", () => {
  it("detects via pedicled_flap tag", () => {
    expect(procedureHasPedicledFlap({ tags: ["pedicled_flap"] })).toBe(true);
  });

  it("returns false for free flap tag (different category)", () => {
    expect(procedureHasPedicledFlap({ tags: ["free_flap"] })).toBe(false);
  });

  it("returns false when no tags", () => {
    expect(procedureHasPedicledFlap({})).toBe(false);
  });
});

// ─── Case-level flap predicates ──────────────────────────────────────────

describe("caseHasFreeFlap / caseHasFlapProcedure", () => {
  it("caseHasFreeFlap detects free flap in any group", () => {
    const groups = [
      makeGroup("general"),
      makeGroup("orthoplastic", {
        procedures: [makeProcedure({ tags: ["free_flap"] })],
      }),
    ];
    expect(caseHasFreeFlap(groups)).toBe(true);
  });

  it("caseHasFlapProcedure includes pedicled flaps", () => {
    const groups = [
      makeGroup("general", {
        procedures: [makeProcedure({ tags: ["pedicled_flap"] })],
      }),
    ];
    expect(caseHasFlapProcedure(groups)).toBe(true);
    // But caseHasFreeFlap should NOT match a pedicled-only case
    expect(caseHasFreeFlap(groups)).toBe(false);
  });

  it("returns false when no flap procedures exist", () => {
    const groups = [makeGroup("hand_wrist")];
    expect(caseHasFreeFlap(groups)).toBe(false);
    expect(caseHasFlapProcedure(groups)).toBe(false);
  });
});

describe("caseNeedsJointContext", () => {
  it("activates for head_neck specialty + neck dissection procedure", () => {
    const groups = [
      makeGroup("head_neck", {
        procedures: [
          makeProcedure({ picklistEntryId: "hn_neck_dissection_selective" }),
        ],
      }),
    ];
    expect(caseNeedsJointContext("head_neck", groups)).toBe(true);
  });

  it("activates for head_neck + free flap (reconstruction with neck access)", () => {
    const groups = [
      makeGroup("head_neck", {
        procedures: [makeProcedure({ tags: ["free_flap"] })],
      }),
    ];
    expect(caseNeedsJointContext("head_neck", groups)).toBe(true);
  });

  it("does NOT activate for non-head_neck specialty even with neck dissection ID", () => {
    const groups = [
      makeGroup("general", {
        procedures: [
          makeProcedure({ picklistEntryId: "hn_neck_dissection_selective" }),
        ],
      }),
    ];
    expect(caseNeedsJointContext("general", groups)).toBe(false);
  });
});

// ─── getModuleVisibility — full contract ────────────────────────────────

describe("getModuleVisibility", () => {
  it("hand_wrist + trauma case type activates handTraumaAssessment", () => {
    const result = getModuleVisibility(makeGroup("hand_wrist"), "trauma");
    expect(result.handTraumaAssessment).toBe(true);
    // Should NOT activate other specialty modules
    expect(result.breast).toBe(false);
    expect(result.craniofacialAssessment).toBe(false);
    expect(result.peripheralNerveAssessment).toBe(false);
  });

  it("hand_wrist + acute case type does NOT activate handTraumaAssessment (only trauma triggers)", () => {
    const result = getModuleVisibility(makeGroup("hand_wrist"), "acute");
    expect(result.handTraumaAssessment).toBe(false);
  });

  it("hand_wrist + elective case type does NOT activate handTraumaAssessment", () => {
    const result = getModuleVisibility(makeGroup("hand_wrist"), "elective");
    expect(result.handTraumaAssessment).toBe(false);
  });

  it("breast specialty activates breast module", () => {
    const result = getModuleVisibility(makeGroup("breast"));
    expect(result.breast).toBe(true);
  });

  it("cleft_cranio specialty activates craniofacialAssessment", () => {
    const result = getModuleVisibility(makeGroup("cleft_cranio"));
    expect(result.craniofacialAssessment).toBe(true);
  });

  it("aesthetics specialty activates aestheticAssessment", () => {
    const result = getModuleVisibility(makeGroup("aesthetics"));
    expect(result.aestheticAssessment).toBe(true);
  });

  it("peripheral_nerve specialty activates peripheralNerveAssessment", () => {
    const result = getModuleVisibility(makeGroup("peripheral_nerve"));
    expect(result.peripheralNerveAssessment).toBe(true);
  });

  it("lymphoedema specialty activates lymphoedemaAssessment", () => {
    const result = getModuleVisibility(makeGroup("lymphoedema"));
    expect(result.lymphoedemaAssessment).toBe(true);
  });

  it("skin_cancer specialty activates skinCancerAssessment", () => {
    const result = getModuleVisibility(makeGroup("skin_cancer"));
    expect(result.skinCancerAssessment).toBe(true);
  });

  it("burns specialty + burns_dx_acute activates burnsAssessment", () => {
    const result = getModuleVisibility(
      makeGroup("burns", { diagnosisPicklistId: "burns_dx_acute" }),
    );
    expect(result.burnsAssessment).toBe(true);
  });

  it("burns specialty WITHOUT burns_dx_acute does NOT activate burnsAssessment", () => {
    // Reconstructive burns diagnoses use standard flow
    const result = getModuleVisibility(
      makeGroup("burns", { diagnosisPicklistId: "burns_dx_recon_scar" }),
    );
    expect(result.burnsAssessment).toBe(false);
  });

  it("burns assessment activates if existing data present (re-edit case)", () => {
    const result = getModuleVisibility(
      makeGroup("burns", {
        diagnosisPicklistId: "burns_dx_recon_scar",

        burnsAssessment: { tbsa: 5 } as any,
      }),
    );
    expect(result.burnsAssessment).toBe(true);
  });

  it("free flap procedure activates flapDetails + flapOutcome", () => {
    const result = getModuleVisibility(
      makeGroup("orthoplastic", {
        procedures: [makeProcedure({ tags: ["free_flap"] })],
      }),
    );
    expect(result.flapDetails).toBe(true);
    expect(result.flapOutcome).toBe(true);
  });

  it("complex_wound tag activates woundAssessment", () => {
    const result = getModuleVisibility(
      makeGroup("general", {
        procedures: [makeProcedure({ tags: ["complex_wound"] })],
      }),
    );
    expect(result.woundAssessment).toBe(true);
  });

  it("wound_management episode activates woundAssessment even without complex_wound tag", () => {
    const result = getModuleVisibility(
      makeGroup("general"),
      undefined,
      undefined,
      undefined,
      "wound_management",
    );
    expect(result.woundAssessment).toBe(true);
  });

  it("infectionOverlay activates infection module (on first matching group)", () => {
    const result = getModuleVisibility(
      makeGroup("general"),
      undefined,

      { status: "active" } as any,
      true,
    );
    expect(result.infection).toBe(true);
  });

  it("infection module hidden on later groups (case-level data on first only)", () => {
    const result = getModuleVisibility(
      makeGroup("general"),
      undefined,

      { status: "active" } as any,
      false, // not the first group
    );
    expect(result.infection).toBe(false);
  });

  it("hand_wrist + escalated hand infection activates full infection module", () => {
    const result = getModuleVisibility(
      makeGroup("hand_wrist", {
        handInfectionDetails: { escalatedToFullModule: true } as any,
      }),
      "acute",
      undefined,
      true,
    );
    expect(result.infection).toBe(true);
  });

  it("returns all-false for general specialty case with no special procedures", () => {
    const result = getModuleVisibility(makeGroup("general"));
    expect(result.handTraumaAssessment).toBe(false);
    expect(result.breast).toBe(false);
    expect(result.craniofacialAssessment).toBe(false);
    expect(result.aestheticAssessment).toBe(false);
    expect(result.peripheralNerveAssessment).toBe(false);
    expect(result.lymphoedemaAssessment).toBe(false);
    expect(result.skinCancerAssessment).toBe(false);
    expect(result.burnsAssessment).toBe(false);
    expect(result.flapDetails).toBe(false);
    expect(result.flapOutcome).toBe(false);
    expect(result.woundAssessment).toBe(false);
    expect(result.implant).toBe(false);
    expect(result.infection).toBe(false);
  });

  it("specialty modules persist when existing data present (re-edit safety)", () => {
    // A general-specialty case with leftover peripheralNerveAssessment data
    // from a re-categorization should keep the module visible so user can
    // see/clear the data — not silently lose it.
    const result = getModuleVisibility(
      makeGroup("general", {
        peripheralNerveAssessment: { sunderlandGrade: "II" } as any,
      }),
    );
    expect(result.peripheralNerveAssessment).toBe(true);
  });
});
