import { describe, expect, it } from "vitest";
import { exportCasesAsCsv } from "@/lib/exportCsv";
import { exportSingleCaseAsFhir } from "@/lib/exportFhir";
import { buildPdfHtml } from "@/lib/exportPdfHtml";

const caseWithMultipleImplants = {
  id: "case-1",
  patientIdentifier: "PAT-1",
  procedureDate: "2026-03-10",
  facility: "Test Hospital",
  specialty: "hand_wrist",
  ownerId: "owner-1",
  caseStatus: "active",
  diagnosisGroups: [
    {
      id: "group-1",
      specialty: "hand_wrist",
      diagnosis: {
        displayName: "Rheumatoid MCP joint disease",
        snomedCtCode: "201771009",
      },
      diagnosisClinicalDetails: {
        laterality: "right",
      },
      procedures: [
        {
          id: "proc-1",
          sequenceOrder: 1,
          procedureName: "PIP joint arthroplasty",
          picklistEntryId: "hand_joint_pip_arthroplasty",
          surgeonRole: "PS",
          implantDetails: {
            jointType: "pip",
            indication: "oa",
            procedureType: "primary",
            implantSystemId: "pip_swanson",
            laterality: "right",
            digit: "II",
            sizeUnified: "2",
            fixation: "not_applicable",
            bearingSurface: "silicone",
          },
        },
        {
          id: "proc-2",
          sequenceOrder: 2,
          procedureName: "MCP joint arthroplasty",
          picklistEntryId: "hand_joint_mcp_arthroplasty",
          surgeonRole: "PS",
          implantDetails: {
            jointType: "mcp",
            indication: "ra",
            procedureType: "revision",
            implantSystemId: "mcp_swanson",
            laterality: "right",
            digit: "III",
            sizeUnified: "4",
            fixation: "not_applicable",
            bearingSurface: "silicone",
            revisionReason: "loosening",
            componentsRevised: ["all"],
          },
        },
      ],
    },
  ],
} as const;

describe("Implant export integration", () => {
  it("aggregates multiple implants into the existing CSV columns in procedure order", () => {
    const csv = exportCasesAsCsv([caseWithMultipleImplants as any], {
      includePatientId: true,
    });
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    const row = lines[1] ?? "";

    expect(row).toContain(
      "Swanson Silicone PIP (Stryker); Swanson Silicone MCP (Stryker)",
    );
    expect(row).toContain("Size 2; Size 4");
    expect(row).toContain("PIP joint; MCP joint");
  });

  it("emits one Device resource per implant-bearing procedure in FHIR export", () => {
    const bundle = JSON.parse(
      exportSingleCaseAsFhir(caseWithMultipleImplants as any),
    );
    const deviceEntries = bundle.entry.filter(
      (entry: any) => entry.resource.resourceType === "Device",
    );
    expect(deviceEntries).toHaveLength(2);

    const digits = deviceEntries.flatMap((entry: any) =>
      (entry.resource.property ?? [])
        .filter((property: any) => property.type?.text === "digit")
        .flatMap((property: any) =>
          (property.valueCode ?? []).map((value: any) => value.text),
        ),
    );
    expect(digits).toEqual(["Index", "Middle"]);
  });

  it("builds PDF HTML with all implant summaries in order", () => {
    const html = buildPdfHtml([caseWithMultipleImplants as any], {
      includePatientId: true,
    });

    expect(html).toContain(
      "PIP joint arthroplasty: Swanson Silicone PIP (Stryker)",
    );
    expect(html).toContain(
      "MCP joint arthroplasty: Swanson Silicone MCP (Stryker)",
    );
  });
});
