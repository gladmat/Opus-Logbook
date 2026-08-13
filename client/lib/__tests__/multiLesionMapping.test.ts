/**
 * multiLesionMapping — aggregation helpers behind MultiLesionSummaryPanel,
 * plus the multi-lesion branch of the save-time accept-mapping guard
 * (validateRequiredFields). Regression suite for the bug where multi-lesion
 * skin cancer groups could never be saved: the accept UI was unmounted in
 * multi-lesion mode while the Phase-7 gate still demanded
 * procedureSuggestionSource === "skinCancer".
 */

import { describe, it, expect } from "vitest";
import {
  anyLesionHasSubstantiveAssessment,
  buildMultiLesionHeadline,
  buildMultiLesionKeyFacts,
  buildMultiLesionSuggestionItems,
  getLesionShortLabel,
  hasSubstantiveSkinCancerAssessment,
  resolvePrimaryMultiLesionDiagnosis,
} from "@/lib/multiLesionMapping";
import { getAcceptMappingErrors } from "@/lib/acceptMappingGuard";
import type { DiagnosisGroup, LesionInstance } from "@/types/case";
import type { SkinCancerLesionAssessment } from "@/types/skinCancer";

const bccAssessment: SkinCancerLesionAssessment = {
  pathwayStage: "histology_known",
  site: "Nose",
  clinicalSuspicion: "bcc",
  priorHistology: {
    source: "external_biopsy",
    pathologyCategory: "bcc",
  },
} as SkinCancerLesionAssessment;

function makeLesion(overrides: Partial<LesionInstance> = {}): LesionInstance {
  return {
    id: overrides.id ?? "lesion-1",
    site: "",
    pathologyType: "other",
    reconstruction: "primary_closure",
    marginStatus: "pending",
    histologyConfirmed: false,
    ...overrides,
  } as LesionInstance;
}

describe("hasSubstantiveSkinCancerAssessment", () => {
  it("rejects null/undefined and the default-shape blob", () => {
    expect(hasSubstantiveSkinCancerAssessment(undefined)).toBe(false);
    expect(hasSubstantiveSkinCancerAssessment(null)).toBe(false);
    expect(
      hasSubstantiveSkinCancerAssessment({} as SkinCancerLesionAssessment),
    ).toBe(false);
  });

  it("accepts any touched signal", () => {
    expect(
      hasSubstantiveSkinCancerAssessment({
        pathwayStage: "excision_biopsy",
      } as SkinCancerLesionAssessment),
    ).toBe(true);
    expect(
      hasSubstantiveSkinCancerAssessment({
        site: "Cheek",
      } as SkinCancerLesionAssessment),
    ).toBe(true);
  });
});

describe("buildMultiLesionSuggestionItems", () => {
  const lesions = [
    makeLesion({ id: "l1", site: "Nose", skinCancerAssessment: bccAssessment }),
    makeLesion({ id: "l2" }), // blank — contributes nothing
    makeLesion({
      id: "l3",
      skinCancerAssessment: {
        ...bccAssessment,
        site: undefined,
      } as SkinCancerLesionAssessment,
    }),
  ];

  it("emits rows only for lesions with substantive assessments", () => {
    const items = buildMultiLesionSuggestionItems(lesions);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.lesionId !== "l2")).toBe(true);
  });

  it("uses composite unique keys and lesion-labelled display names", () => {
    const items = buildMultiLesionSuggestionItems(lesions);
    const keys = items.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const item of items.filter((i) => i.lesionId === "l1")) {
      expect(item.key).toBe(`l1::${item.procedurePicklistId}`);
      expect(item.displayName.endsWith("— Nose")).toBe(true);
    }
    // Site-less lesion falls back to its ordinal label
    for (const item of items.filter((i) => i.lesionId === "l3")) {
      expect(item.displayName.endsWith("— Lesion 3")).toBe(true);
    }
  });

  it("preselects at least one default per substantive lesion", () => {
    const items = buildMultiLesionSuggestionItems(lesions);
    for (const lesionId of ["l1", "l3"]) {
      expect(
        items.some((i) => i.lesionId === lesionId && i.isDefault),
        `${lesionId} should have a default suggestion`,
      ).toBe(true);
    }
  });
});

describe("headline / key facts / primary diagnosis", () => {
  it("counts lesions and flags unassessed ones", () => {
    const lesions = [
      makeLesion({ id: "l1", skinCancerAssessment: bccAssessment }),
      makeLesion({ id: "l2" }),
    ];
    expect(buildMultiLesionHeadline(lesions)).toBe(
      "2 lesions in this session · 1 awaiting assessment",
    );
    expect(buildMultiLesionHeadline([lesions[0]!])).toBe(
      "1 lesion in this session",
    );
  });

  it("labels each lesion with site/ordinal and category", () => {
    const lesions = [
      makeLesion({
        id: "l1",
        site: "Nose",
        skinCancerAssessment: bccAssessment,
      }),
      makeLesion({ id: "l2" }),
    ];
    expect(buildMultiLesionKeyFacts(lesions)).toEqual([
      "1. Nose — BCC",
      "2. Lesion 2 — Not assessed",
    ]);
  });

  it("resolves the group diagnosis from the first substantive lesion", () => {
    const lesions = [
      makeLesion({ id: "l1" }),
      makeLesion({ id: "l2", skinCancerAssessment: bccAssessment }),
    ];
    const resolved = resolvePrimaryMultiLesionDiagnosis(lesions);
    expect(resolved).toBeTruthy();
    expect(resolved?.displayName).toBeTruthy();
    expect(resolvePrimaryMultiLesionDiagnosis([makeLesion()])).toBeNull();
  });

  it("getLesionShortLabel prefers the site", () => {
    expect(getLesionShortLabel(makeLesion({ site: " Cheek " }), 0)).toBe(
      "Cheek",
    );
    expect(getLesionShortLabel(makeLesion(), 1)).toBe("Lesion 2");
    expect(anyLesionHasSubstantiveAssessment(undefined)).toBe(false);
  });
});

// ── Save-time accept-mapping guard (multi-lesion branch) ─────────────────────

function makeGroup(group: Record<string, unknown>): DiagnosisGroup {
  return {
    id: "group-1",
    specialty: "skin_cancer",
    diagnosis: { displayName: "BCC" },
    procedures: [
      {
        id: "proc-1",
        sequenceOrder: 1,
        procedureName: "Excision of skin lesion — Nose",
      },
    ],
    ...group,
  } as unknown as DiagnosisGroup;
}

describe("getAcceptMappingErrors — multi-lesion branch", () => {
  it("blocks an unaccepted multi-lesion group with a panel-specific message", () => {
    const errors = getAcceptMappingErrors([
      makeGroup({
        isMultiLesion: true,
        lesionInstances: [
          makeLesion({ id: "l1", skinCancerAssessment: bccAssessment }),
        ],
        procedureSuggestionSource: "picklist",
      }),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain(
      'tap "Accept mapping" below the lesion list',
    );
  });

  it("passes an accepted multi-lesion group", () => {
    const errors = getAcceptMappingErrors([
      makeGroup({
        isMultiLesion: true,
        lesionInstances: [
          makeLesion({ id: "l1", skinCancerAssessment: bccAssessment }),
        ],
        procedureSuggestionSource: "skinCancer",
      }),
    ]);
    expect(errors).toHaveLength(0);
  });

  it("ignores a stale group-level assessment on a multi-lesion group", () => {
    // Pre-fix repro path A: toggling multi-lesion left the seeded group
    // blob in place with no accept UI mounted — an unsatisfiable dead end.
    const errors = getAcceptMappingErrors([
      makeGroup({
        isMultiLesion: true,
        lesionInstances: [makeLesion({ id: "l1" })],
        skinCancerAssessment: bccAssessment,
        procedureSuggestionSource: "picklist",
      }),
    ]);
    expect(errors).toHaveLength(0);
  });

  it("keeps the single-lesion gate intact", () => {
    const errors = getAcceptMappingErrors([
      makeGroup({
        skinCancerAssessment: bccAssessment,
        procedureSuggestionSource: "picklist",
      }),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain(
      'tap "Accept mapping" in the skin cancer assessment',
    );
  });

  it("keeps the acute-hand gate intact", () => {
    const errors = getAcceptMappingErrors([
      makeGroup({
        handInfectionDetails: { infectionType: "paronychia" },
        procedureSuggestionSource: "picklist",
      }),
    ]);
    expect(
      errors.some((e) =>
        e.message.includes('tap "Accept mapping" in the acute hand assessment'),
      ),
    ).toBe(true);
  });
});
