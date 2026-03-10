import { describe, expect, it } from "vitest";
import type { Case, DiagnosisGroup } from "@/types/case";
import type { TreatmentEpisode } from "@/types/episode";
import {
  buildAttentionCaseFormParams,
  buildAttentionItems,
  buildDashboardSummary,
  calculatePracticePulse,
  filterDashboardCases,
} from "@/lib/dashboardSelectors";

function makeDiagnosisGroup(
  specialty: Case["specialty"],
  overrides: Partial<DiagnosisGroup> = {},
): DiagnosisGroup {
  return {
    id: `group-${specialty}`,
    sequenceOrder: 1,
    specialty,
    procedures: [
      {
        id: `procedure-${specialty}`,
        sequenceOrder: 1,
        procedureName: `${specialty} procedure`,
        specialty,
        surgeonRole: "PS",
      },
    ],
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

function makeEpisode(
  overrides: Partial<TreatmentEpisode> = {},
): TreatmentEpisode {
  return {
    id: overrides.id ?? "episode-1",
    patientIdentifier: overrides.patientIdentifier ?? "TEST001",
    title: overrides.title ?? "Follow-up pathway",
    primaryDiagnosisCode: "123",
    primaryDiagnosisDisplay: overrides.primaryDiagnosisDisplay ?? "Diagnosis",
    type: overrides.type ?? "other",
    specialty: overrides.specialty ?? "general",
    status: overrides.status ?? "active",
    onsetDate: overrides.onsetDate ?? "2026-03-01",
    ownerId: overrides.ownerId ?? "owner-1",
    createdAt: overrides.createdAt ?? "2026-03-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2026-03-01T00:00:00Z",
    ...overrides,
  } as TreatmentEpisode;
}

describe("dashboard selectors", () => {
  it("keeps raw total count separate from per-specialty counts", () => {
    const multiSpecialtyCase = makeCase({
      id: "case-multi",
      specialty: "hand_wrist",
      diagnosisGroups: [
        makeDiagnosisGroup("hand_wrist"),
        makeDiagnosisGroup("general"),
      ],
    });
    const generalCase = makeCase({
      id: "case-general",
      specialty: "general",
    });

    const summary = buildDashboardSummary(
      [multiSpecialtyCase, generalCase],
      () => false,
    );

    expect(summary.totalCaseCount).toBe(2);
    expect(summary.caseCounts.hand_wrist).toBe(1);
    expect(summary.caseCounts.general).toBe(2);
  });

  it("filters dashboard cases by specialty while preserving multi-specialty matches", () => {
    const olderMultiSpecialtyCase = makeCase({
      id: "case-multi",
      specialty: "hand_wrist",
      procedureDate: "2026-03-01",
      diagnosisGroups: [
        makeDiagnosisGroup("hand_wrist"),
        makeDiagnosisGroup("general"),
      ],
    });
    const newerGeneralCase = makeCase({
      id: "case-general",
      specialty: "general",
      procedureDate: "2026-03-08",
    });
    const excludedCase = makeCase({
      id: "case-burns",
      specialty: "burns",
      procedureDate: "2026-03-09",
    });

    const filtered = filterDashboardCases(
      [olderMultiSpecialtyCase, newerGeneralCase, excludedCase],
      "general",
      () => false,
    );

    expect(filtered.map((caseData) => caseData.id)).toEqual([
      "case-general",
      "case-multi",
    ]);
  });

  it("only creates inpatient attention items for true inpatients", () => {
    const inpatientCase = makeCase({
      id: "case-inpatient",
      patientIdentifier: "WARD001",
      specialty: "hand_wrist",
      stayType: "inpatient",
      dischargeDate: undefined,
    });
    const dayCase = makeCase({
      id: "case-day",
      patientIdentifier: "DAY001",
      specialty: "hand_wrist",
      stayType: "day_case",
      dischargeDate: undefined,
    });

    const items = buildAttentionItems([inpatientCase, dayCase], [], null);

    expect(items.filter((item) => item.type === "inpatient")).toHaveLength(1);
    expect(items[0]?.patientIdentifier).toBe("WARD001");
  });

  it("orders attention items as inpatients, then infections, then episodes", () => {
    const inpatientCase = makeCase({
      id: "case-inpatient",
      patientIdentifier: "WARD001",
      specialty: "general",
      stayType: "inpatient",
      procedureDate: "2026-03-05",
    });
    const infectionCase = makeCase({
      id: "case-infection",
      patientIdentifier: "INF001",
      specialty: "general",
      procedureDate: "2026-03-07",
      infectionOverlay: {
        status: "active",
        syndromePrimary: "cellulitis",
        sourceControlStatus: "not_required",
      },
    });
    const episode = makeEpisode({
      id: "episode-1",
      patientIdentifier: "EPI001",
      specialty: "general",
      status: "active",
    });
    const episodeCase = makeCase({
      id: "case-episode",
      patientIdentifier: "EPI001",
      specialty: "general",
      procedureDate: "2026-03-01",
      episodeId: "episode-1",
    });

    const items = buildAttentionItems(
      [infectionCase, inpatientCase, episodeCase],
      [{ episode, cases: [episodeCase] }],
      null,
    );

    expect(items.map((item) => item.type)).toEqual([
      "inpatient",
      "infection",
      "episode",
    ]);
  });

  it("prefers episode prefill when an attention item is linked to an episode", () => {
    const linkedCase = makeCase({
      id: "case-linked",
      patientIdentifier: "EP001",
      specialty: "general",
      facility: "Clinic A",
      procedureDate: "2026-03-08",
      diagnosisGroups: [makeDiagnosisGroup("general")],
    });
    const episode = makeEpisode({
      id: "episode-1",
      patientIdentifier: "EP001",
      specialty: "general",
      status: "active",
    });

    const params = buildAttentionCaseFormParams(
      {
        id: "item-1",
        type: "inpatient",
        patientIdentifier: "EP001",
        diagnosisTitle: "Diagnosis",
        specialty: "general",
        facility: "Clinic A",
        episodeId: "episode-1",
      },
      [{ episode, cases: [linkedCase] }],
      null,
    );

    expect(params?.episodeId).toBe("episode-1");
    expect(params?.episodePrefill?.patientIdentifier).toBe("EP001");
    expect(params?.quickPrefill).toBeUndefined();
  });

  it("falls back to quickPrefill for non-episode inpatients", () => {
    const params = buildAttentionCaseFormParams(
      {
        id: "item-2",
        type: "inpatient",
        patientIdentifier: "WARD002",
        diagnosisTitle: "Diagnosis",
        specialty: "hand_wrist",
        facility: "Ward B",
      },
      [],
      "hand_wrist",
    );

    expect(params).toEqual({
      specialty: "hand_wrist",
      quickPrefill: {
        patientIdentifier: "WARD002",
        facility: "Ward B",
      },
    });
  });

  it("computes month delta and 90-day completion percentage", () => {
    const cases = [
      makeCase({
        id: "current-1",
        procedureDate: "2026-03-02",
        outcome: "discharged_home",
      }),
      makeCase({
        id: "current-2",
        procedureDate: "2026-03-07",
      }),
      makeCase({
        id: "current-3",
        procedureDate: "2026-03-09",
        outcome: "discharged_home",
      }),
      makeCase({
        id: "previous-1",
        procedureDate: "2026-02-03",
        outcome: "discharged_home",
      }),
      makeCase({
        id: "previous-2",
        procedureDate: "2026-01-10",
        outcome: "discharged_home",
      }),
    ];

    const pulse = calculatePracticePulse(cases, new Date(2026, 2, 9, 12, 0, 0));

    expect(pulse.thisMonth.count).toBe(3);
    expect(pulse.thisMonth.delta).toBe(2);
    expect(pulse.thisWeek.count).toBe(1);
    expect(pulse.thisWeek.todayIndex).toBe(0);
    expect(pulse.thisWeek.dailyDots).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(pulse.completion.completedCount).toBe(4);
    expect(pulse.completion.totalCount).toBe(5);
    expect(pulse.completion.percentage).toBe(80);
  });
});
