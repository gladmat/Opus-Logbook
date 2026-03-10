import { getCasePrimaryTitle } from "@/lib/caseDiagnosisSummary";
import { caseCanAddHistology } from "@/lib/skinCancerConfig";
import type { EpisodePrefillData, TreatmentEpisode } from "@/types/episode";
import { PENDING_ACTION_LABELS } from "@/types/episode";
import { INFECTION_SYNDROME_LABELS } from "@/types/infection";
import type { Case, QuickCasePrefillData, Specialty } from "@/types/case";
import { getCaseSpecialties } from "@/types/case";

const DAY_MS = 1000 * 60 * 60 * 24;

export const HISTOLOGY_FILTER_ID = "__histology__";

export interface AttentionItem {
  id: string;
  type: "inpatient" | "episode" | "infection";
  patientIdentifier: string;
  diagnosisTitle: string;
  specialty: Specialty;
  facility?: string;
  caseId?: string;
  postOpDay?: number;
  hasEpisodeLink?: boolean;
  episodeId?: string;
  episodeStatus?: "active" | "on_hold" | "planned";
  daysSinceLastEncounter?: number;
  pendingAction?: string;
  caseCount?: number;
  lastProcedureSummary?: string;
  lastCaseDate?: string;
  lastCaseId?: string;
  infectionSyndrome?: string;
  canAddHistology?: boolean;
}

export interface DashboardEpisodeWithCases {
  episode: TreatmentEpisode;
  cases: Case[];
}

export interface DashboardSummary {
  totalCaseCount: number;
  caseCounts: Partial<Record<Specialty, number>>;
  awaitingHistologyCount: number;
}

export interface PracticePulseData {
  thisMonth: {
    count: number;
    delta: number;
  };
  thisWeek: {
    count: number;
    dailyDots: boolean[];
    todayIndex: number;
  };
  completion: {
    percentage: number;
    completedCount: number;
    totalCount: number;
  };
}

export interface DashboardCaseFormParams {
  specialty?: Specialty;
  episodeId?: string;
  episodePrefill?: EpisodePrefillData;
  quickPrefill?: QuickCasePrefillData;
}

function atStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseCaseDate(dateValue: string): Date {
  const [yearRaw, monthRaw, dayRaw] = dateValue.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  return new Date(dateValue);
}

function getDiffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function isSelectedSpecialty(
  selectedSpecialty: string | null,
  specialty: Specialty,
): boolean {
  return selectedSpecialty === specialty;
}

export function sortCasesByProcedureDateDesc(cases: Case[]): Case[] {
  return [...cases].sort(
    (left, right) =>
      parseCaseDate(right.procedureDate).getTime() -
      parseCaseDate(left.procedureDate).getTime(),
  );
}

export function filterCasesByVisibleSpecialties(
  cases: Case[],
  visibleSpecialties: Specialty[],
): Case[] {
  return cases.filter((caseData) =>
    getCaseSpecialties(caseData).some((specialty) =>
      visibleSpecialties.includes(specialty),
    ),
  );
}

export function buildDashboardSummary(
  cases: Case[],
  needsHistology: (caseData: Case) => boolean,
): DashboardSummary {
  const caseCounts: Partial<Record<Specialty, number>> = {};

  for (const caseData of cases) {
    for (const specialty of getCaseSpecialties(caseData)) {
      caseCounts[specialty] = (caseCounts[specialty] ?? 0) + 1;
    }
  }

  return {
    totalCaseCount: cases.length,
    caseCounts,
    awaitingHistologyCount: cases.filter(needsHistology).length,
  };
}

export function filterDashboardCases(
  cases: Case[],
  selectedFilter: string | null,
  needsHistology: (caseData: Case) => boolean,
): Case[] {
  const sortedCases = sortCasesByProcedureDateDesc(cases);

  if (!selectedFilter) {
    return sortedCases;
  }

  if (selectedFilter === HISTOLOGY_FILTER_ID) {
    return sortedCases.filter(needsHistology);
  }

  return sortedCases.filter((caseData) =>
    getCaseSpecialties(caseData).some((specialty) =>
      isSelectedSpecialty(selectedFilter, specialty),
    ),
  );
}

export function buildAttentionItems(
  cases: Case[],
  episodesWithCases: DashboardEpisodeWithCases[],
  selectedSpecialty: string | null,
): AttentionItem[] {
  const today = atStartOfDay(new Date());

  const inpatientItems: AttentionItem[] = [];
  const inpatientCaseIds = new Set<string>();

  for (const caseData of cases) {
    if (caseData.stayType !== "inpatient" || caseData.dischargeDate) {
      continue;
    }

    if (
      selectedSpecialty &&
      !getCaseSpecialties(caseData).some((specialty) =>
        isSelectedSpecialty(selectedSpecialty, specialty),
      )
    ) {
      continue;
    }

    const procedureDate = atStartOfDay(parseCaseDate(caseData.procedureDate));
    const postOpDay = Math.max(0, getDiffDays(procedureDate, today));

    inpatientCaseIds.add(caseData.id);
    inpatientItems.push({
      id: `inpatient-${caseData.id}`,
      type: "inpatient",
      patientIdentifier: caseData.patientIdentifier,
      diagnosisTitle:
        getCasePrimaryTitle(caseData) || caseData.procedureType || "Unknown",
      specialty: caseData.specialty,
      facility: caseData.facility,
      caseId: caseData.id,
      postOpDay,
      hasEpisodeLink: !!caseData.episodeId,
      episodeId: caseData.episodeId,
      canAddHistology: caseCanAddHistology(caseData),
    });
  }

  inpatientItems.sort(
    (left, right) => (right.postOpDay ?? 0) - (left.postOpDay ?? 0),
  );

  const infectionItems: AttentionItem[] = [];

  for (const caseData of cases) {
    if (caseData.infectionOverlay?.status !== "active") {
      continue;
    }

    if (inpatientCaseIds.has(caseData.id)) {
      continue;
    }

    if (
      selectedSpecialty &&
      !getCaseSpecialties(caseData).some((specialty) =>
        isSelectedSpecialty(selectedSpecialty, specialty),
      )
    ) {
      continue;
    }

    const syndromePrimary = caseData.infectionOverlay.syndromePrimary;

    infectionItems.push({
      id: `infection-${caseData.id}`,
      type: "infection",
      patientIdentifier: caseData.patientIdentifier,
      diagnosisTitle:
        getCasePrimaryTitle(caseData) || caseData.procedureType || "Unknown",
      specialty: caseData.specialty,
      facility: caseData.facility,
      caseId: caseData.id,
      hasEpisodeLink: !!caseData.episodeId,
      episodeId: caseData.episodeId,
      infectionSyndrome: syndromePrimary
        ? (INFECTION_SYNDROME_LABELS[syndromePrimary] ?? syndromePrimary)
        : undefined,
      canAddHistology: caseCanAddHistology(caseData),
    });
  }

  const activeStatuses = new Set(["active", "on_hold", "planned"]);
  const episodeItems: AttentionItem[] = [];

  for (const { episode, cases: linkedCases } of episodesWithCases) {
    if (!activeStatuses.has(episode.status)) {
      continue;
    }

    if (
      selectedSpecialty &&
      !isSelectedSpecialty(selectedSpecialty, episode.specialty)
    ) {
      continue;
    }

    const sortedLinkedCases = sortCasesByProcedureDateDesc(linkedCases);
    const mostRecentCase = sortedLinkedCases[0];

    let daysSinceLastEncounter: number | undefined;
    let lastProcedureSummary: string | undefined;
    let lastCaseDate: string | undefined;
    let lastCaseId: string | undefined;
    let lastCaseCanAddHistology = false;
    let facility: string | undefined;

    if (mostRecentCase) {
      const caseDate = atStartOfDay(
        parseCaseDate(mostRecentCase.procedureDate),
      );
      daysSinceLastEncounter = Math.max(0, getDiffDays(caseDate, today));
      lastProcedureSummary =
        getCasePrimaryTitle(mostRecentCase) || mostRecentCase.procedureType;
      lastCaseDate = mostRecentCase.procedureDate;
      lastCaseId = mostRecentCase.id;
      lastCaseCanAddHistology = caseCanAddHistology(mostRecentCase);
      facility = mostRecentCase.facility;
    }

    episodeItems.push({
      id: `episode-${episode.id}`,
      type: "episode",
      patientIdentifier: episode.patientIdentifier,
      diagnosisTitle: episode.title || episode.primaryDiagnosisDisplay,
      specialty: episode.specialty,
      facility,
      episodeId: episode.id,
      episodeStatus: episode.status as "active" | "on_hold" | "planned",
      daysSinceLastEncounter,
      pendingAction: episode.pendingAction
        ? PENDING_ACTION_LABELS[episode.pendingAction]
        : undefined,
      caseCount: linkedCases.length,
      lastProcedureSummary,
      lastCaseDate,
      lastCaseId,
      canAddHistology: lastCaseCanAddHistology,
    });
  }

  episodeItems.sort(
    (left, right) =>
      (right.daysSinceLastEncounter ?? 0) - (left.daysSinceLastEncounter ?? 0),
  );

  return [...inpatientItems, ...infectionItems, ...episodeItems];
}

export function calculatePracticePulse(
  cases: Case[],
  now: Date = new Date(),
): PracticePulseData {
  const today = atStartOfDay(now);
  const dayOfWeek = now.getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(monday.getDate() - todayIndex);

  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonthStart = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1,
  );
  const previousMonthDayCount = new Date(
    today.getFullYear(),
    today.getMonth(),
    0,
  ).getDate();
  const previousMonthEnd = new Date(
    previousMonthStart.getFullYear(),
    previousMonthStart.getMonth(),
    Math.min(today.getDate(), previousMonthDayCount),
  );
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const dailyDots = [false, false, false, false, false, false, false];
  let thisMonthCount = 0;
  let previousMonthCount = 0;
  let thisWeekCount = 0;
  let totalLast90 = 0;
  let completedLast90 = 0;

  for (const caseData of cases) {
    const caseDate = atStartOfDay(parseCaseDate(caseData.procedureDate));

    if (caseDate >= currentMonthStart && caseDate <= today) {
      thisMonthCount++;
    }

    if (caseDate >= previousMonthStart && caseDate <= previousMonthEnd) {
      previousMonthCount++;
    }

    const diffDays = getDiffDays(monday, caseDate);
    if (diffDays >= 0 && diffDays <= 6) {
      dailyDots[diffDays] = true;
      thisWeekCount++;
    }

    if (caseDate >= ninetyDaysAgo) {
      totalLast90++;
      if (caseData.outcome != null) {
        completedLast90++;
      }
    }
  }

  return {
    thisMonth: {
      count: thisMonthCount,
      delta: thisMonthCount - previousMonthCount,
    },
    thisWeek: {
      count: thisWeekCount,
      dailyDots,
      todayIndex,
    },
    completion: {
      percentage:
        totalLast90 === 0
          ? 0
          : Math.round((completedLast90 / totalLast90) * 100),
      completedCount: completedLast90,
      totalCount: totalLast90,
    },
  };
}

export function buildEpisodeCaseFormParams(
  episodeWithCases: DashboardEpisodeWithCases,
): DashboardCaseFormParams {
  const linkedCases = sortCasesByProcedureDateDesc(episodeWithCases.cases);
  const lastCase = linkedCases[0];
  const prefill: EpisodePrefillData = {
    patientIdentifier: episodeWithCases.episode.patientIdentifier,
    facility: lastCase?.facility,
    specialty: episodeWithCases.episode.specialty,
    diagnosisGroups: lastCase?.diagnosisGroups,
    encounterClass: lastCase?.encounterClass,
    reconstructionTiming: lastCase?.reconstructionTiming,
    priorRadiotherapy: lastCase?.priorRadiotherapy,
    priorChemotherapy: lastCase?.priorChemotherapy,
    episodeSequence: linkedCases.length + 1,
  };

  return {
    specialty: episodeWithCases.episode.specialty,
    episodeId: episodeWithCases.episode.id,
    episodePrefill: prefill,
  };
}

export function buildAttentionCaseFormParams(
  item: AttentionItem,
  episodesWithCases: DashboardEpisodeWithCases[],
  selectedSpecialty: Specialty | null,
): DashboardCaseFormParams | null {
  if (item.episodeId) {
    const matchingEpisode = episodesWithCases.find(
      ({ episode }) => episode.id === item.episodeId,
    );

    if (matchingEpisode) {
      return buildEpisodeCaseFormParams(matchingEpisode);
    }
  }

  if (item.type !== "inpatient") {
    return null;
  }

  return {
    specialty: selectedSpecialty ?? item.specialty,
    quickPrefill: {
      patientIdentifier: item.patientIdentifier,
      facility: item.facility,
    },
  };
}
