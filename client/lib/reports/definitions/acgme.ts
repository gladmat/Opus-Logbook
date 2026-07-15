import { toAcgmeGeneralSurgery } from "@/types/operativeRole";
import { getSeniorityTier } from "@/lib/seniorityTier";
import type { ProcedureReportDefinition } from "../types";
import { procedureCoreColumns, roleColumn } from "./commonColumns";

/**
 * ACGME Case Log — one row per procedure with ACGME resident role codes
 * (SC / SJ / FA / TA). Seniority (Surgeon Chief vs Surgeon Junior) is
 * derived from the profile's career stage: seniority tier ≥ 3 (Senior
 * Trainee, e.g. us_resident_senior / us_fellow) counts as senior. Unknown
 * career stage falls back to senior (the mapper's default).
 *
 * ACGME's official log keys on CPT codes, which Opus does not hold —
 * SNOMED codes are exported instead and the description says so.
 */
export const acgmeCaseLogReport: ProcedureReportDefinition = {
  id: "acgme_case_log",
  title: "ACGME Case Log",
  description:
    "ACGME-style resident case log (SC/SJ/FA/TA). SNOMED coded — ACGME's CPT codes are not held by Opus.",
  category: "training-body",
  granularity: "procedure",
  suggestFor: {
    programmes: ["acgme"],
    countries: ["united_states"],
  },
  defaultIncludePatientId: false,
  pdfTableColumns: [
    "procedure_date",
    "facility",
    "procedure_name",
    "acgme_role",
    "attending",
  ],
  roleSummaryColumn: "acgme_role",
  columns: [
    ...procedureCoreColumns(),
    roleColumn("acgme_role", "ACGME Role", (role, supervision, ctx) => {
      const tier = getSeniorityTier(ctx.profile?.careerStage);
      const isSeniorResident = tier === null ? true : tier >= 3;
      return toAcgmeGeneralSurgery(role, supervision, isSeniorResident);
    }),
    {
      key: "attending",
      header: "Attending",
      extract: (ctx) => ctx.case.responsibleConsultantName ?? "",
    },
    {
      key: "institution",
      header: "Institution",
      extract: (ctx) => ctx.case.facility,
    },
  ],
};
