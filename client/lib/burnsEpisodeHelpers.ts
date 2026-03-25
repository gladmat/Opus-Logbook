/**
 * Burns Episode Helpers — Episode auto-suggestion, linking, and summary logic.
 *
 * Pattern follows skinCancerEpisodeHelpers.ts: pure functions for episode
 * title generation, pending action resolution, and link/create plans.
 */

import type { BurnInjuryEvent, BurnsAssessmentData, BurnPhase } from "../types/burns";
import { BURN_MECHANISM_LABELS, BURN_PHASE_LABELS } from "../types/burns";
import type { BurnProcedureDetails } from "../types/burns";
import { getBurnProcedureCategory } from "./burnsConfig";

// ═══════════════════════════════════════════════════════════════════════════════
// EPISODE TITLE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a descriptive episode title from burn injury data.
 * Format: "[Mechanism] burn [TBSA]% — [Date]"
 */
export function buildBurnEpisodeTitle(
  assessment: BurnsAssessmentData,
  procedureDate?: string,
): string {
  const parts: string[] = [];

  // Mechanism
  const mechanism = assessment.injuryEvent?.mechanism;
  if (mechanism) {
    parts.push(BURN_MECHANISM_LABELS[mechanism] + " burn");
  } else {
    parts.push("Burn");
  }

  // TBSA
  const tbsa = assessment.tbsa?.totalTBSA;
  if (tbsa != null && tbsa > 0) {
    parts.push(`${tbsa}% TBSA`);
  }

  // Date
  if (procedureDate) {
    parts.push(procedureDate);
  }

  return parts.join(" — ");
}

// ═══════════════════════════════════════════════════════════════════════════════
// PENDING ACTION RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

export type BurnPendingAction =
  | "staged_procedure_planned"
  | "awaiting_grafting"
  | "wound_healing"
  | "npwt_in_progress"
  | "other"
  | null;

/**
 * Determines the initial pending action for a new burn episode
 * based on the injury severity and first case's procedures.
 */
export function determineBurnInitialPendingAction(
  assessment: BurnsAssessmentData,
  procedureIds?: string[],
): BurnPendingAction {
  const tbsa = assessment.tbsa?.totalTBSA ?? 0;

  // Check if any procedure is NPWT
  if (procedureIds?.some((id) => id.includes("npwt"))) {
    return "npwt_in_progress";
  }

  // Check if excision without grafting → awaiting grafting
  const hasExcision = procedureIds?.some(
    (id) => getBurnProcedureCategory(id) === "excision",
  );
  const hasGrafting = procedureIds?.some(
    (id) => getBurnProcedureCategory(id) === "grafting",
  );
  if (hasExcision && !hasGrafting) {
    return "awaiting_grafting";
  }

  // Major burn (>20% TBSA) → staged procedures likely
  if (tbsa > 20) {
    return "staged_procedure_planned";
  }

  // Default for smaller burns with grafting → wound healing
  if (hasGrafting) {
    return "wound_healing";
  }

  return null;
}

/**
 * Returns whether episode auto-suggestion should default to ON.
 * ON for TBSA ≥10%, OFF for minor burns.
 */
export function shouldSuggestEpisode(
  assessment: BurnsAssessmentData,
): boolean {
  return (assessment.tbsa?.totalTBSA ?? 0) >= 10;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EPISODE TIMELINE SUMMARIES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BurnEpisodeCaseSummary {
  caseId: string;
  date: string;
  daysSinceInjury?: number;
  phase?: BurnPhase;
  tbsaExcised?: number;
  procedures: Array<{
    name: string;
    category: string | null;
  }>;
  graftTake?: number;
}

export interface BurnEpisodeAggregate {
  totalProceduresByCategory: Record<string, number>;
  cumulativeTBSAExcised: number;
  averageGraftTake?: number;
  daysToFirstExcision?: number;
  totalTreatmentSpanDays?: number;
  injuryDate?: string;
}

/**
 * Computes aggregate summary across all cases in a burn episode.
 */
export function computeBurnEpisodeAggregate(
  cases: BurnEpisodeCaseSummary[],
  injuryDate?: string,
): BurnEpisodeAggregate {
  const totalProceduresByCategory: Record<string, number> = {};
  let cumulativeTBSAExcised = 0;
  const graftTakes: number[] = [];
  let firstExcisionDate: string | undefined;

  for (const c of cases) {
    for (const proc of c.procedures) {
      const cat = proc.category ?? "other";
      totalProceduresByCategory[cat] = (totalProceduresByCategory[cat] ?? 0) + 1;
      if (cat === "excision" && !firstExcisionDate) {
        firstExcisionDate = c.date;
      }
    }
    if (c.tbsaExcised) {
      cumulativeTBSAExcised += c.tbsaExcised;
    }
    if (c.graftTake != null) {
      graftTakes.push(c.graftTake);
    }
  }

  const averageGraftTake =
    graftTakes.length > 0
      ? Math.round(graftTakes.reduce((a, b) => a + b, 0) / graftTakes.length)
      : undefined;

  let daysToFirstExcision: number | undefined;
  if (injuryDate && firstExcisionDate) {
    const injury = new Date(injuryDate);
    const excision = new Date(firstExcisionDate);
    daysToFirstExcision = Math.round(
      (excision.getTime() - injury.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  let totalTreatmentSpanDays: number | undefined;
  if (cases.length >= 2) {
    const dates = cases.map((c) => new Date(c.date).getTime()).sort();
    totalTreatmentSpanDays = Math.round(
      (dates[dates.length - 1]! - dates[0]!) / (1000 * 60 * 60 * 24),
    );
  }

  return {
    totalProceduresByCategory,
    cumulativeTBSAExcised,
    averageGraftTake,
    daysToFirstExcision,
    totalTreatmentSpanDays,
    injuryDate,
  };
}

/**
 * Extracts case summaries from case data for episode timeline.
 */
export function extractBurnCaseSummary(
  caseId: string,
  procedureDate: string,
  assessment: BurnsAssessmentData,
  procedures: Array<{
    id: string;
    picklistEntryId: string;
    procedureName: string;
    burnProcedureDetails?: BurnProcedureDetails;
  }>,
  injuryDate?: string,
): BurnEpisodeCaseSummary {
  let daysSinceInjury: number | undefined;
  if (injuryDate) {
    const injury = new Date(injuryDate);
    const procDate = new Date(procedureDate);
    daysSinceInjury = Math.round(
      (procDate.getTime() - injury.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  // Sum TBSA excised across excision procedures
  let tbsaExcised: number | undefined;
  let graftTake: number | undefined;
  for (const proc of procedures) {
    const details = proc.burnProcedureDetails;
    if (details?.excision?.tbsaExcised) {
      tbsaExcised = (tbsaExcised ?? 0) + details.excision.tbsaExcised;
    }
    if (details?.grafting?.graftTakePercentage != null) {
      graftTake = details.grafting.graftTakePercentage;
    }
  }

  return {
    caseId,
    date: procedureDate,
    daysSinceInjury,
    phase: "acute",
    tbsaExcised,
    procedures: procedures.map((p) => ({
      name: p.procedureName,
      category: getBurnProcedureCategory(p.picklistEntryId),
    })),
    graftTake,
  };
}
