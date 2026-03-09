import { describe, expect, it, vi } from "vitest";

import type {
  Case,
  CaseProcedure,
  DiagnosisGroup,
  FreeFlapDetails,
} from "@/types/case";
import {
  calculateBodyContouringStatistics,
  calculateBreastStatistics,
  calculateFreeFlapStatistics,
  calculateHandSurgeryStatistics,
  calculateOrthoplasticStatistics,
  calculateStatistics,
  filterCases,
} from "@/lib/statistics";

function makeProcedure(overrides: Partial<CaseProcedure> = {}): CaseProcedure {
  return {
    id: overrides.id ?? "procedure-1",
    sequenceOrder: overrides.sequenceOrder ?? 1,
    procedureName: overrides.procedureName ?? "Procedure",
    surgeonRole: overrides.surgeonRole ?? "PS",
    ...overrides,
  };
}

function makeDiagnosisGroup(
  specialty: DiagnosisGroup["specialty"],
  overrides: Partial<DiagnosisGroup> = {},
): DiagnosisGroup {
  return {
    id: overrides.id ?? `group-${specialty}`,
    sequenceOrder: overrides.sequenceOrder ?? 1,
    specialty,
    procedures: overrides.procedures ?? [makeProcedure({ specialty })],
    ...overrides,
  };
}

function makeFreeFlapDetails(
  overrides: Partial<FreeFlapDetails> = {},
): FreeFlapDetails {
  return {
    harvestSide: "left",
    anastomoses: [],
    ...overrides,
  };
}

function makeCase(
  overrides: Partial<Case> & { specialty?: Case["specialty"] } = {},
): Case {
  const specialty = overrides.specialty ?? "general";

  return {
    id: overrides.id ?? `case-${specialty}`,
    patientIdentifier: overrides.patientIdentifier ?? "TEST001",
    procedureDate: overrides.procedureDate ?? "2026-03-09",
    facility: overrides.facility ?? "Test Hospital",
    specialty,
    procedureType: overrides.procedureType ?? "Primary procedure",
    diagnosisGroups: overrides.diagnosisGroups ?? [
      makeDiagnosisGroup(specialty),
    ],
    teamMembers: overrides.teamMembers ?? [],
    schemaVersion: 5,
    createdAt: overrides.createdAt ?? "2026-03-09T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2026-03-09T00:00:00Z",
    ...overrides,
  } as Case;
}

describe("statistics specialty calculators", () => {
  it("includes hand cases matched via diagnosis-group specialty", () => {
    const caseData = makeCase({
      specialty: "general",
      diagnosisGroups: [
        makeDiagnosisGroup("general", {
          procedures: [
            makeProcedure({
              specialty: "general",
              procedureName: "Appendectomy",
              subcategory: "Appendectomy",
            }),
          ],
        }),
        makeDiagnosisGroup("hand_wrist", {
          procedures: [
            makeProcedure({
              specialty: "hand_wrist",
              procedureName: "Flexor tendon repair",
              subcategory: "Flexor tendon repair",
              tags: ["tendon_repair"],
            }),
          ],
        }),
      ],
    });

    const direct = calculateHandSurgeryStatistics([caseData]);
    const dispatched = calculateStatistics([caseData], "hand_wrist");

    expect(direct.totalCases).toBe(1);
    expect(direct.casesByProcedureType).toEqual([
      { procedureType: "Flexor tendon repair", count: 1 },
    ]);
    expect(direct.tendonRepairCount).toBe(1);
    expect(dispatched).toMatchObject({
      totalCases: 1,
      tendonRepairCount: 1,
    });
  });

  it("includes orthoplastic cases matched via diagnosis-group specialty", () => {
    const caseData = makeCase({
      specialty: "general",
      diagnosisGroups: [
        makeDiagnosisGroup("general", {
          procedures: [
            makeProcedure({
              specialty: "general",
              procedureName: "Free DIEP",
              tags: ["free_flap"],
              clinicalDetails: makeFreeFlapDetails({
                flapType: "diep",
                ischemiaTimeMinutes: 120,
              }),
            }),
          ],
        }),
        makeDiagnosisGroup("orthoplastic", {
          procedures: [
            makeProcedure({
              specialty: "orthoplastic",
              procedureName: "Debridement",
              subcategory: "Debridement",
            }),
          ],
        }),
      ],
    });

    const stats = calculateOrthoplasticStatistics([caseData]);

    expect(stats.totalCases).toBe(1);
    expect(stats.freeFlapCount).toBe(0);
    expect(stats.averageIschemiaTimeMinutes).toBeNull();
    expect(stats.casesByCoverage).toEqual([
      { coverage: "Debridement", count: 1 },
    ]);
  });

  it("includes breast cases matched via diagnosis-group specialty", () => {
    const caseData = makeCase({
      specialty: "general",
      procedureType: "Appendectomy",
      diagnosisGroups: [
        makeDiagnosisGroup("breast", {
          procedures: [
            makeProcedure({
              specialty: "breast",
              procedureName: "Direct-to-implant reconstruction",
              subcategory: "Implant-Based Reconstruction",
            }),
          ],
        }),
      ],
    });

    const stats = calculateBreastStatistics([caseData]);

    expect(stats.totalCases).toBe(1);
    expect(stats.reconstructionCount).toBe(1);
    expect(stats.casesByProcedureType).toEqual([
      { procedureType: "Implant-Based Reconstruction", count: 1 },
    ]);
  });

  it("includes body contouring cases matched via diagnosis-group specialty", () => {
    const caseData = makeCase({
      specialty: "general",
      diagnosisGroups: [
        makeDiagnosisGroup("general", {
          procedures: [
            makeProcedure({
              specialty: "general",
              procedureName: "Appendectomy",
              clinicalDetails: { resectionWeightGrams: 9999 },
            }),
          ],
        }),
        makeDiagnosisGroup("body_contouring", {
          procedures: [
            makeProcedure({
              specialty: "body_contouring",
              procedureName: "Abdominoplasty",
              clinicalDetails: { resectionWeightGrams: 640 },
            }),
          ],
        }),
      ],
    });

    const stats = calculateBodyContouringStatistics([caseData]);

    expect(stats.totalCases).toBe(1);
    expect(stats.averageResectionWeightGrams).toBe(640);
  });
});

describe("free flap statistics", () => {
  it("excludes non-free-flap specialty cases from free flap aggregation", () => {
    const freeFlapCase = makeCase({
      id: "case-free-flap",
      specialty: "breast",
      diagnosisGroups: [
        makeDiagnosisGroup("breast", {
          procedures: [
            makeProcedure({
              specialty: "breast",
              procedureName: "DIEP flap breast reconstruction",
              tags: ["free_flap", "microsurgery"],
              clinicalDetails: makeFreeFlapDetails({
                flapType: "diep",
                flapOutcome: {
                  flapSurvival: "complete_survival",
                },
              }),
            }),
          ],
        }),
      ],
    });
    const nonFreeFlapBreastCase = makeCase({
      id: "case-breast-non-flap",
      specialty: "breast",
      procedureType: "Implant exchange",
      diagnosisGroups: [
        makeDiagnosisGroup("breast", {
          procedures: [
            makeProcedure({
              specialty: "breast",
              procedureName: "Implant exchange",
            }),
          ],
        }),
      ],
    });

    const stats = calculateFreeFlapStatistics([
      freeFlapCase,
      nonFreeFlapBreastCase,
    ]);

    expect(stats.totalCases).toBe(1);
    expect(stats.flapSurvivalRate).toBe(100);
    expect(stats.casesByFlapType).toEqual([{ flapType: "diep", count: 1 }]);
  });

  it("includes legacy case-level free flap data with no tagged procedure", () => {
    const legacyFreeFlapCase = makeCase({
      specialty: "orthoplastic",
      diagnosisGroups: [makeDiagnosisGroup("orthoplastic", { procedures: [] })],
      clinicalDetails: makeFreeFlapDetails({
        flapType: "alt",
        flapOutcome: {
          flapSurvival: "complete_survival",
        },
      }),
    });

    const stats = calculateFreeFlapStatistics([legacyFreeFlapCase]);

    expect(stats.totalCases).toBe(1);
    expect(stats.flapSurvivalRate).toBe(100);
    expect(stats.casesByFlapType).toEqual([{ flapType: "alt", count: 1 }]);
  });
});

describe("statistics filters", () => {
  it("includes cases on the exact six-month calendar boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 9, 21, 0, 0));

    const filtered = filterCases(
      [
        makeCase({
          procedureDate: "2025-09-09",
        }),
      ],
      {
        specialty: "all",
        timePeriod: "last_6_months",
        facility: "all",
        role: "all",
      },
    );

    expect(filtered).toHaveLength(1);

    vi.useRealTimers();
  });
});
