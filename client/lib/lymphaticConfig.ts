/**
 * Lymphoedema module configuration and helpers.
 *
 * - isLymphoedemaeDiagnosis(): activation predicate
 * - getLymphaticProcedureCategory(): procedure → LVA/VLNT/SAPL routing
 * - getDefaultLymphaticAssessment(): factory for new assessments
 * - calculateExcessVolume(): truncated cone formula for bilateral limb measurements
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type {
  LymphaticAssessment,
  CircumferenceMeasurement,
} from "@/types/lymphatic";

/**
 * Check if a diagnosis entry activates the lymphoedema assessment module.
 * Uses the `lymphoedemaModule: true` metadata flag on the diagnosis picklist entry.
 */
export function isLymphoedemaeDiagnosis(
  entry?: DiagnosisPicklistEntry | null,
): boolean {
  return entry?.lymphoedemaModule === true;
}

/**
 * Return a minimal default LymphaticAssessment for new cases.
 * All fields optional — the surgeon fills in what's relevant.
 */
export function getDefaultLymphaticAssessment(): LymphaticAssessment {
  return {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURE CATEGORY ROUTING
// ═══════════════════════════════════════════════════════════════════════════════

export type LymphaticProcedureCategory =
  | "lva"
  | "vlnt"
  | "sapl"
  | "lipo_lipedema"
  | null;

/**
 * Determine the lymphatic procedure category from a picklist entry ID.
 * Used to conditionally render LVA/VLNT/SAPL operative detail sections.
 */
export function getLymphaticProcedureCategory(
  picklistEntryId?: string,
): LymphaticProcedureCategory {
  if (!picklistEntryId) return null;
  if (
    picklistEntryId.startsWith("lymph_lva_") ||
    picklistEntryId === "lymph_lympha" ||
    picklistEntryId === "lymph_elva" ||
    picklistEntryId === "lymph_dc_lva" ||
    picklistEntryId === "lymph_robotic_lva" ||
    picklistEntryId === "lymph_revision_lva" ||
    picklistEntryId === "lymph_lla"
  )
    return "lva";
  if (
    picklistEntryId.startsWith("lymph_vlnt_") ||
    picklistEntryId === "lymph_combined_lva_vlnt" ||
    picklistEntryId === "lymph_simultaneous_breast_vlnt"
  )
    return "vlnt";
  if (picklistEntryId === "lymph_sapl") return "sapl";
  if (picklistEntryId === "lymph_lipo_lipedema") return "lipo_lipedema";
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCESS VOLUME CALCULATION (Truncated Cone Formula)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate volume from circumference measurements using the truncated cone formula.
 * Each pair of adjacent measurements defines a truncated cone:
 *   V = h × (C₁² + C₁×C₂ + C₂²) / (12π)
 * where C₁ and C₂ are circumferences at the two measurement points,
 * and h is the distance between them in cm.
 *
 * Measurements must be sorted by `distanceFromReference` ascending.
 */
export function calculateLimbVolume(
  measurements: CircumferenceMeasurement[],
): number {
  if (measurements.length < 2) return 0;

  const sorted = [...measurements].sort(
    (a, b) => a.distanceFromReference - b.distanceFromReference,
  );

  let totalVolume = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const m1 = sorted[i];
    const m2 = sorted[i + 1];
    if (!m1 || !m2) continue;
    const c1 = m1.circumferenceCm;
    const c2 = m2.circumferenceCm;
    const h = m2.distanceFromReference - m1.distanceFromReference;
    // Truncated cone: V = h * (C1² + C1*C2 + C2²) / (12π)
    totalVolume += (h * (c1 * c1 + c1 * c2 + c2 * c2)) / (12 * Math.PI);
  }

  return Math.round(totalVolume);
}

/**
 * Calculate excess volume between affected and contralateral limbs.
 * Returns excess in mL and as a percentage.
 */
export function calculateExcessVolume(
  affected: CircumferenceMeasurement[],
  contralateral: CircumferenceMeasurement[],
): { volumeMl: number; volumePercent: number } {
  const affectedVol = calculateLimbVolume(affected);
  const contralateralVol = calculateLimbVolume(contralateral);

  if (contralateralVol === 0) return { volumeMl: 0, volumePercent: 0 };

  const excessMl = Math.max(0, affectedVol - contralateralVol);
  const excessPercent = Math.round((excessMl / contralateralVol) * 100);

  return { volumeMl: excessMl, volumePercent: excessPercent };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARD MEASUREMENT INTERVALS
// ═══════════════════════════════════════════════════════════════════════════════

/** Upper limb standard measurement points (cm from wrist) */
export const UPPER_LIMB_MEASUREMENT_POINTS = [
  { distanceFromReference: 0, label: "Wrist" },
  { distanceFromReference: 5, label: "5 cm" },
  { distanceFromReference: 10, label: "10 cm" },
  { distanceFromReference: 15, label: "15 cm" },
  { distanceFromReference: 20, label: "20 cm" },
  { distanceFromReference: 25, label: "25 cm" },
  { distanceFromReference: 30, label: "30 cm" },
  { distanceFromReference: 35, label: "35 cm (axilla)" },
] as const;

/** Lower limb standard measurement points (cm from ankle) */
export const LOWER_LIMB_MEASUREMENT_POINTS = [
  { distanceFromReference: 0, label: "Ankle" },
  { distanceFromReference: 10, label: "10 cm" },
  { distanceFromReference: 20, label: "20 cm" },
  { distanceFromReference: 30, label: "30 cm" },
  { distanceFromReference: 40, label: "40 cm" },
  { distanceFromReference: 50, label: "50 cm" },
  { distanceFromReference: 60, label: "60 cm" },
  { distanceFromReference: 70, label: "70 cm (groin)" },
] as const;

/**
 * Get the standard measurement points for a given limb region.
 */
export function getMeasurementPointsForRegion(
  region?: string,
): readonly { distanceFromReference: number; label: string }[] {
  if (
    region === "upper_limb" ||
    region === "bilateral_upper" ||
    region === "breast_trunk"
  ) {
    return UPPER_LIMB_MEASUREMENT_POINTS;
  }
  return LOWER_LIMB_MEASUREMENT_POINTS;
}
