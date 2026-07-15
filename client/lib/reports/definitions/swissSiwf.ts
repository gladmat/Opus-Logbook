import { toSwissSiwf } from "@/types/operativeRole";
import type { ProcedureReportDefinition } from "../types";
import { procedureCoreColumns, roleColumn } from "./commonColumns";

/**
 * Swiss SIWF eLogbuch — one row per procedure with SIWF operateur status
 * (O = Operateur, AI = Assistierte Intervention, A = Assistenz).
 */
export const swissSiwfReport: ProcedureReportDefinition = {
  id: "swiss_siwf",
  title: "SIWF eLogbuch (CH)",
  description:
    "Swiss SIWF training logbook: Operateur-Status (O / AI / A) per procedure.",
  category: "training-body",
  granularity: "procedure",
  suggestFor: {
    countries: ["switzerland"],
  },
  defaultIncludePatientId: false,
  pdfTableColumns: [
    "procedure_date",
    "facility",
    "procedure_name",
    "siwf_status",
    "responsible_consultant",
  ],
  roleSummaryColumn: "siwf_status",
  columns: [
    ...procedureCoreColumns(),
    roleColumn("siwf_status", "Operateur-Status", (role, supervision) =>
      toSwissSiwf(role, supervision),
    ),
  ],
};
