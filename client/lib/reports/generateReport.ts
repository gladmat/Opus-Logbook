import * as Print from "expo-print";
import type { Case } from "@/types/case";
import type { UserProfile } from "@/lib/auth";
import { filterCases } from "@/lib/statistics";
import {
  confirmPhiShare,
  shareAndCleanup,
  writeShareFileToCache,
} from "@/lib/exportShare";
import { File } from "expo-file-system";
import { buildReportRows, buildReportSummary } from "./engine";
import { getReportDefinition } from "./registry";
import { serializeReportCsv } from "./serializeCsv";
import { serializeReportXlsx } from "./serializeXlsx";
import { buildReportPdfHtml } from "./pdfSummary";
import type { ReportFilters, ReportOutputFormat } from "./types";

export interface GenerateReportOptions {
  definitionId: string;
  filters: ReportFilters;
  format: ReportOutputFormat;
  includePatientId: boolean;
  /** Pre-loaded case list — the screen loads once and passes it in. */
  cases: Case[];
  profile: UserProfile | null;
  /** Human-readable filter description for the PDF header. */
  filtersLabel: string;
  /** Reserved for automated flows / tests. */
  skipPhiConfirmation?: boolean;
}

const FORMAT_EXTENSIONS: Record<ReportOutputFormat, string> = {
  csv: "csv",
  xlsx: "xlsx",
  pdf: "pdf",
};

const FORMAT_MIME_TYPES: Record<ReportOutputFormat, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

/**
 * Build, serialize and share a report. Throws on empty result so the
 * caller can surface a friendly alert.
 */
export async function generateAndShareReport(
  options: GenerateReportOptions,
): Promise<void> {
  const def = getReportDefinition(options.definitionId);
  if (!def) {
    throw new Error(`Unknown report: ${options.definitionId}`);
  }

  const filtered = filterCases(options.cases, options.filters);
  const result = buildReportRows(def, filtered, options.profile, {
    includePatientId: options.includePatientId,
  });
  if (result.rowCount === 0) {
    throw new Error("No cases match this report and filter combination.");
  }

  // PHI gate only when identifiers are actually included.
  if (options.includePatientId && !options.skipPhiConfirmation) {
    const confirmed = await confirmPhiShare(def.title);
    if (!confirmed) return;
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  const stem = `opus-${def.id.replace(/_/g, "-")}-${dateStamp}`;

  if (options.format === "pdf") {
    const summary = buildReportSummary(def, result);
    const html = buildReportPdfHtml(def, result, summary, {
      filtersLabel: options.filtersLabel,
      includePatientId: options.includePatientId,
    });
    const { uri } = await Print.printToFileAsync({ html });
    await shareAndCleanup(
      new File(uri),
      FORMAT_MIME_TYPES.pdf,
      `Share ${def.title}`,
    );
    return;
  }

  const content: string | Uint8Array =
    options.format === "csv"
      ? serializeReportCsv(result)
      : serializeReportXlsx(result, def.title);

  const file = writeShareFileToCache(content, {
    stem,
    extension: FORMAT_EXTENSIONS[options.format],
  });
  await shareAndCleanup(
    file,
    FORMAT_MIME_TYPES[options.format],
    `Share ${def.title}`,
  );
}
