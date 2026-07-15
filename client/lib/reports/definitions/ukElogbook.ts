import { toUkElogbook } from "@/types/operativeRole";
import type { ProcedureReportDefinition } from "../types";
import {
  anaestheticColumn,
  procedureCoreColumns,
  roleColumn,
} from "./commonColumns";

/**
 * UK ISCP eLogbook — one row per procedure, supervision coded with the
 * eLogbook taxonomy (O / A / S-TS / S-TU / P / T) via the tested
 * toUkElogbook mapper. Best-effort v1 layout; column headers/order adjust
 * trivially when an official eLogbook import template is supplied.
 */
export const ukElogbookReport: ProcedureReportDefinition = {
  id: "uk_elogbook",
  title: "UK ISCP eLogbook",
  description:
    "Procedure log with eLogbook supervision codes (O/A/S-TS/S-TU/P/T). SNOMED coded — eLogbook's OPCS-4 codes are not held by Opus.",
  category: "training-body",
  granularity: "procedure",
  suggestFor: {
    programmes: ["iscp"],
    countries: ["united_kingdom", "ireland"],
  },
  defaultIncludePatientId: false,
  pdfTableColumns: [
    "procedure_date",
    "facility",
    "procedure_name",
    "supervision_code",
    "admission_type",
    "responsible_consultant",
  ],
  roleSummaryColumn: "supervision_code",
  columns: [
    ...procedureCoreColumns(),
    roleColumn("supervision_code", "Supervision Code", (role, supervision) =>
      toUkElogbook(role, supervision),
    ),
    {
      key: "admission_type",
      header: "Admission Type",
      extract: (ctx) =>
        ctx.case.admissionUrgency === "acute"
          ? "Emergency"
          : ctx.case.admissionUrgency === "elective"
            ? "Elective"
            : "",
    },
    anaestheticColumn(),
    {
      key: "complications_flag",
      header: "Complications",
      extract: (ctx) =>
        ctx.case.hasComplications === undefined
          ? ""
          : ctx.case.hasComplications
            ? "Yes"
            : "No",
    },
    {
      key: "notes",
      header: "Notes",
      extract: (ctx) => ctx.procedure.notes ?? "",
    },
  ],
};
