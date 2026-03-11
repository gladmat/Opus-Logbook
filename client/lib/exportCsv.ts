import { Case, SPECIALTY_LABELS, calculateAgeFromDob } from "@/types/case";
import {
  resolveOperativeRole,
  resolveSupervisionLevel,
  OPERATIVE_ROLE_LABELS,
  SUPERVISION_LABELS,
  migrateLegacyRole,
  isLegacyRole,
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
  "implant_system",
  "implant_size",
  "implant_fixation",
  "implant_approach",
  "implant_bearing",
  "implant_joint_type",
  "planned_date",
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
    .map((p) => p.procedureName)
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
    primaryProc?.procedureName,
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
    implantFields.system,
    implantFields.size,
    implantFields.fixation,
    implantFields.approach,
    implantFields.bearing,
    implantFields.jointType,
    c.plannedDate ?? "",
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
