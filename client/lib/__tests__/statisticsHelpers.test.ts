import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Case,
  type CaseProcedure,
  type DiagnosisGroup,
  SPECIALTY_LABELS,
} from "@/types/case";
import {
  computeCareerOverview,
  computeMonthlyVolume,
  formatMilestoneDate,
} from "@/lib/statisticsHelpers";

const ORIGINAL_TZ = process.env.TZ;

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

describe("statisticsHelpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (ORIGINAL_TZ === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = ORIGINAL_TZ;
    }
  });

  it("computes career overview from valid ISO dates and multi-specialty cases", () => {
    vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0));

    const overview = computeCareerOverview([
      makeCase({
        id: "case-1",
        specialty: "general",
        procedureDate: "2026-01-05",
      }),
      makeCase({
        id: "case-2",
        specialty: "general",
        procedureDate: "2026-03-01",
        diagnosisGroups: [
          makeDiagnosisGroup("general"),
          makeDiagnosisGroup("hand_wrist"),
        ],
      }),
    ]);

    expect(overview.totalCases).toBe(2);
    expect(overview.firstCaseDate).toBe("2026-01-05");
    expect(overview.monthsActive).toBe(2);
    expect(overview.specialtiesUsed).toEqual(
      expect.arrayContaining(["general", "hand_wrist"]),
    );
    expect(overview.specialtyDistribution).toEqual([
      {
        specialty: "general",
        label: SPECIALTY_LABELS.general,
        count: 2,
      },
      {
        specialty: "hand_wrist",
        label: SPECIALTY_LABELS.hand_wrist,
        count: 1,
      },
    ]);
  });

  it("keeps month-boundary cases in the correct month in UTC-negative timezones", () => {
    process.env.TZ = "America/Los_Angeles";
    vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0));

    const monthlyVolume = computeMonthlyVolume([
      makeCase({
        id: "case-boundary",
        procedureDate: "2026-03-01",
      }),
    ]);

    expect(
      monthlyVolume.find((month) => month.month === "2026-03")?.count,
    ).toBe(1);
    expect(
      monthlyVolume.find((month) => month.month === "2026-02")?.count,
    ).toBe(0);
  });

  it("formats milestone dates without timezone drift", () => {
    process.env.TZ = "America/Los_Angeles";

    expect(formatMilestoneDate("2026-03-01")).toBe("1 Mar 2026");
  });
});
