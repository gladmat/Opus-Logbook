/**
 * Peripheral Nerve SNOMED CT Audit tests
 *
 * Validates:
 *   - All diagnosis IDs are unique
 *   - All SNOMED codes are non-empty numeric strings
 *   - No remaining VERIFY comments (handled at file level)
 *   - All suggestedProcedures cross-reference to existing procedures
 *   - SNOMED display text is non-empty
 *   - Subcategory structure (compression, tumour, BP, neuroma)
 *   - Body region mapping
 *   - Legacy ID resolution
 *   - DIAGNOSIS_TO_NERVE completeness
 */

import { describe, it, expect } from "vitest";
import {
  PERIPHERAL_NERVE_DIAGNOSES,
  PN_HAND_CROSS_REF_IDS,
} from "@/lib/diagnosisPicklists/peripheralNerveDiagnoses";
import { PROCEDURE_PICKLIST } from "@/lib/procedurePicklist";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";
import {
  getBodyRegion,
  isNerveTumourDiagnosis,
  DIAGNOSIS_TO_NERVE,
  deriveInjuryPatternLabel,
} from "@/lib/peripheralNerveConfig";

describe("Peripheral nerve SNOMED CT audit", () => {
  it("all diagnosis IDs are unique", () => {
    const ids = PERIPHERAL_NERVE_DIAGNOSES.map((d) => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all diagnoses have non-empty SNOMED CT codes matching numeric pattern", () => {
    for (const dx of PERIPHERAL_NERVE_DIAGNOSES) {
      expect(dx.snomedCtCode, `${dx.id} should have snomedCtCode`).toBeTruthy();
      expect(
        /^\d+$/.test(dx.snomedCtCode ?? ""),
        `${dx.id} snomedCtCode "${dx.snomedCtCode}" should be numeric`,
      ).toBe(true);
    }
  });

  it("all diagnoses have non-empty SNOMED display text", () => {
    for (const dx of PERIPHERAL_NERVE_DIAGNOSES) {
      expect(
        dx.snomedCtDisplay,
        `${dx.id} should have snomedCtDisplay`,
      ).toBeTruthy();
      expect(
        (dx.snomedCtDisplay ?? "").length,
        `${dx.id} snomedCtDisplay should not be empty`,
      ).toBeGreaterThan(0);
    }
  });

  it("all suggested procedures reference existing procedure picklist entries", () => {
    const procedureIds = new Set(PROCEDURE_PICKLIST.map((p) => p.id));

    for (const dx of PERIPHERAL_NERVE_DIAGNOSES) {
      if (dx.suggestedProcedures) {
        for (const sp of dx.suggestedProcedures) {
          expect(
            procedureIds.has(sp.procedurePicklistId),
            `${dx.id} references procedure "${sp.procedurePicklistId}" which does not exist in the procedure picklist`,
          ).toBe(true);
        }
      }
    }
  });

  it("all native diagnoses have peripheralNerveModule: true", () => {
    for (const dx of PERIPHERAL_NERVE_DIAGNOSES) {
      // Cross-referenced diagnoses from other specialties don't need this flag
      if (dx.crossReferenceFrom) continue;
      expect(
        dx.peripheralNerveModule,
        `${dx.id} should have peripheralNerveModule: true`,
      ).toBe(true);
    }
  });

  it("brachial plexus diagnoses have brachialPlexusModule: true", () => {
    const bpDiagnoses = PERIPHERAL_NERVE_DIAGNOSES.filter((d) =>
      d.id.startsWith("pn_dx_bp_"),
    );
    expect(bpDiagnoses.length).toBeGreaterThan(0);
    for (const dx of bpDiagnoses) {
      expect(
        dx.brachialPlexusModule,
        `${dx.id} should have brachialPlexusModule: true`,
      ).toBe(true);
    }
  });

  it("neuroma diagnoses have neuromaModule: true", () => {
    const neuromaDiagnoses = PERIPHERAL_NERVE_DIAGNOSES.filter(
      (d) =>
        d.id.startsWith("pn_dx_neuroma_") || d.id === "pn_dx_morton_neuroma",
    );
    expect(neuromaDiagnoses.length).toBeGreaterThan(0);
    for (const dx of neuromaDiagnoses) {
      expect(dx.neuromaModule, `${dx.id} should have neuromaModule: true`).toBe(
        true,
      );
    }
  });

  it("tumour diagnoses have nerveTumourModule: true", () => {
    const tumourDiagnoses = PERIPHERAL_NERVE_DIAGNOSES.filter(
      (d) => d.subcategory === "Nerve Tumours",
    );
    expect(tumourDiagnoses.length).toBeGreaterThan(0);
    for (const dx of tumourDiagnoses) {
      expect(
        dx.nerveTumourModule,
        `${dx.id} should have nerveTumourModule: true`,
      ).toBe(true);
    }
  });

  it("compression neuropathy subcategory has 12 entries", () => {
    const compressionDx = PERIPHERAL_NERVE_DIAGNOSES.filter(
      (d) => d.subcategory === "Compression Neuropathies",
    );
    expect(compressionDx.length).toBe(12);
  });

  it("CTS and cubital tunnel exist with frozen SNOMED codes (Ontoserver-verified 2026-07-31)", () => {
    const cts = PERIPHERAL_NERVE_DIAGNOSES.find(
      (d) => d.id === "pn_dx_carpal_tunnel",
    );
    expect(cts?.snomedCtCode).toBe("57406009");
    expect(cts?.subcategory).toBe("Compression Neuropathies");
    expect(cts?.clinicalGroup).toBe("elective");
    expect(cts?.peripheralNerveModule).toBe(true);
    expect(
      cts?.suggestedProcedures?.find((p) => p.isDefault)?.procedurePicklistId,
    ).toBe("hand_comp_ctr_open");

    const cubital = PERIPHERAL_NERVE_DIAGNOSES.find(
      (d) => d.id === "pn_dx_cubital_tunnel",
    );
    expect(cubital?.snomedCtCode).toBe("230631009");
    expect(cubital?.subcategory).toBe("Compression Neuropathies");
    expect(cubital?.peripheralNerveModule).toBe(true);
    expect(
      cubital?.suggestedProcedures?.find((p) => p.isDefault)
        ?.procedurePicklistId,
    ).toBe("hand_comp_cubital_insitu");
  });

  it("every hand elective cross-reference ID resolves to a real PN diagnosis", () => {
    // Regression guard: these IDs previously pointed at non-existent entries,
    // so the HandElectivePicker cross-reference list was silently empty.
    const pnIds = new Set(PERIPHERAL_NERVE_DIAGNOSES.map((d) => d.id));
    for (const id of PN_HAND_CROSS_REF_IDS) {
      expect(pnIds.has(id), `${id} should exist in PN diagnoses`).toBe(true);
    }
  });

  it("facial nerve cross-references have crossReferenceFrom marker", () => {
    const facialXref = PERIPHERAL_NERVE_DIAGNOSES.filter(
      (d) => d.crossReferenceFrom === "head_neck",
    );
    expect(facialXref.length).toBeGreaterThan(0);
    for (const dx of facialXref) {
      expect(dx.id).toMatch(/^hn_/);
    }
  });

  it("7 subcategories exist in correct order", () => {
    const seen: string[] = [];
    for (const dx of PERIPHERAL_NERVE_DIAGNOSES) {
      if (dx.crossReferenceFrom) continue;
      if (dx.subcategory && !seen.includes(dx.subcategory)) {
        seen.push(dx.subcategory);
      }
    }
    expect(seen).toEqual([
      "Upper Extremity Nerve Injury",
      "Brachial Plexus",
      "Compression Neuropathies",
      "Lower Extremity Nerve Injury",
      "Neuroma",
      "Nerve Tumours",
    ]);
  });
});

describe("Peripheral nerve body region mapping", () => {
  it("upper extremity diagnoses map to upper_extremity", () => {
    const dx = PERIPHERAL_NERVE_DIAGNOSES.find(
      (d) => d.id === "pn_dx_median_nerve_injury",
    );
    expect(getBodyRegion(dx)).toBe("upper_extremity");
  });

  it("brachial plexus diagnoses map to brachial_plexus", () => {
    const dx = PERIPHERAL_NERVE_DIAGNOSES.find(
      (d) => d.id === "pn_dx_bp_traumatic",
    );
    expect(getBodyRegion(dx)).toBe("brachial_plexus");
  });

  it("compression diagnoses map to compression", () => {
    const dx = PERIPHERAL_NERVE_DIAGNOSES.find(
      (d) => d.id === "pn_dx_ain_syndrome",
    );
    expect(getBodyRegion(dx)).toBe("compression");
  });

  it("tumour diagnoses map to nerve_tumour", () => {
    const dx = PERIPHERAL_NERVE_DIAGNOSES.find(
      (d) => d.id === "pn_dx_schwannoma",
    );
    expect(getBodyRegion(dx)).toBe("nerve_tumour");
    expect(isNerveTumourDiagnosis(dx)).toBe(true);
  });

  it("lower extremity diagnoses map to lower_extremity", () => {
    const dx = PERIPHERAL_NERVE_DIAGNOSES.find(
      (d) => d.id === "pn_dx_sciatic_injury",
    );
    expect(getBodyRegion(dx)).toBe("lower_extremity");
  });

  it("undefined diagnosis returns any", () => {
    expect(getBodyRegion(undefined)).toBe("any");
  });
});

describe("Legacy diagnosis ID resolution", () => {
  it("old traction-pattern IDs resolve to pn_dx_bp_traumatic", () => {
    const legacyIds = [
      "pn_dx_bp_traction_upper",
      "pn_dx_bp_traction_extended",
      "pn_dx_bp_traction_complete",
      "pn_dx_bp_traction_lower",
      "pn_dx_bp_penetrating",
    ];
    for (const id of legacyIds) {
      const resolved = findDiagnosisById(id);
      expect(resolved, `${id} should resolve`).toBeTruthy();
      expect(resolved!.id).toBe("pn_dx_bp_traumatic");
    }
  });
});

describe("DIAGNOSIS_TO_NERVE mapping", () => {
  it("all mapped diagnosis IDs exist in PERIPHERAL_NERVE_DIAGNOSES", () => {
    const allIds = new Set(PERIPHERAL_NERVE_DIAGNOSES.map((d) => d.id));
    for (const dxId of Object.keys(DIAGNOSIS_TO_NERVE)) {
      expect(allIds.has(dxId), `${dxId} should exist in diagnoses`).toBe(true);
    }
  });

  it("maps named nerve injuries to correct nerve", () => {
    expect(DIAGNOSIS_TO_NERVE["pn_dx_median_nerve_injury"]).toBe("median");
    expect(DIAGNOSIS_TO_NERVE["pn_dx_ulnar_nerve_injury"]).toBe("ulnar");
    expect(DIAGNOSIS_TO_NERVE["pn_dx_radial_nerve_injury"]).toBe("radial");
    expect(DIAGNOSIS_TO_NERVE["pn_dx_sciatic_injury"]).toBe("sciatic");
  });
});

describe("deriveInjuryPatternLabel", () => {
  it("returns Upper (C5–C6, Erb) for C5+C6 involvement", () => {
    const label = deriveInjuryPatternLabel({
      C5: { injuryType: "rupture" },
      C6: { injuryType: "avulsion" },
    });
    expect(label).toBe("Upper (C5\u2013C6, Erb)");
  });

  it("returns Complete (C5–T1) for all roots", () => {
    const label = deriveInjuryPatternLabel({
      C5: { injuryType: "rupture" },
      C6: { injuryType: "rupture" },
      C7: { injuryType: "rupture" },
      C8: { injuryType: "rupture" },
      T1: { injuryType: "avulsion" },
    });
    expect(label).toBe("Complete (C5\u2013T1)");
  });

  it("returns undefined for no injured roots", () => {
    expect(deriveInjuryPatternLabel({})).toBeUndefined();
  });
});
