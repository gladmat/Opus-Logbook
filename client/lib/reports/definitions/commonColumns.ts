import {
  ADMISSION_URGENCY_LABELS,
  ANAESTHETIC_TYPE_LABELS,
  ASA_GRADE_LABELS,
  type Case,
  type ClavienDindoGrade,
  CLAVIEN_DINDO_LABELS,
  calculateAgeFromDob,
  DISCHARGE_OUTCOME_LABELS,
  GENDER_LABELS,
  getPrimaryDiagnosisName,
  MORTALITY_CLASSIFICATION_LABELS,
  SPECIALTY_LABELS,
  STAY_TYPE_LABELS,
  UNPLANNED_ICU_LABELS,
  UNPLANNED_READMISSION_LABELS,
} from "@/types/case";
import type { OperativeRole, SupervisionLevel } from "@/types/operativeRole";
import { parseDateOnlyValue } from "@/lib/dateValues";
import type {
  CaseReportContext,
  ProcedureReportContext,
  ReportColumn,
} from "../types";

/**
 * Shared column factories for report definitions. Each definition composes
 * these with its own registry-specific columns so the common semantics
 * (dates, PHI block, SNOMED coding, 30-day audit block) stay consistent
 * across every report.
 */

/** Age at the date of surgery (falls back to current age if no procedure date). */
function ageAtProcedure(c: Case): number | undefined {
  const reference = parseDateOnlyValue(c.procedureDate) ?? undefined;
  return calculateAgeFromDob(c.patientDateOfBirth, reference);
}

/** Effective laterality for a procedure row: procedure-level, else group-level. */
export function resolveRowLaterality(ctx: ProcedureReportContext): string {
  const value =
    ctx.procedure.laterality ??
    ctx.group.diagnosisClinicalDetails?.laterality ??
    "";
  if (value === "not_applicable") return "";
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

/** Highest Clavien-Dindo grade recorded across the case's complications. */
export function maxClavienDindoGrade(c: Case): ClavienDindoGrade | undefined {
  const order: ClavienDindoGrade[] = [
    "none",
    "I",
    "II",
    "IIIa",
    "IIIb",
    "IVa",
    "IVb",
    "V",
  ];
  let maxIndex = -1;
  for (const entry of c.complications ?? []) {
    if (!entry.clavienDindoGrade) continue;
    const idx = order.indexOf(entry.clavienDindoGrade);
    if (idx > maxIndex) maxIndex = idx;
  }
  return maxIndex >= 0 ? order[maxIndex] : undefined;
}

/**
 * Core block shared by every procedure-granularity (training logbook)
 * report: date, facility, specialty, PHI block, diagnosis + procedure
 * with SNOMED codes, laterality, responsible consultant.
 */
export function procedureCoreColumns(): ReportColumn<ProcedureReportContext>[] {
  return [
    {
      key: "procedure_date",
      header: "Date",
      extract: (ctx) => ctx.case.procedureDate,
    },
    {
      key: "facility",
      header: "Facility",
      extract: (ctx) => ctx.case.facility,
    },
    {
      key: "specialty",
      header: "Specialty",
      extract: (ctx) => SPECIALTY_LABELS[ctx.group.specialty] ?? "",
    },
    {
      key: "patient_identifier",
      header: "Patient ID",
      phi: true,
      extract: (ctx) => ctx.case.patientIdentifier,
    },
    {
      key: "patient_age",
      header: "Age",
      phi: true,
      extract: (ctx) => ageAtProcedure(ctx.case),
    },
    {
      key: "patient_gender",
      header: "Gender",
      phi: true,
      extract: (ctx) =>
        ctx.case.gender ? (GENDER_LABELS[ctx.case.gender] ?? "") : "",
    },
    {
      key: "diagnosis_name",
      header: "Diagnosis",
      extract: (ctx) => ctx.group.diagnosis?.displayName ?? "",
    },
    {
      key: "diagnosis_snomed",
      header: "Diagnosis SNOMED",
      extract: (ctx) => ctx.group.diagnosis?.snomedCtCode ?? "",
    },
    {
      key: "procedure_name",
      header: "Procedure",
      extract: (ctx) => ctx.procedure.procedureName,
    },
    {
      key: "procedure_snomed",
      header: "Procedure SNOMED",
      extract: (ctx) => ctx.procedure.snomedCtCode ?? "",
    },
    {
      key: "laterality",
      header: "Laterality",
      extract: resolveRowLaterality,
    },
    {
      key: "responsible_consultant",
      header: "Responsible Consultant",
      extract: (ctx) => ctx.case.responsibleConsultantName ?? "",
    },
  ];
}

/**
 * Core block for case-granularity (registry/audit) reports: one row per
 * case, primary diagnosis, PHI block.
 */
export function caseCoreColumns(): ReportColumn<CaseReportContext>[] {
  return [
    {
      key: "procedure_date",
      header: "Date",
      extract: (ctx) => ctx.case.procedureDate,
    },
    {
      key: "facility",
      header: "Facility",
      extract: (ctx) => ctx.case.facility,
    },
    {
      key: "specialty",
      header: "Specialty",
      extract: (ctx) => SPECIALTY_LABELS[ctx.case.specialty] ?? "",
    },
    {
      key: "patient_identifier",
      header: "Patient ID",
      phi: true,
      extract: (ctx) => ctx.case.patientIdentifier,
    },
    {
      key: "patient_age",
      header: "Age",
      phi: true,
      extract: (ctx) => ageAtProcedure(ctx.case),
    },
    {
      key: "patient_gender",
      header: "Gender",
      phi: true,
      extract: (ctx) =>
        ctx.case.gender ? (GENDER_LABELS[ctx.case.gender] ?? "") : "",
    },
    {
      key: "diagnosis_name",
      header: "Diagnosis",
      extract: (ctx) => getPrimaryDiagnosisName(ctx.case) ?? "",
    },
  ];
}

/**
 * Full patient identity block for clinical registries that require it
 * (device registries key on identity). Every column is PHI-flagged.
 */
export function patientIdentityColumns<
  TCtx extends CaseReportContext | ProcedureReportContext,
>(): ReportColumn<TCtx>[] {
  return [
    {
      key: "patient_first_name",
      header: "First Name",
      phi: true,
      extract: (ctx) => ctx.case.patientFirstName ?? "",
    },
    {
      key: "patient_last_name",
      header: "Last Name",
      phi: true,
      extract: (ctx) => ctx.case.patientLastName ?? "",
    },
    {
      key: "patient_dob",
      header: "Date of Birth",
      phi: true,
      extract: (ctx) => ctx.case.patientDateOfBirth ?? "",
    },
    {
      key: "patient_nhi",
      header: "NHI / Health ID",
      phi: true,
      extract: (ctx) => ctx.case.patientNhi ?? "",
    },
  ];
}

/**
 * Role column factory — each training-body definition supplies its own
 * mapper (one of the tested registry mappers in @/types/operativeRole, or
 * a local provisional one). The ctx is available so mappers that need
 * profile context (ACGME seniority) can reach it.
 */
export function roleColumn(
  key: string,
  header: string,
  map: (
    role: OperativeRole,
    supervision: SupervisionLevel,
    ctx: ProcedureReportContext,
  ) => string,
): ReportColumn<ProcedureReportContext> {
  return {
    key,
    header,
    extract: (ctx) => map(ctx.role, ctx.supervision, ctx),
  };
}

/**
 * 30-day audit block (RACS MALT semantics). Case-level fields — on
 * procedure-granularity reports they repeat on every row of the case,
 * which is how logbook uploads expect them.
 */
export function auditOutcomeColumns<
  TCtx extends CaseReportContext | ProcedureReportContext,
>(): ReportColumn<TCtx>[] {
  return [
    {
      key: "unplanned_readmission",
      header: "Unplanned Readmission",
      extract: (ctx) =>
        ctx.case.unplannedReadmission
          ? (UNPLANNED_READMISSION_LABELS[ctx.case.unplannedReadmission] ?? "")
          : "",
    },
    {
      key: "return_to_theatre",
      header: "Return to Theatre",
      extract: (ctx) =>
        ctx.case.returnToTheatre === undefined
          ? ""
          : ctx.case.returnToTheatre
            ? "Yes"
            : "No",
    },
    {
      key: "return_to_theatre_reason",
      header: "Return to Theatre Reason",
      extract: (ctx) => ctx.case.returnToTheatreReason ?? "",
    },
    {
      key: "unplanned_icu",
      header: "Unplanned ICU",
      extract: (ctx) =>
        ctx.case.unplannedICU
          ? (UNPLANNED_ICU_LABELS[ctx.case.unplannedICU] ?? "")
          : "",
    },
    {
      key: "max_clavien_dindo",
      header: "Max Clavien-Dindo",
      extract: (ctx) => {
        const grade = maxClavienDindoGrade(ctx.case);
        return grade ? CLAVIEN_DINDO_LABELS[grade] : "";
      },
    },
    {
      key: "discharge_outcome",
      header: "Discharge Outcome",
      extract: (ctx) =>
        ctx.case.outcome
          ? (DISCHARGE_OUTCOME_LABELS[ctx.case.outcome] ?? "")
          : "",
    },
    {
      key: "mortality_classification",
      header: "Mortality Classification",
      extract: (ctx) =>
        ctx.case.mortalityClassification
          ? (MORTALITY_CLASSIFICATION_LABELS[
              ctx.case.mortalityClassification
            ] ?? "")
          : "",
    },
    {
      key: "complications_reviewed",
      header: "30-Day Review Done",
      extract: (ctx) =>
        ctx.case.complicationsReviewed === undefined
          ? ""
          : ctx.case.complicationsReviewed
            ? "Yes"
            : "No",
    },
  ];
}

/** Admission context columns shared by several training-body reports. */
export function admissionColumns<
  TCtx extends CaseReportContext | ProcedureReportContext,
>(): ReportColumn<TCtx>[] {
  return [
    {
      key: "admission_urgency",
      header: "Urgency",
      extract: (ctx) =>
        ctx.case.admissionUrgency
          ? (ADMISSION_URGENCY_LABELS[ctx.case.admissionUrgency] ?? "")
          : "",
    },
    {
      key: "stay_type",
      header: "Stay Type",
      extract: (ctx) =>
        ctx.case.stayType ? (STAY_TYPE_LABELS[ctx.case.stayType] ?? "") : "",
    },
    {
      key: "asa_score",
      header: "ASA",
      extract: (ctx) =>
        ctx.case.asaScore ? (ASA_GRADE_LABELS[ctx.case.asaScore] ?? "") : "",
    },
  ];
}

/** Anaesthetic type column (UK eLogbook and others). */
export function anaestheticColumn<
  TCtx extends CaseReportContext | ProcedureReportContext,
>(): ReportColumn<TCtx> {
  return {
    key: "anaesthetic_type",
    header: "Anaesthetic",
    extract: (ctx) =>
      ctx.case.anaestheticType
        ? (ANAESTHETIC_TYPE_LABELS[ctx.case.anaestheticType] ?? "")
        : "",
  };
}
