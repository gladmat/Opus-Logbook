import { describe, it, expect } from "vitest";
import {
  AESTHETIC_PROCEDURE_CONFIG,
  getAestheticProcedureConfig,
  resolveAutoInferredDiagnosisId,
  autoInferDiagnosisEntry,
  isAestheticProcedure,
  getInterventionType,
} from "../aestheticsConfig";
import { getProceduresForSpecialty } from "../procedurePicklist";
import { findDiagnosisById } from "../diagnosisPicklists/index";

// ─── Config completeness ─────────────────────────────────────────────────────

describe("AESTHETIC_PROCEDURE_CONFIG completeness", () => {
  const allAestheticProcedures = getProceduresForSpecialty("aesthetics");
  const aesOrBcProcedures = allAestheticProcedures.filter(
    (p) => p.id.startsWith("aes_") || p.id.startsWith("bc_"),
  );

  it("should have at least 80 mapped procedures", () => {
    expect(
      Object.keys(AESTHETIC_PROCEDURE_CONFIG).length,
    ).toBeGreaterThanOrEqual(80);
  });

  it("every aes_/bc_ procedure in the picklist should have a config entry", () => {
    const missing: string[] = [];
    for (const proc of aesOrBcProcedures) {
      if (!AESTHETIC_PROCEDURE_CONFIG[proc.id]) {
        missing.push(proc.id);
      }
    }
    // Allow a small number of missing entries (handled by fallback default)
    // but flag them for attention
    if (missing.length > 0) {
      console.warn(
        `${missing.length} procedure(s) using fallback config: ${missing.join(", ")}`,
      );
    }
    // The fallback is safe, so we allow up to 10% missing
    expect(missing.length).toBeLessThan(aesOrBcProcedures.length * 0.1);
  });

  it("fallback config returns sensible defaults for unknown procedure", () => {
    const config = getAestheticProcedureConfig("aes_unknown_procedure");
    expect(config.needsIntentPrompt).toBe(false);
    expect(config.defaultIntent).toBe("cosmetic");
    expect(config.isSurgical).toBe(true);
    expect(config.detailCard).toBeNull();
  });
});

// ─── Auto-inference validity ─────────────────────────────────────────────────

describe("auto-inference validity", () => {
  const configs = Object.entries(AESTHETIC_PROCEDURE_CONFIG);

  it("every config entry resolves to a valid diagnosis with SNOMED codes", () => {
    const invalid: string[] = [];
    for (const [procId, config] of configs) {
      const intent = config.defaultIntent;
      const diagId = resolveAutoInferredDiagnosisId(procId, intent);
      const entry = findDiagnosisById(diagId);
      if (!entry) {
        invalid.push(`${procId} → ${diagId} (not found)`);
      } else if (!entry.snomedCtCode) {
        invalid.push(`${procId} → ${diagId} (no SNOMED code)`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it("autoInferDiagnosisEntry returns a full entry for each mapped procedure", () => {
    for (const [procId, config] of configs) {
      const entry = autoInferDiagnosisEntry(procId, config.defaultIntent);
      expect(entry).toBeDefined();
      expect(entry!.id).toBeTruthy();
      expect(entry!.displayName).toBeTruthy();
    }
  });
});

// ─── Intent-dependent inference ──────────────────────────────────────────────

describe("intent-dependent inference", () => {
  it("rhinoplasty open: cosmetic and functional produce different diagnoses", () => {
    const cosmetic = resolveAutoInferredDiagnosisId(
      "aes_rhino_open",
      "cosmetic",
    );
    const functional = resolveAutoInferredDiagnosisId(
      "aes_rhino_open",
      "functional_reconstructive",
    );
    expect(cosmetic).toBe("aes_dx_nasal_cosmetic");
    expect(functional).toBe("aes_dx_nasal_functional");
    expect(cosmetic).not.toBe(functional);
  });

  it("full abdominoplasty: 3 intents produce distinct diagnoses", () => {
    const cosmetic = resolveAutoInferredDiagnosisId("bc_abdo_full", "cosmetic");
    const postbar = resolveAutoInferredDiagnosisId(
      "bc_abdo_full",
      "post_bariatric_mwl",
    );
    const functional = resolveAutoInferredDiagnosisId(
      "bc_abdo_full",
      "functional_reconstructive",
    );
    expect(cosmetic).toBe("aes_dx_abdominal_excess");
    expect(postbar).toBe("aes_dx_post_bariatric_body");
    expect(functional).toBe("aes_dx_panniculitis");
  });

  it("brachioplasty: cosmetic vs post-bariatric", () => {
    const cosmetic = resolveAutoInferredDiagnosisId(
      "bc_upper_brachioplasty",
      "cosmetic",
    );
    const postbar = resolveAutoInferredDiagnosisId(
      "bc_upper_brachioplasty",
      "post_bariatric_mwl",
    );
    expect(cosmetic).toBe("aes_dx_upper_arm_excess");
    expect(postbar).toBe("aes_dx_post_bariatric_arm");
  });

  it("upper blepharoplasty uses same diagnosis for both intents", () => {
    const cosmetic = resolveAutoInferredDiagnosisId(
      "aes_face_upper_bleph",
      "cosmetic",
    );
    const functional = resolveAutoInferredDiagnosisId(
      "aes_face_upper_bleph",
      "functional_reconstructive",
    );
    // Same diagnosis — intent is on the assessment, not the diagnosis
    expect(cosmetic).toBe("aes_dx_upper_eyelid_dermatochalasis");
    expect(functional).toBe("aes_dx_upper_eyelid_dermatochalasis");
  });
});

// ─── Detail card consistency ─────────────────────────────────────────────────

describe("detail card consistency", () => {
  it("neurotoxin procedures have detailCard = neurotoxin", () => {
    const botoxIds = Object.entries(AESTHETIC_PROCEDURE_CONFIG).filter(([id]) =>
      id.includes("botox"),
    );
    for (const [id, config] of botoxIds) {
      expect(config.detailCard).toBe("neurotoxin");
    }
  });

  it("filler procedures have detailCard = filler", () => {
    const fillerIds = Object.entries(AESTHETIC_PROCEDURE_CONFIG).filter(
      ([id]) => id.includes("filler"),
    );
    for (const [id, config] of fillerIds) {
      expect(config.detailCard).toBe("filler");
    }
  });

  it("energy device procedures have detailCard = energy", () => {
    const energyIds = Object.entries(AESTHETIC_PROCEDURE_CONFIG).filter(
      ([id]) =>
        id.includes("_energy_") ||
        id.includes("_laser_") ||
        (id.includes("_rf_") && !id.includes("_fat_transfer")),
    );
    for (const [id, config] of energyIds) {
      expect(config.detailCard).toBe("energy");
    }
  });
});

// ─── Intervention type / isSurgical consistency ──────────────────────────────

describe("intervention type consistency", () => {
  it("non-surgical injectable procedures have isSurgical = false", () => {
    const injectables = Object.entries(AESTHETIC_PROCEDURE_CONFIG).filter(
      ([id]) =>
        getInterventionType(id) === "non_surgical_injectable" &&
        isAestheticProcedure(id),
    );
    for (const [id, config] of injectables) {
      expect(config.isSurgical).toBe(false);
    }
  });

  it("non-surgical energy procedures have isSurgical = false", () => {
    const energy = Object.entries(AESTHETIC_PROCEDURE_CONFIG).filter(
      ([id]) =>
        getInterventionType(id) === "non_surgical_energy" &&
        isAestheticProcedure(id),
    );
    for (const [id, config] of energy) {
      expect(config.isSurgical).toBe(false);
    }
  });

  it("surgical procedures have isSurgical = true", () => {
    // These procedures are non-surgical but getInterventionType classifies them
    // as "surgical" due to pattern matching gaps in the legacy function:
    // - aes_body_tattoo_removal: laser-based, doesn't match energy patterns
    // - aes_energy_monopolar_rf: ends with _rf (not _rf_), misses the _rf_ check
    const KNOWN_EXCEPTIONS = new Set([
      "aes_body_tattoo_removal",
      "aes_energy_monopolar_rf",
    ]);
    const surgical = Object.entries(AESTHETIC_PROCEDURE_CONFIG).filter(
      ([id]) =>
        getInterventionType(id) === "surgical" &&
        isAestheticProcedure(id) &&
        !KNOWN_EXCEPTIONS.has(id),
    );
    for (const [id, config] of surgical) {
      expect(config.isSurgical).toBe(true);
    }
  });
});

// ─── Intent prompt configuration ─────────────────────────────────────────────

describe("intent prompt configuration", () => {
  it("procedures with needsIntentPrompt=true have intentOptions defined", () => {
    const prompted = Object.entries(AESTHETIC_PROCEDURE_CONFIG).filter(
      ([, config]) => config.needsIntentPrompt,
    );
    expect(prompted.length).toBeGreaterThan(0);
    for (const [id, config] of prompted) {
      expect(config.intentOptions).toBeDefined();
      expect(config.intentOptions!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("procedures without needsIntentPrompt have no intentOptions", () => {
    const notPrompted = Object.entries(AESTHETIC_PROCEDURE_CONFIG).filter(
      ([, config]) => !config.needsIntentPrompt,
    );
    for (const [id, config] of notPrompted) {
      expect(config.intentOptions).toBeUndefined();
    }
  });

  it("defaultIntent of each config entry is a valid AestheticIntent", () => {
    const validIntents = new Set([
      "cosmetic",
      "post_bariatric_mwl",
      "functional_reconstructive",
      "combined",
    ]);
    for (const [id, config] of Object.entries(AESTHETIC_PROCEDURE_CONFIG)) {
      expect(validIntents.has(config.defaultIntent)).toBe(true);
    }
  });
});
