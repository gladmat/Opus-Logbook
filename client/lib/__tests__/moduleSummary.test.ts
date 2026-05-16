/**
 * Module summary strings — generators that render a single-line chip-style
 * summary for each clinical-module data block, used in the case form's
 * collapsible-section headers and in CaseDetailScreen. Drift in these
 * strings is the surgeon-facing way "data exists but is hidden" leaks back
 * into the UI, so the tests lock contract for the formatting that downstream
 * components depend on (presence of unit suffix, count pluralisation, etc.).
 */

import { describe, it, expect } from "vitest";
import {
  generateFlapSummary,
  generateFractureSummary,
  generateHandTraumaSummary,
  generateHandTraumaAssessmentSummary,
  generateInfectionSummary,
  generateHandInfectionModuleSummary,
  generateWoundSummary,
  generateBreastSummary,
} from "@/lib/moduleSummary";
import type {
  FreeFlapDetails,
  FractureEntry,
  HandTraumaDetails,
} from "@/types/case";
import type { InfectionOverlay } from "@/types/infection";
import type { WoundAssessment } from "@/types/wound";
import type { HandInfectionDetails } from "@/types/handInfection";
import type { BreastAssessmentData } from "@/types/breast";

describe("generateFlapSummary", () => {
  it("returns null when no flap type is set", () => {
    expect(generateFlapSummary(undefined)).toBeNull();
    expect(generateFlapSummary({} as FreeFlapDetails)).toBeNull();
  });

  it("renders just the flap label when no side or ischaemia", () => {
    expect(generateFlapSummary({ flapType: "diep" })).toBe("DIEP");
  });

  it("includes side (Left/Right) when harvestSide is set", () => {
    expect(
      generateFlapSummary({ flapType: "alt", harvestSide: "left" }),
    ).toContain("Left");
    expect(
      generateFlapSummary({ flapType: "alt", harvestSide: "right" }),
    ).toContain("Right");
  });

  it("includes ischaemia minutes when ischemiaTimeMinutes > 0", () => {
    const r = generateFlapSummary({
      flapType: "alt",
      harvestSide: "left",
      ischemiaTimeMinutes: 42,
    });
    expect(r).toBe("ALT (Anterolateral Thigh), Left, ischaemia 42 min");
  });

  it("omits ischaemia when value is 0 or null", () => {
    expect(
      generateFlapSummary({
        flapType: "alt",
        ischemiaTimeMinutes: 0,
      }),
    ).not.toContain("ischaemia");
    expect(
      generateFlapSummary({
        flapType: "alt",
      }),
    ).not.toContain("ischaemia");
  });

  it("falls back to raw key for unknown flap types", () => {
    // Forced any-cast for the test — production would never hit this.
    const r = generateFlapSummary({
      flapType: "unknown_flap" as never,
    });
    expect(r).toContain("unknown_flap");
  });
});

describe("generateFractureSummary", () => {
  const fx = (id: string, ao: string, name: string): FractureEntry => ({
    id,
    boneId: `bone-${id}`,
    boneName: name,
    aoCode: ao,
    details: { familyCode: "23-A" },
  });

  it("returns null for undefined/empty arrays", () => {
    expect(generateFractureSummary(undefined)).toBeNull();
    expect(generateFractureSummary([])).toBeNull();
  });

  it("renders single fracture as 'AO-code Bone'", () => {
    expect(generateFractureSummary([fx("1", "23-A2.1", "Distal radius")])).toBe(
      "23-A2.1 Distal radius",
    );
  });

  it("appends '+N more' when multiple fractures", () => {
    expect(
      generateFractureSummary([
        fx("1", "23-A2.1", "Distal radius"),
        fx("2", "23-B2", "Distal radius"),
        fx("3", "23-C1", "Distal radius"),
      ]),
    ).toBe("23-A2.1 Distal radius + 2 more");
  });
});

describe("generateHandTraumaSummary", () => {
  it("returns null when injuredStructures is missing or empty", () => {
    expect(generateHandTraumaSummary(undefined)).toBeNull();
    expect(generateHandTraumaSummary({ injuredStructures: [] })).toBeNull();
  });

  it("renders 'displayName' alone when no digit and only one structure", () => {
    expect(
      generateHandTraumaSummary({
        injuredStructures: [
          {
            category: "flexor_tendon",
            structureId: "fdp-zone-2",
            displayName: "FDP Zone II",
          },
        ],
      }),
    ).toBe("FDP Zone II");
  });

  it("appends digit when present", () => {
    expect(
      generateHandTraumaSummary({
        injuredStructures: [
          {
            category: "flexor_tendon",
            structureId: "fdp-zone-2",
            displayName: "FDP Zone II",
            digit: "ring",
          },
        ],
      }),
    ).toBe("FDP Zone II, ring");
  });

  it("appends '+N more' for multiple structures", () => {
    expect(
      generateHandTraumaSummary({
        injuredStructures: [
          {
            category: "flexor_tendon",
            structureId: "fdp",
            displayName: "FDP Zone II",
            digit: "ring",
          },
          {
            category: "nerve",
            structureId: "digital",
            displayName: "Radial digital nerve",
          },
          {
            category: "artery",
            structureId: "digital_a",
            displayName: "Radial digital artery",
          },
          {
            category: "ligament",
            structureId: "vp",
            displayName: "Volar plate",
          },
        ],
      }),
    ).toBe("FDP Zone II, ring + 3 more");
  });
});

describe("generateHandTraumaAssessmentSummary", () => {
  it("returns null when no relevant data", () => {
    expect(
      generateHandTraumaAssessmentSummary(undefined, undefined),
    ).toBeNull();
    expect(generateHandTraumaAssessmentSummary({}, [])).toBeNull();
  });

  it("renders single fracture only", () => {
    const r = generateHandTraumaAssessmentSummary({}, [
      {
        id: "1",
        boneId: "scaphoid",
        boneName: "Scaphoid",
        aoCode: "72-A1",
        details: { familyCode: "72-A" },
      },
    ]);
    expect(r).toBe("72-A1 Scaphoid");
  });

  it("pluralises '+N fracture(s)' correctly", () => {
    const make = (n: number): FractureEntry[] =>
      Array.from({ length: n }, (_, i) => ({
        id: `f${i}`,
        boneId: "b",
        boneName: "Distal radius",
        aoCode: "23-A1",
        details: { familyCode: "23-A" },
      }));
    // 2 fractures → "+1 fracture" (singular)
    expect(generateHandTraumaAssessmentSummary({}, make(2))).toContain(
      "+1 fracture",
    );
    expect(generateHandTraumaAssessmentSummary({}, make(2))).not.toContain(
      "fractures",
    );
    // 3 fractures → "+2 fractures" (plural)
    expect(generateHandTraumaAssessmentSummary({}, make(3))).toContain(
      "+2 fractures",
    );
  });

  it("renders dislocations with friendly joint labels", () => {
    const r = generateHandTraumaAssessmentSummary(
      {
        dislocations: [
          { joint: "pip", digit: "index" },
          { joint: "thumb_cmc" },
        ],
      },
      undefined,
    );
    expect(r).toBe("PIP dislocation, +1 more");
  });

  it("renders special-injury flags as standalone parts", () => {
    const flags = {
      isHighPressureInjection: true,
      isFightBite: true,
      isCompartmentSyndrome: true,
      isRingAvulsion: true,
    };
    const r = generateHandTraumaAssessmentSummary(flags, undefined);
    expect(r).toContain("HPI");
    expect(r).toContain("Fight bite");
    expect(r).toContain("Compartment syndrome");
    expect(r).toContain("Ring avulsion");
  });

  it("renders amputation level with replantable suffix when applicable", () => {
    const r = generateHandTraumaAssessmentSummary(
      {
        digitAmputations: [
          {
            digit: "index",
            level: "distal_phalanx",
            type: "complete",
            isReplantable: true,
          },
        ],
      },
      undefined,
    );
    expect(r).toBe("Distal phalanx amputation (replantable)");
  });

  it("renders structures with digit suffix and '+N structure(s)' pluralisation", () => {
    const make = (n: number): HandTraumaDetails => ({
      injuredStructures: Array.from({ length: n }, (_, i) => ({
        category: "flexor_tendon",
        structureId: `s${i}`,
        displayName: i === 0 ? "FDP Zone II" : `FDP Zone ${i}`,
        digit: i === 0 ? "ring" : undefined,
      })),
    });
    // 2 structures → "+1 structure" singular
    expect(generateHandTraumaAssessmentSummary(make(2), undefined)).toContain(
      "+1 structure",
    );
    expect(
      generateHandTraumaAssessmentSummary(make(2), undefined),
    ).not.toContain("structures");
    // 3 structures → "+2 structures" plural
    expect(generateHandTraumaAssessmentSummary(make(3), undefined)).toContain(
      "+2 structures",
    );
    // Digit appended (note: uses space, not comma)
    expect(generateHandTraumaAssessmentSummary(make(1), undefined)).toBe(
      "FDP Zone II ring",
    );
  });

  it("falls back to affectedDigits only when no other parts populated", () => {
    expect(
      generateHandTraumaAssessmentSummary(
        { affectedDigits: ["thumb", "index"] },
        undefined,
      ),
    ).toBe("Digits: thumb, index");
  });

  it("does NOT show affectedDigits fallback when other parts present", () => {
    // affectedDigits is a fallback only — if any other field renders parts,
    // the affectedDigits line is intentionally suppressed to avoid noise.
    const r = generateHandTraumaAssessmentSummary(
      {
        affectedDigits: ["thumb", "index"],
        isFightBite: true,
      },
      undefined,
    );
    expect(r).toBe("Fight bite");
    expect(r).not.toContain("Digits");
  });

  it("combines fractures + dislocations + structures + flags in stable order", () => {
    const r = generateHandTraumaAssessmentSummary(
      {
        dislocations: [{ joint: "pip" }],
        isFightBite: true,
        injuredStructures: [
          {
            category: "flexor_tendon",
            structureId: "fdp",
            displayName: "FDP Zone II",
          },
        ],
      },
      [
        {
          id: "1",
          boneId: "dr",
          boneName: "Distal radius",
          aoCode: "23-A1",
          details: { familyCode: "23-A" },
        },
      ],
    );
    // Order: fractures → dislocations → flags → amputations → structures
    const parts = r!.split(", ");
    expect(parts[0]).toBe("23-A1 Distal radius");
    expect(parts[1]).toBe("PIP dislocation");
    expect(parts[2]).toBe("Fight bite");
    expect(parts[3]).toBe("FDP Zone II");
  });
});

describe("generateInfectionSummary", () => {
  const base = (over: Partial<InfectionOverlay> = {}): InfectionOverlay =>
    ({
      id: "inf-1",
      syndromePrimary: "skin_soft_tissue",
      region: "hand",
      laterality: "left",
      extent: "localized",
      severity: "local",
      icu: false,
      vasopressors: false,
      episodes: [],
      status: "active",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      ...over,
    }) as InfectionOverlay;

  it("returns null when no syndromePrimary", () => {
    expect(generateInfectionSummary(undefined)).toBeNull();
    expect(
      generateInfectionSummary({ syndromePrimary: undefined } as never),
    ).toBeNull();
  });

  it("composes syndrome + lowercased side + lowercased region", () => {
    const r = generateInfectionSummary(base());
    expect(r).toBe("Skin/Soft Tissue, left hand");
  });

  it("omits 'N/A' laterality and falls through to region", () => {
    expect(generateInfectionSummary(base({ laterality: "na" }))).toBe(
      "Skin/Soft Tissue, Hand",
    );
  });

  it("uses raw laterality label when region missing", () => {
    expect(
      generateInfectionSummary(
        base({ region: undefined as never, laterality: "bilateral" }),
      ),
    ).toBe("Skin/Soft Tissue, Bilateral");
  });

  it("appends '<N> episodes' with correct pluralisation", () => {
    const oneEp = base({
      episodes: [{} as never],
    });
    expect(generateInfectionSummary(oneEp)).toContain("1 episode");
    expect(generateInfectionSummary(oneEp)).not.toContain("episodes");

    const threeEps = base({
      episodes: [{}, {}, {}] as never,
    });
    expect(generateInfectionSummary(threeEps)).toContain("3 episodes");
  });
});

describe("generateHandInfectionModuleSummary", () => {
  // Thin re-export over types/handInfection.generateHandInfectionSummary —
  // we just sanity-check the wiring (the underlying logic owns its own tests).
  it("returns a string with the infection type when given valid details", () => {
    const r = generateHandInfectionModuleSummary({
      infectionType: "tendon_sheath",
      affectedDigits: ["index"],
      severity: "spreading",
    } as HandInfectionDetails);
    expect(typeof r).toBe("string");
    expect(r!.length).toBeGreaterThan(0);
  });

  it("returns null/empty for undefined", () => {
    const r = generateHandInfectionModuleSummary(undefined);
    expect(r === null || r === "").toBe(true);
  });
});

describe("generateWoundSummary", () => {
  it("returns null when no useful fields populated", () => {
    expect(generateWoundSummary(undefined)).toBeNull();
    expect(
      generateWoundSummary({ dressings: [] } as WoundAssessment),
    ).toBeNull();
  });

  it("renders L×W cm without depth", () => {
    expect(
      generateWoundSummary({
        lengthCm: 3.2,
        widthCm: 2.1,
        dressings: [],
      }),
    ).toBe("3.2 × 2.1 cm");
  });

  it("renders L×W×D when depth present", () => {
    expect(
      generateWoundSummary({
        lengthCm: 3,
        widthCm: 2,
        depthCm: 0.5,
        dressings: [],
      }),
    ).toBe("3 × 2 × 0.5 cm");
  });

  it("falls back to area cm² when L×W missing but areaCm2 present", () => {
    expect(
      generateWoundSummary({
        areaCm2: 8.5,
        tissueType: "granulating",
        dressings: [],
      }),
    ).toBe("Area: 8.5 cm², Granulating (Red)");
  });

  it("appends tissue type and healing trend labels", () => {
    expect(
      generateWoundSummary({
        lengthCm: 3,
        widthCm: 2,
        tissueType: "granulating",
        healingTrend: "improving",
        dressings: [],
      }),
    ).toBe("3 × 2 cm, Granulating (Red), Improving");
  });

  it("appends dressing count with pluralisation", () => {
    expect(
      generateWoundSummary({
        lengthCm: 3,
        widthCm: 2,
        dressings: [{} as never],
      }),
    ).toContain("1 dressing");
    expect(
      generateWoundSummary({
        lengthCm: 3,
        widthCm: 2,
        dressings: [{}, {}, {}] as never,
      }),
    ).toContain("3 dressings");
  });
});

describe("generateBreastSummary", () => {
  it("returns null for undefined input", () => {
    expect(generateBreastSummary(undefined)).toBeNull();
  });

  it("returns null when no per-side data populates anything", () => {
    expect(
      generateBreastSummary({
        laterality: "bilateral",
        sides: {},
      } as BreastAssessmentData),
    ).toBeNull();
  });

  it("renders per-side implant summary with L:/R: prefixes", () => {
    const r = generateBreastSummary({
      laterality: "bilateral",
      sides: {
        left: {
          side: "left",
          clinicalContext: "reconstructive",
          implantDetails: {
            deviceType: "permanent_implant",
            manufacturer: "allergan",
            volumeCc: 350,
            shape: "round",
            implantPlane: "dual_plane",
          },
        },
        right: {
          side: "right",
          clinicalContext: "aesthetic",
          implantDetails: {
            deviceType: "permanent_implant",
            manufacturer: "mentor",
            volumeCc: 370,
            shape: "anatomical",
            implantPlane: "subpectoral",
          },
        },
      },
    } as BreastAssessmentData);
    // Sides joined with " · "
    expect(r).toMatch(/^L: .+ · R: .+$/);
    expect(r).toContain("Allergan");
    expect(r).toContain("Mentor");
    expect(r).toContain("350cc");
    expect(r).toContain("370cc");
  });

  it("renders lipofilling fallback only when no implant/flap/masc and per-side volume present", () => {
    const r = generateBreastSummary({
      laterality: "bilateral",
      sides: {
        left: { side: "left", clinicalContext: "aesthetic" },
        right: { side: "right", clinicalContext: "aesthetic" },
      },
      lipofilling: {
        harvestSites: ["abdomen"],
        totalVolumeHarvestedMl: 200,
        injections: {
          left: { volumeInjectedMl: 80 },
        },
      },
    } as BreastAssessmentData);
    expect(r).toContain("L:");
    expect(r).toContain("80ml");
    // No R: because right side has no injection volume
    expect(r).not.toMatch(/R: /);
  });

  it("implant takes precedence over flap on the same side", () => {
    // Per the moduleSummary precedence ladder: implant → flap → masc → lipofilling.
    // If implantDetails is present, flap fields are ignored for the summary.
    const r = generateBreastSummary({
      laterality: "left",
      sides: {
        left: {
          side: "left",
          clinicalContext: "reconstructive",
          implantDetails: {
            deviceType: "permanent_implant",
            manufacturer: "allergan",
            volumeCc: 400,
          },
          flapDetails: {
            perforators: [{}, {}] as never,
            flapWeightGrams: 500,
          } as never,
        },
      },
    } as BreastAssessmentData);
    expect(r).toContain("L:");
    expect(r).toContain("Allergan");
    expect(r).toContain("400cc");
    expect(r).not.toContain("perforator");
    expect(r).not.toContain("500g");
  });
});
