import { describe, it, expect } from "vitest";
import { HAND_SURGERY_DIAGNOSES } from "@/lib/diagnosisPicklists/handSurgeryDiagnoses";
import { PROCEDURE_PICKLIST } from "@/lib/procedurePicklist";

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const allElective = HAND_SURGERY_DIAGNOSES.filter(
  (d) => d.clinicalGroup !== "trauma" && d.clinicalGroup !== "acute",
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
    "Compression Neuropathies",
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
    expect(allElective.length).toBeGreaterThanOrEqual(40);
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
  it("CMC1 OA has SNOMED code 202363001 (Eaton-Littler staging)", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === "hand_dx_cmc1_oa");
    expect(dx).toBeDefined();
    expect(dx!.snomedCtCode).toBe("202363001");
  });

  it("scaphoid non-union has SNOMED code 263225007 (Herbert staging)", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find(
      (d) => d.id === "hand_dx_scaphoid_nonunion_elective",
    );
    expect(dx).toBeDefined();
    expect(dx!.snomedCtCode).toBe("263225007");
  });

  it("Kienböck's has SNOMED code 30886002 (Lichtman staging)", () => {
    const dx = HAND_SURGERY_DIAGNOSES.find((d) => d.id === "hand_dx_kienbock");
    expect(dx).toBeDefined();
    expect(dx!.snomedCtCode).toBe("30886002");
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

  it.each(newProcedureIds)("procedure '%s' exists in PROCEDURE_PICKLIST", (id) => {
    const proc = PROCEDURE_PICKLIST.find((p) => p.id === id);
    expect(proc).toBeDefined();
  });

  it.each(newProcedureIds)(
    "procedure '%s' has required fields",
    (id) => {
      const proc = PROCEDURE_PICKLIST.find((p) => p.id === id)!;
      expect(proc.displayName).toBeTruthy();
      expect(proc.snomedCtCode).toBeTruthy();
      expect(proc.snomedCtDisplay).toBeTruthy();
      expect(proc.specialties).toContain("hand_wrist");
      expect(proc.subcategory).toBeTruthy();
    },
  );
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
    const proc = PROCEDURE_PICKLIST.find((p) => p.id === "hand_other_rheumatoid");
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
