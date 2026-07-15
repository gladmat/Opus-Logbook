import { buildXlsx } from "./xlsxMinimal";
import type { ReportResult } from "./types";

/** Serialize a built report into XLSX bytes (single sheet). */
export function serializeReportXlsx(
  result: ReportResult,
  sheetName: string,
): Uint8Array {
  return buildXlsx({
    sheetName,
    headers: result.headers,
    rows: result.rows,
  });
}
