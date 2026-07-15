import { toRacsMaltJDocs, toRacsMaltPlastics } from "@/types/operativeRole";
import type { ProcedureReportDefinition } from "../types";
import {
  admissionColumns,
  auditOutcomeColumns,
  procedureCoreColumns,
  roleColumn,
} from "./commonColumns";

/**
 * RACS MALT (Plastics) — one row per procedure with MALT supervision
 * values via the tested toRacsMaltPlastics mapper, plus the 30-day audit
 * block the app already captures per RACS MALT semantics.
 */
export const racsMaltPlasticsReport: ProcedureReportDefinition = {
  id: "racs_malt_plastics",
  title: "RACS MALT (Plastics)",
  description:
    "MALT Plastics logbook: procedure log with MALT supervision values and the 30-day audit block (readmission, return to theatre, ICU, Clavien-Dindo).",
  category: "training-body",
  granularity: "procedure",
  suggestFor: {
    programmes: ["racs"],
    countries: ["new_zealand", "australia"],
  },
  defaultIncludePatientId: false,
  pdfTableColumns: [
    "procedure_date",
    "facility",
    "procedure_name",
    "malt_supervision",
    "admission_urgency",
    "stay_type",
  ],
  roleSummaryColumn: "malt_supervision",
  columns: [
    ...procedureCoreColumns(),
    roleColumn("malt_supervision", "MALT Supervision", (role, supervision) =>
      toRacsMaltPlastics(role, supervision),
    ),
    ...admissionColumns(),
    ...auditOutcomeColumns(),
  ],
};

/**
 * RACS JDocs — slimmer procedure log using the JDocs role taxonomy.
 */
export const racsJdocsReport: ProcedureReportDefinition = {
  id: "racs_jdocs",
  title: "RACS JDocs",
  description:
    "JDocs-format procedure log (Independent / Supervised / 1st Assistant / 2nd Assistant / Observed).",
  category: "training-body",
  granularity: "procedure",
  suggestFor: {
    countries: ["new_zealand", "australia"],
  },
  defaultIncludePatientId: false,
  pdfTableColumns: [
    "procedure_date",
    "facility",
    "procedure_name",
    "jdocs_role",
    "admission_urgency",
  ],
  roleSummaryColumn: "jdocs_role",
  columns: [
    ...procedureCoreColumns(),
    roleColumn("jdocs_role", "JDocs Role", (role, supervision) =>
      toRacsMaltJDocs(role, supervision),
    ),
    {
      key: "admission_urgency",
      header: "Urgency",
      extract: (ctx) =>
        ctx.case.admissionUrgency === "acute"
          ? "Acute"
          : ctx.case.admissionUrgency === "elective"
            ? "Elective"
            : "",
    },
  ],
};
