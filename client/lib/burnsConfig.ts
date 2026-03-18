// client/lib/burnsConfig.ts

import type {
  BurnPhase,
  BurnsAssessmentData,
  TBSAData,
  TBSARegionalEntry,
} from "../types/burns";
import { LUND_BROWDER_AGE_ADJUSTMENT } from "../types/burns";

// Re-export the age adjustment table for external use
export { LUND_BROWDER_AGE_ADJUSTMENT };

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Returns true if the diagnosis ID belongs to the burns module */
export function isBurnsDiagnosis(diagnosisId: string): boolean {
  return diagnosisId.startsWith("burns_dx_");
}

/** Infers burn phase from diagnosis ID segments */
export function getBurnPhaseFromDiagnosis(diagnosisId: string): BurnPhase {
  // Non-operative must be checked first — some IDs contain both _nonop_ and _scar_
  if (diagnosisId.includes("_nonop_")) {
    return "non_operative";
  }
  if (
    diagnosisId.includes("_contracture_") ||
    diagnosisId.includes("_scar_") ||
    diagnosisId.includes("_recon_") ||
    diagnosisId.includes("_ectropion_") ||
    diagnosisId.includes("_microstomia") ||
    diagnosisId.includes("_web_space_") ||
    diagnosisId.includes("_heterotopic_") ||
    diagnosisId.includes("_neuropathic_") ||
    diagnosisId.includes("_nasal_") ||
    diagnosisId.includes("_ear_")
  ) {
    return "reconstructive";
  }
  return "acute";
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEVERITY SCORE CALCULATORS
// ═══════════════════════════════════════════════════════════════════════════════

/** Revised Baux Score = age + TBSA + (17 × inhalation[0|1]) */
export function calculateRevisedBaux(
  age: number,
  tbsa: number,
  inhalation: boolean,
): number {
  return age + tbsa + (inhalation ? 17 : 0);
}

/**
 * Abbreviated Burn Severity Index (ABSI).
 * Scoring: sex (F=1), age bracket, TBSA bracket, inhalation (+1), full thickness (+1).
 */
export function calculateABSI(
  age: number,
  sex: "male" | "female",
  tbsa: number,
  inhalation: boolean,
  fullThickness: boolean,
): number {
  let score = 0;

  // Sex
  if (sex === "female") score += 1;

  // Age
  if (age <= 20) score += 1;
  else if (age <= 40) score += 2;
  else if (age <= 60) score += 3;
  else if (age <= 80) score += 4;
  else score += 5;

  // TBSA
  if (tbsa <= 10) score += 1;
  else if (tbsa <= 20) score += 2;
  else if (tbsa <= 30) score += 3;
  else if (tbsa <= 40) score += 4;
  else if (tbsa <= 50) score += 5;
  else if (tbsa <= 60) score += 6;
  else if (tbsa <= 70) score += 7;
  else if (tbsa <= 80) score += 8;
  else if (tbsa <= 90) score += 9;
  else score += 10;

  // Inhalation
  if (inhalation) score += 1;

  // Full thickness
  if (fullThickness) score += 1;

  return score;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TBSA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates that regional breakdown sums match the Tier 1 total.
 * Returns `{ valid, diff }` where diff is the absolute difference.
 */
export function validateTBSARegionalSum(
  regions: TBSARegionalEntry[],
  total: number,
): { valid: boolean; diff: number } {
  const sum = regions.reduce((acc, r) => acc + r.percentage, 0);
  const diff = Math.abs(sum - total);
  // Allow 0.5% tolerance for rounding
  return { valid: diff <= 0.5, diff };
}

/**
 * Returns the Lund-Browder max percentage for a given region and patient age.
 * Falls back to adult values for ages ≥15 or regions without age adjustment.
 */
export function getLundBrowderMaxForAge(
  region: string,
  ageYears: number,
): number | undefined {
  const adjustments = LUND_BROWDER_AGE_ADJUSTMENT[region];
  if (!adjustments) return undefined;

  if (ageYears >= 15) return adjustments["adult"];
  if (ageYears >= 10) return adjustments["15"];
  if (ageYears >= 5) return adjustments["10"];
  if (ageYears >= 1) return adjustments["5"];
  return adjustments["0"];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Returns an empty TBSA data object */
export function getDefaultTBSAData(): TBSAData {
  return {};
}

/** Returns a default BurnsAssessmentData for the given phase */
export function getDefaultBurnsAssessment(
  phase: BurnPhase,
): BurnsAssessmentData {
  return {
    phase,
    tbsa: phase === "acute" ? getDefaultTBSAData() : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/** Returns true if a procedure ID is a burn graft procedure */
export function isBurnGraftProcedure(procedureId: string): boolean {
  return procedureId.startsWith("burns_graft_");
}

/** Returns true if a procedure ID is a burn excision procedure */
export function isBurnExcisionProcedure(procedureId: string): boolean {
  return (
    procedureId === "burns_acute_tangential_excision" ||
    procedureId === "burns_acute_fascial_excision"
  );
}

/** Returns true if a procedure ID is a dermal substitute procedure */
export function isBurnDermalSubstituteProcedure(
  procedureId: string,
): boolean {
  return procedureId.startsWith("burns_sub_");
}

/** Returns true if a procedure ID is a temporary coverage procedure */
export function isBurnTemporaryCoverageProcedure(
  procedureId: string,
): boolean {
  return procedureId.startsWith("burns_temp_");
}

/** Returns true if a procedure ID is a contracture release procedure */
export function isBurnContractureReleaseProcedure(
  procedureId: string,
): boolean {
  return (
    procedureId === "burns_recon_contracture_release" ||
    procedureId === "burns_recon_contracture_graft"
  );
}

/** Returns true if a procedure ID is a burn laser procedure */
export function isBurnLaserProcedure(procedureId: string): boolean {
  return procedureId.startsWith("burns_scar_laser_");
}

/** Returns true if a procedure ID triggers the existing free flap module */
export function isBurnFreeFlap(procedureId: string): boolean {
  return (
    procedureId === "burns_acute_free_flap" ||
    procedureId === "burns_recon_free_flap" ||
    procedureId === "burns_recon_contracture_free_flap"
  );
}
