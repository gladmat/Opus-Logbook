/**
 * Medial Femoral Condyle (MFC) free flap tests.
 *
 * Covers:
 *   - All 4 tissue-composition values present in the picker (incl. new periosteum_only)
 *   - Default flap details now point at osteoperiosteal (the workhorse MFC harvest)
 *   - Procedure entry is reachable from hand_wrist, orthoplastic, and head_neck
 *   - Donor vessel auto-fill maps to descending genicular artery + vein
 *   - PICKLIST_TO_FLAP_TYPE resolves the head/neck picklist ID to the MFC flap type
 *   - Scaphoid non-union and Kienböck's surface MFC as a conditional suggestion
 */

import { describe, it, expect } from "vitest";
import {
  getDefaultFlapSpecificDetails,
  FLAP_DONOR_VESSELS,
} from "@/data/autoFillMappings";
import { FLAP_FIELD_CONFIG } from "@/data/flapFieldConfig";
import {
  PICKLIST_TO_FLAP_TYPE,
  PROCEDURE_PICKLIST,
} from "@/lib/procedurePicklist";
import { HAND_SURGERY_DIAGNOSES } from "@/lib/diagnosisPicklists/handSurgeryDiagnoses";

const MFC_PROCEDURE_ID = "hn_ff_medial_femoral_condyle";

describe("MFC tissue composition picker", () => {
  const config = FLAP_FIELD_CONFIG.medial_femoral_condyle;

  it("exposes the tissue composition field with select type", () => {
    expect(config).toBeDefined();
    const field = config!.find((f) => f.key === "mfcTissueComposition");
    expect(field).toBeDefined();
    expect(field!.type).toBe("select");
  });

  it("includes all four harvest modes", () => {
    const field = config!.find((f) => f.key === "mfcTissueComposition")!;
    const values = field.options!.map((o) => o.value).sort();
    expect(values).toEqual(
      [
        "bone_only",
        "osteocutaneous",
        "osteoperiosteal",
        "periosteum_only",
      ].sort(),
    );
  });

  it("uses clinically correct labels (no 'corticoperiosteal' applied to bone-only)", () => {
    const field = config!.find((f) => f.key === "mfcTissueComposition")!;
    const byValue = Object.fromEntries(
      field.options!.map((o) => [o.value, o.label]),
    );

    // bone + periosteum = corticoperiosteal (the workhorse MFC).
    expect(byValue.osteoperiosteal).toMatch(/corticoperiosteal/i);
    expect(byValue.osteoperiosteal).toMatch(/periosteum/i);

    // periosteum only is the new option.
    expect(byValue.periosteum_only).toMatch(/periosteum only/i);

    // chimeric with skin island.
    expect(byValue.osteocutaneous).toMatch(/skin island|chimeric/i);

    // bone_only is corticocancellous bone alone — must not claim to be corticoperiosteal.
    expect(byValue.bone_only).not.toMatch(/corticoperiosteal/i);
  });
});

describe("MFC default flap details", () => {
  it("defaults to osteoperiosteal (bone + periosteum) — the most common indication", () => {
    const defaults = getDefaultFlapSpecificDetails("medial_femoral_condyle");
    expect(defaults.mfcTissueComposition).toBe("osteoperiosteal");
    expect(defaults.mfcBoneSource).toBe("medial_condyle");
  });
});

describe("MFC donor vessels", () => {
  it("auto-fills the descending genicular pedicle", () => {
    const vessels = FLAP_DONOR_VESSELS.medial_femoral_condyle;
    expect(vessels.artery).toMatch(/descending genicular/i);
    expect(vessels.vein).toMatch(/descending genicular/i);
  });
});

describe("MFC procedure entry", () => {
  const entry = PROCEDURE_PICKLIST.find((p) => p.id === MFC_PROCEDURE_ID);

  it("exists in the procedure picklist", () => {
    expect(entry).toBeDefined();
  });

  it("is available in hand_wrist, orthoplastic, and head_neck", () => {
    expect(entry!.specialties).toContain("hand_wrist");
    expect(entry!.specialties).toContain("orthoplastic");
    expect(entry!.specialties).toContain("head_neck");
  });

  it("is tagged as a free flap with microsurgery", () => {
    expect(entry!.tags).toContain("free_flap");
    expect(entry!.tags).toContain("microsurgery");
    expect(entry!.hasFreeFlap).toBe(true);
  });

  it("resolves to the medial_femoral_condyle flap type", () => {
    expect(PICKLIST_TO_FLAP_TYPE[MFC_PROCEDURE_ID]).toBe(
      "medial_femoral_condyle",
    );
  });

  it("uses a specialty-agnostic subcategory (not head & neck-only)", () => {
    expect(entry!.subcategory).not.toMatch(/head\s*&?\s*neck/i);
  });

  it("carries the specific SNOMED code for vascularised bone graft with microsurgery (not the generic 'Reconstruction procedure' placeholder)", () => {
    expect(entry!.snomedCtCode).toBe("1204100003");
    expect(entry!.snomedCtDisplay).toMatch(/vascularised bone graft/i);
    expect(entry!.snomedCtDisplay).toMatch(/microsurgery/i);
  });
});

describe("MFC suggestion on hand diagnoses", () => {
  function findDiagnosis(id: string) {
    return HAND_SURGERY_DIAGNOSES.find((d) => d.id === id);
  }

  it("appears as a conditional suggestion for trauma scaphoid non-union", () => {
    const dx = findDiagnosis("hand_dx_scaphoid_nonunion");
    expect(dx).toBeDefined();
    const suggestion = dx!.suggestedProcedures?.find(
      (s) => s.procedurePicklistId === MFC_PROCEDURE_ID,
    );
    expect(suggestion).toBeDefined();
    expect(suggestion!.isConditional).toBe(true);
  });

  it("appears as a conditional suggestion for elective scaphoid non-union", () => {
    const dx = findDiagnosis("hand_dx_scaphoid_nonunion_elective");
    expect(dx).toBeDefined();
    const suggestion = dx!.suggestedProcedures?.find(
      (s) => s.procedurePicklistId === MFC_PROCEDURE_ID,
    );
    expect(suggestion).toBeDefined();
    expect(suggestion!.isConditional).toBe(true);
  });

  it("appears as a conditional suggestion for Kienböck's disease", () => {
    const dx = findDiagnosis("hand_dx_kienbock");
    expect(dx).toBeDefined();
    const suggestion = dx!.suggestedProcedures?.find(
      (s) => s.procedurePicklistId === MFC_PROCEDURE_ID,
    );
    expect(suggestion).toBeDefined();
    expect(suggestion!.isConditional).toBe(true);
  });

  it("scaphoid non-union surfaces MFC via 'medial femoral condyle' synonym search", () => {
    const dx = findDiagnosis("hand_dx_scaphoid_nonunion");
    const synonyms = dx!.searchSynonyms ?? [];
    const lower = synonyms.map((s) => s.toLowerCase());
    expect(
      lower.some((s) => s.includes("medial femoral condyle") || s === "mfc"),
    ).toBe(true);
  });
});
