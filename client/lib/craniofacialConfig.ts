/**
 * Craniofacial module configuration.
 *
 * Activation check, age-at-surgery CDS, named technique pickers,
 * and section visibility logic.
 */

import type { CraniofacialSubcategory } from "@/types/craniofacial";
import { getCraniofacialSections } from "@/types/craniofacial";
import { parseDateOnlyValue } from "@/lib/dateValues";

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE ACTIVATION
// ═══════════════════════════════════════════════════════════════════════════════

export function isCraniofacialDiagnosis(specialty: string): boolean {
  return specialty === "cleft_cranio";
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAMED TECHNIQUE PICKERS
// ═══════════════════════════════════════════════════════════════════════════════

export const CLEFT_LIP_TECHNIQUES = [
  { value: "millard", label: "Millard rotation-advancement" },
  { value: "fisher", label: "Fisher subunit" },
  { value: "mohler", label: "Mohler modification" },
  { value: "tennison_randall", label: "Tennison-Randall triangular flap" },
  { value: "mulliken", label: "Mulliken (bilateral)" },
  { value: "other", label: "Other" },
] as const;

export const PALATOPLASTY_TECHNIQUES = [
  { value: "bardach", label: "Bardach two-flap" },
  { value: "von_langenbeck", label: "Von Langenbeck" },
  { value: "furlow", label: "Furlow double-opposing Z-plasty" },
  { value: "sommerlad", label: "Sommerlad intravelar veloplasty" },
  { value: "veau_wardill_kilner", label: "Veau-Wardill-Kilner pushback" },
  { value: "other", label: "Other" },
] as const;

export const BONE_GRAFT_DONORS = [
  { value: "iliac_crest", label: "Iliac crest" },
  { value: "cranial", label: "Cranial / calvarial" },
  { value: "tibial", label: "Tibial" },
  { value: "rib", label: "Rib" },
  { value: "mandibular_symphysis", label: "Mandibular symphysis" },
  { value: "other", label: "Other" },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// AGE-AT-SURGERY CDS — Timing protocol validation
// ═══════════════════════════════════════════════════════════════════════════════

interface AgeWindow {
  minMonths: number;
  maxMonths: number;
  label: string;
  severity: "amber" | "red";
}

/**
 * Maps procedure category → expected age range.
 * Returns null if no age guidance exists for the procedure.
 */
export function getExpectedAgeWindow(procedureId: string): AgeWindow | null {
  // Cleft lip repair: 3-6 months
  if (
    procedureId === "cc_lip_repair_unilateral" ||
    procedureId === "cc_lip_repair_bilateral" ||
    procedureId === "cc_lip_adhesion"
  ) {
    return {
      minMonths: 3,
      maxMonths: 9,
      label: "Primary lip repair: typically 3–6 months",
      severity: "amber",
    };
  }

  // Palate repair: 6-15 months
  if (
    procedureId === "cc_palatoplasty" ||
    procedureId === "cc_palate_repair_soft" ||
    procedureId === "cc_palate_repair_hard" ||
    procedureId === "cc_von_langenbeck" ||
    procedureId === "cc_vomer_flap" ||
    procedureId === "cc_two_stage_palate"
  ) {
    return {
      minMonths: 6,
      maxMonths: 18,
      label: "Primary palate repair: typically 6–15 months",
      severity: "amber",
    };
  }

  // Alveolar bone graft: 8-12 years
  if (procedureId === "cc_alveolar_bone_graft_secondary") {
    return {
      minMonths: 84, // 7 years
      maxMonths: 168, // 14 years
      label: "Secondary ABG: typically 8–12 years (mixed dentition)",
      severity: "amber",
    };
  }

  // Endoscopic strip craniectomy: 2-6 months
  if (procedureId === "cc_endoscopic_strip_craniectomy") {
    return {
      minMonths: 2,
      maxMonths: 6,
      label: "Endoscopic strip craniectomy: typically 2–6 months",
      severity: "red",
    };
  }

  // FOA: 6-12 months
  if (procedureId === "cc_fronto_orbital_advancement") {
    return {
      minMonths: 3,
      maxMonths: 18,
      label: "Fronto-orbital advancement: typically 6–12 months",
      severity: "amber",
    };
  }

  // Le Fort I: skeletal maturity (16-20 years)
  if (
    procedureId === "cc_lefort_i_osteotomy" ||
    procedureId === "cc_lefort_i_distraction" ||
    procedureId === "cc_segmental_lefort_i"
  ) {
    return {
      minMonths: 180, // 15 years
      maxMonths: 300, // 25 years
      label: "Orthognathic surgery: typically after skeletal maturity (16–20 years)",
      severity: "amber",
    };
  }

  // Definitive rhinoplasty: ≥16 years
  if (
    procedureId === "cc_septorhinoplasty_definitive" ||
    procedureId === "cc_septorhinoplasty_rib_graft"
  ) {
    return {
      minMonths: 168, // 14 years
      maxMonths: 600, // No practical upper limit
      label: "Definitive rhinoplasty: typically ≥16 years",
      severity: "amber",
    };
  }

  return null;
}

/**
 * Compute age in months from DOB and surgery date.
 * Uses parseDateOnlyValue for timezone-safe YYYY-MM-DD parsing.
 * Returns null if either date is invalid.
 */
export function computeAgeAtSurgery(
  dobIso: string,
  surgeryDateIso: string,
): { years: number; months: number; weeks?: number; totalMonths: number } | null {
  const dob = parseDateOnlyValue(dobIso);
  const surgery = parseDateOnlyValue(surgeryDateIso);

  if (!dob || !surgery) return null;

  const totalMs = surgery.getTime() - dob.getTime();
  if (totalMs < 0) return null;

  const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const totalMonths = Math.floor(totalDays / 30.44); // Average days per month
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  // For infants <6 months, also provide weeks
  const weeks = totalMonths < 6 ? Math.floor(totalDays / 7) : undefined;

  return { years, months, weeks, totalMonths };
}

/**
 * Format age for display.
 * <6mo: "X weeks"
 * 6mo-2y: "X months"
 * ≥2y: "X years Y months" (or "X years" if 0 months)
 */
export function formatAgeAtSurgery(age: {
  years: number;
  months: number;
  weeks?: number;
}): string {
  if (age.years === 0 && age.months < 6 && age.weeks !== undefined) {
    return `${age.weeks} weeks`;
  }
  if (age.years === 0) {
    return `${age.months} months`;
  }
  if (age.months === 0) {
    return `${age.years} years`;
  }
  return `${age.years} years ${age.months} months`;
}

/**
 * Check if age is within expected window for procedure.
 * Returns warning message or null if within range.
 */
export function checkAgeWarning(
  totalMonths: number,
  procedureId: string,
): { message: string; severity: "amber" | "red" } | null {
  const window = getExpectedAgeWindow(procedureId);
  if (!window) return null;

  if (totalMonths < window.minMonths || totalMonths > window.maxMonths) {
    return {
      message: `Patient age is outside typical window. ${window.label}`,
      severity: window.severity,
    };
  }

  return null;
}

// Re-export section visibility
export { getCraniofacialSections };
export type { CraniofacialSubcategory };
