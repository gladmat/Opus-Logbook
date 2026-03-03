import { Case, Specialty, Role, FreeFlapDetails, ClavienDindoGrade, getAllProcedures, getCaseSpecialties, SPECIALTY_LABELS } from "@/types/case";
import { INFECTION_SYNDROME_LABELS, InfectionSyndrome } from "@/types/infection";

export type TimePeriod = "all_time" | "this_year" | "last_6_months" | "last_12_months" | "custom";

export interface StatisticsFilters {
  specialty: Specialty | "all";
  timePeriod: TimePeriod;
  customStartDate?: string;
  customEndDate?: string;
  facility: string | "all";
  role: Role | "all";
}

export interface BaseStatistics {
  totalCases: number;
  averageDurationMinutes: number | null;
  complicationRate: number;
  casesByMonth: { month: string; count: number }[];
  casesByFacility: { facility: string; count: number }[];
  followUpCompletionRate: number;
}

export interface FreeFlapStatistics extends BaseStatistics {
  flapSurvivalRate: number;
  averageIschemiaTimeMinutes: number | null;
  casesByFlapType: { flapType: string; count: number }[];
  casesByIndication: { indication: string; count: number }[];
  takeBackRate: number;
}

export interface HandSurgeryStatistics extends BaseStatistics {
  casesByProcedureType: { procedureType: string; count: number }[];
  nerveRepairCount: number;
  tendonRepairCount: number;
}

export interface OrthoplasticStatistics extends BaseStatistics {
  freeFlapCount: number;
  averageIschemiaTimeMinutes: number | null;
  casesByCoverage: { coverage: string; count: number }[];
}

export interface BodyContouringStatistics extends BaseStatistics {
  averageResectionWeightGrams: number | null;
}

export interface BreastStatistics extends BaseStatistics {
  reconstructionCount: number;
  casesByProcedureType: { procedureType: string; count: number }[];
}

export interface InfectionStatistics {
  totalInfectionCases: number;
  activeInfectionCases: number;
  resolvedInfectionCases: number;
  totalEpisodes: number;
  averageEpisodesPerCase: number;
  culturePositiveRate: number;
  casesBySyndrome: { syndrome: string; count: number }[];
  casesBySeverity: { severity: string; count: number }[];
  amputationCount: number;
  mortalityCount: number;
}

export type SpecialtyStatistics = BaseStatistics | FreeFlapStatistics | HandSurgeryStatistics | BodyContouringStatistics | OrthoplasticStatistics | BreastStatistics;

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  all_time: "All Time",
  this_year: "This Year",
  last_6_months: "Last 6 Months",
  last_12_months: "Last 12 Months",
  custom: "Custom Range",
};

export const ROLE_FILTER_LABELS: Record<Role | "all", string> = {
  all: "All Roles",
  PS: "Primary Surgeon",
  PP: "Performed with Peer",
  AS: "Assisting (scrubbed)",
  ONS: "Observing (not scrubbed)",
  SS: "Supervising (scrubbed)",
  SNS: "Supervising (not scrubbed)",
  A: "Available",
};

function isWithinTimePeriod(dateString: string, timePeriod: TimePeriod, customStart?: string, customEnd?: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  
  switch (timePeriod) {
    case "all_time":
      return true;
    case "this_year":
      return date.getFullYear() === now.getFullYear();
    case "last_6_months": {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return date >= sixMonthsAgo;
    }
    case "last_12_months": {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      return date >= twelveMonthsAgo;
    }
    case "custom":
      if (customStart && customEnd) {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        return date >= start && date <= end;
      }
      return true;
    default:
      return true;
  }
}

function getPrimaryRole(caseData: Case): Role {
  const procs = getAllProcedures(caseData);
  if (procs.length > 0) {
    return procs[0].surgeonRole;
  }
  if (caseData.teamMembers && caseData.teamMembers.length > 0) {
    const primary = caseData.teamMembers.find(m => m.role === "PS");
    if (primary) return "PS";
    const supervising = caseData.teamMembers.find(m => m.role === "SS" || m.role === "SNS");
    if (supervising) return supervising.role as Role;
  }
  return "PS";
}

export function filterCases(cases: Case[], filters: StatisticsFilters): Case[] {
  return cases.filter(c => {
    if (filters.specialty !== "all") {
      const caseSpecialties = getCaseSpecialties(c);
      if (!caseSpecialties.includes(filters.specialty)) {
        return false;
      }
    }
    
    if (!isWithinTimePeriod(c.procedureDate, filters.timePeriod, filters.customStartDate, filters.customEndDate)) {
      return false;
    }
    
    if (filters.facility !== "all" && c.facility !== filters.facility) {
      return false;
    }
    
    if (filters.role !== "all") {
      const caseRole = getPrimaryRole(c);
      if (caseRole !== filters.role) {
        return false;
      }
    }
    
    return true;
  });
}

export function calculateBaseStatistics(cases: Case[]): BaseStatistics {
  const totalCases = cases.length;
  
  const durationsMinutes = cases
    .map(c => c.surgeryTiming?.durationMinutes)
    .filter((d): d is number => d !== undefined && d !== null && d > 0);
  
  const averageDurationMinutes = durationsMinutes.length > 0
    ? Math.round(durationsMinutes.reduce((a, b) => a + b, 0) / durationsMinutes.length)
    : null;
  
  const casesWithComplications = cases.filter(c => 
    c.hasComplications === true || 
    (c.complications && c.complications.length > 0) ||
    c.returnToTheatre === true
  ).length;
  const complicationRate = totalCases > 0 ? (casesWithComplications / totalCases) * 100 : 0;
  
  const casesByMonthMap = new Map<string, number>();
  cases.forEach(c => {
    const date = new Date(c.procedureDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    casesByMonthMap.set(monthKey, (casesByMonthMap.get(monthKey) || 0) + 1);
  });
  const casesByMonth = Array.from(casesByMonthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, count]) => ({ month, count }));
  
  const casesByFacilityMap = new Map<string, number>();
  cases.forEach(c => {
    if (c.facility) {
      casesByFacilityMap.set(c.facility, (casesByFacilityMap.get(c.facility) || 0) + 1);
    }
  });
  const casesByFacility = Array.from(casesByFacilityMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([facility, count]) => ({ facility, count }));
  
  const casesNeedingFollowUp = cases.filter(c => {
    const daysSinceProcedure = Math.floor(
      (Date.now() - new Date(c.procedureDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceProcedure >= 30;
  });
  const casesWithFollowUpComplete = casesNeedingFollowUp.filter(c => c.complicationsReviewed === true);
  const followUpCompletionRate = casesNeedingFollowUp.length > 0
    ? (casesWithFollowUpComplete.length / casesNeedingFollowUp.length) * 100
    : 100;
  
  return {
    totalCases,
    averageDurationMinutes,
    complicationRate,
    casesByMonth,
    casesByFacility,
    followUpCompletionRate,
  };
}

export function calculateFreeFlapStatistics(cases: Case[]): FreeFlapStatistics {
  const base = calculateBaseStatistics(cases);
  
  const freeFlapCases = cases.filter(c => 
    getAllProcedures(c).some(p => p.tags?.includes("free_flap")) ||
    c.specialty === "orthoplastic" ||
    c.specialty === "head_neck" ||
    c.specialty === "breast"
  );
  
  const casesWithOutcome = freeFlapCases.filter(c => {
    const complications = c.complications || [];
    const hasFlapLoss = complications.some(comp => 
      comp.description.toLowerCase().includes("flap loss") ||
      comp.description.toLowerCase().includes("total loss") ||
      comp.clavienDindoGrade === "V"
    );
    return c.complicationsReviewed || hasFlapLoss;
  });
  
  const flapLossCases = casesWithOutcome.filter(c => {
    const complications = c.complications || [];
    return complications.some(comp => 
      comp.description.toLowerCase().includes("flap loss") ||
      comp.description.toLowerCase().includes("total loss")
    );
  });
  
  const flapSurvivalRate = casesWithOutcome.length > 0
    ? ((casesWithOutcome.length - flapLossCases.length) / casesWithOutcome.length) * 100
    : 100;
  
  const ischemiaTimesMinutes = freeFlapCases
    .map(c => {
      const procs = getAllProcedures(c);
      for (const proc of procs) {
        const details = proc.clinicalDetails as FreeFlapDetails | undefined;
        if (details?.ischemiaTimeMinutes) {
          return details.ischemiaTimeMinutes;
        }
      }
      const details = c.clinicalDetails as FreeFlapDetails | undefined;
      return details?.ischemiaTimeMinutes;
    })
    .filter((t): t is number => t !== undefined && t !== null && t > 0);
  
  const averageIschemiaTimeMinutes = ischemiaTimesMinutes.length > 0
    ? Math.round(ischemiaTimesMinutes.reduce((a, b) => a + b, 0) / ischemiaTimesMinutes.length)
    : null;
  
  const flapTypeMap = new Map<string, number>();
  freeFlapCases.forEach(c => {
    const flapType = c.procedureType || "Unknown";
    flapTypeMap.set(flapType, (flapTypeMap.get(flapType) || 0) + 1);
  });
  const casesByFlapType = Array.from(flapTypeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([flapType, count]) => ({ flapType, count }));
  
  const indicationMap = new Map<string, number>();
  freeFlapCases.forEach(c => {
    let indication = "Unknown";
    const procs = getAllProcedures(c);
    if (procs.length > 0) {
      for (const proc of procs) {
        const details = proc.clinicalDetails as FreeFlapDetails | undefined;
        if (details?.indication) {
          indication = details.indication;
          break;
        }
      }
    } else {
      const details = c.clinicalDetails as FreeFlapDetails | undefined;
      if (details?.indication) indication = details.indication;
    }
    indicationMap.set(indication, (indicationMap.get(indication) || 0) + 1);
  });
  const casesByIndication = Array.from(indicationMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([indication, count]) => ({ indication, count }));
  
  const takeBackCases = freeFlapCases.filter(c => c.returnToTheatre === true);
  const takeBackRate = freeFlapCases.length > 0
    ? (takeBackCases.length / freeFlapCases.length) * 100
    : 0;
  
  return {
    ...base,
    flapSurvivalRate,
    averageIschemiaTimeMinutes,
    casesByFlapType,
    casesByIndication,
    takeBackRate,
  };
}

export function calculateHandSurgeryStatistics(cases: Case[]): HandSurgeryStatistics {
  const base = calculateBaseStatistics(cases);
  
  const handSurgeryCases = cases.filter(c => c.specialty === "hand_surgery");
  
  const procedureTypeMap = new Map<string, number>();
  handSurgeryCases.forEach(c => {
    const procs = getAllProcedures(c);
    if (procs.length > 0) {
      // Derive procedure type from the actual procedure subcategory or name
      const subcategory = procs[0].subcategory || procs[0].procedureName || "Unknown";
      procedureTypeMap.set(subcategory, (procedureTypeMap.get(subcategory) || 0) + 1);
    } else {
      const pt = c.procedureType || "Unknown";
      procedureTypeMap.set(pt, (procedureTypeMap.get(pt) || 0) + 1);
    }
  });
  const casesByProcedureType = Array.from(procedureTypeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([procedureType, count]) => ({ procedureType, count }));

  const nerveRepairCount = handSurgeryCases.filter(c =>
    getAllProcedures(c).some(p =>
      p.tags?.includes("nerve_repair") ||
      p.subcategory?.toLowerCase().includes("nerve")
    )
  ).length;

  const tendonRepairCount = handSurgeryCases.filter(c =>
    getAllProcedures(c).some(p =>
      p.tags?.includes("tendon_repair") ||
      p.subcategory?.toLowerCase().includes("tendon")
    )
  ).length;
  
  return {
    ...base,
    casesByProcedureType,
    nerveRepairCount,
    tendonRepairCount,
  };
}

export function calculateOrthoplasticStatistics(cases: Case[]): OrthoplasticStatistics {
  const base = calculateBaseStatistics(cases);
  
  const orthoplasticCases = cases.filter(c => c.specialty === "orthoplastic");
  
  const freeFlapCount = orthoplasticCases.filter(c =>
    getAllProcedures(c).some(p =>
      p.tags?.includes("free_flap") ||
      p.subcategory?.toLowerCase().includes("free flap")
    )
  ).length;
  
  const ischemiaTimesMinutes = orthoplasticCases
    .flatMap(c => getAllProcedures(c))
    .map(p => {
      const details = p.clinicalDetails as FreeFlapDetails | undefined;
      return details?.ischemiaTimeMinutes;
    })
    .filter((t): t is number => t !== undefined && t !== null && t > 0);
  
  const averageIschemiaTimeMinutes = ischemiaTimesMinutes.length > 0
    ? Math.round(ischemiaTimesMinutes.reduce((a, b) => a + b, 0) / ischemiaTimesMinutes.length)
    : null;
  
  const coverageMap = new Map<string, number>();
  orthoplasticCases.forEach(c => {
    const procedureType = c.procedureType || "Unknown";
    coverageMap.set(procedureType, (coverageMap.get(procedureType) || 0) + 1);
  });
  const casesByCoverage = Array.from(coverageMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([coverage, count]) => ({ coverage, count }));
  
  return {
    ...base,
    freeFlapCount,
    averageIschemiaTimeMinutes,
    casesByCoverage,
  };
}

export function calculateBreastStatistics(cases: Case[]): BreastStatistics {
  const base = calculateBaseStatistics(cases);
  
  const breastCases = cases.filter(c => c.specialty === "breast");
  
  const reconstructionCount = breastCases.filter(c => 
    c.procedureType?.toLowerCase().includes("reconstruction")
  ).length;
  
  const procedureTypeMap = new Map<string, number>();
  breastCases.forEach(c => {
    const procedureType = c.procedureType || "Unknown";
    procedureTypeMap.set(procedureType, (procedureTypeMap.get(procedureType) || 0) + 1);
  });
  const casesByProcedureType = Array.from(procedureTypeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([procedureType, count]) => ({ procedureType, count }));
  
  return {
    ...base,
    reconstructionCount,
    casesByProcedureType,
  };
}

export function calculateBodyContouringStatistics(cases: Case[]): BodyContouringStatistics {
  const base = calculateBaseStatistics(cases);
  
  const bodyContouringCases = cases.filter(c => c.specialty === "body_contouring");
  
  const resectionWeights: number[] = [];
  bodyContouringCases.forEach(c => {
    getAllProcedures(c).forEach(proc => {
      const details = proc.clinicalDetails as { resectionWeightGrams?: number } | undefined;
      if (details?.resectionWeightGrams) {
        resectionWeights.push(details.resectionWeightGrams);
      }
    });
  });
  
  const averageResectionWeightGrams = resectionWeights.length > 0
    ? Math.round(resectionWeights.reduce((a, b) => a + b, 0) / resectionWeights.length)
    : null;
  
  return {
    ...base,
    averageResectionWeightGrams,
  };
}

export function calculateStatistics(cases: Case[], specialty: Specialty | "all"): SpecialtyStatistics {
  switch (specialty) {
    case "orthoplastic":
      return calculateOrthoplasticStatistics(cases);
    case "hand_surgery":
      return calculateHandSurgeryStatistics(cases);
    case "body_contouring":
      return calculateBodyContouringStatistics(cases);
    case "breast":
      return calculateBreastStatistics(cases);
    default:
      return calculateBaseStatistics(cases);
  }
}

export function getUniqueFacilities(cases: Case[]): string[] {
  const facilities = new Set<string>();
  cases.forEach(c => {
    if (c.facility) {
      facilities.add(c.facility);
    }
  });
  return Array.from(facilities).sort();
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function calculateInfectionStatistics(cases: Case[]): InfectionStatistics {
  const infectionCases = cases.filter(c => c.infectionOverlay);
  const totalInfectionCases = infectionCases.length;
  
  const activeInfectionCases = infectionCases.filter(c => !c.dischargeDate).length;
  const resolvedInfectionCases = infectionCases.filter(c => c.dischargeDate).length;
  
  let totalEpisodes = 0;
  infectionCases.forEach(c => {
    totalEpisodes += c.infectionOverlay?.episodes?.length || 1;
  });
  
  const averageEpisodesPerCase = totalInfectionCases > 0 
    ? Math.round((totalEpisodes / totalInfectionCases) * 10) / 10 
    : 0;
  
  const casesWithCultureData = infectionCases.filter(c => 
    c.infectionOverlay?.microbiology?.culturesTaken
  );
  const culturePositiveCases = casesWithCultureData.filter(c =>
    c.infectionOverlay?.microbiology?.cultureStatus === "positive" ||
    (c.infectionOverlay?.microbiology?.organisms && c.infectionOverlay.microbiology.organisms.length > 0)
  );
  const culturePositiveRate = casesWithCultureData.length > 0
    ? (culturePositiveCases.length / casesWithCultureData.length) * 100
    : 0;
  
  const syndromeCounts = new Map<string, number>();
  infectionCases.forEach(c => {
    const syndrome = c.infectionOverlay?.syndromePrimary;
    if (syndrome) {
      const label = INFECTION_SYNDROME_LABELS[syndrome] || syndrome;
      syndromeCounts.set(label, (syndromeCounts.get(label) || 0) + 1);
    }
  });
  const casesBySyndrome = Array.from(syndromeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([syndrome, count]) => ({ syndrome, count }));
  
  const severityCounts = new Map<string, number>();
  infectionCases.forEach(c => {
    const severity = c.infectionOverlay?.severity;
    if (severity) {
      const severityLabels: Record<string, string> = {
        local: "Local",
        systemic_sepsis: "Systemic/Sepsis", 
        shock_icu: "Shock/ICU",
      };
      const label = severityLabels[severity] || severity;
      severityCounts.set(label, (severityCounts.get(label) || 0) + 1);
    }
  });
  const casesBySeverity = Array.from(severityCounts.entries())
    .sort((a, b) => {
      const order = ["Local", "Systemic/Sepsis", "Shock/ICU"];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    })
    .map(([severity, count]) => ({ severity, count }));
  
  let amputationCount = 0;
  let mortalityCount = 0;
  infectionCases.forEach(c => {
    c.infectionOverlay?.episodes?.forEach(ep => {
      if (ep.amputationLevel) {
        amputationCount++;
      }
    });
    if (c.infectionOverlay?.status === "deceased") {
      mortalityCount++;
    }
  });
  
  return {
    totalInfectionCases,
    activeInfectionCases,
    resolvedInfectionCases,
    totalEpisodes,
    averageEpisodesPerCase,
    culturePositiveRate,
    casesBySyndrome,
    casesBySeverity,
    amputationCount,
    mortalityCount,
  };
}

// ─── Top Diagnosis-Procedure Combinations (Phase 4) ──────────────────────

export interface DiagnosisProcedurePair {
  diagnosisName: string;
  diagnosisSnomedCode?: string;
  procedureName: string;
  procedureSnomedCode?: string;
  count: number;
}

export function calculateTopDiagnosisProcedurePairs(
  cases: Case[],
  limit: number = 10,
): DiagnosisProcedurePair[] {
  const pairCounts = new Map<string, DiagnosisProcedurePair>();

  for (const c of cases) {
    for (const group of c.diagnosisGroups) {
      const dxName = group.diagnosis?.displayName;
      if (!dxName) continue;

      for (const proc of group.procedures) {
        if (!proc.procedureName.trim()) continue;
        const key = `${dxName}|||${proc.procedureName}`;
        const existing = pairCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          pairCounts.set(key, {
            diagnosisName: dxName,
            diagnosisSnomedCode: group.diagnosis?.snomedCtCode,
            procedureName: proc.procedureName,
            procedureSnomedCode: proc.snomedCtCode,
            count: 1,
          });
        }
      }
    }
  }

  return Array.from(pairCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ─── Suggestion Acceptance Rate (Phase 4) ────────────────────────────────

export interface SuggestionAcceptanceStats {
  totalSuggestedGroups: number;
  totalSuggestedProcedures: number;
  totalAcceptedProcedures: number;
  totalManuallyAdded: number;
  acceptanceRate: number;
}

export function calculateSuggestionAcceptanceStats(
  cases: Case[],
): SuggestionAcceptanceStats {
  let totalSuggestedGroups = 0;
  let totalSuggestedProcedures = 0;
  let totalAcceptedProcedures = 0;
  let totalManuallyAdded = 0;

  for (const c of cases) {
    const log = c.suggestionAcceptanceLog;
    if (!log) continue;

    for (const entry of log) {
      totalSuggestedGroups++;
      totalSuggestedProcedures += entry.suggestedProcedureIds.length;
      totalAcceptedProcedures += entry.acceptedProcedureIds.length;
      totalManuallyAdded += entry.addedManuallyIds.length;
    }
  }

  return {
    totalSuggestedGroups,
    totalSuggestedProcedures,
    totalAcceptedProcedures,
    totalManuallyAdded,
    acceptanceRate:
      totalSuggestedProcedures > 0
        ? (totalAcceptedProcedures / totalSuggestedProcedures) * 100
        : 0,
  };
}

// ─── Case Entry Time Statistics (Phase 4) ────────────────────────────────

export interface EntryTimeStats {
  averageEntryTimeSeconds: number | null;
  medianEntryTimeSeconds: number | null;
  entryTimeBySpecialty: Array<{
    specialty: string;
    averageSeconds: number;
    count: number;
  }>;
}

export function calculateEntryTimeStats(cases: Case[]): EntryTimeStats {
  const casesWithTime = cases.filter(
    (c) =>
      c.entryDurationSeconds != null &&
      c.entryDurationSeconds > 0 &&
      c.entryDurationSeconds < 7200,
  );

  if (casesWithTime.length === 0) {
    return {
      averageEntryTimeSeconds: null,
      medianEntryTimeSeconds: null,
      entryTimeBySpecialty: [],
    };
  }

  const durations = casesWithTime
    .map((c) => c.entryDurationSeconds!)
    .sort((a, b) => a - b);

  const averageEntryTimeSeconds = Math.round(
    durations.reduce((a, b) => a + b, 0) / durations.length,
  );

  const mid = Math.floor(durations.length / 2);
  const medianEntryTimeSeconds =
    durations.length % 2 === 0
      ? Math.round((durations[mid - 1] + durations[mid]) / 2)
      : durations[mid];

  const bySpecialty = new Map<string, { total: number; count: number }>();
  for (const c of casesWithTime) {
    const key = c.specialty;
    const existing = bySpecialty.get(key) || { total: 0, count: 0 };
    existing.total += c.entryDurationSeconds!;
    existing.count++;
    bySpecialty.set(key, existing);
  }

  const entryTimeBySpecialty = Array.from(bySpecialty.entries())
    .map(([specialty, { total, count }]) => ({
      specialty: SPECIALTY_LABELS[specialty as Specialty] || specialty,
      averageSeconds: Math.round(total / count),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    averageEntryTimeSeconds,
    medianEntryTimeSeconds,
    entryTimeBySpecialty,
  };
}

export function formatEntryTime(seconds: number | null): string {
  if (seconds === null) return "\u2014";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
