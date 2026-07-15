import { describe, expect, it } from "vitest";
import { buildReportRows, buildReportSummary } from "@/lib/reports/engine";
import { buildReportPdfHtml } from "@/lib/reports/pdfSummary";
import { racsMaltPlasticsReport } from "@/lib/reports/definitions/racsMalt";
import { makeCase, makeGroup, makeProcedure } from "./reportFixtures";

function buildFixtureResult() {
  const cases = [
    makeCase({
      procedureDate: "2026-01-15",
      defaultOperativeRole: "SURGEON",
      defaultSupervisionLevel: "INDEPENDENT",
      diagnosisGroups: [
        makeGroup({
          procedures: [
            makeProcedure({ procedureName: "Flexor tendon repair" }),
            makeProcedure({
              procedureName: "Nerve repair",
              operativeRoleOverride: "FIRST_ASST",
            }),
          ],
        }),
      ],
    }),
    makeCase({
      procedureDate: "2026-02-03",
      defaultOperativeRole: "SURGEON",
      defaultSupervisionLevel: "SUP_SCRUBBED",
      diagnosisGroups: [
        makeGroup({
          procedures: [
            makeProcedure({ procedureName: "Flexor tendon repair" }),
          ],
        }),
      ],
    }),
  ];
  return buildReportRows(racsMaltPlasticsReport, cases, null, {
    includePatientId: false,
  });
}

describe("buildReportSummary", () => {
  it("tallies role codes, month buckets and top procedures", () => {
    const result = buildFixtureResult();
    const summary = buildReportSummary(racsMaltPlasticsReport, result);

    expect(summary.totalCases).toBe(2);
    expect(summary.totalRows).toBe(3);
    expect(summary.roleTally).toEqual([
      { label: "Surgeon alone", count: 1 },
      { label: "Assistant", count: 1 },
      { label: "Mentor scrubbed", count: 1 },
    ]);
    expect(summary.rowsByMonth).toEqual([
      { month: "2026-01", count: 2 },
      { month: "2026-02", count: 1 },
    ]);
    expect(summary.topItems[0]).toEqual({
      name: "Flexor tendon repair",
      count: 2,
    });
    expect(summary.topItemsLabel).toBe("Top procedures");
  });
});

describe("buildReportPdfHtml", () => {
  it("renders header, stats blocks and the pdfTableColumns subset", () => {
    const result = buildFixtureResult();
    const summary = buildReportSummary(racsMaltPlasticsReport, result);
    const html = buildReportPdfHtml(racsMaltPlasticsReport, result, summary, {
      filtersLabel: "This Year · All specialties · All facilities",
      includePatientId: false,
    });

    expect(html).toContain("Opus — RACS MALT (Plastics)");
    expect(html).toContain("Training Body");
    expect(html).toContain("2 cases · 3 procedures");
    expect(html).toContain("This Year · All specialties · All facilities");
    expect(html).toContain("Jan 2026");
    expect(html).toContain("Flexor tendon repair");
    expect(html).toContain("Mentor scrubbed");
    // Dates in the case table are display-formatted
    expect(html).toContain("<td>15/01/2026</td>");
    // No PHI footer note when identifiers are off
    expect(html).not.toContain("Contains patient identifiable data");
  });

  it("escapes HTML in extracted values", () => {
    const c = makeCase({
      facility: 'St <b>"Bad"</b> & Co',
      diagnosisGroups: [makeGroup({ procedures: [makeProcedure()] })],
    });
    const result = buildReportRows(racsMaltPlasticsReport, [c], null, {
      includePatientId: false,
    });
    const summary = buildReportSummary(racsMaltPlasticsReport, result);
    const html = buildReportPdfHtml(racsMaltPlasticsReport, result, summary, {
      filtersLabel: "All time",
      includePatientId: true,
    });
    expect(html).toContain("St &lt;b&gt;&quot;Bad&quot;&lt;/b&gt; &amp; Co");
    expect(html).not.toContain('St <b>"Bad"</b>');
    expect(html).toContain("Contains patient identifiable data");
  });
});
