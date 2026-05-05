// client/lib/burnsConfig.ts

import type {
  BurnPhase,
  BurnsAssessmentData,
  DerivedBurnDiagnosis,
  BurnInjuryEvent,
  TBSAData,
  TBSARegionalEntry,
} from "../types/burns";
import { LUND_BROWDER_AGE_ADJUSTMENT } from "../types/burns";
import type { ProcedureSuggestion } from "@/types/diagnosis";

// Re-export the age adjustment table for external use
export { LUND_BROWDER_AGE_ADJUSTMENT };

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Returns true if the diagnosis ID belongs to the burns module */
export function isBurnsDiagnosis(diagnosisId: string): boolean {
  return diagnosisId.startsWith("burns_dx_");
}

/** Returns true if the diagnosis ID is the single acute burn entry */
export function isAcuteBurnDiagnosis(diagnosisId: string): boolean {
  return diagnosisId === "burns_dx_acute";
}

/** Infers burn phase from diagnosis ID */
export function getBurnPhaseFromDiagnosis(diagnosisId: string): BurnPhase {
  if (diagnosisId === "burns_dx_acute") {
    return "acute";
  }
  // All other burns_dx_* entries are reconstructive
  return "reconstructive";
}

// ═══════════════════════════════════════════════════════════════════════════════
// DERIVED DIAGNOSIS (Assessment → SNOMED CT code)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Derive the specific SNOMED-coded diagnosis from BurnsAssessment injury event data.
 * Analogous to handTraumaDiagnosis.ts — assessment data deterministically produces diagnosis.
 */
export function deriveBurnDiagnosis(
  injuryEvent?: BurnInjuryEvent,
): DerivedBurnDiagnosis {
  const mechanism = injuryEvent?.mechanism;
  const detail = injuryEvent?.mechanismDetail;

  let primary: DerivedBurnDiagnosis;

  switch (mechanism) {
    case "thermal":
      switch (detail) {
        case "scald":
        case "steam":
          primary = {
            snomedCtCode: "423858006",
            snomedCtDisplay: "Scald of skin (disorder)",
            displayName: detail === "steam" ? "Steam burn" : "Scald burn",
          };
          break;
        case "contact":
          primary = {
            snomedCtCode: "385516009",
            snomedCtDisplay: "Contact burn of skin (disorder)",
            displayName: "Contact burn",
          };
          break;
        case "flash":
          primary = {
            snomedCtCode: "314534006",
            snomedCtDisplay: "Thermal burn (disorder)",
            displayName: "Flash burn",
          };
          break;
        case "flame":
        default:
          primary = {
            snomedCtCode: "314534006",
            snomedCtDisplay: "Thermal burn (disorder)",
            displayName: "Flame burn",
          };
          break;
      }
      break;

    case "chemical":
      primary = {
        snomedCtCode: "426284001",
        snomedCtDisplay: "Chemical burn (disorder)",
        displayName:
          detail === "acid"
            ? "Chemical burn — acid"
            : detail === "alkali"
              ? "Chemical burn — alkali"
              : "Chemical burn",
      };
      break;

    case "electrical":
      primary = {
        snomedCtCode: "405571006",
        snomedCtDisplay: "Electrical burn (disorder)",
        displayName:
          detail === "high_voltage"
            ? "Electrical burn — high voltage"
            : detail === "lightning"
              ? "Electrical burn — lightning"
              : "Electrical burn — low voltage",
      };
      break;

    case "radiation":
      primary = {
        snomedCtCode: "10821000132101",
        snomedCtDisplay: "Radiation burn of skin (disorder)",
        displayName: "Radiation burn",
      };
      break;

    case "friction":
      primary = {
        snomedCtCode: "284196006",
        snomedCtDisplay: "Burn of skin (disorder)",
        displayName: "Friction burn",
      };
      break;

    case "cold":
      primary = {
        snomedCtCode: "370977006",
        snomedCtDisplay: "Frostbite (disorder)",
        displayName: "Cold injury / frostbite",
      };
      break;

    default:
      primary = {
        snomedCtCode: "284196006",
        snomedCtDisplay: "Burn of skin (disorder)",
        displayName: "Acute burn",
      };
      break;
  }

  // Add inhalation as secondary diagnosis
  if (injuryEvent?.inhalationInjury) {
    primary = {
      ...primary,
      secondaryDiagnoses: [
        ...(primary.secondaryDiagnoses ?? []),
        {
          snomedCtCode: "75478009",
          snomedCtDisplay: "Poisoning by smoke inhalation (disorder)",
          displayName: "Inhalation injury",
        },
      ],
    };
  }

  return primary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSESSMENT-DRIVEN PROCEDURE SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate procedure suggestions dynamically from BurnsAssessment data.
 * Replaces the old conditionStagingMatch system for acute burns.
 * Called from DiagnosisGroupEditor when burns assessment data changes.
 */
export function getAssessmentDrivenProcedureSuggestions(
  assessment: BurnsAssessmentData,
): ProcedureSuggestion[] {
  const suggestions: ProcedureSuggestion[] = [
    // Always suggested
    {
      procedurePicklistId: "burns_acute_wound_dressing",
      displayName: "Burns wound dressing",
      isDefault: true,
      sortOrder: 1,
    },
  ];

  const depth = assessment.tbsa?.predominantDepth;
  const totalTBSA = assessment.tbsa?.totalTBSA ?? 0;
  const isCircumferential =
    assessment.injuryEvent?.circumferentialBurn === true;
  const hasInhalation = assessment.injuryEvent?.inhalationInjury === true;
  const mechanism = assessment.injuryEvent?.mechanism;

  // Depth-conditional suggestions
  if (
    depth === "deep_partial" ||
    depth === "full_thickness" ||
    depth === "mixed"
  ) {
    suggestions.push({
      procedurePicklistId: "burns_acute_tangential_excision",
      displayName: "Tangential excision (burn wound)",
      isDefault: false,
      sortOrder: 2,
    });
    suggestions.push({
      procedurePicklistId: "burns_graft_stsg_meshed",
      displayName: "STSG — meshed (burns)",
      isDefault: false,
      sortOrder: 3,
    });
  }

  if (depth === "full_thickness") {
    suggestions.push({
      procedurePicklistId: "burns_acute_fascial_excision",
      displayName: "Fascial excision (deep burn)",
      isDefault: false,
      sortOrder: 4,
    });
    suggestions.push({
      procedurePicklistId: "burns_graft_dermal_substitute",
      displayName: "Dermal substitute (Integra / Matriderm / BTM)",
      isDefault: false,
      sortOrder: 5,
    });
  }

  // TBSA-conditional suggestions
  if (totalTBSA >= 20) {
    suggestions.push({
      procedurePicklistId: "burns_graft_xenograft",
      displayName: "Xenograft / allograft (temporary cover)",
      isDefault: false,
      sortOrder: 7,
    });
  }

  if (totalTBSA >= 30) {
    suggestions.push({
      procedurePicklistId: "burns_graft_meek",
      displayName: "Meek micrografting",
      isDefault: false,
      sortOrder: 6,
    });
  }

  if (totalTBSA >= 50) {
    suggestions.push({
      procedurePicklistId: "burns_graft_cea",
      displayName: "Cultured epithelial autograft (CEA)",
      isDefault: false,
      sortOrder: 8,
    });
  }

  // Special-situation suggestions
  if (isCircumferential) {
    suggestions.push({
      procedurePicklistId: "burns_acute_escharotomy",
      displayName: "Escharotomy",
      isDefault: true,
      sortOrder: 0,
    });
  }

  if (hasInhalation) {
    suggestions.push({
      procedurePicklistId: "burns_acute_tracheostomy",
      displayName: "Tracheostomy (burn)",
      isDefault: false,
      sortOrder: 9,
    });
  }

  // Mechanism-specific
  if (mechanism === "electrical") {
    suggestions.push({
      procedurePicklistId: "burns_acute_fasciotomy",
      displayName: "Fasciotomy — burns",
      isDefault: false,
      sortOrder: 5,
    });
  }

  return suggestions.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
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

/** Returns a default BurnsAssessmentData for acute burns */
export function getDefaultBurnsAssessment(): BurnsAssessmentData {
  return {
    tbsa: getDefaultTBSAData(),
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
export function isBurnDermalSubstituteProcedure(procedureId: string): boolean {
  return procedureId.startsWith("burns_sub_");
}

/** Returns true if a procedure ID is a temporary coverage procedure */
export function isBurnTemporaryCoverageProcedure(procedureId: string): boolean {
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

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURE CATEGORY DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════

export type BurnProcedureCategory =
  | "excision"
  | "grafting"
  | "dermalSubstitute"
  | "temporaryCoverage"
  | "contractureRelease"
  | "laser";

/**
 * Returns the burn-specific detail category for a procedure ID,
 * or null if the procedure doesn't have burn-specific fields.
 */
export function getBurnProcedureCategory(
  procedureId: string,
): BurnProcedureCategory | null {
  if (isBurnExcisionProcedure(procedureId)) return "excision";
  if (isBurnGraftProcedure(procedureId)) return "grafting";
  if (isBurnDermalSubstituteProcedure(procedureId)) return "dermalSubstitute";
  if (isBurnTemporaryCoverageProcedure(procedureId)) return "temporaryCoverage";
  if (isBurnContractureReleaseProcedure(procedureId))
    return "contractureRelease";
  if (isBurnLaserProcedure(procedureId)) return "laser";
  return null;
}

/** Returns true if mesh ratio is relevant for this graft type */
export function graftTypeShowsMeshRatio(graftType?: string): boolean {
  return graftType === "stsg_meshed" || graftType === "meek";
}

/** Returns default interval to autograft (days) for a dermal substitute product */
export function getDefaultIntervalDays(product?: string): number | undefined {
  switch (product) {
    case "integra_bilayer":
      return 21;
    case "btm_novosorb":
      return 14;
    case "matriderm":
      return 0; // Simultaneous with graft
    default:
      return undefined;
  }
}

/** Calculates ROM improvement in degrees */
export function calculateROMImprovement(
  preOp?: number,
  postOp?: number,
): number | undefined {
  if (preOp == null || postOp == null) return undefined;
  return postOp - preOp;
}

/** Returns severity colour key for ROM improvement */
export function getROMImprovementSeverity(
  improvement?: number,
): "good" | "moderate" | "minimal" | undefined {
  if (improvement == null) return undefined;
  if (improvement >= 30) return "good";
  if (improvement >= 10) return "moderate";
  return "minimal";
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCAR ASSESSMENT CALCULATORS
// ═══════════════════════════════════════════════════════════════════════════════

import type { VancouverScarScale, POSASObserver } from "../types/burns";

/** Calculates VSS total from partial data */
export function calculateVSSTotal(vss: Partial<VancouverScarScale>): number {
  return (
    (vss.vascularity ?? 0) +
    (vss.pigmentation ?? 0) +
    (vss.pliability ?? 0) +
    (vss.height ?? 0)
  );
}

/** Returns severity label for VSS total */
export function getVSSSeverity(
  total: number,
): "minimal" | "moderate" | "severe" {
  if (total <= 4) return "minimal";
  if (total <= 8) return "moderate";
  return "severe";
}

/** Calculates POSAS total from partial data */
export function calculatePOSASTotal(posas: Partial<POSASObserver>): number {
  const keys: (keyof POSASObserver)[] = [
    "vascularity",
    "pigmentation",
    "thickness",
    "relief",
    "pliability",
    "surfaceArea",
    "overallOpinion",
  ];
  return keys.reduce((sum, k) => sum + (posas[k] ?? 0), 0);
}

/** Infers graft type from procedure ID */
export function inferGraftTypeFromProcedure(
  procedureId: string,
): string | undefined {
  if (procedureId === "burns_graft_stsg_sheet") return "stsg_sheet";
  if (procedureId === "burns_graft_stsg_meshed") return "stsg_meshed";
  if (procedureId === "burns_graft_ftsg") return "ftsg";
  if (procedureId === "burns_graft_meek") return "meek";
  if (procedureId === "burns_graft_cea") return "cea";
  if (procedureId === "burns_graft_recell") return "recell";
  return undefined;
}
