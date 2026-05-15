/**
 * Case normalization — date-only field repair + breast assessment cleanup.
 *
 * Runs on every save (via storage.ts). Smoke tests cover the contract:
 * legacy date strings get canonical YYYY-MM-DD; breast assessment objects
 * pass through normalizeBreastAssessment; nothing else mutates.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeCaseDateOnlyFields,
  normalizeCaseBreastFields,
} from "@/lib/caseNormalization";
import type { Case } from "@/types/case";

function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    id: "c1",
    userId: "u1",
    procedureDate: "2026-05-15",
    facility: "Test Hospital",
    specialty: "general",
    operativeRole: "PS",
    diagnosisGroups: [],
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
    ...overrides,
  } as any;
}

describe("normalizeCaseDateOnlyFields", () => {
  it("returns identity when no changes needed (canonical YYYY-MM-DD)", () => {
    const c = makeCase({
      procedureDate: "2026-05-15",
      admissionDate: "2026-05-14",
      dischargeDate: "2026-05-16",
    });
    const result = normalizeCaseDateOnlyFields(c);
    // When nothing changes, returns SAME reference (perf — avoid cloning).
    expect(result).toBe(c);
  });

  it("normalizes ISO timestamp date fields to YYYY-MM-DD", () => {
    const c = makeCase({
      procedureDate: "2026-05-15T00:00:00.000Z",
      admissionDate: "2026-05-14T00:00:00.000Z",
    });
    const result = normalizeCaseDateOnlyFields(c);
    expect(result.procedureDate).toBe("2026-05-15");
    expect(result.admissionDate).toBe("2026-05-14");
    // New object reference because changes occurred
    expect(result).not.toBe(c);
  });

  it("preserves undefined optional dates", () => {
    const c = makeCase({
      admissionDate: undefined,
      dischargeDate: undefined,
      injuryDate: undefined,
    });
    const result = normalizeCaseDateOnlyFields(c);
    expect(result.admissionDate).toBeUndefined();
    expect(result.dischargeDate).toBeUndefined();
    expect(result.injuryDate).toBeUndefined();
  });

  it("normalizes skin cancer prior + current histology reportDate", () => {
    const c = makeCase({
      diagnosisGroups: [
        {
          id: "g1",
          sequenceOrder: 1,
          specialty: "skin_cancer",
          procedures: [],
          skinCancerAssessment: {
            pathwayStage: "histology_known",
            priorHistology: {
              pathologyCategory: "bcc",
              reportDate: "2026-05-10T00:00:00.000Z",
            },
            currentHistology: {
              pathologyCategory: "bcc",
              reportDate: "2026-05-20T12:30:00.000Z",
            },
          } as any,
        } as any,
      ],
    });
    const result = normalizeCaseDateOnlyFields(c);
    const group = result.diagnosisGroups[0]!;
    expect(group.skinCancerAssessment?.priorHistology?.reportDate).toBe(
      "2026-05-10",
    );
    expect(group.skinCancerAssessment?.currentHistology?.reportDate).toBe(
      "2026-05-20",
    );
  });

  it("normalizes lesion-level skin cancer histology dates (multi-lesion sessions)", () => {
    const c = makeCase({
      diagnosisGroups: [
        {
          id: "g1",
          sequenceOrder: 1,
          specialty: "skin_cancer",
          isMultiLesion: true,
          procedures: [],
          lesionInstances: [
            {
              id: "l1",
              skinCancerAssessment: {
                pathwayStage: "histology_known",
                priorHistology: {
                  pathologyCategory: "scc",
                  reportDate: "2026-05-01T08:00:00.000Z",
                },
              },
            } as any,
          ],
        } as any,
      ],
    });
    const result = normalizeCaseDateOnlyFields(c);
    const lesion = result.diagnosisGroups[0]!.lesionInstances![0]!;
    expect(lesion.skinCancerAssessment?.priorHistology?.reportDate).toBe(
      "2026-05-01",
    );
  });

  it("identity short-circuit for histology with no date changes (group level)", () => {
    const group = {
      id: "g1",
      sequenceOrder: 1,
      specialty: "skin_cancer" as const,
      procedures: [],
      skinCancerAssessment: {
        pathwayStage: "histology_known" as const,
        priorHistology: {
          pathologyCategory: "bcc" as const,
          reportDate: "2026-05-10", // Already canonical
        },
      },
    } as any;
    const c = makeCase({ diagnosisGroups: [group] });
    const result = normalizeCaseDateOnlyFields(c);
    // No mutation needed
    expect(result).toBe(c);
  });
});

describe("normalizeCaseBreastFields", () => {
  it("returns same diagnosis groups when no breastAssessment present", () => {
    const c = makeCase({
      diagnosisGroups: [
        {
          id: "g1",
          sequenceOrder: 1,
          specialty: "general",
          procedures: [],
        } as any,
      ],
    });
    const result = normalizeCaseBreastFields(c);
    // Same group reference passed through
    expect(result.diagnosisGroups[0]).toBe(c.diagnosisGroups[0]);
  });

  it("invokes normalizeBreastAssessment on groups with breastAssessment data", () => {
    // We don't need to test the inner normalizer here — that's normalizeBreastAssessment's
    // job. Just verify that this function REACHES it when breastAssessment exists.
    const c = makeCase({
      diagnosisGroups: [
        {
          id: "g1",
          sequenceOrder: 1,
          specialty: "breast",
          procedures: [],
          breastAssessment: {
            // Minimal shape — actual normalization tested elsewhere
            laterality: "left" as const,
            sides: {
              left: { side: "left", clinicalContext: "reconstructive" },
            },
          } as any,
        } as any,
      ],
    });
    const result = normalizeCaseBreastFields(c);
    // The normalizer returns a new group object (immutable update pattern)
    expect(result.diagnosisGroups[0]).not.toBe(c.diagnosisGroups[0]);
    // Original breastAssessment field still present (shape may differ)
    expect(result.diagnosisGroups[0]!.breastAssessment).toBeDefined();
  });
});
