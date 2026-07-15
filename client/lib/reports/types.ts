import type { Case, DiagnosisGroup, CaseProcedure } from "@/types/case";
import type { OperativeRole, SupervisionLevel } from "@/types/operativeRole";
import type { UserProfile } from "@/lib/auth";
import type { StatisticsFilters } from "@/lib/statistics";
import type { CsvCellValue } from "@/lib/csvUtils";

/**
 * Purpose-built report system — targeted exports for training bodies
 * (RACS MALT, ISCP eLogbook, ACGME, …) and clinical registries, as opposed
 * to the complete ~230-column data dump in exportCsv.ts.
 *
 * A report is a ReportDefinition: a column set + eligibility rules +
 * row granularity. The engine (engine.ts) turns filtered cases into rows;
 * serializers turn rows into CSV/XLSX; pdfSummary.ts renders a
 * human-readable summary document.
 */

/** Reuse the statistics filter model — filterCases() already implements it. */
export type ReportFilters = StatisticsFilters;

export type ReportOutputFormat = "csv" | "xlsx" | "pdf";

export type ReportCategory = "training-body" | "registry" | "audit";

export type RowGranularity = "case" | "procedure";

export interface CaseReportContext {
  granularity: "case";
  case: Case;
  profile: UserProfile | null;
}

export interface ProcedureReportContext {
  granularity: "procedure";
  case: Case;
  group: DiagnosisGroup;
  procedure: CaseProcedure;
  /** 1-based position within the case's flattened procedure list */
  procedureIndex: number;
  /** Resolved via resolveOperativeRole — never the raw override */
  role: OperativeRole;
  /** Resolved via resolveSupervisionLevel — never the raw override */
  supervision: SupervisionLevel;
  profile: UserProfile | null;
}

export type ReportContext = CaseReportContext | ProcedureReportContext;

export type ReportCellValue = CsvCellValue;

export interface ReportColumn<TCtx extends ReportContext = ReportContext> {
  /**
   * Stable machine key. Official registry templates map onto keys later —
   * headers can be renamed/reordered freely without breaking extractors.
   */
  key: string;
  header: string;
  /** Stripped when the user turns "Include patient identifiers" off */
  phi?: boolean;
  extract: (ctx: TCtx) => ReportCellValue;
}

interface ReportDefinitionBase {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  /** Case-level gate (e.g. breast registry: implant-bearing cases only) */
  isCaseEligible?: (c: Case) => boolean;
  /** Profile signals that make this the suggested report */
  suggestFor?: { programmes?: string[]; countries?: string[] };
  /** Column keys (keep to ≤8) rendered in the PDF case table */
  pdfTableColumns: string[];
  /** Column key whose values are tallied in the PDF "counts by role" block */
  roleSummaryColumn?: string;
  /** Default for the "Include patient identifiers" toggle */
  defaultIncludePatientId: boolean;
  /** Shown under the row-count preview when eligibility gates apply */
  eligibilityHint?: string;
}

export interface CaseReportDefinition extends ReportDefinitionBase {
  granularity: "case";
  columns: ReportColumn<CaseReportContext>[];
}

export interface ProcedureReportDefinition extends ReportDefinitionBase {
  granularity: "procedure";
  columns: ReportColumn<ProcedureReportContext>[];
  /** Procedure-level gate (e.g. flap audit: free_flap-tagged procedures) */
  isProcedureEligible?: (
    c: Case,
    group: DiagnosisGroup,
    procedure: CaseProcedure,
  ) => boolean;
}

export type ReportDefinition = CaseReportDefinition | ProcedureReportDefinition;

export interface ReportResult {
  definitionId: string;
  /** Headers after PHI stripping */
  headers: string[];
  /** Column keys after PHI stripping — parallel to headers */
  columnKeys: string[];
  rows: ReportCellValue[][];
  /** Eligible cases contributing at least the possibility of a row */
  caseCount: number;
  /** Emitted rows (== caseCount for "case" granularity) */
  rowCount: number;
}
