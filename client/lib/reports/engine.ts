import type { Case } from "@/types/case";
import {
  resolveOperativeRole,
  resolveSupervisionLevel,
} from "@/types/operativeRole";
import type { UserProfile } from "@/lib/auth";
import type {
  CaseReportContext,
  ProcedureReportContext,
  ReportDefinition,
  ReportResult,
  ReportCellValue,
} from "./types";

/**
 * Report engine — turns a ReportDefinition + a (pre-filtered) case list
 * into headers + rows. Pure and synchronous so it is trivially testable
 * and can drive the live row-count preview on the Reports screen.
 */

export interface BuildReportOptions {
  includePatientId: boolean;
}

/**
 * Cases sorted chronologically by procedure date. procedureDate is
 * canonical YYYY-MM-DD, so a lexical compare is correct and timezone-safe.
 */
function sortCasesChronologically(cases: Case[]): Case[] {
  return [...cases].sort((a, b) =>
    (a.procedureDate ?? "").localeCompare(b.procedureDate ?? ""),
  );
}

function eligibleCases(def: ReportDefinition, cases: Case[]): Case[] {
  return def.isCaseEligible ? cases.filter(def.isCaseEligible) : cases;
}

/**
 * Walk a case's diagnosis groups × procedures, yielding a fully resolved
 * ProcedureReportContext per eligible procedure.
 */
function* procedureContexts(
  def: Extract<ReportDefinition, { granularity: "procedure" }>,
  c: Case,
  profile: UserProfile | null,
): Generator<ProcedureReportContext> {
  let procedureIndex = 0;
  for (const group of c.diagnosisGroups ?? []) {
    for (const procedure of group.procedures ?? []) {
      procedureIndex += 1;
      if (
        def.isProcedureEligible &&
        !def.isProcedureEligible(c, group, procedure)
      ) {
        continue;
      }
      const role = resolveOperativeRole(
        procedure.operativeRoleOverride,
        c.defaultOperativeRole,
      );
      const supervision = resolveSupervisionLevel(
        procedure.supervisionLevelOverride,
        c.defaultSupervisionLevel,
        role,
      );
      yield {
        granularity: "procedure",
        case: c,
        group,
        procedure,
        procedureIndex,
        role,
        supervision,
        profile,
      };
    }
  }
}

export function buildReportRows(
  def: ReportDefinition,
  cases: Case[],
  profile: UserProfile | null,
  options: BuildReportOptions,
): ReportResult {
  const sorted = sortCasesChronologically(eligibleCases(def, cases));

  const rows: ReportCellValue[][] = [];
  let contributingCases = 0;

  if (def.granularity === "case") {
    const activeColumns = options.includePatientId
      ? def.columns
      : def.columns.filter((col) => !col.phi);
    for (const c of sorted) {
      const ctx: CaseReportContext = { granularity: "case", case: c, profile };
      rows.push(activeColumns.map((col) => col.extract(ctx)));
      contributingCases += 1;
    }
    return {
      definitionId: def.id,
      headers: activeColumns.map((col) => col.header),
      columnKeys: activeColumns.map((col) => col.key),
      rows,
      caseCount: contributingCases,
      rowCount: rows.length,
    };
  }

  const activeColumns = options.includePatientId
    ? def.columns
    : def.columns.filter((col) => !col.phi);
  for (const c of sorted) {
    let caseContributed = false;
    for (const ctx of procedureContexts(def, c, profile)) {
      rows.push(activeColumns.map((col) => col.extract(ctx)));
      caseContributed = true;
    }
    if (caseContributed) contributingCases += 1;
  }
  return {
    definitionId: def.id,
    headers: activeColumns.map((col) => col.header),
    columnKeys: activeColumns.map((col) => col.key),
    rows,
    caseCount: contributingCases,
    rowCount: rows.length,
  };
}

export interface ReportSummary {
  totalCases: number;
  totalRows: number;
  /** Tally of the definition's roleSummaryColumn values, sorted by count */
  roleTally: { label: string; count: number }[];
  /** Rows per month (YYYY-MM), chronological */
  rowsByMonth: { month: string; count: number }[];
  /** Top 10 procedure (or diagnosis) names by row count */
  topItems: { name: string; count: number }[];
  topItemsLabel: string;
}

/** Pure aggregation over a built report, used by the PDF summary. */
export function buildReportSummary(
  def: ReportDefinition,
  result: ReportResult,
): ReportSummary {
  const columnIndex = (key: string): number => result.columnKeys.indexOf(key);

  const roleTallyMap = new Map<string, number>();
  const roleIdx = def.roleSummaryColumn
    ? columnIndex(def.roleSummaryColumn)
    : -1;

  const monthMap = new Map<string, number>();
  const dateIdx = columnIndex("procedure_date");

  const itemIdx =
    columnIndex("procedure_name") >= 0
      ? columnIndex("procedure_name")
      : columnIndex("diagnosis_name");
  const topItemsLabel =
    columnIndex("procedure_name") >= 0 ? "Top procedures" : "Top diagnoses";
  const itemMap = new Map<string, number>();

  for (const row of result.rows) {
    if (roleIdx >= 0) {
      const label = String(row[roleIdx] ?? "");
      if (label) roleTallyMap.set(label, (roleTallyMap.get(label) ?? 0) + 1);
    }
    if (dateIdx >= 0) {
      const month = String(row[dateIdx] ?? "").slice(0, 7);
      if (month) monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    }
    if (itemIdx >= 0) {
      const name = String(row[itemIdx] ?? "");
      if (name) itemMap.set(name, (itemMap.get(name) ?? 0) + 1);
    }
  }

  return {
    totalCases: result.caseCount,
    totalRows: result.rowCount,
    roleTally: Array.from(roleTallyMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    rowsByMonth: Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    topItems: Array.from(itemMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topItemsLabel,
  };
}

export interface ReportRowCounts {
  caseCount: number;
  rowCount: number;
}

/**
 * Count eligible cases and rows without extracting any cell values —
 * cheap enough to run inside a useMemo for the live preview.
 */
export function countReportRows(
  def: ReportDefinition,
  cases: Case[],
): ReportRowCounts {
  const eligible = eligibleCases(def, cases);

  if (def.granularity === "case") {
    return { caseCount: eligible.length, rowCount: eligible.length };
  }

  let caseCount = 0;
  let rowCount = 0;
  for (const c of eligible) {
    let caseRows = 0;
    for (const group of c.diagnosisGroups ?? []) {
      for (const procedure of group.procedures ?? []) {
        if (
          def.isProcedureEligible &&
          !def.isProcedureEligible(c, group, procedure)
        ) {
          continue;
        }
        caseRows += 1;
      }
    }
    if (caseRows > 0) {
      caseCount += 1;
      rowCount += caseRows;
    }
  }
  return { caseCount, rowCount };
}
