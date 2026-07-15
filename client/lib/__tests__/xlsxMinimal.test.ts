import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import {
  buildXlsx,
  columnLetters,
  sanitizeSheetName,
} from "@/lib/reports/xlsxMinimal";
import { serializeReportXlsx } from "@/lib/reports/serializeXlsx";
import { buildReportRows } from "@/lib/reports/engine";
import { ukElogbookReport } from "@/lib/reports/definitions/ukElogbook";
import { makeCase } from "./reportFixtures";

function unzipXlsx(bytes: Uint8Array): Record<string, string> {
  const entries = unzipSync(bytes);
  const parts: Record<string, string> = {};
  for (const [path, content] of Object.entries(entries)) {
    parts[path] = strFromU8(content);
  }
  return parts;
}

describe("columnLetters", () => {
  it("maps indices to A1-style letters", () => {
    expect(columnLetters(0)).toBe("A");
    expect(columnLetters(25)).toBe("Z");
    expect(columnLetters(26)).toBe("AA");
    expect(columnLetters(27)).toBe("AB");
    expect(columnLetters(51)).toBe("AZ");
    expect(columnLetters(52)).toBe("BA");
  });
});

describe("sanitizeSheetName", () => {
  it("strips forbidden characters and caps at 31 chars", () => {
    expect(sanitizeSheetName("RACS: MALT [Plastics]")).toBe(
      "RACS  MALT  Plastics",
    );
    expect(sanitizeSheetName("x".repeat(40))).toHaveLength(31);
    expect(sanitizeSheetName("///")).toBe("Report");
  });
});

describe("buildXlsx", () => {
  it("produces a well-formed zip with the five required parts", () => {
    const bytes = buildXlsx({
      sheetName: "Test",
      headers: ["Date", "Count"],
      rows: [["2026-03-10", 3]],
    });
    // Zip magic bytes
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);

    const parts = unzipXlsx(bytes);
    expect(Object.keys(parts).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    expect(parts["[Content_Types].xml"]).toContain(
      "spreadsheetml.sheet.main+xml",
    );
    expect(parts["xl/workbook.xml"]).toContain('name="Test"');
  });

  it("writes numbers as native number cells and strings inline", () => {
    const bytes = buildXlsx({
      sheetName: "Types",
      headers: ["Name", "N"],
      rows: [
        ["Flexor repair", 42],
        ["Empty middle", null],
      ],
    });
    const sheet = unzipXlsx(bytes)["xl/worksheets/sheet1.xml"] ?? "";
    expect(sheet).toContain('<c r="A1" t="inlineStr"><is><t>Name</t></is></c>');
    expect(sheet).toContain('<c r="B2" t="n"><v>42</v></c>');
    expect(sheet).toContain(
      '<c r="A3" t="inlineStr"><is><t>Empty middle</t></is></c>',
    );
    // Null cell is skipped, not emitted as an empty element
    expect(sheet).not.toContain('r="B3"');
  });

  it("escapes XML metacharacters in cell text and sheet names", () => {
    const bytes = buildXlsx({
      sheetName: "A&B",
      headers: ["H"],
      rows: [['<script>"&"</script>']],
    });
    const parts = unzipXlsx(bytes);
    expect(parts["xl/workbook.xml"]).toContain('name="A&amp;B"');
    const sheet = parts["xl/worksheets/sheet1.xml"] ?? "";
    expect(sheet).toContain("&lt;script&gt;&quot;&amp;&quot;&lt;/script&gt;");
    expect(sheet).not.toContain("<script>");
  });
});

describe("serializeReportXlsx", () => {
  it("round-trips a real report definition", () => {
    const result = buildReportRows(ukElogbookReport, [makeCase()], null, {
      includePatientId: false,
    });
    const bytes = serializeReportXlsx(result, ukElogbookReport.title);
    const sheet = unzipXlsx(bytes)["xl/worksheets/sheet1.xml"] ?? "";
    expect(sheet).toContain("<t>Supervision Code</t>");
    expect(sheet).toContain("<t>2026-03-10</t>");
    expect(sheet).toContain("<t>P</t>");
  });
});
