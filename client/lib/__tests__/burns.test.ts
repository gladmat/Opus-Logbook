import { describe, it, expect } from "vitest";
import {
  isBurnsDiagnosis,
  getBurnPhaseFromDiagnosis,
  calculateRevisedBaux,
  calculateABSI,
  validateTBSARegionalSum,
  getDefaultBurnsAssessment,
  getDefaultTBSAData,
  isBurnGraftProcedure,
  isBurnExcisionProcedure,
  isBurnDermalSubstituteProcedure,
  isBurnContractureReleaseProcedure,
  isBurnLaserProcedure,
  isBurnFreeFlap,
} from "@/lib/burnsConfig";
import type { TBSARegionalEntry } from "@/types/burns";
import {
  RULE_OF_NINES_ADULT,
  LUND_BROWDER_AGE_ADJUSTMENT,
  ALL_TBSA_REGIONS,
  BURN_PHASE_LABELS,
  BURN_DEPTH_LABELS,
  MECHANISM_DETAILS,
} from "@/types/burns";

// ═══════════════════════════════════════════════════════════
// 1. Activation checks
// ═══════════════════════════════════════════════════════════

describe("isBurnsDiagnosis", () => {
  it("returns true for burns diagnosis IDs", () => {
    expect(isBurnsDiagnosis("burns_dx_thermal_flame")).toBe(true);
    expect(isBurnsDiagnosis("burns_dx_contracture_neck")).toBe(true);
    expect(isBurnsDiagnosis("burns_dx_nonop_wound_care")).toBe(true);
  });

  it("returns false for non-burns diagnosis IDs", () => {
    expect(isBurnsDiagnosis("hand_dx_fracture")).toBe(false);
    expect(isBurnsDiagnosis("skin_cancer_bcc")).toBe(false);
    expect(isBurnsDiagnosis("breast_dx_cancer")).toBe(false);
    expect(isBurnsDiagnosis("")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 2. Phase gate inference
// ═══════════════════════════════════════════════════════════

describe("getBurnPhaseFromDiagnosis", () => {
  it("returns 'acute' for acute burn diagnoses", () => {
    expect(getBurnPhaseFromDiagnosis("burns_dx_thermal_flame")).toBe("acute");
    expect(getBurnPhaseFromDiagnosis("burns_dx_thermal_scald")).toBe("acute");
    expect(getBurnPhaseFromDiagnosis("burns_dx_chemical_acid")).toBe("acute");
    expect(getBurnPhaseFromDiagnosis("burns_dx_electrical_high")).toBe("acute");
    expect(getBurnPhaseFromDiagnosis("burns_dx_circumferential")).toBe("acute");
    expect(getBurnPhaseFromDiagnosis("burns_dx_cold_frostbite")).toBe("acute");
    expect(getBurnPhaseFromDiagnosis("burns_dx_inhalation")).toBe("acute");
    expect(getBurnPhaseFromDiagnosis("burns_dx_radiation")).toBe("acute");
  });

  it("returns 'reconstructive' for reconstruction diagnoses", () => {
    expect(getBurnPhaseFromDiagnosis("burns_dx_contracture_hand")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_contracture_neck")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_contracture_axilla")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_scar_hypertrophic")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_scar_keloid")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_scar_unstable")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_web_space_contracture")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_ectropion_burn")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_microstomia")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_heterotopic_ossification")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_neuropathic_pain")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_nasal_contracture")).toBe(
      "reconstructive",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_ear_contracture")).toBe(
      "reconstructive",
    );
  });

  it("returns 'non_operative' for non-operative diagnoses", () => {
    expect(getBurnPhaseFromDiagnosis("burns_dx_nonop_wound_care")).toBe(
      "non_operative",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_nonop_dressing_ga")).toBe(
      "non_operative",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_nonop_scar_review")).toBe(
      "non_operative",
    );
    expect(getBurnPhaseFromDiagnosis("burns_dx_nonop_garment_fit")).toBe(
      "non_operative",
    );
  });
});

// ═══════════════════════════════════════════════════════════
// 3. Revised Baux score
// ═══════════════════════════════════════════════════════════

describe("calculateRevisedBaux", () => {
  it("calculates correctly without inhalation", () => {
    expect(calculateRevisedBaux(50, 30, false)).toBe(80);
    expect(calculateRevisedBaux(0, 0, false)).toBe(0);
    expect(calculateRevisedBaux(70, 40, false)).toBe(110);
  });

  it("adds 17 for inhalation injury", () => {
    expect(calculateRevisedBaux(50, 30, true)).toBe(97);
    expect(calculateRevisedBaux(0, 0, true)).toBe(17);
    expect(calculateRevisedBaux(70, 40, true)).toBe(127);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. ABSI score
// ═══════════════════════════════════════════════════════════

describe("calculateABSI", () => {
  it("calculates for young male, small burn, no complications", () => {
    // sex=male(0), age≤20(1), tbsa≤10(1), no inhalation(0), no FT(0) = 2
    expect(calculateABSI(18, "male", 5, false, false)).toBe(2);
  });

  it("calculates for middle-aged female, moderate burn, inhalation", () => {
    // sex=female(1), age≤40(2), tbsa≤30(3), inhalation(1), FT(1) = 8
    expect(calculateABSI(35, "female", 25, true, true)).toBe(8);
  });

  it("calculates for elderly, large burn", () => {
    // sex=male(0), age≤80(4), tbsa≤50(5), inhalation(1), FT(1) = 11
    expect(calculateABSI(75, "male", 45, true, true)).toBe(11);
  });

  it("handles edge cases", () => {
    // sex=female(1), age>80(5), tbsa>90(10), inhalation(1), FT(1) = 18
    expect(calculateABSI(90, "female", 95, true, true)).toBe(18);
  });

  it("correctly scores TBSA brackets", () => {
    // Verify each TBSA bracket boundary
    expect(calculateABSI(30, "male", 10, false, false)).toBe(3); // age≤40(2) + tbsa≤10(1)
    expect(calculateABSI(30, "male", 11, false, false)).toBe(4); // age≤40(2) + tbsa≤20(2)
    expect(calculateABSI(30, "male", 20, false, false)).toBe(4);
    expect(calculateABSI(30, "male", 21, false, false)).toBe(5); // age≤40(2) + tbsa≤30(3)
  });
});

// ═══════════════════════════════════════════════════════════
// 5. TBSA validation
// ═══════════════════════════════════════════════════════════

describe("validateTBSARegionalSum", () => {
  it("validates matching sums", () => {
    const regions: TBSARegionalEntry[] = [
      { region: "head_neck", percentage: 4.5, depth: "superficial_partial" },
      { region: "right_upper_limb", percentage: 5.5, depth: "deep_partial" },
    ];
    const result = validateTBSARegionalSum(regions, 10);
    expect(result.valid).toBe(true);
    expect(result.diff).toBe(0);
  });

  it("allows 0.5% tolerance", () => {
    const regions: TBSARegionalEntry[] = [
      { region: "head_neck", percentage: 5, depth: "deep_partial" },
      { region: "anterior_trunk", percentage: 5, depth: "full_thickness" },
    ];
    const result = validateTBSARegionalSum(regions, 10.5);
    expect(result.valid).toBe(true);
  });

  it("rejects sums outside tolerance", () => {
    const regions: TBSARegionalEntry[] = [
      { region: "head_neck", percentage: 5, depth: "deep_partial" },
    ];
    const result = validateTBSARegionalSum(regions, 10);
    expect(result.valid).toBe(false);
    expect(result.diff).toBe(5);
  });

  it("handles empty regions", () => {
    const result = validateTBSARegionalSum([], 0);
    expect(result.valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. Defaults
// ═══════════════════════════════════════════════════════════

describe("getDefaultBurnsAssessment", () => {
  it("returns acute assessment with TBSA data", () => {
    const assessment = getDefaultBurnsAssessment("acute");
    expect(assessment.phase).toBe("acute");
    expect(assessment.tbsa).toBeDefined();
  });

  it("returns reconstructive assessment without TBSA data", () => {
    const assessment = getDefaultBurnsAssessment("reconstructive");
    expect(assessment.phase).toBe("reconstructive");
    expect(assessment.tbsa).toBeUndefined();
  });

  it("returns non-operative assessment without TBSA data", () => {
    const assessment = getDefaultBurnsAssessment("non_operative");
    expect(assessment.phase).toBe("non_operative");
    expect(assessment.tbsa).toBeUndefined();
  });
});

describe("getDefaultTBSAData", () => {
  it("returns empty TBSA data", () => {
    const data = getDefaultTBSAData();
    expect(data).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════
// 7. Constants integrity
// ═══════════════════════════════════════════════════════════

describe("Rule of Nines", () => {
  it("sums to 100%", () => {
    const total = Object.values(RULE_OF_NINES_ADULT).reduce(
      (sum, v) => sum + v,
      0,
    );
    expect(total).toBe(100);
  });

  it("has 8 regions", () => {
    expect(ALL_TBSA_REGIONS).toHaveLength(8);
    expect(Object.keys(RULE_OF_NINES_ADULT)).toHaveLength(8);
  });
});

describe("Lund-Browder age adjustments", () => {
  it("has adjustments for head, thigh, and lower leg", () => {
    expect(LUND_BROWDER_AGE_ADJUSTMENT).toHaveProperty("half_head");
    expect(LUND_BROWDER_AGE_ADJUSTMENT).toHaveProperty("half_thigh");
    expect(LUND_BROWDER_AGE_ADJUSTMENT).toHaveProperty("half_lower_leg");
  });

  it("head percentage decreases with age", () => {
    const head = LUND_BROWDER_AGE_ADJUSTMENT["half_head"];
    expect(head["0"]).toBeGreaterThan(head["adult"]);
    expect(head["0"]).toBe(9.5);
    expect(head["adult"]).toBe(3.5);
  });

  it("thigh percentage increases with age", () => {
    const thigh = LUND_BROWDER_AGE_ADJUSTMENT["half_thigh"];
    expect(thigh["adult"]).toBeGreaterThan(thigh["0"]);
  });
});

describe("Label records completeness", () => {
  it("BURN_PHASE_LABELS has all phases", () => {
    expect(Object.keys(BURN_PHASE_LABELS)).toEqual([
      "acute",
      "reconstructive",
      "non_operative",
    ]);
  });

  it("BURN_DEPTH_LABELS has all depths", () => {
    expect(Object.keys(BURN_DEPTH_LABELS)).toHaveLength(6);
  });

  it("MECHANISM_DETAILS maps all mechanisms to valid detail arrays", () => {
    expect(MECHANISM_DETAILS.thermal).toHaveLength(5);
    expect(MECHANISM_DETAILS.chemical).toHaveLength(3);
    expect(MECHANISM_DETAILS.electrical).toHaveLength(4);
    expect(MECHANISM_DETAILS.radiation).toHaveLength(0);
    expect(MECHANISM_DETAILS.friction).toHaveLength(0);
    expect(MECHANISM_DETAILS.cold).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════
// 8. Procedure detection helpers
// ═══════════════════════════════════════════════════════════

describe("Procedure detection helpers", () => {
  it("isBurnGraftProcedure detects graft procedures", () => {
    expect(isBurnGraftProcedure("burns_graft_stsg_sheet")).toBe(true);
    expect(isBurnGraftProcedure("burns_graft_meek")).toBe(true);
    expect(isBurnGraftProcedure("burns_acute_fasciotomy")).toBe(false);
  });

  it("isBurnExcisionProcedure detects excision procedures", () => {
    expect(isBurnExcisionProcedure("burns_acute_tangential_excision")).toBe(
      true,
    );
    expect(isBurnExcisionProcedure("burns_acute_fascial_excision")).toBe(true);
    expect(isBurnExcisionProcedure("burns_graft_stsg_sheet")).toBe(false);
  });

  it("isBurnDermalSubstituteProcedure detects dermal subs", () => {
    expect(isBurnDermalSubstituteProcedure("burns_sub_integra_bilayer")).toBe(
      true,
    );
    expect(isBurnDermalSubstituteProcedure("burns_sub_matriderm")).toBe(true);
    expect(isBurnDermalSubstituteProcedure("burns_graft_stsg_sheet")).toBe(
      false,
    );
  });

  it("isBurnContractureReleaseProcedure detects contracture releases", () => {
    expect(
      isBurnContractureReleaseProcedure("burns_recon_contracture_release"),
    ).toBe(true);
    expect(
      isBurnContractureReleaseProcedure("burns_recon_contracture_graft"),
    ).toBe(true);
    expect(isBurnContractureReleaseProcedure("burns_recon_zplasty_single")).toBe(
      false,
    );
  });

  it("isBurnLaserProcedure detects laser procedures", () => {
    expect(isBurnLaserProcedure("burns_scar_laser_ablative")).toBe(true);
    expect(isBurnLaserProcedure("burns_scar_laser_pulsed_dye")).toBe(true);
    expect(isBurnLaserProcedure("burns_scar_fat_grafting")).toBe(false);
  });

  it("isBurnFreeFlap detects free flap procedures", () => {
    expect(isBurnFreeFlap("burns_acute_free_flap")).toBe(true);
    expect(isBurnFreeFlap("burns_recon_free_flap")).toBe(true);
    expect(isBurnFreeFlap("burns_recon_contracture_free_flap")).toBe(true);
    expect(isBurnFreeFlap("burns_recon_local_flap")).toBe(false);
  });
});
