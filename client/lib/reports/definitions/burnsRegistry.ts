import type { Case } from "@/types/case";
import {
  BURNS_CSV_HEADERS,
  type BurnsCsvFields,
  extractBurnsCsvFields,
} from "@/lib/burnsExport";
import type {
  CaseReportContext,
  CaseReportDefinition,
  ReportColumn,
} from "../types";
import {
  auditOutcomeColumns,
  caseCoreColumns,
  patientIdentityColumns,
} from "./commonColumns";

/**
 * Burns registry — one row per case with a burns assessment. Wires the
 * burns export module (client/lib/burnsExport.ts) into a live report:
 * the 20 burn_* columns are keyed straight off BURNS_CSV_HEADERS so the
 * two stay in lockstep.
 */

const burnsFieldsCache = new WeakMap<Case, BurnsCsvFields>();

function burnsFields(c: Case): BurnsCsvFields {
  let fields = burnsFieldsCache.get(c);
  if (!fields) {
    fields = extractBurnsCsvFields(c.diagnosisGroups ?? []);
    burnsFieldsCache.set(c, fields);
  }
  return fields;
}

function hasBurnsAssessment(c: Case): boolean {
  return (c.diagnosisGroups ?? []).some((g) => g.burnsAssessment);
}

const burnColumns: ReportColumn<CaseReportContext>[] = BURNS_CSV_HEADERS.map(
  (key) => ({
    key,
    header: key,
    extract: (ctx: CaseReportContext) => burnsFields(ctx.case)[key],
  }),
);

export const burnsRegistryReport: CaseReportDefinition = {
  id: "burns_registry",
  title: "Burns Registry",
  description:
    "Burns registry extract: TBSA, mechanism, inhalation injury, excision and grafting, scar outcomes and length of stay per burns case.",
  category: "registry",
  granularity: "case",
  isCaseEligible: hasBurnsAssessment,
  eligibilityHint: "Only cases with a burns assessment are included.",
  defaultIncludePatientId: true,
  pdfTableColumns: [
    "procedure_date",
    "facility",
    "burn_tbsa_total",
    "burn_mechanism",
    "burn_graft_type",
    "burn_los_days",
  ],
  columns: [
    ...caseCoreColumns(),
    ...patientIdentityColumns(),
    ...burnColumns,
    ...auditOutcomeColumns(),
  ],
};
