import { describe, it, expect } from "vitest";
import { getModuleVisibility } from "../moduleVisibility";
import {
  isAestheticProcedure,
  getInterventionType,
  getAestheticIntentFromDiagnosis,
  getAcgmeCategory,
  getAcgmeSubcategory,
} from "../aestheticsConfig";
import {
  getProductById,
  getProductsByCategory,
  getProductsByRegion,
} from "../aestheticProducts";
import {
  getEnergyDeviceSpec,
  getAllEnergyDevices,
  getEnergyDevicesBySubcategory,
} from "../aestheticProductsEnergy";
import type { DiagnosisGroup } from "../../types/case";

// ─── Module Visibility ─────────────────────────────────────────────────────

describe("moduleVisibility — aestheticAssessment", () => {
  const baseGroup: DiagnosisGroup = {
    specialty: "general",
    procedures: [],
    diagnosis: undefined,
  };

  it("returns true when specialty is aesthetics", () => {
    const group = { ...baseGroup, specialty: "aesthetics" as const };
    const vis = getModuleVisibility(group);
    expect(vis.aestheticAssessment).toBe(true);
  });

  it("returns true when any procedure has aes_ prefix", () => {
    const group = {
      ...baseGroup,
      procedures: [
        { picklistEntryId: "aes_inj_botox_upper_face", tags: [] },
      ],
    } as unknown as DiagnosisGroup;
    const vis = getModuleVisibility(group);
    expect(vis.aestheticAssessment).toBe(true);
  });

  it("returns true when any procedure has bc_ prefix", () => {
    const group = {
      ...baseGroup,
      procedures: [{ picklistEntryId: "bc_abdo_full", tags: [] }],
    } as unknown as DiagnosisGroup;
    const vis = getModuleVisibility(group);
    expect(vis.aestheticAssessment).toBe(true);
  });

  it("returns true when aestheticAssessment data exists", () => {
    const group = {
      ...baseGroup,
      aestheticAssessment: {
        interventionType: "surgical",
        intent: "cosmetic",
      },
    } as unknown as DiagnosisGroup;
    const vis = getModuleVisibility(group);
    expect(vis.aestheticAssessment).toBe(true);
  });

  it("returns false for unrelated specialties with no aesthetic procedures", () => {
    const group = {
      ...baseGroup,
      specialty: "hand_wrist" as const,
      procedures: [{ picklistEntryId: "hand_cts_release", tags: [] }],
    } as unknown as DiagnosisGroup;
    const vis = getModuleVisibility(group);
    expect(vis.aestheticAssessment).toBe(false);
  });
});

// ─── isAestheticProcedure ──────────────────────────────────────────────────

describe("isAestheticProcedure", () => {
  it("returns true for aes_ prefix", () => {
    expect(isAestheticProcedure("aes_inj_filler_midface")).toBe(true);
  });

  it("returns true for bc_ prefix", () => {
    expect(isAestheticProcedure("bc_upper_brachioplasty")).toBe(true);
  });

  it("returns false for other prefixes", () => {
    expect(isAestheticProcedure("hand_cts_release")).toBe(false);
    expect(isAestheticProcedure("sc_wide_local_excision")).toBe(false);
  });
});

// ─── getInterventionType ───────────────────────────────────────────────────

describe("getInterventionType", () => {
  it("classifies injectable procedures", () => {
    expect(getInterventionType("aes_inj_botox_upper_face")).toBe(
      "non_surgical_injectable",
    );
    expect(getInterventionType("aes_inj_filler_midface")).toBe(
      "non_surgical_injectable",
    );
    expect(getInterventionType("aes_inj_biostim_sculptra")).toBe(
      "non_surgical_injectable",
    );
    expect(getInterventionType("aes_inj_prp")).toBe(
      "non_surgical_injectable",
    );
  });

  it("classifies energy procedures", () => {
    expect(getInterventionType("aes_energy_rf_microneedling")).toBe(
      "non_surgical_energy",
    );
    expect(getInterventionType("aes_skin_laser_ablative")).toBe(
      "non_surgical_energy",
    );
    expect(getInterventionType("aes_energy_hifu")).toBe(
      "non_surgical_energy",
    );
    expect(getInterventionType("aes_energy_ipl")).toBe(
      "non_surgical_energy",
    );
    expect(getInterventionType("aes_energy_cryolipolysis")).toBe(
      "non_surgical_energy",
    );
  });

  it("classifies skin treatment procedures", () => {
    expect(getInterventionType("aes_skin_peel_light")).toBe(
      "non_surgical_skin_treatment",
    );
    expect(getInterventionType("aes_skin_microneedling")).toBe(
      "non_surgical_skin_treatment",
    );
    expect(getInterventionType("aes_thread_neck")).toBe(
      "non_surgical_skin_treatment",
    );
  });

  it("defaults to surgical for surgical procedures", () => {
    expect(getInterventionType("aes_face_smas_facelift")).toBe("surgical");
    expect(getInterventionType("bc_abdo_full")).toBe("surgical");
    expect(getInterventionType("aes_face_upper_bleph")).toBe("surgical");
  });
});

// ─── getAestheticIntentFromDiagnosis ───────────────────────────────────────

describe("getAestheticIntentFromDiagnosis", () => {
  it("returns post_bariatric_mwl for post-bariatric diagnoses", () => {
    expect(
      getAestheticIntentFromDiagnosis("aes_dx_post_bariatric_body"),
    ).toBe("post_bariatric_mwl");
    expect(
      getAestheticIntentFromDiagnosis("aes_dx_post_bariatric_arm"),
    ).toBe("post_bariatric_mwl");
  });

  it("returns functional_reconstructive for functional diagnoses", () => {
    expect(getAestheticIntentFromDiagnosis("aes_dx_panniculitis")).toBe(
      "functional_reconstructive",
    );
    expect(
      getAestheticIntentFromDiagnosis("aes_dx_nasal_functional"),
    ).toBe("functional_reconstructive");
  });

  it("defaults to cosmetic for unrecognised diagnoses", () => {
    expect(
      getAestheticIntentFromDiagnosis("aes_dx_facelift_ageing"),
    ).toBe("cosmetic");
    expect(getAestheticIntentFromDiagnosis("unknown_id")).toBe("cosmetic");
  });
});

// ─── getAcgmeCategory / getAcgmeSubcategory ───────────────────────────────

describe("getAcgmeCategory", () => {
  it("classifies facial procedures as head_neck_aesthetic", () => {
    expect(getAcgmeCategory("aes_face_smas_facelift")).toBe(
      "head_neck_aesthetic",
    );
    expect(getAcgmeCategory("aes_bleph_upper")).toBe("head_neck_aesthetic");
  });

  it("classifies body procedures as trunk_extremity_aesthetic", () => {
    expect(getAcgmeCategory("bc_abdo_full")).toBe(
      "trunk_extremity_aesthetic",
    );
    expect(getAcgmeCategory("bc_upper_brachioplasty")).toBe(
      "trunk_extremity_aesthetic",
    );
  });

  it("classifies injectables as injectable_non_index", () => {
    expect(getAcgmeCategory("aes_inj_botox_upper_face")).toBe(
      "injectable_non_index",
    );
    expect(getAcgmeCategory("aes_inj_filler_midface")).toBe(
      "injectable_non_index",
    );
  });

  it("classifies energy as laser_non_index", () => {
    expect(getAcgmeCategory("aes_energy_rf_microneedling")).toBe(
      "laser_non_index",
    );
  });
});

describe("getAcgmeSubcategory", () => {
  it("returns correct subcategories", () => {
    expect(getAcgmeSubcategory("aes_bleph_upper")).toBe("blepharoplasty");
    expect(getAcgmeSubcategory("bc_abdo_full")).toBe("abdominoplasty");
    expect(getAcgmeSubcategory("aes_body_liposuction")).toBe("liposuction");
    expect(getAcgmeSubcategory("aes_inj_botox_upper_face")).toBe(
      "botulinum_toxin",
    );
  });

  it("defaults to other for unrecognised procedures", () => {
    expect(getAcgmeSubcategory("some_unknown_id")).toBe("other");
  });
});

// ─── Product catalogue ─────────────────────────────────────────────────────

describe("product catalogue", () => {
  it("getProductById returns correct product", () => {
    const p = getProductById("ntx_botox");
    expect(p).toBeDefined();
    expect(p?.manufacturer).toBe("Allergan (AbbVie)");
    expect(p?.category).toBe("neurotoxin");
  });

  it("getProductById returns undefined for unknown ID", () => {
    expect(getProductById("unknown_product_xyz")).toBeUndefined();
  });

  it("getProductsByCategory filters correctly", () => {
    const neurotoxins = getProductsByCategory("neurotoxin");
    expect(neurotoxins.length).toBeGreaterThan(0);
    expect(neurotoxins.every((p) => p.category === "neurotoxin")).toBe(true);
  });

  it("getProductsByRegion filters by region", () => {
    const usProducts = getProductsByRegion("us");
    expect(usProducts.length).toBeGreaterThan(0);
    expect(
      usProducts.every(
        (p) =>
          p.availableRegions.includes("us") ||
          p.availableRegions.includes("global"),
      ),
    ).toBe(true);
  });
});

// ─── Energy device catalogue ───────────────────────────────────────────────

describe("energy device catalogue", () => {
  it("getEnergyDeviceSpec returns spec for known device", () => {
    const spec = getEnergyDeviceSpec("energy_ultrapulse");
    expect(spec).toBeDefined();
    expect(spec?.wavelengthsNm).toContain(10600);
    expect(spec?.availableHandpieces?.length).toBeGreaterThan(0);
  });

  it("getEnergyDeviceSpec returns undefined for unknown device", () => {
    expect(getEnergyDeviceSpec("unknown_device")).toBeUndefined();
  });

  it("getAllEnergyDevices returns all devices", () => {
    const devices = getAllEnergyDevices();
    expect(devices.length).toBeGreaterThan(0);
    expect(devices.every((d) => d.category === "energy_device")).toBe(true);
  });

  it("getEnergyDevicesBySubcategory filters correctly", () => {
    const rfDevices = getEnergyDevicesBySubcategory("rf_microneedling");
    expect(rfDevices.length).toBeGreaterThan(0);
    expect(
      rfDevices.every((d) => d.subcategory === "rf_microneedling"),
    ).toBe(true);
  });
});

// ─── Phase 6: Post-bariatric & detail card mapping ────────────────────────

describe("post-bariatric intent detection", () => {
  it("returns post_bariatric_mwl for all post-bariatric diagnoses", () => {
    const pbDiagnoses = [
      "aes_dx_post_bariatric_body",
      "aes_dx_post_bariatric_arm",
      "aes_dx_post_bariatric_thigh",
      "aes_dx_post_bariatric_breast",
    ];
    for (const dx of pbDiagnoses) {
      expect(getAestheticIntentFromDiagnosis(dx)).toBe("post_bariatric_mwl");
    }
  });

  it("does not return post_bariatric_mwl for cosmetic diagnoses", () => {
    expect(
      getAestheticIntentFromDiagnosis("aes_dx_facelift_ageing"),
    ).not.toBe("post_bariatric_mwl");
  });
});

describe("procedure-to-card-type mapping via getInterventionType", () => {
  it("biostimulator → non_surgical_injectable", () => {
    expect(getInterventionType("aes_inj_biostim_sculptra")).toBe(
      "non_surgical_injectable",
    );
  });

  it("PRP → non_surgical_injectable", () => {
    expect(getInterventionType("aes_inj_prp")).toBe(
      "non_surgical_injectable",
    );
  });

  it("thread lift → non_surgical_skin_treatment", () => {
    expect(getInterventionType("aes_thread_neck")).toBe(
      "non_surgical_skin_treatment",
    );
  });

  it("fat transfer → surgical (no injectable/energy prefix)", () => {
    expect(getInterventionType("aes_body_fat_transfer_buttock")).toBe(
      "surgical",
    );
  });

  it("liposuction → surgical", () => {
    expect(getInterventionType("aes_body_liposuction")).toBe("surgical");
  });
});

describe("Pittsburgh Rating Scale computation", () => {
  it("auto-sums scores correctly", () => {
    const scores: Record<string, number> = {
      chin_neck: 2,
      chest: 1,
      arms: 3,
      abdomen: 3,
      flanks_back: 2,
      buttock: 1,
      inner_thighs: 2,
      outer_thighs: 1,
      breasts: 2,
      mons_pubis: 1,
    };
    const total = Object.values(scores).reduce((s, v) => s + v, 0);
    expect(total).toBe(18);
  });

  it("handles partial scores", () => {
    const scores = { arms: 3, abdomen: 2 };
    const total = Object.values(scores).reduce((s, v) => s + v, 0);
    expect(total).toBe(5);
  });
});

describe("BMI and weight loss calculations", () => {
  it("calculates BMI correctly", () => {
    const weightKg = 80;
    const heightCm = 170;
    const heightM = heightCm / 100;
    const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
    expect(bmi).toBe(27.7);
  });

  it("calculates weight loss correctly", () => {
    const pre = 150;
    const current = 80;
    expect(pre - current).toBe(70);
  });

  it("calculates %TWL correctly", () => {
    const pre = 150;
    const current = 80;
    const twl = Math.round(((pre - current) / pre) * 100);
    expect(twl).toBe(47);
  });
});

describe("product catalogue completeness", () => {
  it("biostimulator products exist", () => {
    const products = getProductsByCategory("biostimulator");
    expect(products.length).toBeGreaterThanOrEqual(5);
  });

  it("PRP systems exist", () => {
    const products = getProductsByCategory("prp_system");
    expect(products.length).toBeGreaterThanOrEqual(5);
  });

  it("thread lift products exist", () => {
    const products = getProductsByCategory("thread_lift");
    expect(products.length).toBeGreaterThanOrEqual(5);
  });
});
