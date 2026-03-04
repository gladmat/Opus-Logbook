import { Case, SPECIALTY_LABELS } from "@/types/case";

export interface CsvExportOptions {
  includePatientId: boolean;
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
  "entry_duration_seconds",
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
    c.entryDurationSeconds,
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
