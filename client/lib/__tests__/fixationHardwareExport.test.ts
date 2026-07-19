/**
 * Fixation hardware export integration — CSV columns, FHIR Procedure
 * extension, and PDF summary cell for CaseProcedure.fixationHardware.
 */

import { describe, expect, it } from "vitest";
import { exportCasesAsCsv } from "@/lib/exportCsv";
import { exportSingleCaseAsFhir } from "@/lib/exportFhir";
import { buildPdfHtml } from "@/lib/exportPdfHtml";

const scaphoidScrewCase = {
  id: "case-fix-1",
  patientIdentifier: "PAT-1",
  procedureDate: "2026-07-01",
  facility: "Test Hospital",
  specialty: "hand_wrist",
  ownerId: "owner-1",
  caseStatus: "active",
  diagnosisGroups: [
    {
      id: "group-1",
      specialty: "hand_wrist",
      diagnosis: {
        displayName: "Scaphoid fracture",
        snomedCtCode: "263199007",
      },
      procedures: [
        {
          id: "proc-1",
          sequenceOrder: 1,
          procedureName: "Scaphoid fracture ORIF (headless screw)",
          picklistEntryId: "hand_fx_scaphoid_orif",
          surgeonRole: "PS",
          snomedCtCode: "608784006",
          fixationHardware: {
            kwires: null,
            screws: {
              system: "acutrak",
              diameterMm: "2.4",
              lengthMm: 22,
              count: 1,
            },
            plate: null,
          },
        },
      ],
    },
  ],
} as const;

const twoProcedureCase = {
  ...scaphoidScrewCase,
  id: "case-fix-2",
  diagnosisGroups: [
    {
      ...scaphoidScrewCase.diagnosisGroups[0],
      procedures: [
        scaphoidScrewCase.diagnosisGroups[0].procedures[0],
        {
          id: "proc-2",
          sequenceOrder: 2,
          procedureName: "Phalangeal fracture CRIF (K-wires)",
          picklistEntryId: "hand_fx_phalanx_crif",
          surgeonRole: "PS",
          fixationHardware: {
            kwires: { gaugeMm: "1.1", count: 2 },
            screws: null,
            plate: null,
          },
        },
      ],
    },
  ],
} as const;

describe("Fixation hardware CSV export", () => {
  it("emits the nine fixation columns in the header", () => {
    const csv = exportCasesAsCsv([scaphoidScrewCase as any], {
      includePatientId: false,
    });
    const header = csv.split("\n")[0] ?? "";
    expect(header).toContain(
      "fixation_kwire_gauge_mm,fixation_kwire_count,fixation_screw_system,fixation_screw_diameter_mm,fixation_screw_length_mm,fixation_screw_count,fixation_plate_system,fixation_plate_type,fixation_plate_profile_mm",
    );
    // Positional lockstep: fixation block sits between bone tumour and planned_date
    expect(header).toContain("bone_tumour_donor_site,fixation_kwire_gauge_mm");
    expect(header).toContain("fixation_plate_profile_mm,planned_date");
  });

  it("emits screw values for the scaphoid fixture", () => {
    const csv = exportCasesAsCsv([scaphoidScrewCase as any], {
      includePatientId: false,
    });
    const row = csv.split("\n")[1] ?? "";
    expect(row).toContain("Acutrak");
    expect(row).toContain("2.4");
    expect(row).toContain("22");
  });

  it("joins two hardware-bearing procedures with a semicolon", () => {
    const csv = exportCasesAsCsv([twoProcedureCase as any], {
      includePatientId: false,
    });
    const row = csv.split("\n")[1] ?? "";
    // kwire gauge column: first procedure has none ("-"), second has 1.1
    expect(row).toContain("-; 1.1");
    // screw system column: Acutrak first, none second
    expect(row).toContain("Acutrak; -");
  });

  it("leaves fixation columns blank for a case without hardware", () => {
    const bare = {
      ...scaphoidScrewCase,
      id: "case-fix-3",
      diagnosisGroups: [
        {
          ...scaphoidScrewCase.diagnosisGroups[0],
          procedures: [
            {
              id: "proc-1",
              sequenceOrder: 1,
              procedureName: "Scaphoid fracture ORIF",
              picklistEntryId: "hand_fx_scaphoid_orif",
              surgeonRole: "PS",
            },
          ],
        },
      ],
    };
    const csv = exportCasesAsCsv([bare as any], { includePatientId: false });
    const header = csv.split("\n")[0] ?? "";
    const row = csv.split("\n")[1] ?? "";
    const headerCols = header.split(",");
    const rowCols = row.split(",");
    const idx = headerCols.indexOf("fixation_screw_system");
    expect(idx).toBeGreaterThan(-1);
    expect(rowCols[idx]).toBe("");
  });
});

describe("Fixation hardware FHIR export", () => {
  it("emits a urn:opus:fixation-hardware extension on the Procedure", () => {
    // exportSingleCaseAsFhir returns the serialized bundle string
    const json = exportSingleCaseAsFhir(scaphoidScrewCase as any);
    expect(json).toContain("urn:opus:fixation-hardware");
    expect(json).toContain('"screwSystem"');
    expect(json).toContain('"acutrak"');
    expect(json).toContain('"screwLengthMm"');
    expect(json).toContain('"22"');

    const bundle = JSON.parse(json);
    const procedure = bundle.entry.find(
      (entry: any) => entry.resource.resourceType === "Procedure",
    )?.resource;
    const ext = procedure?.extension?.find(
      (e: any) => e.url === "urn:opus:fixation-hardware",
    );
    expect(ext?.extension).toContainEqual({
      url: "screwSystem",
      valueString: "acutrak",
    });
  });

  it("emits no fixation extension when no hardware is recorded", () => {
    const bare = {
      ...scaphoidScrewCase,
      id: "case-fix-4",
      diagnosisGroups: [
        {
          ...scaphoidScrewCase.diagnosisGroups[0],
          procedures: [
            {
              id: "proc-1",
              sequenceOrder: 1,
              procedureName: "Scaphoid fracture ORIF",
              picklistEntryId: "hand_fx_scaphoid_orif",
              surgeonRole: "PS",
            },
          ],
        },
      ],
    };
    const json = exportSingleCaseAsFhir(bare as any);
    expect(json).not.toContain("urn:opus:fixation-hardware");
  });
});

describe("Fixation hardware PDF export", () => {
  it("includes the fixation summary in the case table", () => {
    const html = buildPdfHtml([scaphoidScrewCase as any], {
      includePatientId: false,
    });
    expect(html).toContain("Fixation: Acutrak ⌀2.4 × 22 mm");
  });

  it("omits the fixation summary when no hardware is recorded", () => {
    const bare = {
      ...scaphoidScrewCase,
      id: "case-fix-5",
      diagnosisGroups: [
        {
          ...scaphoidScrewCase.diagnosisGroups[0],
          procedures: [
            {
              id: "proc-1",
              sequenceOrder: 1,
              procedureName: "Scaphoid fracture ORIF",
              picklistEntryId: "hand_fx_scaphoid_orif",
              surgeonRole: "PS",
            },
          ],
        },
      ],
    };
    const html = buildPdfHtml([bare as any], { includePatientId: false });
    expect(html).not.toContain("Fixation:");
  });
});
