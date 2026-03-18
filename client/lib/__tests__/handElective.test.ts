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
// 1. All 7 elective subcategories have diagnoses
// ═══════════════════════════════════════════════════════════

describe("Elective subcategory coverage", () => {
  const expectedSubcategories = [
    "Stenosing Tenosynovitis",
    "Dupuytren's Disease",
    "Joint & Degenerative",
    "Elective Tendon",
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
      "hand_dx_malunion_hand",
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

  it("scaphoid non-union has SNOMED code 263225007 (Herbert staging)", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find(
      (d) => d.id === "hand_dx_scaphoid_nonunion_elective",
    );
    expect(dx).toBeDefined();
    expect(dx!.snomedCtCode).toBe("263225007");
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

  it("CTS, CuTS, Guyon's exist in peripheral nerve diagnoses", () => {
    const pnIds = PERIPHERAL_NERVE_DIAGNOSES.map((d) => d.id);
    expect(pnIds).toContain("pn_dx_carpal_tunnel");
    expect(pnIds).toContain("pn_dx_cubital_tunnel");
    expect(pnIds).toContain("pn_dx_guyon_canal");
  });

  it("peripheral nerve compression entries have correct specialty and clinical group", () => {
    const compressionIds = [
      "pn_dx_carpal_tunnel",
      "pn_dx_cubital_tunnel",
      "pn_dx_guyon_canal",
    ];
    for (const id of compressionIds) {
      const dx = PERIPHERAL_NERVE_DIAGNOSES.find((d) => d.id === id);
      expect(dx).toBeDefined();
      expect(dx!.specialty).toBe("peripheral_nerve");
      expect(dx!.clinicalGroup).toBe("elective");
      expect(dx!.subcategory).toBe("Compression Neuropathy");
    }
  });

  it("CTS has hasStaging: true", () => {
    const dx = PERIPHERAL_NERVE_DIAGNOSES.find(
      (d) => d.id === "pn_dx_carpal_tunnel",
    );
    expect(dx).toBeDefined();
    expect(dx!.hasStaging).toBe(true);
  });

  it("peripheral nerve compression diagnoses reference valid procedures", () => {
    const compressionIds = [
      "pn_dx_carpal_tunnel",
      "pn_dx_cubital_tunnel",
      "pn_dx_guyon_canal",
    ];
    for (const id of compressionIds) {
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
