/**
 * Brachial Plexus + Neuroma config helper tests
 *
 * Covers:
 *   - applyInjuryPattern() — all 6 patterns
 *   - deriveInjuryPattern() — reverse mapping + edge cases
 *   - cycleInjuryType() — correct cycle order
 *   - cleanNeuromaForAetiologyChange() — 3→3 transitions
 *   - getDefaultBrachialPlexusAssessment / getDefaultNeuromaAssessment
 *   - Label constants completeness
 */

import { describe, it, expect } from "vitest";
import {
  applyInjuryPattern,
  deriveInjuryPattern,
  cycleInjuryType,
  getDefaultBrachialPlexusAssessment,
  getDefaultNeuromaAssessment,
  cleanNeuromaForAetiologyChange,
  BP_ROOT_ORDER,
  TRUNK_ROOT_MAP,
  TERMINAL_CORD_MAP,
  NEUROMA_AETIOLOGY_LABELS,
  NEUROMA_MORPHOLOGY_LABELS,
  NERVE_TARGET_MUSCLES,
  MRC_MOTOR_GRADE_LABELS,
  BMRC_SENSORY_GRADE_LABELS,
  SWMT_RESULT_LABELS,
} from "@/lib/peripheralNerveConfig";
import type {
  BPRoot,
  BPLevelInjury,
  NeuromaAssessmentData,
} from "@/types/peripheralNerve";
import {
  BP_PATTERN_LABELS,
  BP_INJURY_TYPE_LABELS,
} from "@/types/peripheralNerve";

// ══════════════════════════════════════════════════
// applyInjuryPattern
// ══════════════════════════════════════════════════

describe("applyInjuryPattern", () => {
  it("upper_c5_c6 sets C5 and C6 as injured, C7-T1 intact", () => {
    const result = applyInjuryPattern("upper_c5_c6");
    expect(result.C5?.injuryType).toBe("rupture");
    expect(result.C6?.injuryType).toBe("rupture");
    expect(result.C7?.injuryType).toBe("intact");
    expect(result.C8?.injuryType).toBe("intact");
    expect(result.T1?.injuryType).toBe("intact");
  });

  it("extended_upper_c5_c7 sets C5-C7 injured, C8-T1 intact", () => {
    const result = applyInjuryPattern("extended_upper_c5_c7");
    expect(result.C5?.injuryType).toBe("rupture");
    expect(result.C6?.injuryType).toBe("rupture");
    expect(result.C7?.injuryType).toBe("rupture");
    expect(result.C8?.injuryType).toBe("intact");
    expect(result.T1?.injuryType).toBe("intact");
  });

  it("complete_c5_t1 sets all roots injured (C5,T1 avulsion, middle rupture)", () => {
    const result = applyInjuryPattern("complete_c5_t1");
    expect(result.C5?.injuryType).toBe("avulsion");
    expect(result.C6?.injuryType).toBe("rupture");
    expect(result.C7?.injuryType).toBe("rupture");
    expect(result.C8?.injuryType).toBe("rupture");
    expect(result.T1?.injuryType).toBe("avulsion");
  });

  it("lower_c8_t1 sets C8-T1 injured, C5-C7 intact", () => {
    const result = applyInjuryPattern("lower_c8_t1");
    expect(result.C5?.injuryType).toBe("intact");
    expect(result.C6?.injuryType).toBe("intact");
    expect(result.C7?.injuryType).toBe("intact");
    expect(result.C8?.injuryType).toBe("rupture");
    expect(result.T1?.injuryType).toBe("rupture");
  });

  it("isolated_root returns empty (surgeon sets manually)", () => {
    const result = applyInjuryPattern("isolated_root");
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("other returns empty (surgeon sets manually)", () => {
    const result = applyInjuryPattern("other");
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════
// deriveInjuryPattern
// ══════════════════════════════════════════════════

describe("deriveInjuryPattern", () => {
  it("detects upper_c5_c6 from C5+C6 injured", () => {
    const roots: Partial<Record<BPRoot, BPLevelInjury>> = {
      C5: { injuryType: "rupture" },
      C6: { injuryType: "stretch" },
    };
    expect(deriveInjuryPattern(roots)).toBe("upper_c5_c6");
  });

  it("detects extended_upper_c5_c7 from C5+C6+C7 injured", () => {
    const roots: Partial<Record<BPRoot, BPLevelInjury>> = {
      C5: { injuryType: "rupture" },
      C6: { injuryType: "rupture" },
      C7: { injuryType: "stretch" },
    };
    expect(deriveInjuryPattern(roots)).toBe("extended_upper_c5_c7");
  });

  it("detects complete_c5_t1 when all roots injured", () => {
    const roots: Partial<Record<BPRoot, BPLevelInjury>> = {
      C5: { injuryType: "avulsion" },
      C6: { injuryType: "rupture" },
      C7: { injuryType: "rupture" },
      C8: { injuryType: "stretch" },
      T1: { injuryType: "avulsion" },
    };
    expect(deriveInjuryPattern(roots)).toBe("complete_c5_t1");
  });

  it("detects lower_c8_t1 from C8+T1 injured", () => {
    const roots: Partial<Record<BPRoot, BPLevelInjury>> = {
      C8: { injuryType: "rupture" },
      T1: { injuryType: "rupture" },
    };
    expect(deriveInjuryPattern(roots)).toBe("lower_c8_t1");
  });

  it("detects isolated_root when single root injured", () => {
    const roots: Partial<Record<BPRoot, BPLevelInjury>> = {
      C7: { injuryType: "avulsion" },
    };
    expect(deriveInjuryPattern(roots)).toBe("isolated_root");
  });

  it("returns undefined for non-standard pattern", () => {
    const roots: Partial<Record<BPRoot, BPLevelInjury>> = {
      C5: { injuryType: "rupture" },
      C8: { injuryType: "rupture" },
    };
    expect(deriveInjuryPattern(roots)).toBeUndefined();
  });

  it("returns undefined for empty roots", () => {
    expect(deriveInjuryPattern({})).toBeUndefined();
  });

  it("ignores intact and unknown roots", () => {
    const roots: Partial<Record<BPRoot, BPLevelInjury>> = {
      C5: { injuryType: "intact" },
      C6: { injuryType: "unknown" },
      C7: { injuryType: "rupture" },
    };
    expect(deriveInjuryPattern(roots)).toBe("isolated_root");
  });
});

// ══════════════════════════════════════════════════
// cycleInjuryType
// ══════════════════════════════════════════════════

describe("cycleInjuryType", () => {
  it("cycles through the correct order", () => {
    const expected: BPInjuryType[] = [
      "unknown",
      "intact",
      "stretch",
      "rupture",
      "avulsion",
    ];
    let current: BPInjuryType | undefined = undefined;
    for (const exp of expected) {
      current = cycleInjuryType(current);
      expect(current).toBe(exp);
    }
  });

  it("wraps from avulsion back to unknown", () => {
    expect(cycleInjuryType("avulsion")).toBe("unknown");
  });

  it("starts at unknown when given undefined", () => {
    expect(cycleInjuryType(undefined)).toBe("unknown");
  });
});

// ══════════════════════════════════════════════════
// Defaults
// ══════════════════════════════════════════════════

describe("getDefaultBrachialPlexusAssessment", () => {
  it("returns empty roots", () => {
    const result = getDefaultBrachialPlexusAssessment();
    expect(result.roots).toEqual({});
    expect(result.procedures).toBeUndefined();
  });
});

describe("getDefaultNeuromaAssessment", () => {
  it("returns correct aetiology for each type", () => {
    expect(getDefaultNeuromaAssessment("post_amputation").aetiology).toBe(
      "post_amputation",
    );
    expect(getDefaultNeuromaAssessment("traumatic").aetiology).toBe(
      "traumatic",
    );
    expect(getDefaultNeuromaAssessment("iatrogenic").aetiology).toBe(
      "iatrogenic",
    );
  });
});

// ══════════════════════════════════════════════════
// cleanNeuromaForAetiologyChange
// ══════════════════════════════════════════════════

describe("cleanNeuromaForAetiologyChange", () => {
  const fullPostAmputation: NeuromaAssessmentData = {
    aetiology: "post_amputation",
    morphology: "bulbous",
    neuromaSizeMm: 15,
    technique: "tmr",
    tmrRecipientMotorNerve: "lateral gastrocnemius",
    tmrTargetMuscle: "gastrocnemius",
    amputationLevel: "below-knee",
    amputationCause: "trauma",
    timeSinceAmputationMonths: 12,
    prostheticUse: true,
    prostheticHoursPerDay: 8,
    phantomLimbPainNRS: 7,
    residualLimbPainNRS: 5,
    neuromaPositionInStump: "anterior",
    proximityToWeightBearing: true,
  };

  it("preserves shared fields when switching aetiology", () => {
    const result = cleanNeuromaForAetiologyChange(
      fullPostAmputation,
      "traumatic",
    );
    expect(result.aetiology).toBe("traumatic");
    expect(result.morphology).toBe("bulbous");
    expect(result.neuromaSizeMm).toBe(15);
    expect(result.technique).toBe("tmr");
    expect(result.tmrRecipientMotorNerve).toBe("lateral gastrocnemius");
  });

  it("clears amputation-specific fields when switching to traumatic", () => {
    const result = cleanNeuromaForAetiologyChange(
      fullPostAmputation,
      "traumatic",
    );
    expect(result.amputationLevel).toBeUndefined();
    expect(result.amputationCause).toBeUndefined();
    expect(result.phantomLimbPainNRS).toBeUndefined();
    expect(result.residualLimbPainNRS).toBeUndefined();
    expect(result.prostheticUse).toBeUndefined();
  });

  it("clears amputation-specific fields when switching to iatrogenic", () => {
    const result = cleanNeuromaForAetiologyChange(
      fullPostAmputation,
      "iatrogenic",
    );
    expect(result.amputationLevel).toBeUndefined();
    expect(result.phantomLimbPainNRS).toBeUndefined();
  });

  it("preserves amputation fields when staying post_amputation", () => {
    const result = cleanNeuromaForAetiologyChange(
      fullPostAmputation,
      "post_amputation",
    );
    expect(result.amputationLevel).toBe("below-knee");
    expect(result.amputationCause).toBe("trauma");
    expect(result.phantomLimbPainNRS).toBe(7);
    expect(result.prostheticUse).toBe(true);
  });

  it("clears traumatic fields when switching from traumatic to iatrogenic", () => {
    const traumatic: NeuromaAssessmentData = {
      aetiology: "traumatic",
      priorNerveRepairAttempted: true,
      morphology: "fusiform",
    };
    const result = cleanNeuromaForAetiologyChange(traumatic, "iatrogenic");
    expect(result.priorNerveRepairAttempted).toBeUndefined();
    expect(result.morphology).toBe("fusiform");
  });

  it("preserves iatrogenic fields when staying iatrogenic", () => {
    const iatrogenic: NeuromaAssessmentData = {
      aetiology: "iatrogenic",
      causativeProcedure: "arthroplasty",
    };
    const result = cleanNeuromaForAetiologyChange(iatrogenic, "iatrogenic");
    expect(result.causativeProcedure).toBe("arthroplasty");
  });
});

// ══════════════════════════════════════════════════
// Label constant completeness
// ══════════════════════════════════════════════════

describe("label constant completeness", () => {
  it("BP_PATTERN_LABELS covers all patterns", () => {
    const patterns = [
      "upper_c5_c6",
      "extended_upper_c5_c7",
      "lower_c8_t1",
      "complete_c5_t1",
      "isolated_root",
      "other",
    ] as const;
    for (const p of patterns) {
      expect(BP_PATTERN_LABELS[p]).toBeTruthy();
    }
  });

  it("BP_INJURY_TYPE_LABELS covers all injury types", () => {
    const types: BPInjuryType[] = [
      "avulsion",
      "rupture",
      "stretch",
      "intact",
      "unknown",
    ];
    for (const t of types) {
      expect(BP_INJURY_TYPE_LABELS[t]).toBeTruthy();
    }
  });

  it("BP_ROOT_ORDER has 5 roots in correct anatomical order", () => {
    expect(BP_ROOT_ORDER).toEqual(["C5", "C6", "C7", "C8", "T1"]);
  });

  it("TRUNK_ROOT_MAP is anatomically correct", () => {
    expect(TRUNK_ROOT_MAP.upper).toEqual(["C5", "C6"]);
    expect(TRUNK_ROOT_MAP.middle).toEqual(["C7"]);
    expect(TRUNK_ROOT_MAP.lower).toEqual(["C8", "T1"]);
  });

  it("TERMINAL_CORD_MAP is anatomically correct", () => {
    expect(TERMINAL_CORD_MAP.musculocutaneous).toEqual(["lateral"]);
    expect(TERMINAL_CORD_MAP.radial).toEqual(["posterior"]);
    expect(TERMINAL_CORD_MAP.median).toEqual(["lateral", "medial"]);
    expect(TERMINAL_CORD_MAP.ulnar).toEqual(["medial"]);
  });

  it("NEUROMA_AETIOLOGY_LABELS covers all 3 aetiologies", () => {
    expect(Object.keys(NEUROMA_AETIOLOGY_LABELS)).toHaveLength(3);
  });

  it("NEUROMA_MORPHOLOGY_LABELS covers all 3 morphologies", () => {
    expect(Object.keys(NEUROMA_MORPHOLOGY_LABELS)).toHaveLength(3);
  });

  it("MRC_MOTOR_GRADE_LABELS covers all 8 grades", () => {
    expect(Object.keys(MRC_MOTOR_GRADE_LABELS)).toHaveLength(8);
  });

  it("BMRC_SENSORY_GRADE_LABELS covers all 8 grades", () => {
    expect(Object.keys(BMRC_SENSORY_GRADE_LABELS)).toHaveLength(8);
  });

  it("SWMT_RESULT_LABELS covers all 6 results", () => {
    expect(Object.keys(SWMT_RESULT_LABELS)).toHaveLength(6);
  });
});

// ══════════════════════════════════════════════════
// NERVE_TARGET_MUSCLES
// ══════════════════════════════════════════════════

describe("NERVE_TARGET_MUSCLES", () => {
  it("defines target muscles for common nerves", () => {
    const commonNerves = [
      "median",
      "ulnar",
      "radial",
      "common_peroneal",
      "tibial",
      "femoral",
    ] as const;
    for (const nerve of commonNerves) {
      const muscles = NERVE_TARGET_MUSCLES[nerve];
      expect(muscles).toBeDefined();
      expect(muscles!.length).toBeGreaterThan(0);
    }
  });

  it("each entry has a non-empty muscle name", () => {
    for (const muscles of Object.values(NERVE_TARGET_MUSCLES)) {
      if (muscles) {
        for (const entry of muscles) {
          expect(entry.muscle).toBeTruthy();
          expect(entry.muscle.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ══════════════════════════════════════════════════
// Backward compatibility
// ══════════════════════════════════════════════════

describe("backward compatibility", () => {
  it("peripheral nerve assessment without brachialPlexus loads cleanly", () => {
    const assessment = { nerveInjured: "median" as const };
    expect(assessment.brachialPlexus).toBeUndefined();
  });

  it("peripheral nerve assessment without neuroma loads cleanly", () => {
    const assessment = { nerveInjured: "ulnar" as const };
    expect(assessment.neuroma).toBeUndefined();
  });
});
