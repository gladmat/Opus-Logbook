import { buildCsvDocument } from "@/lib/csvUtils";
import type { ReportResult } from "./types";

/** Serialize a built report into a CSV document string. */
export function serializeReportCsv(result: ReportResult): string {
  return buildCsvDocument(result.headers, result.rows);
}
