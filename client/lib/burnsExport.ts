/**
 * Burns Export Helpers — CSV, FHIR, and PDF export data extraction.
 *
 * Pattern follows getCaseImplantExportFields() and extractBreastCsvFields().
 */

import type { DiagnosisGroup, CaseProcedure } from "../types/case";
import type {
  BurnsAssessmentData,
  BurnProcedureDetails,
  BurnOutcomeData,
} from "../types/burns";
import {
  BURN_PHASE_LABELS,
  BURN_MECHANISM_LABELS,
  GRAFT_TYPE_LABELS,
  GRAFT_DONOR_LABELS,
  MESH_RATIO_LABELS,
  CONTRACTURE_JOINT_LABELS,
  BURN_COMPLICATION_LABELS,
  DERMAL_SUBSTITUTE_LABELS,
} from "../types/burns";
import { getBurnProcedureCategory, getBurnPhaseFromDiagnosis, calculateVSSTotal, calculatePOSASTotal } from "./burnsConfig";

// ═══════════════════════════════════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

/** Column headers for burns CSV export (20 columns) */
export const BURNS_CSV_HEADERS = [
  "burn_phase",
  "burn_tbsa_total",
  "burn_tbsa_partial",
  "burn_tbsa_full",
  "burn_mechanism",
  "burn_inhalation",
  "burn_excision_tbsa",
  "burn_graft_type",
  "burn_graft_donor",
  "burn_mesh_ratio",
  "burn_graft_take_pct",
  "burn_contracture_joint",
  "burn_rom_pre",
  "burn_rom_post",
  "burn_dermal_sub_product",
  "burn_vss_total",
  "burn_posas_total",
  "burn_complications",
  "burn_los_days",
  "burn_icu_days",
] as const;

export type BurnsCsvFieldKey = (typeof BURNS_CSV_HEADERS)[number];

export interface BurnsCsvFields {
  burn_phase: string;
  burn_tbsa_total: string;
  burn_tbsa_partial: string;
  burn_tbsa_full: string;
  burn_mechanism: string;
  burn_inhalation: string;
  burn_excision_tbsa: string;
  burn_graft_type: string;
  burn_graft_donor: string;
  burn_mesh_ratio: string;
  burn_graft_take_pct: string;
  burn_contracture_joint: string;
  burn_rom_pre: string;
  burn_rom_post: string;
  burn_dermal_sub_product: string;
  burn_vss_total: string;
  burn_posas_total: string;
  burn_complications: string;
  burn_los_days: string;
  burn_icu_days: string;
}

/**
 * Extracts burn-specific fields from diagnosis groups for CSV export.
 * Returns a fixed-shape record matching BURNS_CSV_HEADERS.
 */
export function extractBurnsCsvFields(
  groups: DiagnosisGroup[],
): BurnsCsvFields {
  const empty: BurnsCsvFields = {
    burn_phase: "",
    burn_tbsa_total: "",
    burn_tbsa_partial: "",
    burn_tbsa_full: "",
    burn_mechanism: "",
    burn_inhalation: "",
    burn_excision_tbsa: "",
    burn_graft_type: "",
    burn_graft_donor: "",
    burn_mesh_ratio: "",
    burn_graft_take_pct: "",
    burn_contracture_joint: "",
    burn_rom_pre: "",
    burn_rom_post: "",
    burn_dermal_sub_product: "",
    burn_vss_total: "",
    burn_posas_total: "",
    burn_complications: "",
    burn_los_days: "",
    burn_icu_days: "",
  };

  const burnGroup = groups.find((g) => g.burnsAssessment);
  if (!burnGroup?.burnsAssessment) return empty;

  const ba = burnGroup.burnsAssessment;
  const derivedPhase = burnGroup.diagnosisPicklistId
    ? getBurnPhaseFromDiagnosis(burnGroup.diagnosisPicklistId)
    : "acute";

  // Assessment-level fields
  empty.burn_phase = BURN_PHASE_LABELS[derivedPhase];
  empty.burn_tbsa_total = ba.tbsa?.totalTBSA != null ? String(ba.tbsa.totalTBSA) : "";
  empty.burn_tbsa_partial = ba.tbsa?.partialThicknessTBSA != null
    ? String(ba.tbsa.partialThicknessTBSA) : "";
  empty.burn_tbsa_full = ba.tbsa?.fullThicknessTBSA != null
    ? String(ba.tbsa.fullThicknessTBSA) : "";
  empty.burn_mechanism = ba.injuryEvent?.mechanism
    ? BURN_MECHANISM_LABELS[ba.injuryEvent.mechanism] : "";
  empty.burn_inhalation = ba.injuryEvent?.inhalationInjury ? "Yes" : "";

  // Procedure-level fields — aggregate from all procedures
  const excisionTBSAs: number[] = [];
  const graftTypes: string[] = [];
  const graftDonors: string[] = [];
  const meshRatios: string[] = [];
  const graftTakes: number[] = [];
  const joints: string[] = [];
  const romPres: number[] = [];
  const romPosts: number[] = [];
  const dermalSubs: string[] = [];

  for (const proc of burnGroup.procedures) {
    const d = proc.burnProcedureDetails;
    if (!d) continue;

    if (d.excision?.tbsaExcised != null) excisionTBSAs.push(d.excision.tbsaExcised);
    if (d.grafting?.graftType) graftTypes.push(GRAFT_TYPE_LABELS[d.grafting.graftType]);
    if (d.grafting?.donorSite) graftDonors.push(GRAFT_DONOR_LABELS[d.grafting.donorSite]);
    if (d.grafting?.meshRatio) meshRatios.push(MESH_RATIO_LABELS[d.grafting.meshRatio]);
    if (d.grafting?.graftTakePercentage != null) graftTakes.push(d.grafting.graftTakePercentage);
    if (d.contractureRelease?.joint)
      joints.push(CONTRACTURE_JOINT_LABELS[d.contractureRelease.joint]);
    if (d.contractureRelease?.romPreOpDegrees != null)
      romPres.push(d.contractureRelease.romPreOpDegrees);
    if (d.contractureRelease?.romPostOpDegrees != null)
      romPosts.push(d.contractureRelease.romPostOpDegrees);
    if (d.dermalSubstitute?.product) {
      dermalSubs.push(DERMAL_SUBSTITUTE_LABELS[d.dermalSubstitute.product] ?? d.dermalSubstitute.product);
    }
  }

  empty.burn_excision_tbsa = excisionTBSAs.length > 0
    ? excisionTBSAs.reduce((a, b) => a + b, 0).toString() : "";
  empty.burn_graft_type = graftTypes.join("; ");
  empty.burn_graft_donor = graftDonors.join("; ");
  empty.burn_mesh_ratio = meshRatios.join("; ");
  empty.burn_graft_take_pct = graftTakes.length > 0
    ? graftTakes.map(String).join("; ") : "";
  empty.burn_contracture_joint = joints.join("; ");
  empty.burn_rom_pre = romPres.length > 0 ? romPres.map((r) => `${r}°`).join("; ") : "";
  empty.burn_rom_post = romPosts.length > 0 ? romPosts.map((r) => `${r}°`).join("; ") : "";
  empty.burn_dermal_sub_product = dermalSubs.join("; ");

  // Outcome fields
  const outcomes = ba.outcomes;
  if (outcomes) {
    if (outcomes.vancouverScarScale) {
      empty.burn_vss_total = String(calculateVSSTotal(outcomes.vancouverScarScale));
    }
    if (outcomes.posasObserver) {
      empty.burn_posas_total = String(calculatePOSASTotal(outcomes.posasObserver));
    }
    if (outcomes.complications && outcomes.complications.length > 0) {
      empty.burn_complications = outcomes.complications
        .map((c) => BURN_COMPLICATION_LABELS[c])
        .join("; ");
    }
    if (outcomes.lengthOfStayDays != null) {
      empty.burn_los_days = String(outcomes.lengthOfStayDays);
    }
    if (outcomes.icuDays != null) {
      empty.burn_icu_days = String(outcomes.icuDays);
    }
  }

  return empty;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FHIR EXPORT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds FHIR extension data for burns assessment on a Condition resource.
 */
export function buildBurnsFhirExtension(
  ba: BurnsAssessmentData,
  diagnosisPicklistId?: string,
): Array<{ url: string; valueString?: string; valueDecimal?: number; valueBoolean?: boolean }> {
  const extensions: Array<{
    url: string;
    valueString?: string;
    valueDecimal?: number;
    valueBoolean?: boolean;
  }> = [];

  const phase = diagnosisPicklistId
    ? getBurnPhaseFromDiagnosis(diagnosisPicklistId)
    : "acute";
  extensions.push({ url: "phase", valueString: phase });

  if (ba.tbsa?.totalTBSA != null) {
    extensions.push({ url: "tbsaTotal", valueDecimal: ba.tbsa.totalTBSA });
  }
  if (ba.tbsa?.partialThicknessTBSA != null) {
    extensions.push({ url: "tbsaPartial", valueDecimal: ba.tbsa.partialThicknessTBSA });
  }
  if (ba.tbsa?.fullThicknessTBSA != null) {
    extensions.push({ url: "tbsaFull", valueDecimal: ba.tbsa.fullThicknessTBSA });
  }
  if (ba.injuryEvent?.mechanism) {
    extensions.push({ url: "mechanism", valueString: ba.injuryEvent.mechanism });
  }
  if (ba.injuryEvent?.inhalationInjury != null) {
    extensions.push({ url: "inhalationInjury", valueBoolean: ba.injuryEvent.inhalationInjury });
  }

  return extensions;
}

/**
 * Builds FHIR extension data for burn procedure details on a Procedure resource.
 */
export function buildBurnProcedureFhirExtension(
  details: BurnProcedureDetails,
): Array<{ url: string; valueString?: string; valueDecimal?: number }> {
  const ext: Array<{ url: string; valueString?: string; valueDecimal?: number }> = [];

  if (details.excision) {
    if (details.excision.tbsaExcised != null)
      ext.push({ url: "excisionTbsa", valueDecimal: details.excision.tbsaExcised });
    if (details.excision.excisionDepth)
      ext.push({ url: "excisionDepth", valueString: details.excision.excisionDepth });
  }

  if (details.grafting) {
    if (details.grafting.graftType)
      ext.push({ url: "graftType", valueString: details.grafting.graftType });
    if (details.grafting.donorSite)
      ext.push({ url: "graftDonorSite", valueString: details.grafting.donorSite });
    if (details.grafting.meshRatio)
      ext.push({ url: "meshRatio", valueString: details.grafting.meshRatio });
    if (details.grafting.graftTakePercentage != null)
      ext.push({ url: "graftTake", valueDecimal: details.grafting.graftTakePercentage });
  }

  if (details.contractureRelease) {
    if (details.contractureRelease.joint)
      ext.push({ url: "contractureJoint", valueString: details.contractureRelease.joint });
    if (details.contractureRelease.romPreOpDegrees != null)
      ext.push({ url: "romPreOp", valueDecimal: details.contractureRelease.romPreOpDegrees });
    if (details.contractureRelease.romPostOpDegrees != null)
      ext.push({ url: "romPostOp", valueDecimal: details.contractureRelease.romPostOpDegrees });
  }

  return ext;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a compact burn summary string for PDF export.
 */
export function getBurnsPdfSummary(groups: DiagnosisGroup[]): string {
  const burnGroup = groups.find((g) => g.burnsAssessment);
  if (!burnGroup?.burnsAssessment) return "";

  const ba = burnGroup.burnsAssessment;
  const parts: string[] = [];

  // Phase
  const pdfPhase = burnGroup.diagnosisPicklistId
    ? getBurnPhaseFromDiagnosis(burnGroup.diagnosisPicklistId)
    : "acute";
  parts.push(BURN_PHASE_LABELS[pdfPhase]);

  // TBSA
  if (ba.tbsa?.totalTBSA != null) {
    parts.push(`${ba.tbsa.totalTBSA}% TBSA`);
  }

  // Mechanism
  if (ba.injuryEvent?.mechanism) {
    parts.push(BURN_MECHANISM_LABELS[ba.injuryEvent.mechanism]);
  }

  // Inhalation
  if (ba.injuryEvent?.inhalationInjury) {
    parts.push("inhalation");
  }

  // Graft summary
  const graftProcs = burnGroup.procedures.filter(
    (p) => p.burnProcedureDetails?.grafting,
  );
  for (const gp of graftProcs) {
    const g = gp.burnProcedureDetails!.grafting!;
    const gParts: string[] = [];
    if (g.graftType) gParts.push(GRAFT_TYPE_LABELS[g.graftType]);
    if (g.meshRatio) gParts.push(MESH_RATIO_LABELS[g.meshRatio]);
    if (g.donorSite) gParts.push(GRAFT_DONOR_LABELS[g.donorSite]);
    if (gParts.length > 0) parts.push(gParts.join(" · "));
  }

  // Contracture ROM
  const contractureProcs = burnGroup.procedures.filter(
    (p) => p.burnProcedureDetails?.contractureRelease,
  );
  for (const cp of contractureProcs) {
    const cr = cp.burnProcedureDetails!.contractureRelease!;
    if (cr.joint && cr.romPreOpDegrees != null && cr.romPostOpDegrees != null) {
      parts.push(
        `${CONTRACTURE_JOINT_LABELS[cr.joint]} ROM ${cr.romPreOpDegrees}°→${cr.romPostOpDegrees}°`,
      );
    }
  }

  return parts.join(", ");
}
