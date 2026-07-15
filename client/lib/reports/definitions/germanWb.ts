import { toGermanWeiterbildung } from "@/types/operativeRole";
import type { ProcedureReportDefinition } from "../types";
import { procedureCoreColumns, roleColumn } from "./commonColumns";

/**
 * German Weiterbildung OP-Katalog — one row per procedure. Domain-term
 * columns carry German headers (Tätigkeit, OPS-Code) since that is what
 * the Weiterbildungsordnung paperwork uses; shared columns keep the
 * common English headers so the core block stays consistent.
 *
 * OPS code exports from procedure.localCode when the local code system is
 * OPS — otherwise blank (Opus codes procedures in SNOMED CT).
 */
export const germanWeiterbildungReport: ProcedureReportDefinition = {
  id: "german_weiterbildung",
  title: "Weiterbildung OP-Katalog (DE)",
  description:
    "German training logbook: Tätigkeit (Selbstverantwortlich / Unter Anleitung / Assistiert) per procedure; OPS code when recorded.",
  category: "training-body",
  granularity: "procedure",
  suggestFor: {
    countries: ["germany"],
  },
  defaultIncludePatientId: false,
  pdfTableColumns: [
    "procedure_date",
    "facility",
    "procedure_name",
    "taetigkeit",
    "ops_code",
  ],
  roleSummaryColumn: "taetigkeit",
  columns: [
    ...procedureCoreColumns(),
    roleColumn("taetigkeit", "Tätigkeit", (role, supervision) =>
      toGermanWeiterbildung(role, supervision),
    ),
    {
      key: "ops_code",
      header: "OPS-Code",
      extract: (ctx) =>
        ctx.procedure.localCodeSystem?.toLowerCase() === "ops"
          ? (ctx.procedure.localCode ?? "")
          : "",
    },
  ],
};
