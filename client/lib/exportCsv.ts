import { Case, SPECIALTY_LABELS } from "@/types/case";
import { TreatmentEpisode, ENCOUNTER_CLASS_LABELS } from "@/types/episode";
import {
  HAND_INFECTION_TYPE_LABELS,
  SEVERITY_LABELS as HAND_SEVERITY_LABELS,
  HAND_ORGANISM_LABELS,
  HAND_ANTIBIOTIC_LABELS,
  countKanavelSigns,
} from "@/types/handInfection";
import { IMPLANT_CATALOGUE } from "@/data/implantCatalogue";
import {
  FIXATION_LABELS,
  APPROACH_LABELS,
  BEARING_LABELS,
  JOINT_TYPE_LABELS,
} from "@/types/jointImplant";

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

  // Implant data (from first procedure with implant details)
  const implantProc = (primaryGroup?.procedures ?? []).find(
    (p) => p.implantDetails?.implantSystemId,
  );
  const implant = implantProc?.implantDetails;
  const implantEntry = implant?.implantSystemId
    ? IMPLANT_CATALOGUE[implant.implantSystemId]
    : undefined;

  const values: (string | number | boolean | undefined | null)[] = [
    c.id,
    options.includePatientId ? c.patientIdentifier : undefined,
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
    primaryProc?.surgeonRole,
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
    implantEntry?.displayName ?? implant?.implantSystemOther ?? "",
    implant?.sizeUnified ??
      (implant?.cupSize && implant?.stemSize
        ? `Cup ${implant.cupSize} / Stem ${implant.stemSize}`
        : ""),
    implant?.fixation ? FIXATION_LABELS[implant.fixation] : "",
    implant?.approach ? APPROACH_LABELS[implant.approach] : "",
    implant?.bearingSurface ? BEARING_LABELS[implant.bearingSurface] : "",
    implant?.jointType ? JOINT_TYPE_LABELS[implant.jointType] : "",
  ];

  return values.map(escapeCsvField).join(",");
}

export function exportCasesAsCsv(
  cases: Case[],
  options: CsvExportOptions = { includePatientId: true },
): string {
  const headers = options.includePatientId
    ? CSV_HEADERS
    : CSV_HEADERS.filter((h) => h !== "patient_id");

  const headerRow = headers.join(",");
  const dataRows = cases.map((c) => caseToRow(c, options));
  return [headerRow, ...dataRows].join("\n");
}
