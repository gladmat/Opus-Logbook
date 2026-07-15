import { describe, expect, it } from "vitest";
import { buildReportRows, countReportRows } from "@/lib/reports/engine";
import { serializeReportCsv } from "@/lib/reports/serializeCsv";
import type {
  CaseReportDefinition,
  ProcedureReportDefinition,
} from "@/lib/reports/types";
import { ukElogbookReport } from "@/lib/reports/definitions/ukElogbook";
import { makeCase, makeGroup, makeProcedure } from "./reportFixtures";

const testProcedureReport: ProcedureReportDefinition = {
  id: "test_procedure_report",
  title: "Test Procedure Report",
  description: "Test",
  category: "training-body",
  granularity: "procedure",
  defaultIncludePatientId: false,
  pdfTableColumns: ["procedure_date"],
  columns: [
    {
      key: "procedure_date",
      header: "Date",
      extract: (ctx) => ctx.case.procedureDate,
    },
    {
      key: "patient_identifier",
      header: "Patient ID",
      phi: true,
      extract: (ctx) => ctx.case.patientIdentifier,
    },
    {
      key: "procedure_name",
      header: "Procedure",
      extract: (ctx) => ctx.procedure.procedureName,
    },
    {
      key: "procedure_index",
      header: "Index",
      extract: (ctx) => ctx.procedureIndex,
    },
    { key: "role", header: "Role", extract: (ctx) => ctx.role },
    {
      key: "supervision",
      header: "Supervision",
      extract: (ctx) => ctx.supervision,
    },
  ],
};

const testCaseReport: CaseReportDefinition = {
  id: "test_case_report",
  title: "Test Case Report",
  description: "Test",
  category: "registry",
  granularity: "case",
  defaultIncludePatientId: true,
  pdfTableColumns: ["procedure_date"],
  columns: [
    {
      key: "procedure_date",
      header: "Date",
      extract: (ctx) => ctx.case.procedureDate,
    },
    {
      key: "patient_identifier",
      header: "Patient ID",
      phi: true,
      extract: (ctx) => ctx.case.patientIdentifier,
    },
  ],
};

describe("buildReportRows — procedure granularity", () => {
  it("emits one row per procedure across all diagnosis groups", () => {
    const c = makeCase({
      diagnosisGroups: [
        makeGroup({
          procedures: [
            makeProcedure({ procedureName: "Proc A" }),
            makeProcedure({ procedureName: "Proc B" }),
          ],
        }),
        makeGroup({ procedures: [makeProcedure({ procedureName: "Proc C" })] }),
      ],
    });
    const result = buildReportRows(testProcedureReport, [c], null, {
      includePatientId: true,
    });
    expect(result.rowCount).toBe(3);
    expect(result.caseCount).toBe(1);
    expect(result.rows.map((r) => r[2])).toEqual([
      "Proc A",
      "Proc B",
      "Proc C",
    ]);
    // procedureIndex is 1-based across the flattened case procedure list
    expect(result.rows.map((r) => r[3])).toEqual([1, 2, 3]);
  });

  it("resolves role from case default and per-procedure override", () => {
    const c = makeCase({
      defaultOperativeRole: "SURGEON",
      defaultSupervisionLevel: "SUP_SCRUBBED",
      diagnosisGroups: [
        makeGroup({
          procedures: [
            makeProcedure(),
            makeProcedure({ operativeRoleOverride: "FIRST_ASST" }),
          ],
        }),
      ],
    });
    const result = buildReportRows(testProcedureReport, [c], null, {
      includePatientId: true,
    });
    expect(result.rows[0]?.[4]).toBe("SURGEON");
    expect(result.rows[0]?.[5]).toBe("SUP_SCRUBBED");
    // Non-surgeon roles resolve supervision to NOT_APPLICABLE
    expect(result.rows[1]?.[4]).toBe("FIRST_ASST");
    expect(result.rows[1]?.[5]).toBe("NOT_APPLICABLE");
  });

  it("defaults to SURGEON / INDEPENDENT when nothing is recorded", () => {
    const c = makeCase({
      diagnosisGroups: [makeGroup({ procedures: [makeProcedure()] })],
    });
    const result = buildReportRows(testProcedureReport, [c], null, {
      includePatientId: true,
    });
    expect(result.rows[0]?.[4]).toBe("SURGEON");
    expect(result.rows[0]?.[5]).toBe("INDEPENDENT");
  });

  it("applies isProcedureEligible and excludes non-contributing cases from caseCount", () => {
    const gated: ProcedureReportDefinition = {
      ...testProcedureReport,
      isProcedureEligible: (_c, _g, p) => p.procedureName.includes("Flap"),
    };
    const withFlap = makeCase({
      diagnosisGroups: [
        makeGroup({
          procedures: [
            makeProcedure({ procedureName: "Free Flap" }),
            makeProcedure({ procedureName: "Debridement" }),
          ],
        }),
      ],
    });
    const withoutFlap = makeCase();
    const result = buildReportRows(gated, [withFlap, withoutFlap], null, {
      includePatientId: true,
    });
    expect(result.rowCount).toBe(1);
    expect(result.caseCount).toBe(1);
  });

  it("sorts rows chronologically by procedure date", () => {
    const late = makeCase({ procedureDate: "2026-06-01" });
    const early = makeCase({ procedureDate: "2025-11-20" });
    const mid = makeCase({ procedureDate: "2026-01-05" });
    const result = buildReportRows(
      testProcedureReport,
      [late, early, mid],
      null,
      {
        includePatientId: true,
      },
    );
    expect(result.rows.map((r) => r[0])).toEqual([
      "2025-11-20",
      "2026-01-05",
      "2026-06-01",
    ]);
  });

  it("strips PHI columns when includePatientId is false", () => {
    const c = makeCase();
    const withPhi = buildReportRows(testProcedureReport, [c], null, {
      includePatientId: true,
    });
    const withoutPhi = buildReportRows(testProcedureReport, [c], null, {
      includePatientId: false,
    });
    expect(withPhi.headers).toContain("Patient ID");
    expect(withoutPhi.headers).not.toContain("Patient ID");
    expect(withoutPhi.columnKeys).not.toContain("patient_identifier");
    expect(withoutPhi.rows[0]).toHaveLength(withPhi.rows[0]!.length - 1);
    expect(withoutPhi.rows[0]).not.toContain("PAT-001");
  });

  it("returns an empty result for an empty case list", () => {
    const result = buildReportRows(testProcedureReport, [], null, {
      includePatientId: true,
    });
    expect(result.rowCount).toBe(0);
    expect(result.caseCount).toBe(0);
    expect(result.rows).toEqual([]);
  });
});

describe("buildReportRows — case granularity", () => {
  it("emits one row per eligible case", () => {
    const gated: CaseReportDefinition = {
      ...testCaseReport,
      isCaseEligible: (c) => c.facility === "Eligible Hospital",
    };
    const eligible = makeCase({ facility: "Eligible Hospital" });
    const ineligible = makeCase({ facility: "Other Hospital" });
    const result = buildReportRows(gated, [eligible, ineligible], null, {
      includePatientId: true,
    });
    expect(result.rowCount).toBe(1);
    expect(result.caseCount).toBe(1);
  });
});

describe("countReportRows", () => {
  it("matches buildReportRows counts without extracting", () => {
    const cases = [
      makeCase({
        diagnosisGroups: [
          makeGroup({ procedures: [makeProcedure(), makeProcedure()] }),
        ],
      }),
      makeCase(),
    ];
    const counts = countReportRows(testProcedureReport, cases);
    const built = buildReportRows(testProcedureReport, cases, null, {
      includePatientId: true,
    });
    expect(counts.rowCount).toBe(built.rowCount);
    expect(counts.caseCount).toBe(built.caseCount);
    expect(counts.rowCount).toBe(3);
    expect(counts.caseCount).toBe(2);
  });
});

describe("serializeReportCsv", () => {
  it("produces a header row plus one line per row with CSV escaping", () => {
    const c = makeCase({
      diagnosisGroups: [
        makeGroup({
          procedures: [makeProcedure({ procedureName: 'Flap, "free"' })],
        }),
      ],
    });
    const result = buildReportRows(testProcedureReport, [c], null, {
      includePatientId: false,
    });
    const csv = serializeReportCsv(result);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Date,Procedure,Index,Role,Supervision");
    expect(lines[1]).toContain('"Flap, ""free"""');
  });
});

describe("UK eLogbook definition", () => {
  it("maps roles and supervision to eLogbook codes", () => {
    const c = makeCase({
      defaultOperativeRole: "SURGEON",
      defaultSupervisionLevel: "SUP_SCRUBBED",
      admissionUrgency: "acute",
      diagnosisGroups: [
        makeGroup({
          procedures: [
            makeProcedure(),
            makeProcedure({ operativeRoleOverride: "FIRST_ASST" }),
            makeProcedure({ operativeRoleOverride: "SUPERVISOR" }),
          ],
        }),
      ],
    });
    const result = buildReportRows(ukElogbookReport, [c], null, {
      includePatientId: false,
    });
    const codeIdx = result.columnKeys.indexOf("supervision_code");
    const admissionIdx = result.columnKeys.indexOf("admission_type");
    expect(result.rows.map((r) => r[codeIdx])).toEqual(["S-TS", "A", "T"]);
    expect(result.rows[0]?.[admissionIdx]).toBe("Emergency");
  });

  it("keeps PHI columns out by default configuration", () => {
    expect(ukElogbookReport.defaultIncludePatientId).toBe(false);
    const phiKeys = ukElogbookReport.columns
      .filter((col) => col.phi)
      .map((col) => col.key);
    expect(phiKeys).toEqual([
      "patient_identifier",
      "patient_age",
      "patient_gender",
    ]);
  });
});
