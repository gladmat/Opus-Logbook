import { escapeHtml } from "@/lib/exportPdfHtml";
import { parseIsoDateValue } from "@/lib/dateValues";
import { REPORT_CATEGORY_LABELS } from "./registry";
import type { ReportSummary } from "./engine";
import type { ReportDefinition, ReportResult } from "./types";

/**
 * Human-readable PDF rendering of a report: header with filter context,
 * summary stats (role tallies, monthly volume, top procedures), then a
 * compact case table limited to the definition's pdfTableColumns.
 * Print CSS mirrors exportPdfHtml.ts (hex values are deliberate here —
 * this is a printed document, not app UI).
 */

export interface ReportPdfMeta {
  /** e.g. "This Year · Breast · All facilities" */
  filtersLabel: string;
  includePatientId: boolean;
}

function formatDisplayDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatMonth(month: string): string {
  const parsed = parseIsoDateValue(`${month}-01`);
  if (!parsed) return month;
  return `${MONTH_NAMES[parsed.getMonth()] ?? month} ${parsed.getFullYear()}`;
}

function statList(items: { label: string; count: number }[]): string {
  if (items.length === 0) return `<div class="stat-empty">No data</div>`;
  return items
    .map(
      (item) =>
        `<div class="stat-row"><span>${escapeHtml(item.label)}</span><strong>${item.count}</strong></div>`,
    )
    .join("");
}

export function buildReportPdfHtml(
  def: ReportDefinition,
  result: ReportResult,
  summary: ReportSummary,
  meta: ReportPdfMeta,
): string {
  const now = new Date();
  const generated = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;

  // Case table restricted to the definition's pdfTableColumns, skipping
  // any that were PHI-stripped for this run.
  const tableIndices = def.pdfTableColumns
    .map((key) => result.columnKeys.indexOf(key))
    .filter((idx) => idx >= 0);
  const tableHeaders = tableIndices.map((idx) => result.headers[idx] ?? "");

  const tableRows = result.rows.map((row) => {
    const cells = tableIndices.map((idx) => {
      const raw = row[idx];
      const value =
        result.columnKeys[idx] === "procedure_date"
          ? formatDisplayDate(String(raw ?? ""))
          : String(raw ?? "");
      return `<td>${escapeHtml(value)}</td>`;
    });
    return `<tr>${cells.join("")}</tr>`;
  });

  const rowNoun = def.granularity === "procedure" ? "procedures" : "cases";
  const countLine =
    def.granularity === "procedure"
      ? `${summary.totalCases} cases · ${summary.totalRows} procedures`
      : `${summary.totalRows} cases`;

  const roleBlock = def.roleSummaryColumn
    ? `<div class="stat-card">
        <h3>By ${escapeHtml(
          result.headers[result.columnKeys.indexOf(def.roleSummaryColumn)] ??
            "Role",
        )}</h3>
        ${statList(summary.roleTally)}
      </div>`
    : "";

  const monthBlock = `<div class="stat-card">
      <h3>By Month</h3>
      ${statList(
        summary.rowsByMonth.map((m) => ({
          label: formatMonth(m.month),
          count: m.count,
        })),
      )}
    </div>`;

  const topBlock = `<div class="stat-card">
      <h3>${escapeHtml(summary.topItemsLabel)}</h3>
      ${statList(
        summary.topItems.map((item) => ({
          label: item.name,
          count: item.count,
        })),
      )}
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 9px; color: #1F2328; }
  .header { padding: 16px 24px; border-bottom: 2px solid #E5A00D; margin-bottom: 12px; }
  .header h1 { font-size: 18px; font-weight: 700; color: #0C0F14; }
  .header .meta { font-size: 10px; color: #656D76; margin-top: 4px; }
  .header .badge { display: inline-block; font-size: 8px; font-weight: 600; text-transform: uppercase;
       letter-spacing: 0.5px; color: #9A6700; border: 1px solid #E5A00D; border-radius: 3px;
       padding: 1px 6px; margin-top: 6px; }
  .stats { display: flex; gap: 12px; margin: 0 24px 16px; }
  .stat-card { flex: 1; border: 1px solid #D0D7DE; border-radius: 6px; padding: 10px 12px; }
  .stat-card h3 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;
       color: #656D76; margin-bottom: 6px; }
  .stat-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 9px; }
  .stat-empty { color: #8B949E; font-size: 9px; }
  table { width: 100%; border-collapse: collapse; margin: 0 24px; }
  th { background: #0C0F14; color: #E6EDF3; font-weight: 600; font-size: 8px;
       text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 8px; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #D0D7DE; font-size: 9px; vertical-align: top; }
  tr:nth-child(even) td { background: #F6F8FA; }
  .footer { margin-top: 16px; padding: 12px 24px; font-size: 8px; color: #8B949E; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <h1>Opus — ${escapeHtml(def.title)}</h1>
    <div class="meta">${escapeHtml(meta.filtersLabel)} · ${escapeHtml(countLine)} · Generated ${generated}</div>
    <div class="badge">${escapeHtml(REPORT_CATEGORY_LABELS[def.category])}</div>
  </div>
  <div class="stats">
    ${roleBlock}
    ${monthBlock}
    ${topBlock}
  </div>
  <table>
    <thead><tr>${tableHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
    <tbody>${tableRows.join("\n")}</tbody>
  </table>
  <div class="footer">Generated by Opus Logbook · ${escapeHtml(String(summary.totalRows))} ${escapeHtml(rowNoun)}${meta.includePatientId ? " · Contains patient identifiable data" : ""}</div>
</body>
</html>`;
}
