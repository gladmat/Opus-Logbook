/**
 * Shared CSV primitives used by the complete data export (exportCsv.ts)
 * and the targeted report serializers (client/lib/reports/).
 */

export type CsvCellValue = string | number | boolean | undefined | null;

export function escapeCsvField(value: CsvCellValue): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Serialize a header row + data rows into a CSV document string. */
export function buildCsvDocument(
  headers: readonly string[],
  rows: readonly (readonly CsvCellValue[])[],
): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));
  return [headerLine, ...dataLines].join("\n");
}
