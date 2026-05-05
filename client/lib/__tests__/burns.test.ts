import { describe, it, expect } from "vitest";
import {
  isBurnsDiagnosis,
  isAcuteBurnDiagnosis,
  getBurnPhaseFromDiagnosis,
  deriveBurnDiagnosis,
  getAssessmentDrivenProcedureSuggestions,
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
import type { TBSARegionalEntry, BurnsAssessmentData } from "@/types/burns";
import {
  RULE_OF_NINES_ADULT,
  LUND_BROWDER_AGE_ADJUSTMENT,
  ALL_TBSA_REGIONS,
  BURN_PHASE_LABELS,
  BURN_DEPTH_LABELS,
  MECHANISM_DETAILS,
} from "@/types/burns";
import { BURNS_DIAGNOSES } from "@/lib/diagnosisPicklists/burnsDiagnoses";

// ═══════════════════════════════════════════════════════════
// 1. Activation checks
// ═══════════════════════════════════════════════════════════

describe("isBurnsDiagnosis", () => {
  it("returns true for burns diagnosis IDs", () => {
    expect(isBurnsDiagnosis("burns_dx_acute")).toBe(true);
    expect(isBurnsDiagnosis("burns_dx_contracture_neck")).toBe(true);
  });

  it("returns false for non-burns diagnosis IDs", () => {
    expect(isBurnsDiagnosis("hand_dx_fracture")).toBe(false);
    expect(isBurnsDiagnosis("skin_cancer_bcc")).toBe(false);
    expect(isBurnsDiagnosis("breast_dx_cancer")).toBe(false);
    expect(isBurnsDiagnosis("")).toBe(false);
  });
});

describe("isAcuteBurnDiagnosis", () => {
  it("returns true only for burns_dx_acute", () => {
    expect(isAcuteBurnDiagnosis("burns_dx_acute")).toBe(true);
  });

  it("returns false for reconstructive diagnoses", () => {
    expect(isAcuteBurnDiagnosis("burns_dx_contracture_hand")).toBe(false);
    expect(isAcuteBurnDiagnosis("burns_dx_hypertrophic_scar")).toBe(false);
  });

  it("returns false for non-burns diagnoses", () => {
    expect(isAcuteBurnDiagnosis("hand_dx_fracture")).toBe(false);
    expect(isAcuteBurnDiagnosis("")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 2. Phase inference
// ═══════════════════════════════════════════════════════════

describe("getBurnPhaseFromDiagnosis", () => {
  it("returns 'acute' for the acute burn diagnosis", () => {
    expect(getBurnPhaseFromDiagnosis("burns_dx_acute")).toBe("acute");
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
    expect(getBurnPhaseFromDiagnosis("burns_dx_hypertrophic_scar")).toBe(
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
});

// ═══════════════════════════════════════════════════════════
// 3. Derived diagnosis
// ═══════════════════════════════════════════════════════════

describe("deriveBurnDiagnosis", () => {
  it("returns generic burn when no injury event", () => {
    const result = deriveBurnDiagnosis(undefined);
    expect(result.snomedCtCode).toBe("284196006");
    expect(result.displayName).toBe("Acute burn");
  });

  it("returns flame burn for thermal/flame", () => {
    const result = deriveBurnDiagnosis({
      mechanism: "thermal",
      mechanismDetail: "flame",
    });
    expect(result.snomedCtCode).toBe("314534006");
    expect(result.displayName).toBe("Flame burn");
  });

  it("returns scald for thermal/scald", () => {
    const result = deriveBurnDiagnosis({
      mechanism: "thermal",
      mechanismDetail: "scald",
    });
    expect(result.snomedCtCode).toBe("423858006");
    expect(result.displayName).toBe("Scald burn");
  });

  it("returns contact burn for thermal/contact", () => {
    const result = deriveBurnDiagnosis({
      mechanism: "thermal",
      mechanismDetail: "contact",
    });
    expect(result.snomedCtCode).toBe("385516009");
    expect(result.displayName).toBe("Contact burn");
  });

  it("returns chemical burn with acid qualifier", () => {
    const result = deriveBurnDiagnosis({
      mechanism: "chemical",
      mechanismDetail: "acid",
    });
    expect(result.snomedCtCode).toBe("426284001");
    expect(result.displayName).toBe("Chemical burn — acid");
  });

  it("returns electrical burn for electrical mechanism", () => {
    const result = deriveBurnDiagnosis({
      mechanism: "electrical",
      mechanismDetail: "high_voltage",
    });
    expect(result.snomedCtCode).toBe("405571006");
    expect(result.displayName).toBe("Electrical burn — high voltage");
  });

  it("returns frostbite for cold mechanism", () => {
    const result = deriveBurnDiagnosis({ mechanism: "cold" });
    expect(result.snomedCtCode).toBe("370977006");
    expect(result.displayName).toBe("Cold injury / frostbite");
  });

  it("adds inhalation as secondary diagnosis", () => {
    const result = deriveBurnDiagnosis({
      mechanism: "thermal",
      mechanismDetail: "flame",
      inhalationInjury: true,
    });
    expect(result.snomedCtCode).toBe("314534006");
    expect(result.secondaryDiagnoses).toHaveLength(1);
    expect(result.secondaryDiagnoses![0].displayName).toBe("Inhalation injury");
    expect(result.secondaryDiagnoses![0].snomedCtCode).toBe("75478009");
  });

  it("does not add secondary when inhalation is false", () => {
    const result = deriveBurnDiagnosis({
      mechanism: "thermal",
      inhalationInjury: false,
    });
    expect(result.secondaryDiagnoses).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// 4. Assessment-driven procedure suggestions
// ═══════════════════════════════════════════════════════════

describe("getAssessmentDrivenProcedureSuggestions", () => {
  it("always includes wound dressing", () => {
    const suggestions = getAssessmentDrivenProcedureSuggestions({});
    expect(
      suggestions.find(
        (s) => s.procedurePicklistId === "burns_acute_wound_dressing",
      ),
    ).toBeDefined();
  });

  it("suggests excision + STSG for deep partial depth", () => {
    const assessment: BurnsAssessmentData = {
      tbsa: { predominantDepth: "deep_partial", totalTBSA: 10 },
    };
    const suggestions = getAssessmentDrivenProcedureSuggestions(assessment);
    expect(
      suggestions.find(
        (s) => s.procedurePicklistId === "burns_acute_tangential_excision",
      ),
    ).toBeDefined();
    expect(
      suggestions.find(
        (s) => s.procedurePicklistId === "burns_graft_stsg_meshed",
      ),
    ).toBeDefined();
  });

  it("suggests fascial excision + dermal substitute for full thickness", () => {
    const assessment: BurnsAssessmentData = {
      tbsa: { predominantDepth: "full_thickness", totalTBSA: 10 },
    };
    const suggestions = getAssessmentDrivenProcedureSuggestions(assessment);
    expect(
      suggestions.find(
        (s) => s.procedurePicklistId === "burns_acute_fascial_excision",
      ),
    ).toBeDefined();
    expect(
      suggestions.find(
        (s) => s.procedurePicklistId === "burns_graft_dermal_substitute",
      ),
    ).toBeDefined();
  });

  it("suggests meek for TBSA >= 30%", () => {
    const assessment: BurnsAssessmentData = {
      tbsa: { totalTBSA: 35 },
    };
    const suggestions = getAssessmentDrivenProcedureSuggestions(assessment);
    expect(
      suggestions.find((s) => s.procedurePicklistId === "burns_graft_meek"),
    ).toBeDefined();
  });

  it("suggests CEA for TBSA >= 50%", () => {
    const assessment: BurnsAssessmentData = {
      tbsa: { totalTBSA: 55 },
    };
    const suggestions = getAssessmentDrivenProcedureSuggestions(assessment);
    expect(
      suggestions.find((s) => s.procedurePicklistId === "burns_graft_cea"),
    ).toBeDefined();
  });

  it("suggests escharotomy for circumferential burns", () => {
    const assessment: BurnsAssessmentData = {
      injuryEvent: { circumferentialBurn: true },
    };
    const suggestions = getAssessmentDrivenProcedureSuggestions(assessment);
    const eschar = suggestions.find(
      (s) => s.procedurePicklistId === "burns_acute_escharotomy",
    );
    expect(eschar).toBeDefined();
    expect(eschar!.isDefault).toBe(true);
  });

  it("suggests fasciotomy for electrical burns", () => {
    const assessment: BurnsAssessmentData = {
      injuryEvent: { mechanism: "electrical" },
    };
    const suggestions = getAssessmentDrivenProcedureSuggestions(assessment);
    expect(
      suggestions.find(
        (s) => s.procedurePicklistId === "burns_acute_fasciotomy",
      ),
    ).toBeDefined();
  });

  it("suggests tracheostomy for inhalation injury", () => {
    const assessment: BurnsAssessmentData = {
      injuryEvent: { inhalationInjury: true },
    };
    const suggestions = getAssessmentDrivenProcedureSuggestions(assessment);
    expect(
      suggestions.find(
        (s) => s.procedurePicklistId === "burns_acute_tracheostomy",
      ),
    ).toBeDefined();
  });

  it("returns suggestions sorted by sortOrder", () => {
    const assessment: BurnsAssessmentData = {
      tbsa: { predominantDepth: "full_thickness", totalTBSA: 55 },
      injuryEvent: { circumferentialBurn: true, inhalationInjury: true },
    };
    const suggestions = getAssessmentDrivenProcedureSuggestions(assessment);
    const orders = suggestions.map((s) => s.sortOrder ?? 99);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

// ═══════════════════════════════════════════════════════════
// 5. Revised Baux score
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
// 6. ABSI score
// ═══════════════════════════════════════════════════════════

describe("calculateABSI", () => {
  it("calculates for young male, small burn, no complications", () => {
    expect(calculateABSI(18, "male", 5, false, false)).toBe(2);
  });

  it("calculates for middle-aged female, moderate burn, inhalation", () => {
    expect(calculateABSI(35, "female", 25, true, true)).toBe(8);
  });

  it("calculates for elderly, large burn", () => {
    expect(calculateABSI(75, "male", 45, true, true)).toBe(11);
  });

  it("handles edge cases", () => {
    expect(calculateABSI(90, "female", 95, true, true)).toBe(18);
  });

  it("correctly scores TBSA brackets", () => {
    expect(calculateABSI(30, "male", 10, false, false)).toBe(3);
    expect(calculateABSI(30, "male", 11, false, false)).toBe(4);
    expect(calculateABSI(30, "male", 20, false, false)).toBe(4);
    expect(calculateABSI(30, "male", 21, false, false)).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════
// 7. TBSA validation
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
// 8. Defaults
// ═══════════════════════════════════════════════════════════

describe("getDefaultBurnsAssessment", () => {
  it("returns assessment with TBSA data", () => {
    const assessment = getDefaultBurnsAssessment();
    expect(assessment.tbsa).toBeDefined();
  });

  it("does not have a phase property", () => {
    const assessment = getDefaultBurnsAssessment();
    expect(assessment).not.toHaveProperty("phase");
  });
});

describe("getDefaultTBSAData", () => {
  it("returns empty TBSA data", () => {
    const data = getDefaultTBSAData();
    expect(data).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════
// 9. Constants integrity
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
    expect(Object.keys(BURN_PHASE_LABELS)).toEqual(["acute", "reconstructive"]);
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
// 10. Procedure detection helpers
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
    expect(
      isBurnContractureReleaseProcedure("burns_recon_zplasty_single"),
    ).toBe(false);
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

// ═══════════════════════════════════════════════════════════
// 11. Diagnosis picklist integrity
// ═══════════════════════════════════════════════════════════

describe("Burns diagnosis picklist", () => {
  it("has exactly 1 acute diagnosis", () => {
    const acute = BURNS_DIAGNOSES.filter(
      (d) => d.subcategory === "Acute Burns",
    );
    expect(acute).toHaveLength(1);
    expect(acute[0].id).toBe("burns_dx_acute");
  });

  it("acute diagnosis has hasStaging: false", () => {
    const acute = BURNS_DIAGNOSES.find((d) => d.id === "burns_dx_acute");
    expect(acute?.hasStaging).toBe(false);
  });

  it("has no non-operative entries", () => {
    const nonOp = BURNS_DIAGNOSES.filter(
      (d) => d.subcategory === "Non-Operative Burns",
    );
    expect(nonOp).toHaveLength(0);
  });

  it("has no expanded acute mechanism entries", () => {
    const expanded = BURNS_DIAGNOSES.filter(
      (d) =>
        d.subcategory === "Acute Thermal" ||
        d.subcategory === "Acute Chemical" ||
        d.subcategory === "Acute Electrical" ||
        d.subcategory === "Acute Other",
    );
    expect(expanded).toHaveLength(0);
  });

  it("preserves all reconstructive/scar entries", () => {
    const recon = BURNS_DIAGNOSES.filter(
      (d) => d.clinicalGroup === "reconstructive",
    );
    // 4 reconstruction + 9 contractures + 5 scars = 18
    expect(recon.length).toBe(18);
  });

  it("total count is 19 (1 acute + 18 reconstructive)", () => {
    expect(BURNS_DIAGNOSES).toHaveLength(19);
  });
});
