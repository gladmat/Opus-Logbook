import { strToU8, zipSync } from "fflate";

/**
 * Minimal single-sheet XLSX writer. An .xlsx file is a zip of XML parts;
 * with inline strings (no sharedStrings table, no styles part) the whole
 * container is five entries. Excel, Numbers and Google Sheets all open
 * this shape. Chosen over the SheetJS npm package (frozen at 0.18.5 with
 * open advisories) and exceljs (Node-stream heavy) — see the report
 * system plan.
 *
 * Cell typing: finite numbers are written as native number cells
 * (`t="n"`), everything else as inline strings. Empty values are skipped
 * entirely. Dates stay ISO text — consumers sort/filter them fine and we
 * avoid Excel serial-date maths.
 */

export type XlsxCellValue = string | number | boolean | null | undefined;

export interface XlsxSheetData {
  sheetName: string;
  headers: readonly string[];
  rows: readonly (readonly XlsxCellValue[])[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Excel forbids : \ / ? * [ ] in sheet names and caps them at 31 chars. */
export function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, " ").trim();
  return (cleaned || "Report").slice(0, 31);
}

/** 0-based column index → A1-style column letters (0 → A, 26 → AA). */
export function columnLetters(index: number): string {
  let letters = "";
  let remaining = index;
  while (remaining >= 0) {
    letters = String.fromCharCode(65 + (remaining % 26)) + letters;
    remaining = Math.floor(remaining / 26) - 1;
  }
  return letters;
}

function cellXml(
  value: XlsxCellValue,
  colIndex: number,
  rowNumber: number,
): string {
  if (value === null || value === undefined || value === "") return "";
  const ref = `${columnLetters(colIndex)}${rowNumber}`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}" t="n"><v>${value}</v></c>`;
  }
  const text =
    typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  const preserve = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : "";
  return `<c r="${ref}" t="inlineStr"><is><t${preserve}>${escapeXml(text)}</t></is></c>`;
}

function rowXml(values: readonly XlsxCellValue[], rowNumber: number): string {
  const cells = values
    .map((value, colIndex) => cellXml(value, colIndex, rowNumber))
    .join("");
  return `<row r="${rowNumber}">${cells}</row>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

export function buildXlsx(data: XlsxSheetData): Uint8Array {
  const sheetName = sanitizeSheetName(data.sheetName);

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const rowsXml = [
    rowXml(data.headers, 1),
    ...data.rows.map((row, index) => rowXml(row, index + 2)),
  ].join("");
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`;

  return zipSync(
    {
      "[Content_Types].xml": strToU8(CONTENT_TYPES),
      "_rels/.rels": strToU8(ROOT_RELS),
      "xl/workbook.xml": strToU8(workbook),
      "xl/_rels/workbook.xml.rels": strToU8(WORKBOOK_RELS),
      "xl/worksheets/sheet1.xml": strToU8(worksheet),
    },
    { level: 6 },
  );
}
