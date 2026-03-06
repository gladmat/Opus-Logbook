import {
  Case,
  Specialty,
  Role,
  FreeFlapDetails,
  ClavienDindoGrade,
  getAllProcedures,
  getCaseSpecialties,
  SPECIALTY_LABELS,
  type FreeFlapOutcomeDetails,
  type DonorSiteComplication,
  type RecipientSiteComplication,
  DONOR_SITE_COMPLICATION_LABELS,
  RECIPIENT_SITE_COMPLICATION_LABELS,
} from "@/types/case";
import {
  ANTICOAGULATION_PROTOCOLS,
  FLAP_MONITORING_PROTOCOLS,
} from "@/types/surgicalPreferences";
import {
  INFECTION_SYNDROME_LABELS,
  InfectionSyndrome,
} from "@/types/infection";

export type TimePeriod =
  | "all_time"
  | "this_year"
  | "last_6_months"
  | "last_12_months"
  | "custom";

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
  partialLossRate: number;
  totalLossRate: number;
  averageIschemiaTimeMinutes: number | null;
  averageWarmIschemiaMinutes: number | null;
  casesByFlapType: { flapType: string; count: number }[];
  casesByIndication: { indication: string; count: number }[];
  takeBackRate: number;
  reExplorationRate: number;
  salvageRate: number;
  donorSiteComplicationRate: number;
  recipientSiteComplicationRate: number;
  mostCommonDonorComplication: string | null;
  mostCommonRecipientComplication: string | null;
  anticoagulationDistribution: { protocol: string; count: number }[];
  monitoringDistribution: { protocol: string; count: number }[];
  /** Number of flap procedures with structured outcome data */
  structuredOutcomeCount: number;
  /** Number using legacy string-matching fallback */
  legacyOutcomeCount: number;
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

export type SpecialtyStatistics =
  | BaseStatistics
  | FreeFlapStatistics
  | HandSurgeryStatistics
  | BodyContouringStatistics
  | OrthoplasticStatistics
  | BreastStatistics;

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

function isWithinTimePeriod(
  dateString: string,
  timePeriod: TimePeriod,
  customStart?: string,
  customEnd?: string,
): boolean {
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
    return procs[0]!.surgeonRole;
  }
  if (caseData.teamMembers && caseData.teamMembers.length > 0) {
    const primary = caseData.teamMembers.find((m) => m.role === "PS");
    if (primary) return "PS";
    const supervising = caseData.teamMembers.find(
      (m) => m.role === "SS" || m.role === "SNS",
    );
    if (supervising) return supervising.role as Role;
  }
  return "PS";
}

export function filterCases(cases: Case[], filters: StatisticsFilters): Case[] {
  return cases.filter((c) => {
    if (filters.specialty !== "all") {
      const caseSpecialties = getCaseSpecialties(c);
      if (!caseSpecialties.includes(filters.specialty)) {
        return false;
      }
    }

    if (
      !isWithinTimePeriod(
        c.procedureDate,
        filters.timePeriod,
        filters.customStartDate,
        filters.customEndDate,
      )
    ) {
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
    .map((c) => c.surgeryTiming?.durationMinutes)
    .filter((d): d is number => d !== undefined && d !== null && d > 0);

  const averageDurationMinutes =
    durationsMinutes.length > 0
      ? Math.round(
          durationsMinutes.reduce((a, b) => a + b, 0) / durationsMinutes.length,
        )
      : null;

  const casesWithComplications = cases.filter(
    (c) =>
      c.hasComplications === true ||
      (c.complications && c.complications.length > 0) ||
      c.returnToTheatre === true,
  ).length;
  const complicationRate =
    totalCases > 0 ? (casesWithComplications / totalCases) * 100 : 0;

  const casesByMonthMap = new Map<string, number>();
  cases.forEach((c) => {
    const date = new Date(c.procedureDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    casesByMonthMap.set(monthKey, (casesByMonthMap.get(monthKey) || 0) + 1);
  });
  const casesByMonth = Array.from(casesByMonthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, count]) => ({ month, count }));

  const casesByFacilityMap = new Map<string, number>();
  cases.forEach((c) => {
    if (c.facility) {
      casesByFacilityMap.set(
        c.facility,
        (casesByFacilityMap.get(c.facility) || 0) + 1,
      );
    }
  });
  const casesByFacility = Array.from(casesByFacilityMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([facility, count]) => ({ facility, count }));

  const casesNeedingFollowUp = cases.filter((c) => {
    const daysSinceProcedure = Math.floor(
      (Date.now() - new Date(c.procedureDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return daysSinceProcedure >= 30;
  });
  const casesWithFollowUpComplete = casesNeedingFollowUp.filter(
    (c) => c.complicationsReviewed === true,
  );
  const followUpCompletionRate =
    casesNeedingFollowUp.length > 0
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

/**
 * Extract all free flap procedures from a case, returning the procedure + its FreeFlapDetails.
 */
function extractFreeFlapProcedures(
  c: Case,
): { details: FreeFlapDetails; procId?: string }[] {
  const results: { details: FreeFlapDetails; procId?: string }[] = [];
  for (const group of c.diagnosisGroups) {
    for (const proc of group.procedures) {
      if (proc.tags?.includes("free_flap") && proc.clinicalDetails) {
        results.push({
          details: proc.clinicalDetails as FreeFlapDetails,
          procId: proc.id,
        });
      }
    }
  }
  // Legacy flat structure fallback
  if (results.length === 0) {
    const legacy = c.clinicalDetails as FreeFlapDetails | undefined;
    if (legacy?.flapType) {
      results.push({ details: legacy });
    }
  }
  return results;
}

export function calculateFreeFlapStatistics(cases: Case[]): FreeFlapStatistics {
  const base = calculateBaseStatistics(cases);

  // Identify cases containing at least one free flap procedure
  const freeFlapCases = cases.filter(
    (c) =>
      getAllProcedures(c).some((p) => p.tags?.includes("free_flap")) ||
      c.specialty === "orthoplastic" ||
      c.specialty === "head_neck" ||
      c.specialty === "breast",
  );

  // ─── Survival analysis: structured first, legacy fallback ───────────
  let structuredOutcomeCount = 0;
  let legacyOutcomeCount = 0;
  let structuredComplete = 0;
  let structuredPartial = 0;
  let structuredTotal = 0;
  let legacySurvived = 0;
  let legacyLost = 0;

  // Re-exploration & salvage
  let reExplorationCount = 0;
  let salvageAttempts = 0;
  let salvageSuccesses = 0;

  // Complications
  const donorCompCounts = new Map<DonorSiteComplication, number>();
  const recipientCompCounts = new Map<RecipientSiteComplication, number>();
  let procsWithDonorComp = 0;
  let procsWithRecipientComp = 0;
  let totalFreeFlapProcs = 0;

  // Protocol distributions
  const anticoagMap = new Map<string, number>();
  const monitoringMap = new Map<string, number>();

  // Ischemia
  const ischemiaTimesMinutes: number[] = [];
  const warmIschemiaTimesMinutes: number[] = [];

  // Flap type & indication
  const flapTypeMap = new Map<string, number>();
  const indicationMap = new Map<string, number>();

  for (const c of freeFlapCases) {
    const flapProcs = extractFreeFlapProcedures(c);

    for (const { details } of flapProcs) {
      totalFreeFlapProcs++;

      // ── Survival classification ──
      const outcome = details.flapOutcome;
      if (outcome) {
        structuredOutcomeCount++;
        switch (outcome.flapSurvival) {
          case "complete_survival":
            structuredComplete++;
            break;
          case "partial_loss":
            structuredPartial++;
            break;
          case "total_loss":
            structuredTotal++;
            break;
        }

        // Re-exploration
        if (outcome.reExploration?.reExplored) {
          reExplorationCount++;
          const events = outcome.reExploration.events || [];
          for (const evt of events) {
            salvageAttempts++;
            if (
              evt.salvageOutcome === "salvaged_complete" ||
              evt.salvageOutcome === "salvaged_partial_loss"
            ) {
              salvageSuccesses++;
            }
          }
        }

        // Donor site complications
        if (outcome.donorSiteComplications?.length) {
          procsWithDonorComp++;
          for (const comp of outcome.donorSiteComplications) {
            donorCompCounts.set(
              comp,
              (donorCompCounts.get(comp) || 0) + 1,
            );
          }
        }

        // Recipient site complications
        if (outcome.recipientSiteComplications?.length) {
          procsWithRecipientComp++;
          for (const comp of outcome.recipientSiteComplications) {
            recipientCompCounts.set(
              comp,
              (recipientCompCounts.get(comp) || 0) + 1,
            );
          }
        }

        // Monitoring protocol
        if (outcome.monitoringProtocol) {
          const label =
            FLAP_MONITORING_PROTOCOLS.find(
              (p) => p.id === outcome.monitoringProtocol,
            )?.label || outcome.monitoringProtocol;
          monitoringMap.set(label, (monitoringMap.get(label) || 0) + 1);
        }
      }

      // ── Ischemia ──
      if (details.ischemiaTimeMinutes && details.ischemiaTimeMinutes > 0) {
        ischemiaTimesMinutes.push(details.ischemiaTimeMinutes);
      }
      if (details.warmIschemiaMinutes && details.warmIschemiaMinutes > 0) {
        warmIschemiaTimesMinutes.push(details.warmIschemiaMinutes);
      }

      // ── Anticoagulation ──
      if (details.anticoagulationProtocol) {
        const label =
          ANTICOAGULATION_PROTOCOLS.find(
            (p) => p.id === details.anticoagulationProtocol,
          )?.label || details.anticoagulationProtocol;
        anticoagMap.set(label, (anticoagMap.get(label) || 0) + 1);
      }

      // ── Flap type ──
      const flapType = details.flapType || "Unknown";
      flapTypeMap.set(flapType, (flapTypeMap.get(flapType) || 0) + 1);

      // ── Indication ──
      const indication = details.indication || "Unknown";
      indicationMap.set(indication, (indicationMap.get(indication) || 0) + 1);
    }

    // Legacy fallback for cases without structured outcomes
    if (flapProcs.every((fp) => !fp.details.flapOutcome)) {
      // Try legacy string-matching on case-level complications
      const complications = c.complications || [];
      const hasFlapLoss = complications.some(
        (comp) =>
          comp.description.toLowerCase().includes("flap loss") ||
          comp.description.toLowerCase().includes("total loss"),
      );
      if (c.complicationsReviewed || hasFlapLoss) {
        legacyOutcomeCount++;
        if (hasFlapLoss) {
          legacyLost++;
        } else {
          legacySurvived++;
        }
      }
    }
  }

  // ─── Aggregate survival rates ───────────────────────────────────────
  const totalWithOutcome =
    structuredOutcomeCount + legacyOutcomeCount;
  const totalSurvived = structuredComplete + legacySurvived;
  const totalPartialLoss = structuredPartial;
  const totalTotalLoss = structuredTotal + legacyLost;

  const flapSurvivalRate =
    totalWithOutcome > 0
      ? (totalSurvived / totalWithOutcome) * 100
      : 100;
  const partialLossRate =
    totalWithOutcome > 0
      ? (totalPartialLoss / totalWithOutcome) * 100
      : 0;
  const totalLossRate =
    totalWithOutcome > 0
      ? (totalTotalLoss / totalWithOutcome) * 100
      : 0;

  // ─── Ischemia averages ──────────────────────────────────────────────
  const averageIschemiaTimeMinutes =
    ischemiaTimesMinutes.length > 0
      ? Math.round(
          ischemiaTimesMinutes.reduce((a, b) => a + b, 0) /
            ischemiaTimesMinutes.length,
        )
      : null;

  const averageWarmIschemiaMinutes =
    warmIschemiaTimesMinutes.length > 0
      ? Math.round(
          warmIschemiaTimesMinutes.reduce((a, b) => a + b, 0) /
            warmIschemiaTimesMinutes.length,
        )
      : null;

  // ─── Re-exploration & salvage ───────────────────────────────────────
  const reExplorationRate =
    totalFreeFlapProcs > 0
      ? (reExplorationCount / totalFreeFlapProcs) * 100
      : 0;
  const salvageRate =
    salvageAttempts > 0
      ? (salvageSuccesses / salvageAttempts) * 100
      : 0;

  // ─── Complication rates ─────────────────────────────────────────────
  const donorSiteComplicationRate =
    totalFreeFlapProcs > 0
      ? (procsWithDonorComp / totalFreeFlapProcs) * 100
      : 0;
  const recipientSiteComplicationRate =
    totalFreeFlapProcs > 0
      ? (procsWithRecipientComp / totalFreeFlapProcs) * 100
      : 0;

  // Most common complications
  let mostCommonDonorComplication: string | null = null;
  if (donorCompCounts.size > 0) {
    const top = Array.from(donorCompCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0]!;
    mostCommonDonorComplication =
      DONOR_SITE_COMPLICATION_LABELS[top[0]] || top[0];
  }

  let mostCommonRecipientComplication: string | null = null;
  if (recipientCompCounts.size > 0) {
    const top = Array.from(recipientCompCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0]!;
    mostCommonRecipientComplication =
      RECIPIENT_SITE_COMPLICATION_LABELS[top[0]] || top[0];
  }

  // ─── Protocol distributions ─────────────────────────────────────────
  const anticoagulationDistribution = Array.from(anticoagMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([protocol, count]) => ({ protocol, count }));

  const monitoringDistribution = Array.from(monitoringMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([protocol, count]) => ({ protocol, count }));

  // ─── Flap type & indication breakdowns ──────────────────────────────
  const casesByFlapType = Array.from(flapTypeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([flapType, count]) => ({ flapType, count }));

  const casesByIndication = Array.from(indicationMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([indication, count]) => ({ indication, count }));

  // ─── Take-back rate ─────────────────────────────────────────────────
  const takeBackCases = freeFlapCases.filter((c) => c.returnToTheatre === true);
  const takeBackRate =
    freeFlapCases.length > 0
      ? (takeBackCases.length / freeFlapCases.length) * 100
      : 0;

  return {
    ...base,
    flapSurvivalRate,
    partialLossRate,
    totalLossRate,
    averageIschemiaTimeMinutes,
    averageWarmIschemiaMinutes,
    casesByFlapType,
    casesByIndication,
    takeBackRate,
    reExplorationRate,
    salvageRate,
    donorSiteComplicationRate,
    recipientSiteComplicationRate,
    mostCommonDonorComplication,
    mostCommonRecipientComplication,
    anticoagulationDistribution,
    monitoringDistribution,
    structuredOutcomeCount,
    legacyOutcomeCount,
  };
}

export function calculateHandSurgeryStatistics(
  cases: Case[],
): HandSurgeryStatistics {
  const base = calculateBaseStatistics(cases);

  const handSurgeryCases = cases.filter((c) => c.specialty === "hand_wrist");

  const procedureTypeMap = new Map<string, number>();
  handSurgeryCases.forEach((c) => {
    const procs = getAllProcedures(c);
    if (procs.length > 0) {
      // Derive procedure type from the actual procedure subcategory or name
      const subcategory =
        procs[0]!.subcategory || procs[0]!.procedureName || "Unknown";
      procedureTypeMap.set(
        subcategory,
        (procedureTypeMap.get(subcategory) || 0) + 1,
      );
    } else {
      const pt = c.procedureType || "Unknown";
      procedureTypeMap.set(pt, (procedureTypeMap.get(pt) || 0) + 1);
    }
  });
  const casesByProcedureType = Array.from(procedureTypeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([procedureType, count]) => ({ procedureType, count }));

  const nerveRepairCount = handSurgeryCases.filter((c) =>
    getAllProcedures(c).some(
      (p) =>
        p.tags?.includes("nerve_repair") ||
        p.subcategory?.toLowerCase().includes("nerve"),
    ),
  ).length;

  const tendonRepairCount = handSurgeryCases.filter((c) =>
    getAllProcedures(c).some(
      (p) =>
        p.tags?.includes("tendon_repair") ||
        p.subcategory?.toLowerCase().includes("tendon"),
    ),
  ).length;

  return {
    ...base,
    casesByProcedureType,
    nerveRepairCount,
    tendonRepairCount,
  };
}

export function calculateOrthoplasticStatistics(
  cases: Case[],
): OrthoplasticStatistics {
  const base = calculateBaseStatistics(cases);

  const orthoplasticCases = cases.filter((c) => c.specialty === "orthoplastic");

  const freeFlapCount = orthoplasticCases.filter((c) =>
    getAllProcedures(c).some(
      (p) =>
        p.tags?.includes("free_flap") ||
        p.subcategory?.toLowerCase().includes("free flap"),
    ),
  ).length;

  const ischemiaTimesMinutes = orthoplasticCases
    .flatMap((c) => getAllProcedures(c))
    .map((p) => {
      const details = p.clinicalDetails as FreeFlapDetails | undefined;
      return details?.ischemiaTimeMinutes;
    })
    .filter((t): t is number => t !== undefined && t !== null && t > 0);

  const averageIschemiaTimeMinutes =
    ischemiaTimesMinutes.length > 0
      ? Math.round(
          ischemiaTimesMinutes.reduce((a, b) => a + b, 0) /
            ischemiaTimesMinutes.length,
        )
      : null;

  const coverageMap = new Map<string, number>();
  orthoplasticCases.forEach((c) => {
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

  const breastCases = cases.filter((c) => c.specialty === "breast");

  const reconstructionCount = breastCases.filter((c) =>
    c.procedureType?.toLowerCase().includes("reconstruction"),
  ).length;

  const procedureTypeMap = new Map<string, number>();
  breastCases.forEach((c) => {
    const procedureType = c.procedureType || "Unknown";
    procedureTypeMap.set(
      procedureType,
      (procedureTypeMap.get(procedureType) || 0) + 1,
    );
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

export function calculateBodyContouringStatistics(
  cases: Case[],
): BodyContouringStatistics {
  const base = calculateBaseStatistics(cases);

  const bodyContouringCases = cases.filter(
    (c) => c.specialty === "body_contouring",
  );

  const resectionWeights: number[] = [];
  bodyContouringCases.forEach((c) => {
    getAllProcedures(c).forEach((proc) => {
      const details = proc.clinicalDetails as
        | { resectionWeightGrams?: number }
        | undefined;
      if (details?.resectionWeightGrams) {
        resectionWeights.push(details.resectionWeightGrams);
      }
    });
  });

  const averageResectionWeightGrams =
    resectionWeights.length > 0
      ? Math.round(
          resectionWeights.reduce((a, b) => a + b, 0) / resectionWeights.length,
        )
      : null;

  return {
    ...base,
    averageResectionWeightGrams,
  };
}

export function calculateStatistics(
  cases: Case[],
  specialty: Specialty | "all",
): SpecialtyStatistics {
  switch (specialty) {
    case "orthoplastic":
      return calculateOrthoplasticStatistics(cases);
    case "hand_wrist":
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
  cases.forEach((c) => {
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
  const parts = monthKey.split("-");
  const date = new Date(
    parseInt(parts[0] ?? "0"),
    parseInt(parts[1] ?? "1") - 1,
  );
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function calculateInfectionStatistics(
  cases: Case[],
): InfectionStatistics {
  const infectionCases = cases.filter((c) => c.infectionOverlay);
  const totalInfectionCases = infectionCases.length;

  const activeInfectionCases = infectionCases.filter(
    (c) => !c.dischargeDate,
  ).length;
  const resolvedInfectionCases = infectionCases.filter(
    (c) => c.dischargeDate,
  ).length;

  let totalEpisodes = 0;
  infectionCases.forEach((c) => {
    totalEpisodes += c.infectionOverlay?.episodes?.length || 1;
  });

  const averageEpisodesPerCase =
    totalInfectionCases > 0
      ? Math.round((totalEpisodes / totalInfectionCases) * 10) / 10
      : 0;

  const casesWithCultureData = infectionCases.filter(
    (c) => c.infectionOverlay?.microbiology?.culturesTaken,
  );
  const culturePositiveCases = casesWithCultureData.filter(
    (c) =>
      c.infectionOverlay?.microbiology?.cultureStatus === "positive" ||
      (c.infectionOverlay?.microbiology?.organisms &&
        c.infectionOverlay.microbiology.organisms.length > 0),
  );
  const culturePositiveRate =
    casesWithCultureData.length > 0
      ? (culturePositiveCases.length / casesWithCultureData.length) * 100
      : 0;

  const syndromeCounts = new Map<string, number>();
  infectionCases.forEach((c) => {
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
  infectionCases.forEach((c) => {
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
  infectionCases.forEach((c) => {
    c.infectionOverlay?.episodes?.forEach((ep) => {
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
      ? Math.round(((durations[mid - 1] ?? 0) + (durations[mid] ?? 0)) / 2)
      : (durations[mid] ?? null);

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
