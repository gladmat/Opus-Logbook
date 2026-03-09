import {
  Case,
  Specialty,
  Role,
  SPECIALTY_LABELS,
  ROLE_LABELS,
  getCaseSpecialties,
  getAllProcedures,
} from "@/types/case";
import type { SkinCancerPathologyCategory } from "@/types/skinCancer";
import {
  calculateBaseStatistics,
  calculateEntryTimeStats,
  calculateTopDiagnosisProcedurePairs,
  type BaseStatistics,
  type DiagnosisProcedurePair,
} from "@/lib/statistics";
import { parseIsoDateValue } from "@/lib/dateValues";

// ─── Ordinal suffix helper ──────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"] as const;
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// ─── Career Overview ─────────────────────────────────────────────────────

export interface CareerOverview {
  totalCases: number;
  firstCaseDate: string | null;
  monthsActive: number;
  specialtiesUsed: Specialty[];
  specialtyDistribution: {
    specialty: Specialty;
    label: string;
    count: number;
  }[];
}

export function computeCareerOverview(cases: Case[]): CareerOverview {
  const totalCases = cases.length;

  // Sort by procedureDate ascending
  const sorted = [...cases]
    .filter((c) => parseIsoDateValue(c.procedureDate) !== null)
    .sort((a, b) => a.procedureDate.localeCompare(b.procedureDate));

  const firstCaseDate = sorted.length > 0 ? sorted[0]!.procedureDate : null;

  let monthsActive = 0;
  if (firstCaseDate) {
    const first = parseIsoDateValue(firstCaseDate);
    const now = new Date();
    if (first) {
      monthsActive =
        (now.getFullYear() - first.getFullYear()) * 12 +
        (now.getMonth() - first.getMonth());
      if (monthsActive < 1 && totalCases > 0) monthsActive = 1;
    }
  }

  // Count per specialty using getCaseSpecialties (handles multi-specialty cases)
  const specCounts = new Map<Specialty, number>();
  for (const c of cases) {
    const specs = getCaseSpecialties(c);
    for (const s of specs) {
      specCounts.set(s, (specCounts.get(s) ?? 0) + 1);
    }
  }

  const specialtiesUsed = Array.from(specCounts.keys());
  const specialtyDistribution = Array.from(specCounts.entries())
    .map(([specialty, count]) => ({
      specialty,
      label: SPECIALTY_LABELS[specialty] ?? specialty,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalCases,
    firstCaseDate,
    monthsActive,
    specialtiesUsed,
    specialtyDistribution,
  };
}

// ─── Monthly Volume ──────────────────────────────────────────────────────

export interface MonthlyVolume {
  month: string; // "2025-01" format
  label: string; // "Jan 25" for chart axis
  count: number;
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function computeMonthlyVolume(cases: Case[]): MonthlyVolume[] {
  // Group cases by YYYY-MM
  const counts = new Map<string, number>();
  for (const c of cases) {
    const date = parseIsoDateValue(c.procedureDate);
    if (!date) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Generate last 12 months (including current), zero-fill gaps
  const result: MonthlyVolume[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthIdx = d.getMonth();
    const yearShort = String(d.getFullYear()).slice(-2);
    result.push({
      month: key,
      label: `${MONTH_SHORT[monthIdx]} ${yearShort}`,
      count: counts.get(key) ?? 0,
    });
  }

  return result;
}

export function formatMilestoneDate(dateStr: string): string {
  const date = parseIsoDateValue(dateStr);
  if (!date) return dateStr;
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

// ─── Operational Insights ────────────────────────────────────────────────

export interface OperationalInsights {
  facilityBreakdown: { name: string; count: number }[];
  roleBreakdown: { role: string; label: string; count: number }[];
  avgEntryTimeSeconds: number | null;
  medianEntryTimeSeconds: number | null;
  timedEntryCount: number;
  completionRate: number;
  topDxProcPairs: DiagnosisProcedurePair[];
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

export function computeOperationalInsights(
  cases: Case[],
  precomputedBase?: BaseStatistics,
): OperationalInsights {
  const base = precomputedBase ?? calculateBaseStatistics(cases);

  // Facility breakdown
  const facilityBreakdown = base.casesByFacility.map((f) => ({
    name: f.facility,
    count: f.count,
  }));

  // Role breakdown
  const roleCounts = new Map<Role, number>();
  for (const c of cases) {
    const role = getPrimaryRole(c);
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }
  const roleBreakdown = Array.from(roleCounts.entries())
    .map(([role, count]) => ({
      role,
      label: ROLE_LABELS[role] ?? role,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Entry time
  const entryTime = calculateEntryTimeStats(cases);
  const timedEntryCount = cases.filter(
    (c) =>
      c.entryDurationSeconds != null &&
      c.entryDurationSeconds > 0 &&
      c.entryDurationSeconds < 7200,
  ).length;

  // Data completeness: % of cases with patient ID, date, facility, diagnosis, procedure
  const completeCount = cases.filter(
    (c) =>
      c.patientIdentifier &&
      c.procedureDate &&
      c.facility &&
      (c.diagnosisGroups?.length ?? 0) > 0 &&
      getAllProcedures(c).length > 0,
  ).length;
  const completionRate =
    cases.length > 0 ? (completeCount / cases.length) * 100 : 100;

  // Top dx-proc pairs
  const topDxProcPairs = calculateTopDiagnosisProcedurePairs(cases, 10);

  return {
    facilityBreakdown,
    roleBreakdown,
    avgEntryTimeSeconds: entryTime.averageEntryTimeSeconds,
    medianEntryTimeSeconds: entryTime.medianEntryTimeSeconds,
    timedEntryCount,
    completionRate,
    topDxProcPairs,
  };
}

// ─── Milestones ──────────────────────────────────────────────────────────

export interface MilestoneEvent {
  label: string;
  date: string;
  caseIndex: number;
}

const COUNT_MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000] as const;

export function computeMilestones(cases: Case[]): MilestoneEvent[] {
  if (cases.length === 0) return [];

  const sorted = [...cases].sort((a, b) =>
    a.procedureDate.localeCompare(b.procedureDate),
  );

  const milestones: MilestoneEvent[] = [];

  // Count milestones
  for (const n of COUNT_MILESTONES) {
    if (n <= sorted.length) {
      const c = sorted[n - 1]!;
      milestones.push({
        label: n === 1 ? "First case" : `${ordinal(n)} case`,
        date: c.procedureDate,
        caseIndex: n,
      });
    }
  }

  // First case per specialty
  const seenSpecialties = new Set<Specialty>();
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i]!;
    const specs = getCaseSpecialties(c);
    for (const s of specs) {
      if (!seenSpecialties.has(s)) {
        seenSpecialties.add(s);
        // Only add if this isn't the very first case (already captured)
        if (i > 0) {
          milestones.push({
            label: `First ${SPECIALTY_LABELS[s] ?? s} case`,
            date: c.procedureDate,
            caseIndex: i + 1,
          });
        }
      }
    }
  }

  // First free flap
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i]!;
    const procs = getAllProcedures(c);
    const hasFreeFlap = procs.some((p) => p.tags?.includes("free_flap"));
    if (hasFreeFlap) {
      milestones.push({
        label: "First free flap",
        date: c.procedureDate,
        caseIndex: i + 1,
      });
      break;
    }
  }

  // Sort by date ascending, then by caseIndex
  milestones.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : a.caseIndex - b.caseIndex;
  });

  return milestones;
}

// ─── Skin Cancer Insights ───────────────────────────────────────────────

export interface SkinCancerInsights {
  pathologyCounts: { category: string; count: number }[];
  histologyCompletionRate: number;
  totalLesions: number;
  lesionsWithHistology: number;
}

const PATHOLOGY_LABELS: Record<SkinCancerPathologyCategory, string> = {
  bcc: "BCC",
  scc: "SCC",
  melanoma: "Melanoma",
  merkel_cell: "Merkel Cell",
  rare_malignant: "Rare Malignant",
  benign: "Benign",
  uncertain: "Uncertain",
};

export function computeSkinCancerInsights(cases: Case[]): SkinCancerInsights {
  const catCounts = new Map<SkinCancerPathologyCategory, number>();
  let totalLesions = 0;
  let lesionsWithHistology = 0;

  for (const c of cases) {
    for (const g of c.diagnosisGroups ?? []) {
      // Single-lesion mode
      const sca = g.skinCancerAssessment;
      if (sca) {
        totalLesions++;
        const cat =
          sca.currentHistology?.pathologyCategory ??
          sca.priorHistology?.pathologyCategory ??
          sca.clinicalSuspicion;
        if (cat) {
          catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
        }
        if (sca.currentHistology) {
          lesionsWithHistology++;
        }
      }
      // Multi-lesion mode
      if (g.isMultiLesion && g.lesionInstances) {
        for (const lesion of g.lesionInstances) {
          const lsca = lesion.skinCancerAssessment;
          if (lsca) {
            totalLesions++;
            const cat =
              lsca.currentHistology?.pathologyCategory ??
              lsca.priorHistology?.pathologyCategory ??
              lsca.clinicalSuspicion;
            if (cat) {
              catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
            }
            if (lsca.currentHistology) {
              lesionsWithHistology++;
            }
          }
        }
      }
    }
  }

  const pathologyCounts = Array.from(catCounts.entries())
    .map(([category, count]) => ({
      category: PATHOLOGY_LABELS[category] ?? category,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const histologyCompletionRate =
    totalLesions > 0 ? (lesionsWithHistology / totalLesions) * 100 : 100;

  return {
    pathologyCounts,
    histologyCompletionRate,
    totalLesions,
    lesionsWithHistology,
  };
}

// ─── Burns Insights ─────────────────────────────────────────────────────

export interface BurnsInsights {
  acuteCount: number;
  reconstructionCount: number;
  graftingRate: number;
  totalBurnsCases: number;
}

export function computeBurnsInsights(cases: Case[]): BurnsInsights {
  let acuteCount = 0;
  let reconstructionCount = 0;
  let casesWithGraft = 0;

  for (const c of cases) {
    const procs = getAllProcedures(c);
    const procNames = procs.map((p) => p.procedureName.toLowerCase());
    const hasGraft = procNames.some(
      (n) =>
        n.includes("graft") ||
        n.includes("stsg") ||
        n.includes("ftsg") ||
        n.includes("skin graft"),
    );
    const isReconstruction = procNames.some(
      (n) =>
        n.includes("reconstruction") ||
        n.includes("flap") ||
        n.includes("scar") ||
        n.includes("contracture"),
    );

    if (isReconstruction) {
      reconstructionCount++;
    } else {
      acuteCount++;
    }
    if (hasGraft) {
      casesWithGraft++;
    }
  }

  const totalBurnsCases = cases.length;
  const graftingRate =
    totalBurnsCases > 0 ? (casesWithGraft / totalBurnsCases) * 100 : 0;

  return { acuteCount, reconstructionCount, graftingRate, totalBurnsCases };
}

// ─── Hand Surgery Case Type Insights ────────────────────────────────────

export interface HandCaseTypeInsights {
  traumaCount: number;
  acuteCount: number;
  electiveCount: number;
}

export function computeHandCaseTypeInsights(
  cases: Case[],
): HandCaseTypeInsights {
  let traumaCount = 0;
  let acuteCount = 0;
  let electiveCount = 0;

  for (const c of cases) {
    const groups = c.diagnosisGroups ?? [];
    const hasTrauma = groups.some(
      (g) =>
        g.specialty === "hand_wrist" &&
        g.diagnosisClinicalDetails?.handTrauma != null,
    );
    const hasAcute = groups.some(
      (g) =>
        g.specialty === "hand_wrist" &&
        (g.procedureSuggestionSource === "acuteHand" ||
          g.handInfectionDetails != null),
    );

    if (hasTrauma) {
      traumaCount++;
    } else if (hasAcute) {
      acuteCount++;
    } else {
      electiveCount++;
    }
  }

  return { traumaCount, acuteCount, electiveCount };
}
