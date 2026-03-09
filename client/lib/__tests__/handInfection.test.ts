import { describe, it, expect } from "vitest";
import {
  createDefaultHandInfectionDetails,
  generateHandInfectionSummary,
  isHandInfectionDiagnosis,
  countKanavelSigns,
  DIAGNOSIS_TO_INFECTION_TYPE,
  DIAGNOSIS_TO_DEFAULT_SEVERITY,
} from "@/types/handInfection";
import type { HandInfectionDetails, KanavelSigns } from "@/types/handInfection";
import {
  handInfectionToOverlay,
  overlayToHandInfection,
} from "@/lib/handInfectionBridge";
import type { InfectionOverlay } from "@/types/infection";

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function makeDetails(
  overrides: Partial<HandInfectionDetails> = {},
): HandInfectionDetails {
  return {
    infectionType: "superficial",
    affectedDigits: [],
    severity: "local",
    ...overrides,
  };
}

function makeOverlay(
  overrides: Partial<InfectionOverlay> = {},
): InfectionOverlay {
  return {
    id: "test-overlay",
    syndromePrimary: "skin_soft_tissue",
    region: "hand",
    laterality: "left",
    extent: "localized",
    severity: "local",
    icu: false,
    vasopressors: false,
    episodes: [],
    status: "active",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// createDefaultHandInfectionDetails
// ═══════════════════════════════════════════════════════════

describe("createDefaultHandInfectionDetails", () => {
  it("paronychia → superficial, local", () => {
    const d = createDefaultHandInfectionDetails("hand_dx_paronychia");
    expect(d.infectionType).toBe("superficial");
    expect(d.severity).toBe("local");
    expect(d.affectedDigits).toEqual([]);
  });

  it("flexor sheath infection → tendon_sheath, spreading", () => {
    const d = createDefaultHandInfectionDetails(
      "hand_dx_flexor_sheath_infection",
    );
    expect(d.infectionType).toBe("tendon_sheath");
    expect(d.severity).toBe("spreading");
  });

  it("necrotising fasciitis → necrotising, systemic", () => {
    const d = createDefaultHandInfectionDetails(
      "hand_dx_necrotising_fasciitis_hand",
    );
    expect(d.infectionType).toBe("necrotising");
    expect(d.severity).toBe("systemic");
  });

  it("fight bite → bite, local", () => {
    const d = createDefaultHandInfectionDetails("hand_dx_fight_bite");
    expect(d.infectionType).toBe("bite");
    expect(d.severity).toBe("local");
  });

  it("deep space infection → deep_space, spreading", () => {
    const d = createDefaultHandInfectionDetails(
      "hand_dx_deep_space_infection",
    );
    expect(d.infectionType).toBe("deep_space");
    expect(d.severity).toBe("spreading");
  });

  it("septic arthritis → joint, local", () => {
    const d = createDefaultHandInfectionDetails(
      "hand_dx_septic_arthritis_hand",
    );
    expect(d.infectionType).toBe("joint");
    expect(d.severity).toBe("local");
  });

  it("unknown diagnosis → superficial, local (defaults)", () => {
    const d = createDefaultHandInfectionDetails("hand_dx_unknown_thing");
    expect(d.infectionType).toBe("superficial");
    expect(d.severity).toBe("local");
  });

  it("all 10 diagnoses have mappings", () => {
    const diagnosisIds = Object.keys(DIAGNOSIS_TO_INFECTION_TYPE);
    expect(diagnosisIds).toHaveLength(10);
    for (const id of diagnosisIds) {
      expect(DIAGNOSIS_TO_DEFAULT_SEVERITY[id]).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════
// isHandInfectionDiagnosis
// ═══════════════════════════════════════════════════════════

describe("isHandInfectionDiagnosis", () => {
  it("returns true for infection diagnoses", () => {
    expect(isHandInfectionDiagnosis("hand_dx_paronychia")).toBe(true);
    expect(isHandInfectionDiagnosis("hand_dx_fight_bite")).toBe(true);
    expect(isHandInfectionDiagnosis("hand_dx_osteomyelitis_hand")).toBe(true);
  });

  it("returns false for non-infection acute diagnoses", () => {
    expect(isHandInfectionDiagnosis("hand_dx_foreign_body_hand")).toBe(false);
    expect(isHandInfectionDiagnosis("hand_dx_acute_cts")).toBe(false);
  });

  it("returns false for trauma diagnoses", () => {
    expect(isHandInfectionDiagnosis("hand_dx_distal_radius_fracture")).toBe(
      false,
    );
  });
});

// ═══════════════════════════════════════════════════════════
// countKanavelSigns
// ═══════════════════════════════════════════════════════════

describe("countKanavelSigns", () => {
  it("returns 0 for undefined", () => {
    expect(countKanavelSigns(undefined)).toBe(0);
  });

  it("returns 0 when all false", () => {
    const signs: KanavelSigns = {
      fusiformSwelling: false,
      flexedPosture: false,
      sheathTenderness: false,
      painOnPassiveExtension: false,
    };
    expect(countKanavelSigns(signs)).toBe(0);
  });

  it("returns 4 when all true", () => {
    const signs: KanavelSigns = {
      fusiformSwelling: true,
      flexedPosture: true,
      sheathTenderness: true,
      painOnPassiveExtension: true,
    };
    expect(countKanavelSigns(signs)).toBe(4);
  });

  it("counts correctly for partial signs", () => {
    const signs: KanavelSigns = {
      fusiformSwelling: true,
      flexedPosture: false,
      sheathTenderness: true,
      painOnPassiveExtension: false,
    };
    expect(countKanavelSigns(signs)).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════
// generateHandInfectionSummary
// ═══════════════════════════════════════════════════════════

describe("generateHandInfectionSummary", () => {
  it("returns null for undefined", () => {
    expect(generateHandInfectionSummary(undefined)).toBeNull();
  });

  it("basic superficial → 'Superficial'", () => {
    const result = generateHandInfectionSummary(makeDetails());
    expect(result).toBe("Superficial");
  });

  it("includes digits when ≤2", () => {
    const result = generateHandInfectionSummary(
      makeDetails({ affectedDigits: ["thumb", "index"] }),
    );
    expect(result).toBe("Superficial · Thumb, Index");
  });

  it("shows digit count when >2", () => {
    const result = generateHandInfectionSummary(
      makeDetails({
        affectedDigits: ["thumb", "index", "middle"],
      }),
    );
    expect(result).toBe("Superficial · 3 digits");
  });

  it("includes affected space", () => {
    const result = generateHandInfectionSummary(
      makeDetails({
        infectionType: "deep_space",
        affectedSpace: "thenar",
        severity: "spreading",
      }),
    );
    expect(result).toContain("Thenar space");
    expect(result).toContain("Spreading");
  });

  it("includes Kanavel count for tendon sheath", () => {
    const result = generateHandInfectionSummary(
      makeDetails({
        infectionType: "tendon_sheath",
        affectedDigits: ["index"],
        kanavelSigns: {
          fusiformSwelling: true,
          flexedPosture: true,
          sheathTenderness: true,
          painOnPassiveExtension: false,
        },
        severity: "spreading",
      }),
    );
    expect(result).toContain("Kanavel 3/4");
  });

  it("includes organism when not pending", () => {
    const result = generateHandInfectionSummary(
      makeDetails({ organism: "staph_aureus_mssa" }),
    );
    expect(result).toContain("S. aureus (MSSA)");
  });

  it("excludes pending organism", () => {
    const result = generateHandInfectionSummary(
      makeDetails({ organism: "pending" }),
    );
    expect(result).not.toContain("Pending");
  });

  it("excludes local severity (default)", () => {
    const result = generateHandInfectionSummary(
      makeDetails({ severity: "local" }),
    );
    expect(result).not.toContain("Local");
  });

  it("includes non-local severity", () => {
    const result = generateHandInfectionSummary(
      makeDetails({ severity: "systemic" }),
    );
    expect(result).toContain("Systemic (sepsis)");
  });

  it("full summary with all fields", () => {
    const result = generateHandInfectionSummary(
      makeDetails({
        infectionType: "tendon_sheath",
        affectedDigits: ["index"],
        kanavelSigns: {
          fusiformSwelling: true,
          flexedPosture: true,
          sheathTenderness: true,
          painOnPassiveExtension: true,
        },
        organism: "staph_aureus_mrsa",
        severity: "spreading",
      }),
    );
    expect(result).toBe(
      "Tendon sheath · Index · Kanavel 4/4 · S. aureus (MRSA) · Spreading",
    );
  });
});

// ═══════════════════════════════════════════════════════════
// handInfectionToOverlay
// ═══════════════════════════════════════════════════════════

describe("handInfectionToOverlay", () => {
  it("creates new overlay with correct syndrome mapping", () => {
    const overlay = handInfectionToOverlay(
      makeDetails({ infectionType: "tendon_sheath" }),
    );
    expect(overlay.syndromePrimary).toBe("deep_infection");
    expect(overlay.region).toBe("hand");
    expect(overlay.status).toBe("active");
  });

  it("maps severity correctly", () => {
    const local = handInfectionToOverlay(makeDetails({ severity: "local" }));
    expect(local.severity).toBe("local");
    expect(local.extent).toBe("localized");
    expect(local.icu).toBe(false);

    const spreading = handInfectionToOverlay(
      makeDetails({ severity: "spreading" }),
    );
    expect(spreading.severity).toBe("systemic_sepsis");
    expect(spreading.extent).toBe("regional");

    const systemic = handInfectionToOverlay(
      makeDetails({ severity: "systemic" }),
    );
    expect(systemic.severity).toBe("shock_icu");
    expect(systemic.extent).toBe("multi_compartment");
    expect(systemic.icu).toBe(true);
  });

  it("passes laterality to new overlay", () => {
    const overlay = handInfectionToOverlay(makeDetails(), undefined, "left");
    expect(overlay.laterality).toBe("left");
  });

  it("defaults laterality to 'na' when not provided", () => {
    const overlay = handInfectionToOverlay(makeDetails());
    expect(overlay.laterality).toBe("na");
  });

  it("builds microbiology from cultures", () => {
    const overlay = handInfectionToOverlay(
      makeDetails({
        culturesTaken: true,
        organism: "staph_aureus_mssa",
      }),
    );
    expect(overlay.microbiology?.culturesTaken).toBe(true);
    expect(overlay.microbiology?.cultureStatus).toBe("positive");
    expect(overlay.microbiology?.organisms).toHaveLength(1);
    expect(overlay.microbiology?.organisms?.[0]?.organismName).toBe(
      "S. aureus (MSSA)",
    );
  });

  it("handles pending culture status", () => {
    const overlay = handInfectionToOverlay(
      makeDetails({
        culturesTaken: true,
        organism: "pending",
      }),
    );
    expect(overlay.microbiology?.cultureStatus).toBe("pending");
    expect(overlay.microbiology?.organisms).toBeUndefined();
  });

  it("handles no growth", () => {
    const overlay = handInfectionToOverlay(
      makeDetails({
        culturesTaken: true,
        organism: "no_growth",
      }),
    );
    expect(overlay.microbiology?.cultureStatus).toBe("negative");
  });

  it("merges into existing overlay", () => {
    const existing = makeOverlay({ id: "keep-me", region: "hand" });
    const overlay = handInfectionToOverlay(
      makeDetails({ infectionType: "joint" }),
      existing,
    );
    expect(overlay.id).toBe("keep-me");
    expect(overlay.syndromePrimary).toBe("bone_joint");
  });
});

// ═══════════════════════════════════════════════════════════
// overlayToHandInfection
// ═══════════════════════════════════════════════════════════

describe("overlayToHandInfection", () => {
  it("maps syndrome back to infection type", () => {
    const details = overlayToHandInfection(
      makeOverlay({ syndromePrimary: "deep_infection" }),
    );
    expect(details.infectionType).toBe("deep_space");
  });

  it("maps severity back correctly", () => {
    const local = overlayToHandInfection(makeOverlay({ severity: "local" }));
    expect(local.severity).toBe("local");

    const spreading = overlayToHandInfection(
      makeOverlay({ severity: "systemic_sepsis" }),
    );
    expect(spreading.severity).toBe("spreading");

    const systemic = overlayToHandInfection(
      makeOverlay({ severity: "shock_icu" }),
    );
    expect(systemic.severity).toBe("systemic");
  });

  it("sets escalatedToFullModule to true", () => {
    const details = overlayToHandInfection(makeOverlay());
    expect(details.escalatedToFullModule).toBe(true);
  });

  it("reverse-maps organism from overlay microbiology", () => {
    const details = overlayToHandInfection(
      makeOverlay({
        microbiology: {
          culturesTaken: true,
          cultureStatus: "positive",
          organisms: [
            { id: "1", organismName: "S. aureus (MSSA)" },
          ],
        },
      }),
    );
    expect(details.organism).toBe("staph_aureus_mssa");
    expect(details.culturesTaken).toBe(true);
  });

  it("maps negative culture to no_growth", () => {
    const details = overlayToHandInfection(
      makeOverlay({
        microbiology: {
          culturesTaken: true,
          cultureStatus: "negative",
        },
      }),
    );
    expect(details.organism).toBe("no_growth");
  });

  it("maps pending culture to pending", () => {
    const details = overlayToHandInfection(
      makeOverlay({
        microbiology: {
          culturesTaken: true,
          cultureStatus: "pending",
        },
      }),
    );
    expect(details.organism).toBe("pending");
  });

  it("defaults unmapped syndrome to superficial", () => {
    const details = overlayToHandInfection(
      makeOverlay({ syndromePrimary: "central_line_associated" as any }),
    );
    expect(details.infectionType).toBe("superficial");
  });

  it("returns empty affectedDigits (not mappable from overlay)", () => {
    const details = overlayToHandInfection(makeOverlay());
    expect(details.affectedDigits).toEqual([]);
  });
});
