import {
  BROWN_MANDIBLE_CLASS_LABELS,
  Case,
  type DiagnosisGroup,
  JOINT_CASE_ABLATIVE_SURGEON_LABELS,
  JOINT_CASE_PARTNER_SPECIALTY_LABELS,
  JOINT_CASE_RECONSTRUCTION_SEQUENCE_LABELS,
  JOINT_CASE_STRUCTURE_RESECTED_LABELS,
  MANDIBLE_SEGMENT_LABELS,
  RECIPIENT_VESSEL_QUALITY_LABELS,
  SPECIALTY_LABELS,
  VEIN_GRAFT_SOURCE_LABELS,
  calculateAgeFromDob,
  type FreeFlapDetails,
} from "@/types/case";
import {
  resolveOperativeRole,
  resolveSupervisionLevel,
  OPERATIVE_ROLE_LABELS,
  SUPERVISION_LABELS,
  toNearestLegacyRole,
} from "@/types/operativeRole";
import { TreatmentEpisode, ENCOUNTER_CLASS_LABELS } from "@/types/episode";
import {
  HAND_INFECTION_TYPE_LABELS,
  SEVERITY_LABELS as HAND_SEVERITY_LABELS,
  HAND_ORGANISM_LABELS,
  HAND_ANTIBIOTIC_LABELS,
  countKanavelSigns,
} from "@/types/handInfection";
import {
  getImplantBearingProcedures,
  getImplantDisplayFields,
} from "@/lib/jointImplant";
import { getBreastExportData } from "@/lib/breastExport";
import {
  generateDupuytrenCsvRayDetail,
  calculateDiathesisScore,
  getDominantPatternLabel,
} from "@/lib/dupuytrenHelpers";

export interface CsvExportOptions {
  includePatientId: boolean;
  episodeMap?: Map<string, TreatmentEpisode>;
}

/**
 * CSV column layout — one row per case.
 *
 * Primary diagnosis/procedure in dedicated columns;
 * secondary diagnoses/procedures semicolon-delimited.
 * Laterality and staging included per RACS MALT spec.
 */

const CSV_HEADERS = [
  "case_id",
  "patient_id",
  "patient_first_name",
  "patient_last_name",
  "patient_dob",
  "patient_nhi",
  "patient_age",
  "procedure_date",
  "facility",
  "specialty",
  "admission_urgency",
  "stay_type",
  "admission_date",
  "discharge_date",
  "primary_diagnosis",
  "primary_diagnosis_snomed",
  "primary_laterality",
  "primary_staging",
  "primary_procedure",
  "primary_procedure_snomed",
  "primary_procedure_role",
  "responsible_consultant",
  "operative_role",
  "supervision_level",
  "secondary_diagnoses",
  "secondary_procedures",
  "asa_score",
  "bmi",
  "smoker",
  "anaesthetic_type",
  "wound_infection_risk",
  "surgery_duration_minutes",
  "outcome",
  "return_to_theatre",
  "unplanned_icu",
  "has_complications",
  "complication_grades",
  "case_status",
  "episode_id",
  "episode_title",
  "encounter_class",
  "entry_duration_seconds",
  "hand_infection_type",
  "hand_infection_digits",
  "hand_infection_organism",
  "hand_infection_antibiotic",
  "hand_infection_severity",
  "hand_infection_kanavel",
  // ── Dupuytren / elective hand columns ──
  "affected_fingers",
  "dupuytren_ray_detail",
  "dupuytren_total_score",
  "dupuytren_dominant_pattern",
  "dupuytren_revision",
  "dupuytren_web_space",
  "dupuytren_diathesis_score",
  "implant_system",
  "implant_size",
  "implant_fixation",
  "implant_approach",
  "implant_bearing",
  "implant_joint_type",
  "planned_date",
  // ── Breast module columns ──
  "breast_laterality",
  "breast_L_context",
  "breast_R_context",
  "breast_L_recon_timing",
  "breast_R_recon_timing",
  "breast_L_implant_manufacturer",
  "breast_L_implant_volume_cc",
  "breast_L_implant_surface",
  "breast_L_implant_fill",
  "breast_L_implant_shape",
  "breast_L_implant_profile",
  "breast_L_implant_plane",
  "breast_L_implant_incision",
  "breast_L_adm_used",
  "breast_L_adm_product",
  "breast_R_implant_manufacturer",
  "breast_R_implant_volume_cc",
  "breast_R_implant_surface",
  "breast_R_implant_fill",
  "breast_R_implant_shape",
  "breast_R_implant_profile",
  "breast_R_implant_plane",
  "breast_R_implant_incision",
  "breast_R_adm_used",
  "breast_R_adm_product",
  "breast_L_flap_weight_g",
  "breast_L_perforator_count",
  "breast_L_recipient_artery",
  "breast_R_flap_weight_g",
  "breast_R_perforator_count",
  "breast_R_recipient_artery",
  "breast_L_lipofilling_volume_ml",
  "breast_R_lipofilling_volume_ml",
  "breast_lipofilling_harvest_technique",
  "breast_lipofilling_total_harvested_ml",
  "breast_lipofilling_processing_method",
  "breast_lipofilling_session_number",
  "breast_recon_episode_id",
  // ── Joint case columns ──
  "joint_case",
  "partner_specialty",
  "partner_consultant",
  "ablative_surgeon",
  "reconstruction_sequence",
  "ablative_procedure_description",
  "defect_length_mm",
  "defect_width_mm",
  "defect_depth_mm",
  "structures_resected",
  // ── Head & Neck flap detail columns ──
  "hn_recipient_vessel_quality",
  "hn_vein_graft_used",
  "hn_vein_graft_source",
  "hn_vein_graft_length_cm",
  "hn_fibula_brown_class",
  "hn_fibula_mandible_segments",
] as const;

function escapeCsvField(
  value: string | number | boolean | undefined | null,
): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatStagingSelections(
  selections: Record<string, string> | undefined,
): string {
  if (!selections) return "";
  return Object.entries(selections)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
}

function getCaseImplantExportFields(c: Case) {
  const implantProcedures = (c.diagnosisGroups ?? []).flatMap((group) =>
    getImplantBearingProcedures(group.procedures ?? []),
  );
  if (implantProcedures.length === 0) {
    return {
      system: "",
      size: "",
      fixation: "",
      approach: "",
      bearing: "",
      jointType: "",
    };
  }

  const displayFields = implantProcedures.map((procedure) =>
    getImplantDisplayFields(procedure.implantDetails),
  );

  return {
    system: displayFields
      .map((fields) => fields.system || "Incomplete")
      .join("; "),
    size: displayFields.map((fields) => fields.size || "-").join("; "),
    fixation: displayFields.map((fields) => fields.fixation || "-").join("; "),
    approach: displayFields.map((fields) => fields.approach || "-").join("; "),
    bearing: displayFields.map((fields) => fields.bearing || "-").join("; "),
    jointType: displayFields
      .map((fields) => fields.jointType || "-")
      .join("; "),
  };
}

function extractBreastCsvFields(
  groups: DiagnosisGroup[],
): (string | number | undefined)[] {
  const breast = getBreastExportData(groups);
  if (!breast) {
    return new Array(39).fill("") as string[];
  }

  const left = breast.sides.left;
  const right = breast.sides.right;

  return [
    breast.laterality,
    left?.clinicalContextLabel ?? "",
    right?.clinicalContextLabel ?? "",
    left?.reconstructionTimingLabel ?? "",
    right?.reconstructionTimingLabel ?? "",
    left?.implant?.manufacturerLabel ?? "",
    left?.implant?.volumeCc ?? "",
    left?.implant?.surfaceLabel ?? "",
    left?.implant?.fillLabel ?? "",
    left?.implant?.shapeLabel ?? "",
    left?.implant?.profileLabel ?? "",
    left?.implant?.planeLabel ?? "",
    left?.implant?.incisionLabel ?? "",
    left?.implant?.admUsed === true
      ? "Yes"
      : left?.implant?.admUsed === false
        ? "No"
        : "",
    left?.implant?.admProduct ?? "",
    right?.implant?.manufacturerLabel ?? "",
    right?.implant?.volumeCc ?? "",
    right?.implant?.surfaceLabel ?? "",
    right?.implant?.fillLabel ?? "",
    right?.implant?.shapeLabel ?? "",
    right?.implant?.profileLabel ?? "",
    right?.implant?.planeLabel ?? "",
    right?.implant?.incisionLabel ?? "",
    right?.implant?.admUsed === true
      ? "Yes"
      : right?.implant?.admUsed === false
        ? "No"
        : "",
    right?.implant?.admProduct ?? "",
    left?.flap?.weightGrams ?? "",
    left?.flap?.perforatorCount ?? "",
    left?.flap?.recipientArteryLabel ?? "",
    right?.flap?.weightGrams ?? "",
    right?.flap?.perforatorCount ?? "",
    right?.flap?.recipientArteryLabel ?? "",
    left?.lipofillingVolumeMl ?? "",
    right?.lipofillingVolumeMl ?? "",
    breast.lipofilling?.harvestTechniqueLabel ?? "",
    breast.lipofilling?.totalVolumeHarvestedMl ?? "",
    breast.lipofilling?.processingMethodLabel ?? "",
    breast.lipofilling?.sessionNumber ?? "",
    breast.reconstructionEpisodeId ?? "",
  ];
}

function getHeadNeckFreeFlapDetails(c: Case): FreeFlapDetails | undefined {
  for (const group of c.diagnosisGroups ?? []) {
    for (const procedure of group.procedures ?? []) {
      if (
        (procedure.specialty ?? group.specialty) === "head_neck" &&
        procedure.tags?.includes("free_flap") &&
        procedure.clinicalDetails
      ) {
        return procedure.clinicalDetails as FreeFlapDetails;
      }
    }
  }

  return undefined;
}

function extractHeadNeckCsvFields(c: Case): (string | number | undefined)[] {
  const details = getHeadNeckFreeFlapDetails(c);
  if (!details) {
    return new Array(6).fill("") as string[];
  }

  const recipientVesselQuality =
    details.recipientVesselQuality ??
    (details.irradiatedVesselPreference === "vein_graft_required"
      ? "irradiated_vein_graft_required"
      : details.irradiatedNeckDissectionPerformed
        ? "previously_operated"
        : details.irradiatedVesselPreference === "ipsilateral_viable" ||
            (details.irradiatedVesselStatus &&
              details.irradiatedVesselStatus !== "normal")
          ? "irradiated_usable"
          : details.irradiatedVesselStatus === "normal" ||
              details.irradiatedVesselPreference === "contralateral"
            ? "normal"
            : undefined);
  const veinGraftUsed =
    details.veinGraftUsed ??
    details.irradiatedVesselPreference === "vein_graft_required";

  return [
    recipientVesselQuality
      ? RECIPIENT_VESSEL_QUALITY_LABELS[recipientVesselQuality]
      : "",
    veinGraftUsed === true ? "Yes" : veinGraftUsed === false ? "No" : "",
    details.veinGraftSource
      ? VEIN_GRAFT_SOURCE_LABELS[details.veinGraftSource]
      : "",
    details.veinGraftLength ?? "",
    details.flapSpecificDetails?.fibulaBrownClass
      ? BROWN_MANDIBLE_CLASS_LABELS[
          details.flapSpecificDetails.fibulaBrownClass
        ]
      : "",
    details.flapSpecificDetails?.fibulaMandibleSegments?.length
      ? details.flapSpecificDetails.fibulaMandibleSegments
          .map((segment) => MANDIBLE_SEGMENT_LABELS[segment] ?? segment)
          .join("; ")
      : "",
  ];
}

function caseToRow(c: Case, options: CsvExportOptions): string {
  const groups = c.diagnosisGroups || [];
  const primaryGroup = groups[0];
  const secondaryGroups = groups.slice(1);
  const primaryProc = primaryGroup?.procedures[0];

  const secondaryDiagnoses = secondaryGroups
    .map((g) => g.diagnosis?.displayName)
    .filter(Boolean)
    .join("; ");

  const allSecondaryProcs = [
    ...(primaryGroup?.procedures.slice(1) || []),
    ...secondaryGroups.flatMap((g) => g.procedures),
  ];
  const secondaryProcedures = allSecondaryProcs
    .map((p) => {
      const lat = p.laterality ? ` (${p.laterality === "left" ? "Left" : "Right"})` : "";
      return p.procedureName ? `${p.procedureName}${lat}` : "";
    })
    .filter(Boolean)
    .join("; ");

  const complicationGrades = (c.complications || [])
    .map((comp) => comp.clavienDindoGrade)
    .filter(Boolean)
    .join("; ");

  const episodeTitle = c.episodeId
    ? (options.episodeMap?.get(c.episodeId)?.title ?? "")
    : "";
  const encounterClassLabel = c.encounterClass
    ? ENCOUNTER_CLASS_LABELS[c.encounterClass]
    : "";

  // Hand infection data (from primary group)
  const handInfection = primaryGroup?.handInfectionDetails;

  const implantFields = getCaseImplantExportFields(c);
  const breastFields = extractBreastCsvFields(groups);
  const headNeckFields = extractHeadNeckCsvFields(c);

  const values: (string | number | boolean | undefined | null)[] = [
    c.id,
    options.includePatientId ? c.patientIdentifier : undefined,
    options.includePatientId ? c.patientFirstName : undefined,
    options.includePatientId ? c.patientLastName : undefined,
    options.includePatientId ? c.patientDateOfBirth : undefined,
    options.includePatientId ? c.patientNhi : undefined,
    options.includePatientId
      ? (calculateAgeFromDob(c.patientDateOfBirth) ?? c.age)
      : undefined,
    c.procedureDate,
    c.facility,
    SPECIALTY_LABELS[c.specialty] || c.specialty,
    c.admissionUrgency,
    c.stayType,
    c.admissionDate,
    c.dischargeDate,
    primaryGroup?.diagnosis?.displayName,
    primaryGroup?.diagnosis?.snomedCtCode,
    primaryGroup?.diagnosisClinicalDetails?.laterality ?? "",
    formatStagingSelections(primaryGroup?.diagnosisStagingSelections),
    primaryProc
      ? `${primaryProc.procedureName}${primaryProc.laterality ? ` (${primaryProc.laterality === "left" ? "Left" : "Right"})` : ""}`
      : "",
    primaryProc?.snomedCtCode,
    // primary_procedure_role — backward compat (legacy code)
    (() => {
      const role = resolveOperativeRole(
        primaryProc?.operativeRoleOverride,
        c.defaultOperativeRole,
      );
      const sup = resolveSupervisionLevel(
        primaryProc?.supervisionLevelOverride,
        c.defaultSupervisionLevel,
        role,
      );
      return toNearestLegacyRole(role, sup);
    })(),
    // responsible_consultant
    c.responsibleConsultantName ?? "",
    // operative_role
    (() => {
      const role = resolveOperativeRole(
        primaryProc?.operativeRoleOverride,
        c.defaultOperativeRole,
      );
      return OPERATIVE_ROLE_LABELS[role];
    })(),
    // supervision_level
    (() => {
      const role = resolveOperativeRole(
        primaryProc?.operativeRoleOverride,
        c.defaultOperativeRole,
      );
      const sup = resolveSupervisionLevel(
        primaryProc?.supervisionLevelOverride,
        c.defaultSupervisionLevel,
        role,
      );
      return SUPERVISION_LABELS[sup];
    })(),
    secondaryDiagnoses,
    secondaryProcedures,
    c.asaScore,
    c.bmi,
    c.smoker,
    c.anaestheticType,
    c.woundInfectionRisk,
    c.surgeryTiming?.durationMinutes,
    c.outcome,
    c.returnToTheatre,
    c.unplannedICU,
    c.hasComplications,
    complicationGrades,
    c.caseStatus,
    c.episodeId ?? "",
    episodeTitle,
    encounterClassLabel,
    c.entryDurationSeconds,
    handInfection
      ? HAND_INFECTION_TYPE_LABELS[handInfection.infectionType]
      : "",
    handInfection?.affectedDigits?.join("; ") ?? "",
    handInfection?.organism ? HAND_ORGANISM_LABELS[handInfection.organism] : "",
    handInfection?.empiricalAntibiotic
      ? HAND_ANTIBIOTIC_LABELS[handInfection.empiricalAntibiotic]
      : "",
    handInfection ? HAND_SEVERITY_LABELS[handInfection.severity] : "",
    handInfection?.kanavelSigns
      ? `${countKanavelSigns(handInfection.kanavelSigns)}/4`
      : "",
    // ── Dupuytren / elective hand ──
    primaryGroup?.affectedFingers?.join("; ") ?? "",
    primaryGroup?.dupuytrenAssessment?.rays?.length
      ? generateDupuytrenCsvRayDetail(primaryGroup.dupuytrenAssessment)
      : "",
    primaryGroup?.dupuytrenAssessment?.totalHandScore != null
      ? String(primaryGroup.dupuytrenAssessment.totalHandScore)
      : "",
    primaryGroup?.dupuytrenAssessment?.dominantPattern
      ? getDominantPatternLabel(
          primaryGroup.dupuytrenAssessment.dominantPattern,
        )
      : "",
    primaryGroup?.dupuytrenAssessment?.isRevision ? "Yes" : "",
    primaryGroup?.dupuytrenAssessment?.firstWebSpace?.isAffected
      ? "Yes"
      : "",
    primaryGroup?.dupuytrenAssessment?.diathesis
      ? String(
          calculateDiathesisScore(primaryGroup.dupuytrenAssessment.diathesis),
        )
      : "",
    implantFields.system,
    implantFields.size,
    implantFields.fixation,
    implantFields.approach,
    implantFields.bearing,
    implantFields.jointType,
    c.plannedDate ?? "",
    // ── Breast module ──
    ...breastFields,
    // ── Joint case ──
    c.jointCaseContext?.isJointCase ? "Yes" : "",
    c.jointCaseContext?.partnerSpecialty
      ? JOINT_CASE_PARTNER_SPECIALTY_LABELS[c.jointCaseContext.partnerSpecialty]
      : "",
    c.jointCaseContext?.partnerConsultantName ?? "",
    c.jointCaseContext?.ablativeSurgeon
      ? JOINT_CASE_ABLATIVE_SURGEON_LABELS[c.jointCaseContext.ablativeSurgeon]
      : "",
    c.jointCaseContext?.reconstructionSequence
      ? JOINT_CASE_RECONSTRUCTION_SEQUENCE_LABELS[
          c.jointCaseContext.reconstructionSequence
        ]
      : "",
    c.jointCaseContext?.ablativeProcedureDescription ?? "",
    c.jointCaseContext?.defectDimensions?.length ?? "",
    c.jointCaseContext?.defectDimensions?.width ?? "",
    c.jointCaseContext?.defectDimensions?.depth ?? "",
    c.jointCaseContext?.structuresResected?.length
      ? c.jointCaseContext.structuresResected
          .map((value) => JOINT_CASE_STRUCTURE_RESECTED_LABELS[value] ?? value)
          .join("; ")
      : "",
    // ── Head & Neck flap details ──
    ...headNeckFields,
  ];

  return values.map(escapeCsvField).join(",");
}

export function exportCasesAsCsv(
  cases: Case[],
  options: CsvExportOptions = { includePatientId: true },
): string {
  const PATIENT_ID_HEADERS = new Set([
    "patient_id",
    "patient_first_name",
    "patient_last_name",
    "patient_dob",
    "patient_nhi",
    "patient_age",
  ]);
  const headers = options.includePatientId
    ? CSV_HEADERS
    : CSV_HEADERS.filter((h) => !PATIENT_ID_HEADERS.has(h));

  const headerRow = headers.join(",");
  const dataRows = cases.map((c) => caseToRow(c, options));
  return [headerRow, ...dataRows].join("\n");
}
