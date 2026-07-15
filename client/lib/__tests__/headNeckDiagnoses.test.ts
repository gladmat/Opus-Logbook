import { describe, it, expect } from "vitest";
import {
  HEAD_NECK_DIAGNOSES,
  searchHeadNeckDiagnoses,
} from "@/lib/diagnosisPicklists/headNeckDiagnoses";
import { PROCEDURE_PICKLIST } from "@/lib/procedurePicklist";

// ═══════════════════════════════════════════════════════════════════════════════
// Cross-reference validation (mirrors craniofacialConfig.test.ts data-integrity
// block) — a standing guard the H&N picklist previously lacked.
// ═══════════════════════════════════════════════════════════════════════════════

describe("head & neck data integrity", () => {
  const procedureIds = new Set(PROCEDURE_PICKLIST.map((p) => p.id));

  it("all suggestedProcedures reference existing procedure picklist entries", () => {
    const broken: string[] = [];
    for (const dx of HEAD_NECK_DIAGNOSES) {
      for (const sp of dx.suggestedProcedures ?? []) {
        if (!procedureIds.has(sp.procedurePicklistId)) {
          broken.push(`${dx.id} → ${sp.procedurePicklistId}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("all diagnoses have non-empty SNOMED CT codes", () => {
    const missing = HEAD_NECK_DIAGNOSES.filter(
      (dx) => !dx.snomedCtCode || dx.snomedCtCode.trim() === "",
    ).map((dx) => dx.id);
    expect(missing).toEqual([]);
  });

  it("all diagnoses have non-empty SNOMED CT display names", () => {
    const missing = HEAD_NECK_DIAGNOSES.filter(
      (dx) => !dx.snomedCtDisplay || dx.snomedCtDisplay.trim() === "",
    ).map((dx) => dx.id);
    expect(missing).toEqual([]);
  });

  it("no duplicate diagnosis IDs", () => {
    const ids = HEAD_NECK_DIAGNOSES.map((dx) => dx.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Scalp friction burn / rotation flap coverage (2026-07 addition)
// ═══════════════════════════════════════════════════════════════════════════════

describe("scalp friction burn diagnosis", () => {
  const frictionBurn = HEAD_NECK_DIAGNOSES.find(
    (dx) => dx.id === "hn_dx_scalp_friction_burn",
  );

  it("exists in Soft Tissue Trauma with the Ontoserver-verified SNOMED code", () => {
    expect(frictionBurn).toBeDefined();
    expect(frictionBurn?.subcategory).toBe("Soft Tissue Trauma");
    expect(frictionBurn?.specialty).toBe("head_neck");
    expect(frictionBurn?.clinicalGroup).toBe("trauma");
    // Burn-depth staging is deliberate: the server keyword fallback attaches
    // the burns Depth / TBSA% systems and depth grading is clinically apt.
    expect(frictionBurn?.hasStaging).toBe(true);
    // Verified live against CSIRO Ontoserver (SNOMED International 20260601)
    expect(frictionBurn?.snomedCtCode).toBe("447150006");
    expect(frictionBurn?.snomedCtDisplay).toBe(
      "Friction burn of scalp (disorder)",
    );
  });

  it("defaults to wound debridement", () => {
    const defaults = (frictionBurn?.suggestedProcedures ?? []).filter(
      (sp) => sp.isDefault,
    );
    expect(defaults.map((sp) => sp.procedurePicklistId)).toEqual([
      "hn_trauma_facial_wound_exploration",
    ]);
  });

  it("suggests both rotation-flap coverage options and scalp grafts", () => {
    const ids = (frictionBurn?.suggestedProcedures ?? []).map(
      (sp) => sp.procedurePicklistId,
    );
    expect(ids).toContain("hn_scalp_double_rotation");
    expect(ids).toContain("hn_local_rotation");
    expect(ids).toContain("hn_scalp_stsg");
    expect(ids).toContain("hn_scalp_ftsg");
  });
});

describe("scalp double rotation (yin-yang) procedure", () => {
  const doubleRotation = PROCEDURE_PICKLIST.find(
    (p) => p.id === "hn_scalp_double_rotation",
  );

  it("exists in Scalp Reconstruction with the local rotation flap SNOMED code", () => {
    expect(doubleRotation).toBeDefined();
    expect(doubleRotation?.subcategory).toBe("Scalp Reconstruction");
    expect(doubleRotation?.specialties).toContain("head_neck");
    expect(doubleRotation?.snomedCtCode).toBe("304102003");
    expect(doubleRotation?.snomedCtDisplay).toBe(
      "Local rotation flap (procedure)",
    );
    expect(doubleRotation?.tags).toContain("local_flap");
  });

  it("names the yin-yang design so it is searchable", () => {
    expect(doubleRotation?.displayName.toLowerCase()).toContain("yin-yang");
  });
});

describe("scalp trauma suggestion broadening", () => {
  it("scalp avulsion now suggests rotation-flap coverage", () => {
    const avulsion = HEAD_NECK_DIAGNOSES.find(
      (dx) => dx.id === "hn_dx_scalp_avulsion",
    );
    const ids = (avulsion?.suggestedProcedures ?? []).map(
      (sp) => sp.procedurePicklistId,
    );
    expect(ids).toContain("hn_local_rotation");
    expect(ids).toContain("hn_scalp_double_rotation");
  });

  it("facial tissue loss now suggests a rotation flap alongside advancement", () => {
    const tissueLoss = HEAD_NECK_DIAGNOSES.find(
      (dx) => dx.id === "hn_dx_facial_tissue_loss",
    );
    const ids = (tissueLoss?.suggestedProcedures ?? []).map(
      (sp) => sp.procedurePicklistId,
    );
    expect(ids).toContain("hn_local_advancement");
    expect(ids).toContain("hn_local_rotation");
  });

  it("the shared debridement procedure mentions the scalp", () => {
    const debridement = PROCEDURE_PICKLIST.find(
      (p) => p.id === "hn_trauma_facial_wound_exploration",
    );
    expect(debridement?.displayName.toLowerCase()).toContain("scalp");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Search behaviour — searchHeadNeckDiagnoses IS the picker's filter, so these
// prove the terms a surgeon would actually type now surface the new entry.
// ═══════════════════════════════════════════════════════════════════════════════

describe("searchHeadNeckDiagnoses", () => {
  const resultIds = (query: string) =>
    searchHeadNeckDiagnoses(query).map((dx) => dx.id);

  it("surfaces the friction burn entry for burn-flavoured queries", () => {
    expect(resultIds("friction")).toContain("hn_dx_scalp_friction_burn");
    expect(resultIds("burn")).toContain("hn_dx_scalp_friction_burn");
    expect(resultIds("abrasion")).toContain("hn_dx_scalp_friction_burn");
    expect(resultIds("graze")).toContain("hn_dx_scalp_friction_burn");
    expect(resultIds("road rash")).toContain("hn_dx_scalp_friction_burn");
  });

  it("surfaces both scalp entries for scalp queries", () => {
    const ids = resultIds("scalp");
    expect(ids).toContain("hn_dx_scalp_friction_burn");
    expect(ids).toContain("hn_dx_scalp_avulsion");
  });

  it("surfaces scalp avulsion for the broadened trauma synonyms", () => {
    expect(resultIds("scalp trauma")).toContain("hn_dx_scalp_avulsion");
    expect(resultIds("scalp wound")).toContain("hn_dx_scalp_avulsion");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(resultIds("FRICTION")).toContain("hn_dx_scalp_friction_burn");
    expect(resultIds("  burn  ")).toContain("hn_dx_scalp_friction_burn");
  });

  it("matches SNOMED codes", () => {
    expect(resultIds("447150006")).toEqual(["hn_dx_scalp_friction_burn"]);
  });

  it("returns nothing below the 2-character threshold", () => {
    expect(searchHeadNeckDiagnoses("b")).toEqual([]);
    expect(searchHeadNeckDiagnoses("")).toEqual([]);
    expect(searchHeadNeckDiagnoses(" ")).toEqual([]);
  });
});
