/**
 * Procedure module config registry — defines per-specialty form field
 * blueprints (label, type, options, units, conditional visibility) consumed
 * by the legacy clinical-details forms and AI extraction prompts. This file
 * is mostly static data, but the contract matters: any specialty in the
 * `Specialty` union must resolve to a config (`getConfigForSpecialty`
 * indexes without a fallback), and `getDefaultClinicalDetails` must
 * deterministically seed every field key so partial saves don't drop
 * undefined keys.
 */

import { describe, it, expect } from "vitest";
import {
  BREAST_CONFIG,
  HAND_SURGERY_CONFIG,
  BODY_CONTOURING_CONFIG,
  ORTHOPLASTIC_CONFIG,
  HEAD_NECK_CONFIG,
  PROCEDURE_CONFIGS,
  getConfigForSpecialty,
  getDefaultClinicalDetails,
} from "@/lib/procedureConfig";
import type { Specialty } from "@/types/case";

const ALL_SPECIALTIES: Specialty[] = [
  "breast",
  "hand_wrist",
  "head_neck",
  "cleft_cranio",
  "skin_cancer",
  "orthoplastic",
  "burns",
  "lymphoedema",
  "body_contouring",
  "aesthetics",
  "peripheral_nerve",
  "general",
];

describe("PROCEDURE_CONFIGS registry", () => {
  it("contains exactly one entry for every Specialty union member", () => {
    expect(Object.keys(PROCEDURE_CONFIGS).sort()).toEqual(
      [...ALL_SPECIALTIES].sort(),
    );
  });

  it("every config has non-empty displayName, icon, and aiPrompt", () => {
    for (const sp of ALL_SPECIALTIES) {
      const cfg = PROCEDURE_CONFIGS[sp];
      expect(cfg.displayName.length).toBeGreaterThan(0);
      expect(cfg.icon.length).toBeGreaterThan(0);
      expect(typeof cfg.aiPrompt).toBe("string");
    }
  });

  it("config.id matches the registry key for every specialty EXCEPT aesthetics (legacy merge)", () => {
    // body_contouring was merged into aesthetics per CLAUDE.md; the
    // legacy BODY_CONTOURING_CONFIG instance is reused under both keys,
    // which means PROCEDURE_CONFIGS.aesthetics.id === "body_contouring".
    // Lock that quirk so any future "set id correctly" refactor must
    // also update this test deliberately.
    for (const sp of ALL_SPECIALTIES) {
      const cfg = PROCEDURE_CONFIGS[sp];
      if (sp === "aesthetics") {
        expect(cfg.id).toBe("body_contouring");
      } else {
        expect(cfg.id).toBe(sp);
      }
    }
  });

  it("every field has a unique key within its specialty", () => {
    for (const sp of ALL_SPECIALTIES) {
      const keys = PROCEDURE_CONFIGS[sp].fields.map((f) => f.key);
      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    }
  });

  it("every select field has a non-empty options array", () => {
    for (const sp of ALL_SPECIALTIES) {
      for (const field of PROCEDURE_CONFIGS[sp].fields) {
        if (field.type === "select") {
          expect(Array.isArray(field.options)).toBe(true);
          expect(field.options!.length).toBeGreaterThan(0);
          for (const opt of field.options!) {
            expect(opt.value.length).toBeGreaterThan(0);
            expect(opt.label.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("number fields declare keyboardType (numeric or decimal-pad)", () => {
    for (const sp of ALL_SPECIALTIES) {
      for (const field of PROCEDURE_CONFIGS[sp].fields) {
        if (field.type === "number") {
          expect(["numeric", "decimal-pad"]).toContain(field.keyboardType);
        }
      }
    }
  });
});

describe("BREAST_CONFIG", () => {
  it("declares laterality as required select with left/right/bilateral", () => {
    const lat = BREAST_CONFIG.fields.find((f) => f.key === "laterality")!;
    expect(lat.required).toBe(true);
    expect(lat.type).toBe("select");
    const values = lat.options!.map((o) => o.value).sort();
    expect(values).toEqual(["bilateral", "left", "right"]);
  });

  it("includes implantType and implantSizeCc as the implant fields", () => {
    const keys = BREAST_CONFIG.fields.map((f) => f.key);
    expect(keys).toContain("implantType");
    expect(keys).toContain("implantSizeCc");
  });

  it("implantSizeCc carries 'cc' unit and numeric keyboard", () => {
    const f = BREAST_CONFIG.fields.find((x) => x.key === "implantSizeCc")!;
    expect(f.type).toBe("number");
    expect(f.unit).toBe("cc");
    expect(f.keyboardType).toBe("numeric");
  });

  it("registered in PROCEDURE_CONFIGS under 'breast'", () => {
    expect(PROCEDURE_CONFIGS.breast).toBe(BREAST_CONFIG);
  });
});

describe("HAND_SURGERY_CONFIG", () => {
  it("exposes injuryMechanism with all 8 standard mechanisms", () => {
    const f = HAND_SURGERY_CONFIG.fields.find(
      (x) => x.key === "injuryMechanism",
    )!;
    expect(f.type).toBe("select");
    const values = f.options!.map((o) => o.value);
    // Order-sensitive: matches the UI chip order
    expect(values).toEqual([
      "fall",
      "crush",
      "saw_blade",
      "punch_assault",
      "sports",
      "mva",
      "work_related",
      "other",
    ]);
  });

  it("does not mark injuryMechanism required (open-ended hand entry)", () => {
    const f = HAND_SURGERY_CONFIG.fields.find(
      (x) => x.key === "injuryMechanism",
    )!;
    expect(f.required).toBeFalsy();
  });
});

describe("BODY_CONTOURING_CONFIG", () => {
  it("declares resectionWeightGrams and drainOutputMl as numeric fields", () => {
    const keys = BODY_CONTOURING_CONFIG.fields.map((f) => f.key);
    expect(keys).toEqual(["resectionWeightGrams", "drainOutputMl"]);
    for (const f of BODY_CONTOURING_CONFIG.fields) {
      expect(f.type).toBe("number");
    }
  });

  it("uses 'g' unit for resection weight and 'mL' for drains (avoid SI vs UI mismatch)", () => {
    const weight = BODY_CONTOURING_CONFIG.fields.find(
      (f) => f.key === "resectionWeightGrams",
    )!;
    expect(weight.unit).toBe("g");
    const drain = BODY_CONTOURING_CONFIG.fields.find(
      (f) => f.key === "drainOutputMl",
    )!;
    expect(drain.unit).toBe("mL");
  });

  it("aesthetics shares the body_contouring config object (legacy merge)", () => {
    // Per CLAUDE.md: body_contouring was merged into aesthetics. The legacy
    // category ID is still present in Specialty for backward compatibility,
    // and both keys point at the same config instance.
    expect(PROCEDURE_CONFIGS.aesthetics).toBe(BODY_CONTOURING_CONFIG);
    expect(PROCEDURE_CONFIGS.body_contouring).toBe(BODY_CONTOURING_CONFIG);
  });
});

describe("ORTHOPLASTIC_CONFIG", () => {
  it("exposes Gustilo-Anderson select with all 5 grades + N/A", () => {
    const f = ORTHOPLASTIC_CONFIG.fields.find(
      (x) => x.key === "gustiloAnderson",
    )!;
    expect(f.type).toBe("select");
    const values = f.options!.map((o) => o.value);
    expect(values).toEqual(["I", "II", "IIIa", "IIIb", "IIIc", "na"]);
  });

  it("ischemiaTimeMinutes is numeric with 'min' unit", () => {
    const f = ORTHOPLASTIC_CONFIG.fields.find(
      (x) => x.key === "ischemiaTimeMinutes",
    )!;
    expect(f.type).toBe("number");
    expect(f.unit).toBe("min");
    expect(f.keyboardType).toBe("numeric");
  });

  it("defectLocation and defectSizeCm are text fields with placeholders", () => {
    const loc = ORTHOPLASTIC_CONFIG.fields.find(
      (x) => x.key === "defectLocation",
    )!;
    expect(loc.type).toBe("text");
    expect(loc.placeholder).toBeTruthy();
    const size = ORTHOPLASTIC_CONFIG.fields.find(
      (x) => x.key === "defectSizeCm",
    )!;
    expect(size.type).toBe("text");
    expect(size.placeholder).toBeTruthy();
  });
});

describe("HEAD_NECK_CONFIG", () => {
  it("neckDissection has selective/modified_radical/radical levels", () => {
    const f = HEAD_NECK_CONFIG.fields.find((x) => x.key === "neckDissection")!;
    const values = f.options!.map((o) => o.value);
    expect(values).toContain("none");
    expect(values).toContain("selective");
    expect(values).toContain("modified_radical");
    expect(values).toContain("radical");
  });

  it("tracheostomy is boolean", () => {
    const f = HEAD_NECK_CONFIG.fields.find((x) => x.key === "tracheostomy")!;
    expect(f.type).toBe("boolean");
  });
});

describe("Cleft & Craniofacial config", () => {
  it("cleftType covers UCL/BCL/CP plus combined codes and craniosynostosis", () => {
    const cfg = PROCEDURE_CONFIGS.cleft_cranio;
    const cleft = cfg.fields.find((f) => f.key === "cleftType")!;
    const values = cleft.options!.map((o) => o.value);
    expect(values).toEqual([
      "ucl",
      "bcl",
      "cp",
      "uclp",
      "bclp",
      "craniosynostosis",
      "craniofacial",
    ]);
  });

  it("named technique field is open text with surgical-eponym examples in the placeholder", () => {
    const cfg = PROCEDURE_CONFIGS.cleft_cranio;
    const f = cfg.fields.find((x) => x.key === "namedTechnique")!;
    expect(f.type).toBe("text");
    // Should mention at least one famous cleft-lip technique in the
    // placeholder so the surgeon knows the field accepts eponyms.
    expect(f.placeholder).toMatch(/(Fisher|Millard|Furlow|Bardach)/);
  });

  it("estimatedBloodLossMl is numeric with 'mL' unit", () => {
    const cfg = PROCEDURE_CONFIGS.cleft_cranio;
    const f = cfg.fields.find((x) => x.key === "estimatedBloodLossMl")!;
    expect(f.type).toBe("number");
    expect(f.unit).toBe("mL");
  });
});

describe("Skin cancer + general configs share a histology pattern", () => {
  // Both specialties capture a basic histology + margins triplet for
  // pre-skin-cancer-module-era cases. The shared keys must stay aligned
  // so the legacy AI extraction prompts continue to map correctly.
  const sharedKeys = [
    "histologyDiagnosis",
    "peripheralMarginMm",
    "deepMarginMm",
    "excisionCompleteness",
  ];

  it("skin_cancer exposes the histology triplet", () => {
    const cfg = PROCEDURE_CONFIGS.skin_cancer;
    for (const key of sharedKeys) {
      expect(cfg.fields.find((f) => f.key === key)).toBeDefined();
    }
  });

  it("general exposes the same histology triplet", () => {
    const cfg = PROCEDURE_CONFIGS.general;
    for (const key of sharedKeys) {
      expect(cfg.fields.find((f) => f.key === key)).toBeDefined();
    }
  });

  it("margins use decimal-pad keyboard (sub-millimetre precision)", () => {
    const cfg = PROCEDURE_CONFIGS.skin_cancer;
    const peripheral = cfg.fields.find((f) => f.key === "peripheralMarginMm")!;
    expect(peripheral.keyboardType).toBe("decimal-pad");
    expect(peripheral.unit).toBe("mm");
    const deep = cfg.fields.find((f) => f.key === "deepMarginMm")!;
    expect(deep.keyboardType).toBe("decimal-pad");
    expect(deep.unit).toBe("mm");
  });

  it("excisionCompleteness has complete/incomplete/uncertain options", () => {
    const cfg = PROCEDURE_CONFIGS.skin_cancer;
    const f = cfg.fields.find((x) => x.key === "excisionCompleteness")!;
    const values = f.options!.map((o) => o.value).sort();
    expect(values).toEqual(["complete", "incomplete", "uncertain"]);
  });
});

describe("Specialty modules without per-specialty fields", () => {
  // burns / lymphoedema / peripheral_nerve own their domain through
  // specialty-specific assessment components rendered inline in the
  // diagnosis group editor — the legacy procedureConfig fields array is
  // intentionally empty for those.
  it("burns has empty fields (handled by BurnsAssessment)", () => {
    expect(PROCEDURE_CONFIGS.burns.fields).toEqual([]);
  });

  it("lymphoedema has empty fields (handled by LymphaticAssessment)", () => {
    expect(PROCEDURE_CONFIGS.lymphoedema.fields).toEqual([]);
  });

  it("peripheral_nerve has empty fields (handled by PeripheralNerveAssessment)", () => {
    expect(PROCEDURE_CONFIGS.peripheral_nerve.fields).toEqual([]);
    // Display name reflects the renamed category from the
    // Facial & Peripheral Nerve remediation.
    expect(PROCEDURE_CONFIGS.peripheral_nerve.displayName).toBe(
      "Facial & Peripheral Nerve",
    );
  });
});

describe("getConfigForSpecialty", () => {
  it("returns the corresponding config object for every Specialty value", () => {
    for (const sp of ALL_SPECIALTIES) {
      const cfg = getConfigForSpecialty(sp);
      // Identity check: must be the exact same object instance, not a copy.
      expect(cfg).toBe(PROCEDURE_CONFIGS[sp]);
    }
  });
});

describe("getDefaultClinicalDetails", () => {
  it("returns empty object for specialties with no fields", () => {
    expect(getDefaultClinicalDetails("burns")).toEqual({});
    expect(getDefaultClinicalDetails("lymphoedema")).toEqual({});
    expect(getDefaultClinicalDetails("peripheral_nerve")).toEqual({});
  });

  it("seeds boolean fields to false (not undefined)", () => {
    const r = getDefaultClinicalDetails("head_neck");
    expect(r.tracheostomy).toBe(false);
  });

  it("seeds text and select fields to empty string", () => {
    const r = getDefaultClinicalDetails("orthoplastic");
    expect(r.defectLocation).toBe("");
    expect(r.defectSizeCm).toBe("");
    expect(r.gustiloAnderson).toBe("");
  });

  it("seeds number fields to undefined (not 0 — preserves 'not entered' state)", () => {
    const r = getDefaultClinicalDetails("orthoplastic");
    expect(r.ischemiaTimeMinutes).toBeUndefined();
    expect("ischemiaTimeMinutes" in r).toBe(true);
  });

  it("seeds every field key (no missing entries)", () => {
    for (const sp of ALL_SPECIALTIES) {
      const cfg = PROCEDURE_CONFIGS[sp];
      const defaults = getDefaultClinicalDetails(sp);
      for (const field of cfg.fields) {
        expect(field.key in defaults).toBe(true);
      }
      expect(Object.keys(defaults).length).toBe(cfg.fields.length);
    }
  });

  it("seeds breast laterality select to empty string (cleared state)", () => {
    const r = getDefaultClinicalDetails("breast");
    expect(r.laterality).toBe("");
    expect(r.implantType).toBe("");
    expect(r.implantSizeCc).toBeUndefined();
  });
});
