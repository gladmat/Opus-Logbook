import type { OperativeRole, SupervisionLevel } from "@/types/operativeRole";
import type { ProcedureReportDefinition } from "../types";
import { procedureCoreColumns, roleColumn } from "./commonColumns";
import { SPECIALTY_LABELS } from "@/types/case";

export type EboprasRoleValue =
  | "Operator"
  | "Operator (supervised)"
  | "Assistant"
  | "Observer"
  | "Supervising surgeon";

/**
 * PROVISIONAL EBOPRAS role mapping — EBOPRAS has not published a fixed
 * role taxonomy the way MALT/ISCP have, so this local mapper stays inside
 * the definition file (not promoted to @/types/operativeRole) until the
 * taxonomy is confirmed against an official EBOPRAS logbook template.
 */
export function toEboprasRole(
  role: OperativeRole,
  supervision: SupervisionLevel,
): EboprasRoleValue {
  if (role === "OBSERVER") return "Observer";
  if (role === "FIRST_ASST" || role === "SECOND_ASST") return "Assistant";
  if (role === "SUPERVISOR") return "Supervising surgeon";
  // role === 'SURGEON'
  if (supervision === "INDEPENDENT" || supervision === "SUP_AVAILABLE") {
    return "Operator";
  }
  return "Operator (supervised)";
}

/**
 * EBOPRAS operative log — one row per procedure for the European board
 * fellowship paperwork.
 */
export const eboprasLogReport: ProcedureReportDefinition = {
  id: "ebopras_log",
  title: "EBOPRAS Operative Log",
  description:
    "European board (EBOPRAS) operative log with a provisional role mapping — adjust when an official template is available.",
  category: "training-body",
  granularity: "procedure",
  suggestFor: {
    programmes: ["febopras"],
  },
  defaultIncludePatientId: false,
  pdfTableColumns: [
    "procedure_date",
    "facility",
    "procedure_name",
    "ebopras_role",
    "ebopras_category",
  ],
  roleSummaryColumn: "ebopras_role",
  columns: [
    ...procedureCoreColumns(),
    roleColumn("ebopras_role", "Role", (role, supervision) =>
      toEboprasRole(role, supervision),
    ),
    {
      key: "ebopras_category",
      header: "Category",
      extract: (ctx) => SPECIALTY_LABELS[ctx.group.specialty] ?? "",
    },
  ],
};
