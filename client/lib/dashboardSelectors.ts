import { getCasePrimaryTitle } from "@/lib/caseDiagnosisSummary";
import { caseCanAddHistology } from "@/lib/skinCancerConfig";
import type { EpisodePrefillData, TreatmentEpisode } from "@/types/episode";
import { PENDING_ACTION_LABELS } from "@/types/episode";
import { INFECTION_SYNDROME_LABELS } from "@/types/infection";
import type { Case, QuickCasePrefillData, Specialty } from "@/types/case";
import { getCaseSpecialties, getPatientDisplayName } from "@/types/case";
import type { CaseSummary } from "@/types/caseSummary";
import { isPlannedCaseSummary } from "@/types/caseSummary";

const DAY_MS = 1000 * 60 * 60 * 24;

export const HISTOLOGY_FILTER_ID = "__histology__";

export interface AttentionItem {
  id: string;
  type: "inpatient" | "episode" | "infection" | "inbox_photos";
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
  pendingActions?: string[];
  caseCount?: number;
  lastProcedureSummary?: string;
  lastCaseDate?: string;
  lastCaseId?: string;
  infectionSyndrome?: string;
  canAddHistology?: boolean;
  inboxCount?: number;
}

export interface DashboardEpisodeWithCases {
  episode: TreatmentEpisode;
  cases: (Case | CaseSummary)[];
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

function isCaseSummaryLike(
  caseData: Case | CaseSummary,
): caseData is CaseSummary {
  return "searchableText" in caseData;
}

function getCaseLikeSpecialties(caseData: Case | CaseSummary): Specialty[] {
  return isCaseSummaryLike(caseData)
    ? caseData.specialties
    : getCaseSpecialties(caseData);
}

function getCaseLikePatientIdentifier(caseData: Case | CaseSummary): string {
  return isCaseSummaryLike(caseData)
    ? caseData.patientDisplayName || caseData.patientIdentifier
    : getPatientDisplayName(caseData) || caseData.patientIdentifier;
}

function getCaseLikeDiagnosisTitle(caseData: Case | CaseSummary): string {
  return isCaseSummaryLike(caseData)
    ? caseData.diagnosisTitle || caseData.procedureType || "Unknown"
    : getCasePrimaryTitle(caseData) || caseData.procedureType || "Unknown";
}

function getCaseLikeCanAddHistology(caseData: Case | CaseSummary): boolean {
  return isCaseSummaryLike(caseData)
    ? caseData.canAddHistology
    : caseCanAddHistology(caseData);
}

function hasCaseLikeRecordedOutcome(caseData: Case | CaseSummary): boolean {
  return isCaseSummaryLike(caseData)
    ? caseData.outcomeRecorded
    : caseData.outcome != null;
}

export function sortCasesByProcedureDateDesc<
  T extends { procedureDate: string },
>(cases: T[]): T[] {
  return [...cases].sort(
    (left, right) =>
      parseCaseDate(right.procedureDate).getTime() -
      parseCaseDate(left.procedureDate).getTime(),
  );
}

export function filterOutPlannedCases<T extends { caseStatus?: string }>(
  cases: T[],
): T[] {
  return cases.filter((caseData) => !isPlannedCaseSummary(caseData));
}

export function getPlannedCases<
  T extends { caseStatus?: string; plannedDate?: string; createdAt: string },
>(cases: T[]): T[] {
  return cases.filter(isPlannedCaseSummary).sort((a, b) => {
    // Sort by plannedDate ascending (unscheduled last), then createdAt
    if (a.plannedDate && b.plannedDate) {
      return a.plannedDate.localeCompare(b.plannedDate);
    }
    if (a.plannedDate && !b.plannedDate) return -1;
    if (!a.plannedDate && b.plannedDate) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function getPlannedCaseCount<T extends { caseStatus?: string }>(
  cases: T[],
): number {
  return cases.filter(isPlannedCaseSummary).length;
}

export function filterCasesByVisibleSpecialties<T extends Case | CaseSummary>(
  cases: T[],
  visibleSpecialties: Specialty[],
): T[] {
  return cases.filter((caseData) =>
    getCaseLikeSpecialties(caseData).some((specialty) =>
      visibleSpecialties.includes(specialty),
    ),
  );
}

export function buildDashboardSummary<T extends Case | CaseSummary>(
  cases: T[],
  needsHistology: (caseData: T) => boolean,
): DashboardSummary {
  const caseCounts: Partial<Record<Specialty, number>> = {};

  for (const caseData of cases) {
    for (const specialty of getCaseLikeSpecialties(caseData)) {
      caseCounts[specialty] = (caseCounts[specialty] ?? 0) + 1;
    }
  }

  return {
    totalCaseCount: cases.length,
    caseCounts,
    awaitingHistologyCount: cases.filter(needsHistology).length,
  };
}

export function filterDashboardCases<T extends Case | CaseSummary>(
  cases: T[],
  selectedFilter: string | null,
  needsHistology: (caseData: T) => boolean,
): T[] {
  const sortedCases = sortCasesByProcedureDateDesc(cases);

  if (!selectedFilter) {
    return sortedCases;
  }

  if (selectedFilter === HISTOLOGY_FILTER_ID) {
    return sortedCases.filter(needsHistology);
  }

  return sortedCases.filter((caseData) =>
    getCaseLikeSpecialties(caseData).some((specialty) =>
      isSelectedSpecialty(selectedFilter, specialty),
    ),
  );
}

export function buildAttentionItems<T extends Case | CaseSummary>(
  cases: T[],
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
      !getCaseLikeSpecialties(caseData).some((specialty) =>
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
      patientIdentifier: getCaseLikePatientIdentifier(caseData),
      diagnosisTitle: getCaseLikeDiagnosisTitle(caseData),
      specialty: caseData.specialty,
      facility: caseData.facility,
      caseId: caseData.id,
      postOpDay,
      hasEpisodeLink: !!caseData.episodeId,
      episodeId: caseData.episodeId,
      canAddHistology: getCaseLikeCanAddHistology(caseData),
    });
  }

  // --- Episode-inpatient dedup ---
  // If an episode's most-recent case is currently an active inpatient,
  // suppress the episode card and merge its pending action onto the inpatient card.
  const activeStatuses = new Set(["active", "on_hold", "planned"]);
  const suppressedEpisodeIds = new Set<string>();
  const episodePendingByInpatientCaseId = new Map<
    string,
    { pendingAction?: string; pendingActions?: string[]; episodeId: string }
  >();

  for (const { episode, cases: linkedCases } of episodesWithCases) {
    if (!activeStatuses.has(episode.status)) continue;
    const sortedLinked = sortCasesByProcedureDateDesc(linkedCases);
    const mostRecent = sortedLinked[0];
    if (mostRecent && inpatientCaseIds.has(mostRecent.id)) {
      suppressedEpisodeIds.add(episode.id);
      const pending = episode.pendingAction
        ? PENDING_ACTION_LABELS[episode.pendingAction]
        : undefined;
      const pendingAll = episode.pendingActions?.length
        ? episode.pendingActions.map((a) => PENDING_ACTION_LABELS[a])
        : pending
          ? [pending]
          : undefined;
      episodePendingByInpatientCaseId.set(mostRecent.id, {
        pendingAction: pending,
        pendingActions: pendingAll,
        episodeId: episode.id,
      });
    }
  }

  // Enrich inpatient items with episode pending actions
  for (const item of inpatientItems) {
    if (item.caseId) {
      const episodeInfo = episodePendingByInpatientCaseId.get(item.caseId);
      if (episodeInfo) {
        item.pendingAction = item.pendingAction ?? episodeInfo.pendingAction;
        item.pendingActions = item.pendingActions ?? episodeInfo.pendingActions;
        item.episodeId = item.episodeId ?? episodeInfo.episodeId;
        item.hasEpisodeLink = true;
      }
    }
  }

  inpatientItems.sort(
    (left, right) => (right.postOpDay ?? 0) - (left.postOpDay ?? 0),
  );

  const infectionItems: AttentionItem[] = [];

  for (const caseData of cases) {
    const isActiveInfection = isCaseSummaryLike(caseData)
      ? caseData.infectionStatus === "active"
      : caseData.infectionOverlay?.status === "active";
    if (!isActiveInfection) {
      continue;
    }

    if (inpatientCaseIds.has(caseData.id)) {
      continue;
    }

    if (
      selectedSpecialty &&
      !getCaseLikeSpecialties(caseData).some((specialty) =>
        isSelectedSpecialty(selectedSpecialty, specialty),
      )
    ) {
      continue;
    }

    const syndromePrimary = isCaseSummaryLike(caseData)
      ? undefined
      : caseData.infectionOverlay?.syndromePrimary;
    const syndromeLabel = isCaseSummaryLike(caseData)
      ? caseData.infectionSyndrome
      : syndromePrimary
        ? (INFECTION_SYNDROME_LABELS[syndromePrimary] ?? syndromePrimary)
        : undefined;

    infectionItems.push({
      id: `infection-${caseData.id}`,
      type: "infection",
      patientIdentifier: getCaseLikePatientIdentifier(caseData),
      diagnosisTitle: getCaseLikeDiagnosisTitle(caseData),
      specialty: caseData.specialty,
      facility: caseData.facility,
      caseId: caseData.id,
      hasEpisodeLink: !!caseData.episodeId,
      episodeId: caseData.episodeId,
      infectionSyndrome: syndromeLabel,
      canAddHistology: getCaseLikeCanAddHistology(caseData),
    });
  }

  const episodeItems: AttentionItem[] = [];

  for (const { episode, cases: linkedCases } of episodesWithCases) {
    if (!activeStatuses.has(episode.status)) {
      continue;
    }

    // Skip episodes already represented by an inpatient card
    if (suppressedEpisodeIds.has(episode.id)) {
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
      lastProcedureSummary = getCaseLikeDiagnosisTitle(mostRecentCase);
      lastCaseDate = mostRecentCase.procedureDate;
      lastCaseId = mostRecentCase.id;
      lastCaseCanAddHistology = getCaseLikeCanAddHistology(mostRecentCase);
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
      pendingActions: episode.pendingActions?.length
        ? episode.pendingActions.map((a) => PENDING_ACTION_LABELS[a])
        : episode.pendingAction
          ? [PENDING_ACTION_LABELS[episode.pendingAction]]
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
  cases: (Case | CaseSummary)[],
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
      if (hasCaseLikeRecordedOutcome(caseData)) {
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
    diagnosisGroups:
      lastCase && !isCaseSummaryLike(lastCase)
        ? lastCase.diagnosisGroups
        : undefined,
    encounterClass:
      lastCase?.encounterClass as EpisodePrefillData["encounterClass"],
    reconstructionTiming:
      lastCase && !isCaseSummaryLike(lastCase)
        ? lastCase.reconstructionTiming
        : undefined,
    priorRadiotherapy:
      lastCase && !isCaseSummaryLike(lastCase)
        ? lastCase.priorRadiotherapy
        : undefined,
    priorChemotherapy:
      lastCase && !isCaseSummaryLike(lastCase)
        ? lastCase.priorChemotherapy
        : undefined,
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
