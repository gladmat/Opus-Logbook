import { describe, expect, it } from "vitest";
import {
  AESTHETICS_DIAGNOSES,
  getAestheticsSubcategories,
} from "../diagnosisPicklists/aestheticsDiagnoses";
import {
  ALL_DIAGNOSES,
  findDiagnosisById,
  getDiagnosesForSpecialty,
} from "../diagnosisPicklists";
import { findPicklistEntry } from "../procedurePicklist";
import {
  getAestheticIntentFromDiagnosis,
  COMBINATION_PRESETS,
} from "../aestheticsConfig";

describe("Aesthetics diagnosis picklist — Phase 2 consolidation", () => {
  it("has ~44 total diagnoses", () => {
    // 19 original + 12 absorbed body contouring + 13 new
    expect(AESTHETICS_DIAGNOSES.length).toBeGreaterThanOrEqual(42);
    expect(AESTHETICS_DIAGNOSES.length).toBeLessThanOrEqual(50);
  });

  it("has no duplicate IDs within AESTHETICS_DIAGNOSES", () => {
    const ids = AESTHETICS_DIAGNOSES.map((dx) => dx.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate IDs across ALL_DIAGNOSES", () => {
    const ids = ALL_DIAGNOSES.map((dx) => dx.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it("all entries have specialty aesthetics", () => {
    for (const dx of AESTHETICS_DIAGNOSES) {
      expect(dx.specialty).toBe("aesthetics");
    }
  });

  it("all entries have an intent field set", () => {
    for (const dx of AESTHETICS_DIAGNOSES) {
      expect(dx.intent).toBeDefined();
      expect([
        "cosmetic",
        "post_bariatric_mwl",
        "functional_reconstructive",
        "combined",
      ]).toContain(dx.intent);
    }
  });

  it("all suggestedProcedures reference valid procedure picklist entries", () => {
    const missing: string[] = [];
    for (const dx of AESTHETICS_DIAGNOSES) {
      for (const sp of dx.suggestedProcedures) {
        if (!findPicklistEntry(sp.procedurePicklistId)) {
          missing.push(`${dx.id} → ${sp.procedurePicklistId}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("every diagnosis has at least one suggestedProcedure", () => {
    for (const dx of AESTHETICS_DIAGNOSES) {
      expect(dx.suggestedProcedures.length).toBeGreaterThan(0);
    }
  });
});

describe("Subcategories", () => {
  it("returns expected subcategory set", () => {
    const subcats = getAestheticsSubcategories();
    expect(subcats).toContain("Facial Ageing");
    expect(subcats).toContain("Nose & Ear");
    expect(subcats).toContain("Skin & Volume");
    expect(subcats).toContain("Body Aesthetics");
    expect(subcats).toContain("Energy-Based");
    expect(subcats).toContain("Genital / Intimate");
    // Absorbed body contouring subcategories
    expect(subcats).toContain("Abdomen");
    expect(subcats).toContain("Upper Body");
    expect(subcats).toContain("Lower Body");
    expect(subcats).toContain("Post-Bariatric");
    expect(subcats).toContain("Lipodystrophy");
  });
});

describe("Body contouring backward compatibility", () => {
  it("body contouring subcategories absorbed into aesthetics", () => {
    const bcSubcategories = [
      "Abdomen",
      "Upper Body",
      "Lower Body",
      "Post-Bariatric",
      "Lipodystrophy",
    ];
    const bcDiagnoses = AESTHETICS_DIAGNOSES.filter((dx) =>
      bcSubcategories.includes(dx.subcategory),
    );
    // 12 original + 1 new post-bariatric breast = 13
    expect(bcDiagnoses.length).toBeGreaterThanOrEqual(12);
  });

  it("all 12 bc_dx_* aliases resolve via findDiagnosisById", () => {
    const aliases = [
      "bc_dx_abdominal_excess",
      "bc_dx_panniculitis",
      "bc_dx_diastasis",
      "bc_dx_upper_arm_excess",
      "bc_dx_back_excess",
      "bc_dx_thigh_excess",
      "bc_dx_buttock_ptosis",
      "bc_dx_mons",
      "bc_dx_post_bariatric_trunk",
      "bc_dx_post_bariatric_arms",
      "bc_dx_post_bariatric_thighs",
      "bc_dx_lipodystrophy",
    ];
    for (const alias of aliases) {
      const result = findDiagnosisById(alias);
      expect(result).toBeDefined();
      expect(result!.id.startsWith("aes_dx_")).toBe(true);
    }
  });

  it("both aesthetics and body_contouring specialty map return same array", () => {
    const aes = getDiagnosesForSpecialty("aesthetics");
    const bc = getDiagnosesForSpecialty("body_contouring");
    expect(aes).toBe(bc);
  });
});

describe("Intent field consistency", () => {
  it("post-bariatric diagnoses have post_bariatric_mwl intent", () => {
    const postBar = AESTHETICS_DIAGNOSES.filter((dx) =>
      dx.id.includes("post_bariatric"),
    );
    expect(postBar.length).toBeGreaterThanOrEqual(4);
    for (const dx of postBar) {
      expect(dx.intent).toBe("post_bariatric_mwl");
    }
  });

  it("functional_reconstructive diagnoses are correctly tagged", () => {
    const functional = AESTHETICS_DIAGNOSES.filter(
      (dx) => dx.intent === "functional_reconstructive",
    );
    const funcIds = functional.map((dx) => dx.id);
    expect(funcIds).toContain("aes_dx_panniculitis");
    expect(funcIds).toContain("aes_dx_nasal_functional");
    expect(funcIds).toContain("aes_dx_rhinophyma");
    expect(funcIds).toContain("aes_dx_hyperhidrosis");
  });

  it("diastasis recti has combined intent", () => {
    const dx = findDiagnosisById("aes_dx_diastasis_recti");
    expect(dx?.intent).toBe("combined");
  });

  it("getAestheticIntentFromDiagnosis matches entry intent for non-cosmetic entries", () => {
    const nonCosmetic = AESTHETICS_DIAGNOSES.filter(
      (dx) => dx.intent !== "cosmetic",
    );
    for (const dx of nonCosmetic) {
      expect(getAestheticIntentFromDiagnosis(dx.id)).toBe(dx.intent);
    }
  });
});

describe("New Phase 2 diagnoses", () => {
  it("lip ageing diagnosis exists with correct procedures", () => {
    const dx = findDiagnosisById("aes_dx_lip_ageing");
    expect(dx).toBeDefined();
    const procIds = dx!.suggestedProcedures.map((p) => p.procedurePicklistId);
    expect(procIds).toContain("aes_inj_filler_lips");
    expect(procIds).toContain("aes_lip_lift");
  });

  it("jawline contour diagnosis uses correct procedure IDs", () => {
    const dx = findDiagnosisById("aes_dx_jawline_contour");
    expect(dx).toBeDefined();
    const procIds = dx!.suggestedProcedures.map((p) => p.procedurePicklistId);
    expect(procIds).toContain("aes_inj_filler_jawline_chin");
    expect(procIds).toContain("aes_face_chin_implant");
  });

  it("skin laxity diagnosis suggests energy procedures", () => {
    const dx = findDiagnosisById("aes_dx_skin_laxity");
    expect(dx).toBeDefined();
    const procIds = dx!.suggestedProcedures.map((p) => p.procedurePicklistId);
    expect(procIds).toContain("aes_energy_rf_microneedling");
    expect(procIds).toContain("aes_energy_hifu");
    expect(procIds).toContain("aes_energy_monopolar_rf");
  });

  it("genital diagnoses exist in Genital / Intimate subcategory", () => {
    const genital = AESTHETICS_DIAGNOSES.filter(
      (dx) => dx.subcategory === "Genital / Intimate",
    );
    expect(genital.length).toBe(3);
  });

  it("gynaecomastia uses breast_aes_gynaecomastia procedure", () => {
    const dx = findDiagnosisById("aes_dx_gynecomastia");
    expect(dx).toBeDefined();
    expect(dx!.suggestedProcedures[0]!.procedurePicklistId).toBe(
      "breast_aes_gynaecomastia",
    );
  });

  it("post-bariatric breast suggests mastopexy procedures", () => {
    const dx = findDiagnosisById("aes_dx_post_bariatric_breast");
    expect(dx).toBeDefined();
    expect(dx!.intent).toBe("post_bariatric_mwl");
    const procIds = dx!.suggestedProcedures.map((p) => p.procedurePicklistId);
    expect(procIds).toContain("breast_aes_mastopexy_wise");
  });
});

describe("COMBINATION_PRESETS validity", () => {
  it("all preset procedure IDs reference existing procedures", () => {
    const missing: string[] = [];
    for (const [key, preset] of Object.entries(COMBINATION_PRESETS)) {
      for (const procId of preset.procedures) {
        if (!findPicklistEntry(procId)) {
          missing.push(`${key} → ${procId}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
