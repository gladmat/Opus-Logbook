import { describe, it, expect } from "vitest";
import { HAND_SURGERY_DIAGNOSES } from "@/lib/diagnosisPicklists/handSurgeryDiagnoses";
import { PERIPHERAL_NERVE_DIAGNOSES } from "@/lib/diagnosisPicklists/peripheralNerveDiagnoses";
import { PROCEDURE_PICKLIST } from "@/lib/procedurePicklist";
import {
  buildElectiveSnomedFallbackState,
  shouldRenderGenericDiagnosisSnomedPicker,
} from "@/lib/handElectiveFlow";
import {
  getFingerConfigForDiagnosis,
  hasPerFingerQuinnell,
  formatTriggerFingerGrading,
  bridgeDigitsToFingers,
  QUINNELL_GRADES,
} from "@/lib/handElectiveFieldConfig";

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const allElective = HAND_SURGERY_DIAGNOSES.filter(
  (d) => d.clinicalGroup === "elective",
);

const procedureIds = new Set(PROCEDURE_PICKLIST.map((p) => p.id));

function getDiagnosesForSubcategory(subcategory: string) {
  return allElective.filter((d) => d.subcategory === subcategory);
}

// ═══════════════════════════════════════════════════════════
// 1. All 8 elective subcategories have diagnoses
// ═══════════════════════════════════════════════════════════

describe("Elective subcategory coverage", () => {
  const expectedSubcategories = [
    "Stenosing Tenosynovitis",
    "Dupuytren's Disease",
    "Joint & Degenerative",
    "Elective Tendon",
    "Post-traumatic Bone",
    "Rheumatoid Hand",
    "Tumours & Other",
    "Congenital",
  ];

  it.each(expectedSubcategories)(
    "subcategory '%s' has at least one elective diagnosis",
    (subcategory) => {
      const diagnoses = getDiagnosesForSubcategory(subcategory);
      expect(diagnoses.length).toBeGreaterThan(0);
    },
  );

  it("total elective diagnosis count is at least 40", () => {
    expect(allElective.length).toBeGreaterThanOrEqual(35);
  });
});

describe("Strict elective scoping", () => {
  it("includes only diagnoses explicitly marked clinicalGroup 'elective'", () => {
    for (const dx of allElective) {
      expect(dx.clinicalGroup).toBe("elective");
    }
  });

  it("does not include reconstructive hand diagnoses in elective search scope", () => {
    const reconstructiveIds = [
      "hand_dx_scaphoid_nonunion",
    ];
    const electiveIds = new Set(allElective.map((d) => d.id));
    for (const id of reconstructiveIds) {
      expect(electiveIds.has(id)).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 2. Every diagnosis references valid procedure IDs
// ═══════════════════════════════════════════════════════════

describe("Procedure reference integrity", () => {
  it("all suggested procedures reference valid procedure picklist IDs", () => {
    const invalid: { diagnosisId: string; procedureId: string }[] = [];
    for (const dx of HAND_SURGERY_DIAGNOSES) {
      for (const sp of dx.suggestedProcedures) {
        if (!procedureIds.has(sp.procedurePicklistId)) {
          invalid.push({
            diagnosisId: dx.id,
            procedureId: sp.procedurePicklistId,
          });
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it("elective tendon diagnoses all have procedure suggestions", () => {
    const tendonDx = allElective.filter(
      (d) => d.subcategory === "Elective Tendon",
    );
    for (const dx of tendonDx) {
      expect(dx.suggestedProcedures.length).toBeGreaterThan(0);
    }
  });

  it("rheumatoid diagnoses all have procedure suggestions", () => {
    const rheumatoidDx = allElective.filter(
      (d) => d.subcategory === "Rheumatoid Hand",
    );
    for (const dx of rheumatoidDx) {
      expect(dx.suggestedProcedures.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 3. Congenital entries appear in elective filter
// ═══════════════════════════════════════════════════════════

describe("Congenital reclassification", () => {
  const congenitalDx = HAND_SURGERY_DIAGNOSES.filter(
    (d) => d.subcategory === "Congenital",
  );

  it("congenital entries have clinicalGroup 'elective'", () => {
    expect(congenitalDx.length).toBeGreaterThan(0);
    for (const dx of congenitalDx) {
      expect(dx.clinicalGroup).toBe("elective");
    }
  });

  it("congenital entries are included in elective filter", () => {
    const electiveIds = new Set(allElective.map((d) => d.id));
    for (const dx of congenitalDx) {
      expect(electiveIds.has(dx.id)).toBe(true);
    }
  });

  it("congenital entries retain subcategory 'Congenital'", () => {
    for (const dx of congenitalDx) {
      expect(dx.subcategory).toBe("Congenital");
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 4. Neuroma removed from hand surgery diagnoses
// ═══════════════════════════════════════════════════════════

describe("Neuroma removal", () => {
  it("hand_dx_neuroma is not in HAND_SURGERY_DIAGNOSES", () => {
    const ids = HAND_SURGERY_DIAGNOSES.map((d) => d.id);
    expect(ids).not.toContain("hand_dx_neuroma");
  });
});

// ═══════════════════════════════════════════════════════════
// 5. CMC1 OA and Kienböck's have staging
// ═══════════════════════════════════════════════════════════

describe("Staging flag updates", () => {
  it("hand_dx_cmc1_oa has hasStaging: true", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === "hand_dx_cmc1_oa");
    expect(dx).toBeDefined();
    expect(dx!.hasStaging).toBe(true);
  });

  it("hand_dx_kienbock has hasStaging: true", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === "hand_dx_kienbock");
    expect(dx).toBeDefined();
    expect(dx!.hasStaging).toBe(true);
  });

  it("hand_dx_scaphoid_nonunion_elective has hasStaging: true", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find(
      (d) => d.id === "hand_dx_scaphoid_nonunion_elective",
    );
    expect(dx).toBeDefined();
    expect(dx!.hasStaging).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. Staging-flagged diagnoses have correct SNOMED codes
// ═══════════════════════════════════════════════════════════

describe("Staging SNOMED codes", () => {
  it("CMC1 OA has SNOMED code 37895003 (Eaton-Littler staging)", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === "hand_dx_cmc1_oa");
    expect(dx).toBeDefined();
    expect(dx!.snomedCtCode).toBe("37895003");
  });

  it("scaphoid non-union has SNOMED code 302941001 (Herbert staging)", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find(
      (d) => d.id === "hand_dx_scaphoid_nonunion_elective",
    );
    expect(dx).toBeDefined();
    expect(dx!.snomedCtCode).toBe("302941001");
  });

  it("Kienböck's has SNOMED code 787484007 (Lichtman staging)", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === "hand_dx_kienbock");
    expect(dx).toBeDefined();
    expect(dx!.snomedCtCode).toBe("787484007");
  });
});

// ═══════════════════════════════════════════════════════════
// 7. New procedure entries have valid structure
// ═══════════════════════════════════════════════════════════

describe("New procedure entry structure", () => {
  const newProcedureIds = [
    "hand_elective_vascularised_bone_graft",
    "hand_elective_druj_reconstruction",
    "hand_elective_sauve_kapandji",
    "hand_elective_darrach",
    "hand_elective_four_corner_fusion",
    "hand_elective_mucous_cyst_excision",
    "hand_rheumatoid_mcp_synovectomy",
    "hand_rheumatoid_wrist_synovectomy",
    "hand_rheumatoid_nodule_excision",
    "hand_elective_curettage_bone_graft",
    "hand_elective_glomus_excision",
  ];

  it.each(newProcedureIds)(
    "procedure '%s' exists in PROCEDURE_PICKLIST",
    (id) => {
      const proc = PROCEDURE_PICKLIST.find((p) => p.id === id);
      expect(proc).toBeDefined();
    },
  );

  it.each(newProcedureIds)("procedure '%s' has required fields", (id) => {
    const proc = PROCEDURE_PICKLIST.find((p) => p.id === id)!;
    expect(proc.displayName).toBeTruthy();
    expect(proc.snomedCtCode).toBeTruthy();
    expect(proc.snomedCtDisplay).toBeTruthy();
    expect(proc.specialties).toContain("hand_wrist");
    expect(proc.subcategory).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════
// 8. No duplicate diagnosis or procedure IDs
// ═══════════════════════════════════════════════════════════

describe("No duplicate IDs", () => {
  it("no duplicate diagnosis IDs in HAND_SURGERY_DIAGNOSES", () => {
    const ids = HAND_SURGERY_DIAGNOSES.map((d) => d.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
  });

  it("no duplicate procedure IDs in PROCEDURE_PICKLIST", () => {
    const ids = PROCEDURE_PICKLIST.map((p) => p.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════
// 9. New diagnosis metadata
// ═══════════════════════════════════════════════════════════

describe("New diagnosis metadata", () => {
  it("Elective Tendon entries have correct subcategory and clinicalGroup", () => {
    const tendonDx = allElective.filter(
      (d) => d.subcategory === "Elective Tendon",
    );
    expect(tendonDx.length).toBe(7);
    for (const dx of tendonDx) {
      expect(dx.clinicalGroup).toBe("elective");
      expect(dx.specialty).toBe("hand_wrist");
    }
  });

  it("Rheumatoid Hand entries have correct subcategory and clinicalGroup", () => {
    const rheumatoidDx = allElective.filter(
      (d) => d.subcategory === "Rheumatoid Hand",
    );
    expect(rheumatoidDx.length).toBe(5);
    for (const dx of rheumatoidDx) {
      expect(dx.clinicalGroup).toBe("elective");
      expect(dx.specialty).toBe("hand_wrist");
    }
  });

  it("new tumour entries exist with correct subcategory", () => {
    const tumourIds = [
      "hand_dx_enchondroma",
      "hand_dx_glomus_tumour",
      "hand_dx_lipoma_hand",
    ];
    for (const id of tumourIds) {
      const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === id);
      expect(dx).toBeDefined();
      expect(dx!.subcategory).toBe("Tumours & Other");
    }
  });

  it("forearm tumour diagnoses exist with verified International SNOMED codes", () => {
    const expectations: Record<string, { code: string; display: string }> = {
      hand_dx_forearm_soft_tissue_mass: {
        code: "126653006",
        display: "Neoplasm of forearm (disorder)",
      },
      hand_dx_lipoma_forearm: {
        code: "188996003",
        display: "Lipoma of forearm (disorder)",
      },
      hand_dx_schwannoma_upper_limb: {
        code: "189948006",
        display: "Schwannoma (disorder)",
      },
    };

    for (const [id, expected] of Object.entries(expectations)) {
      const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === id);
      expect(dx, `diagnosis ${id} should exist`).toBeDefined();
      expect(dx!.subcategory).toBe("Tumours & Other");
      expect(dx!.specialty).toBe("hand_wrist");
      expect(dx!.clinicalGroup).toBe("elective");
      expect(dx!.snomedCtCode).toBe(expected.code);
      expect(dx!.snomedCtDisplay).toBe(expected.display);
    }
  });

  it("forearm tumour diagnoses default to hand_elective_forearm_tumour_excision", () => {
    const forearmIds = [
      "hand_dx_forearm_soft_tissue_mass",
      "hand_dx_lipoma_forearm",
      "hand_dx_schwannoma_upper_limb",
    ];
    for (const id of forearmIds) {
      const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === id);
      const defaultProc = dx?.suggestedProcedures?.find((p) => p.isDefault);
      expect(defaultProc?.procedurePicklistId).toBe(
        "hand_elective_forearm_tumour_excision",
      );
    }
  });

  it("hand_elective_forearm_tumour_excision procedure exists with correct SNOMED", () => {
    const proc = PROCEDURE_PICKLIST.find(
      (p) => p.id === "hand_elective_forearm_tumour_excision",
    );
    expect(proc).toBeDefined();
    expect(proc!.snomedCtCode).toBe("48219004");
    expect(proc!.snomedCtDisplay).toBe(
      "Excision of lesion of soft tissue (procedure)",
    );
    expect(proc!.specialties).toContain("hand_wrist");
    expect(proc!.tags).toContain("elective");
    expect(proc!.tags).toContain("oncological");
  });

  it("hand_dx_hand_tumour uses the valid International neoplasm-of-hand SNOMED code", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === "hand_dx_hand_tumour");
    expect(dx).toBeDefined();
    // Previous code 126670009 did not resolve against SNOMED International;
    // 126654000 is the canonical "Neoplasm of hand" concept.
    expect(dx!.snomedCtCode).toBe("126654000");
  });

  it("hand_dx_hand_tumour search synonyms no longer advertise forearm scope", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === "hand_dx_hand_tumour");
    const synonyms = (dx?.searchSynonyms ?? []).map((s) => s.toLowerCase());
    for (const term of synonyms) {
      expect(term).not.toContain("forearm");
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 10. Procedure reclassifications
// ═══════════════════════════════════════════════════════════

describe("Procedure reclassifications", () => {
  it("hand_other_rheumatoid has subcategory 'Rheumatoid Hand'", () => {
    const proc = PROCEDURE_PICKLIST.find(
      (p) => p.id === "hand_other_rheumatoid",
    );
    expect(proc).toBeDefined();
    expect(proc!.subcategory).toBe("Rheumatoid Hand");
  });

  it("hand_other_steroid_injection has subcategory 'Compression Neuropathies'", () => {
    const proc = PROCEDURE_PICKLIST.find(
      (p) => p.id === "hand_other_steroid_injection",
    );
    expect(proc).toBeDefined();
    expect(proc!.subcategory).toBe("Compression Neuropathies");
  });
});

// ═══════════════════════════════════════════════════════════
// 11. Nerve compressions moved to peripheral nerve
// ═══════════════════════════════════════════════════════════

describe("Nerve compression reclassification", () => {
  it("CTS, CuTS, Guyon's removed from hand surgery diagnoses", () => {
    const handIds = HAND_SURGERY_DIAGNOSES.map((d) => d.id);
    expect(handIds).not.toContain("hand_dx_carpal_tunnel");
    expect(handIds).not.toContain("hand_dx_cubital_tunnel");
    expect(handIds).not.toContain("hand_dx_guyon");
  });

  it("Stenosing Tenosynovitis subcategory has exactly 2 diagnoses (unified trigger digit)", () => {
    const stenosingDx = allElective.filter(
      (d) => d.subcategory === "Stenosing Tenosynovitis",
    );
    expect(stenosingDx.length).toBe(2);
    const ids = stenosingDx.map((d) => d.id);
    expect(ids).toContain("hand_dx_dequervain");
    expect(ids).toContain("hand_dx_trigger_digit");
  });

  it("Guyon's canal exists in peripheral nerve diagnoses", () => {
    const pnIds = PERIPHERAL_NERVE_DIAGNOSES.map((d) => d.id);
    // CTS and cubital tunnel stay in hand_wrist as primary home; Guyon's has a peripheral nerve entry
    expect(pnIds).toContain("pn_dx_guyon_canal_syndrome");
  });

  it("peripheral nerve upper extremity entries have correct specialty", () => {
    const ueIds = [
      "pn_dx_guyon_canal_syndrome",
      "pn_dx_pronator_syndrome",
      "pn_dx_radial_tunnel_syndrome",
    ];
    for (const id of ueIds) {
      const dx = PERIPHERAL_NERVE_DIAGNOSES.find((d) => d.id === id);
      expect(dx).toBeDefined();
      expect(dx!.specialty).toBe("peripheral_nerve");
      expect(dx!.clinicalGroup).toBe("elective");
    }
  });

  it("peripheral nerve diagnoses reference valid procedures", () => {
    const testIds = [
      "pn_dx_guyon_canal_syndrome",
      "pn_dx_pronator_syndrome",
      "pn_dx_radial_tunnel_syndrome",
    ];
    for (const id of testIds) {
      const dx = PERIPHERAL_NERVE_DIAGNOSES.find((d) => d.id === id)!;
      for (const sp of dx.suggestedProcedures) {
        expect(procedureIds.has(sp.procedurePicklistId)).toBe(true);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 12. Compression procedures have peripheral_nerve specialty
// ═══════════════════════════════════════════════════════════

describe("Compression procedure dual-specialty", () => {
  const compressionProcIds = [
    "hand_comp_ctr_open",
    "hand_comp_ctr_endoscopic",
    "hand_comp_cubital_insitu",
    "hand_comp_cubital_transposition",
    "hand_comp_guyon",
  ];

  it.each(compressionProcIds)(
    "procedure '%s' has both hand_wrist and peripheral_nerve specialties",
    (id) => {
      const proc = PROCEDURE_PICKLIST.find((p) => p.id === id);
      expect(proc).toBeDefined();
      expect(proc!.specialties).toContain("hand_wrist");
      expect(proc!.specialties).toContain("peripheral_nerve");
    },
  );
});

describe("Elective SNOMED fallback helpers", () => {
  it("suppresses the generic diagnosis SNOMED picker for elective hand flow", () => {
    expect(
      shouldRenderGenericDiagnosisSnomedPicker({
        hasDiagnosisPicklist: true,
        isDiagnosisPickerCollapsed: false,
        groupSpecialty: "hand_wrist",
        handCaseType: "elective",
      }),
    ).toBe(false);
  });

  it("keeps the generic diagnosis SNOMED picker for non-elective picklist flows", () => {
    expect(
      shouldRenderGenericDiagnosisSnomedPicker({
        hasDiagnosisPicklist: true,
        isDiagnosisPickerCollapsed: false,
        groupSpecialty: "hand_wrist",
        handCaseType: "trauma",
      }),
    ).toBe(true);
  });

  it("builds the elective fallback reset state from the dedicated handler path", () => {
    const defaultProcedures = [
      {
        id: "default-proc",
        sequenceOrder: 1,
        procedureName: "",
        specialty: "hand_wrist" as const,
        surgeonRole: "PS" as const,
      },
    ];

    const nextState = buildElectiveSnomedFallbackState(
      { conceptId: "12345", term: "Custom elective diagnosis" },
      defaultProcedures,
    );

    expect(nextState.selectedDiagnosis).toBeNull();
    expect(nextState.primaryDiagnosis).toEqual({
      conceptId: "12345",
      term: "Custom elective diagnosis",
    });
    expect(nextState.diagnosis).toBe("Custom elective diagnosis");
    expect(nextState.diagnosisStaging).toBeNull();
    expect(nextState.stagingValues).toEqual({});
    expect([...nextState.selectedSuggestionIds]).toEqual([]);
    expect(nextState.isDiagnosisPickerCollapsed).toBe(true);
    expect(nextState.showAllProcedures).toBe(false);
    expect(nextState.handCaseType).toBe("elective");
    expect(nextState.handInfectionDetails).toBeUndefined();
    expect(nextState.acuteProceduresAccepted).toBe(false);
    expect(nextState.showAcuteFullProcedurePicker).toBe(false);
    expect(nextState.procedures).toEqual(defaultProcedures);
  });
});

// ═══════════════════════════════════════════════════════════
// Per-finger Quinnell grading
// ═══════════════════════════════════════════════════════════

describe("Per-finger Quinnell grading", () => {
  it("unified trigger digit uses DigitMultiSelect (not finger config)", () => {
    // Old per-finger config removed — unified trigger digit uses hasDigitMultiSelect
    const config = getFingerConfigForDiagnosis("hand_dx_trigger_digit");
    expect(config).toBeNull();

    const dx = HAND_SURGERY_DIAGNOSES.find(
      (d) => d.id === "hand_dx_trigger_digit",
    );
    expect(dx).toBeDefined();
    expect(dx!.hasDigitMultiSelect).toBe(true);
  });

  it("old trigger thumb ID no longer has separate finger config", () => {
    const config = getFingerConfigForDiagnosis("hand_dx_trigger_thumb");
    expect(config).toBeNull();
  });

  it("hasPerFingerQuinnell returns true for unified trigger digit", () => {
    expect(hasPerFingerQuinnell("hand_dx_trigger_digit")).toBe(true);
  });

  it("hasPerFingerQuinnell returns false for legacy trigger IDs", () => {
    expect(hasPerFingerQuinnell("hand_dx_trigger_finger")).toBe(false);
    expect(hasPerFingerQuinnell("hand_dx_trigger_thumb")).toBe(false);
  });

  it("hasPerFingerQuinnell returns false for unrelated diagnosis", () => {
    expect(hasPerFingerQuinnell("hand_dx_dequervain")).toBe(false);
    expect(hasPerFingerQuinnell(undefined)).toBe(false);
  });

  it("bridgeDigitsToFingers maps DigitIds to finger IDs", () => {
    expect(bridgeDigitsToFingers(["I", "III", "V"])).toEqual([
      "thumb",
      "middle",
      "little",
    ]);
    expect(bridgeDigitsToFingers(["II", "IV"])).toEqual(["index", "ring"]);
    expect(bridgeDigitsToFingers([])).toEqual([]);
  });

  it("QUINNELL_GRADES has 5 grades (0-IV)", () => {
    expect(QUINNELL_GRADES).toHaveLength(5);
    expect(QUINNELL_GRADES.map((g) => g.value)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("formatTriggerFingerGrading formats single finger", () => {
    const result = formatTriggerFingerGrading(
      { index: "2" },
      ["index"],
    );
    expect(result).toBe("Index Grade II");
  });

  it("formatTriggerFingerGrading formats multiple fingers", () => {
    const result = formatTriggerFingerGrading(
      { index: "2", ring: "3" },
      ["index", "ring"],
    );
    expect(result).toBe("Index Grade II, Ring Grade III");
  });

  it("formatTriggerFingerGrading skips ungraded fingers", () => {
    const result = formatTriggerFingerGrading(
      { index: "1" },
      ["index", "middle"],
    );
    expect(result).toBe("Index Grade I");
  });

  it("formatTriggerFingerGrading returns empty for no grades", () => {
    const result = formatTriggerFingerGrading({}, ["index", "middle"]);
    expect(result).toBe("");
  });

  it("unified trigger digit suggests trigger finger release procedure", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find(
      (d) => d.id === "hand_dx_trigger_digit",
    );
    expect(dx).toBeDefined();
    expect(dx!.suggestedProcedures!.length).toBeGreaterThanOrEqual(1);
    const ids = dx!.suggestedProcedures!.map((p) => p.procedurePicklistId);
    expect(ids).toContain("hand_comp_trigger_finger");
  });

  it("unified trigger digit has hasStaging false (Quinnell handled per-digit client-side)", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find(
      (d) => d.id === "hand_dx_trigger_digit",
    );
    expect(dx).toBeDefined();
    expect(dx!.hasStaging).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// Post-traumatic Bone subcategory
// ═══════════════════════════════════════════════════════════

describe("Post-traumatic Bone subcategory", () => {
  const ptbDiagnoses = allElective.filter(
    (d) => d.subcategory === "Post-traumatic Bone",
  );

  it("has exactly 4 diagnoses", () => {
    expect(ptbDiagnoses).toHaveLength(4);
  });

  it("all diagnoses are clinicalGroup 'elective'", () => {
    for (const dx of ptbDiagnoses) {
      expect(dx.clinicalGroup).toBe("elective");
    }
  });

  it("contains expected diagnosis IDs", () => {
    const ids = ptbDiagnoses.map((d) => d.id);
    expect(ids).toContain("hand_dx_malunion_metacarpal_phalanx");
    expect(ids).toContain("hand_dx_malunion_distal_radius");
    expect(ids).toContain("hand_dx_nonunion_hand_wrist");
    expect(ids).toContain("hand_dx_symptomatic_hardware");
  });

  it("all diagnoses have procedure suggestions", () => {
    for (const dx of ptbDiagnoses) {
      expect(dx.suggestedProcedures.length).toBeGreaterThan(0);
    }
  });

  it("all suggested procedures reference valid procedure picklist IDs", () => {
    for (const dx of ptbDiagnoses) {
      for (const sp of dx.suggestedProcedures) {
        expect(procedureIds.has(sp.procedurePicklistId)).toBe(true);
      }
    }
  });

  it("malunion MC/phalanx defaults to corrective osteotomy hand", () => {
    const dx = ptbDiagnoses.find(
      (d) => d.id === "hand_dx_malunion_metacarpal_phalanx",
    )!;
    const defaultProcs = dx.suggestedProcedures.filter((p) => p.isDefault);
    expect(defaultProcs).toHaveLength(1);
    expect(defaultProcs[0].procedurePicklistId).toBe(
      "hand_elective_corrective_osteotomy_hand",
    );
  });

  it("malunion distal radius defaults to corrective osteotomy radius", () => {
    const dx = ptbDiagnoses.find(
      (d) => d.id === "hand_dx_malunion_distal_radius",
    )!;
    const defaultProcs = dx.suggestedProcedures.filter((p) => p.isDefault);
    expect(defaultProcs).toHaveLength(1);
    expect(defaultProcs[0].procedurePicklistId).toBe(
      "hand_elective_corrective_osteotomy_radius",
    );
  });

  it("non-union defaults to non-union repair", () => {
    const dx = ptbDiagnoses.find(
      (d) => d.id === "hand_dx_nonunion_hand_wrist",
    )!;
    const defaultProcs = dx.suggestedProcedures.filter((p) => p.isDefault);
    expect(defaultProcs).toHaveLength(1);
    expect(defaultProcs[0].procedurePicklistId).toBe(
      "hand_elective_nonunion_repair",
    );
  });

  it("symptomatic hardware defaults to hardware removal", () => {
    const dx = ptbDiagnoses.find(
      (d) => d.id === "hand_dx_symptomatic_hardware",
    )!;
    const defaultProcs = dx.suggestedProcedures.filter((p) => p.isDefault);
    expect(defaultProcs).toHaveLength(1);
    expect(defaultProcs[0].procedurePicklistId).toBe(
      "hand_elective_hardware_removal",
    );
  });

  it("old hand_dx_malunion_hand is removed from HAND_SURGERY_DIAGNOSES", () => {
    const ids = HAND_SURGERY_DIAGNOSES.map((d) => d.id);
    expect(ids).not.toContain("hand_dx_malunion_hand");
  });

  it("old hand_fx_corrective_osteotomy procedure is removed", () => {
    expect(procedureIds.has("hand_fx_corrective_osteotomy")).toBe(false);
  });

  it("scaphoid non-union remains in Joint & Degenerative (not moved)", () => {
    const scaphoidNu = HAND_SURGERY_DIAGNOSES.find(
      (d) => d.id === "hand_dx_scaphoid_nonunion_elective",
    );
    expect(scaphoidNu).toBeDefined();
    expect(scaphoidNu!.subcategory).toBe("Joint & Degenerative");
  });
});

// ═══════════════════════════════════════════════════════════
// Post-traumatic Bone procedure entries
// ═══════════════════════════════════════════════════════════

describe("Post-traumatic Bone procedures", () => {
  const ptbProcedureIds = [
    "hand_elective_corrective_osteotomy_hand",
    "hand_elective_corrective_osteotomy_radius",
    "hand_elective_ulna_shortening",
    "hand_elective_nonunion_repair",
    "hand_elective_bone_graft_hand",
    "hand_elective_hardware_removal",
  ];

  it.each(ptbProcedureIds)(
    "procedure '%s' exists in PROCEDURE_PICKLIST",
    (id) => {
      const proc = PROCEDURE_PICKLIST.find((p) => p.id === id);
      expect(proc).toBeDefined();
    },
  );

  it.each(ptbProcedureIds)(
    "procedure '%s' has correct subcategory and specialty",
    (id) => {
      const proc = PROCEDURE_PICKLIST.find((p) => p.id === id)!;
      expect(proc.subcategory).toBe("Post-traumatic Bone");
      expect(proc.specialties).toContain("hand_wrist");
    },
  );
});
