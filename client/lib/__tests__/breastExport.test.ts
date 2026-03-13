import { describe, expect, it } from "vitest";
import { exportCasesAsCsv } from "@/lib/exportCsv";
import { exportSingleCaseAsFhir } from "@/lib/exportFhir";
import { buildPdfHtml } from "@/lib/exportPdfHtml";
import { getBreastExportData } from "@/lib/breastExport";
import { generateBreastSummary } from "@/lib/moduleSummary";
import type { BreastAssessmentData } from "@/types/breast";

const breastAssessment: BreastAssessmentData = {
  laterality: "bilateral",
  reconstructionEpisodeId: "breast-episode-1",
  sides: {
    left: {
      side: "left",
      clinicalContext: "reconstructive",
      reconstructionTiming: "immediate",
      implantDetails: {
        deviceType: "permanent_implant",
        manufacturer: "allergan",
        volumeCc: 350,
        shellSurface: "smooth",
        fillMaterial: "silicone_standard",
        shape: "round",
        profile: "moderate_plus",
        implantPlane: "dual_plane",
        incisionSite: "inframammary",
        admUsed: true,
        admDetails: { productName: "Strattice" },
      },
      nippleDetails: {
        technique: "cv_flap",
      },
    },
    right: {
      side: "right",
      clinicalContext: "aesthetic",
      implantDetails: {
        deviceType: "permanent_implant",
        manufacturer: "mentor",
        volumeCc: 370,
        shellSurface: "microtextured",
        fillMaterial: "silicone_highly_cohesive",
        shape: "anatomical",
        profile: "high",
        implantPlane: "subpectoral",
        incisionSite: "mastectomy_wound",
        admUsed: false,
      },
    },
  },
  lipofilling: {
    harvestSites: ["abdomen"],
    harvestTechnique: "coleman_syringe",
    processingMethod: "coleman_centrifuge",
    totalVolumeHarvestedMl: 300,
    sessionNumber: 2,
    injections: {
      left: { volumeInjectedMl: 120 },
      right: { volumeInjectedMl: 140 },
    },
  },
};

const breastCase = {
  id: "breast-case-1",
  patientIdentifier: "PAT-B1",
  patientFirstName: "Ada",
  patientLastName: "Lovelace",
  patientDateOfBirth: "1987-03-12",
  patientNhi: "ABC1234",
  procedureDate: "2026-03-10",
  facility: "Test Hospital",
  specialty: "breast",
  ownerId: "owner-1",
  caseStatus: "active" as const,
  episodeId: "breast-episode-1",
  diagnosisGroups: [
    {
      id: "group-1",
      specialty: "breast",
      diagnosis: {
        displayName: "Breast reconstruction with implant",
        snomedCtCode: "234001",
      },
      procedures: [
        {
          id: "proc-1",
          sequenceOrder: 1,
          procedureName: "Breast implant insertion",
          surgeonRole: "PS",
        },
      ],
      breastAssessment,
    },
  ],
};

describe("breast export mapper", () => {
  it("normalizes one shared breast export shape for downstream exporters", () => {
    const mapped = getBreastExportData(breastCase.diagnosisGroups as any);

    expect(mapped?.laterality).toBe("bilateral");
    expect(mapped?.reconstructionEpisodeId).toBe("breast-episode-1");
    expect(mapped?.sides.left?.implant?.manufacturerLabel).toBe("Allergan");
    expect(mapped?.sides.right?.implant?.manufacturerLabel).toBe("Mentor");
    expect(mapped?.sides.left?.lipofillingVolumeMl).toBe(120);
    expect(mapped?.lipofilling?.processingMethodLabel).toContain("Coleman");
  });
});

describe("breast CSV export", () => {
  it("uses human-readable manufacturer labels and shared lipofilling fields", () => {
    const csv = exportCasesAsCsv([breastCase as any], {
      includePatientId: true,
    });
    const [headerLine, valueLine] = csv.split("\n");
    const headers = headerLine!.split(",");
    const values = valueLine!.split(",");

    expect(values[headers.indexOf("breast_L_implant_manufacturer")]).toBe(
      "Allergan",
    );
    expect(values[headers.indexOf("breast_R_implant_manufacturer")]).toBe(
      "Mentor",
    );
    expect(
      values[headers.indexOf("breast_lipofilling_processing_method")],
    ).toContain("Coleman");
    expect(values[headers.indexOf("breast_recon_episode_id")]).toBe(
      "breast-episode-1",
    );
  });
});

describe("breast FHIR export", () => {
  it("links breast devices back to the originating procedure", () => {
    const bundle = JSON.parse(exportSingleCaseAsFhir(breastCase as any));
    const procedure = bundle.entry.find(
      (entry: any) => entry.resource.resourceType === "Procedure",
    )?.resource;
    const devices = bundle.entry
      .filter((entry: any) => entry.resource.resourceType === "Device")
      .map((entry: any) => entry.resource);

    expect(procedure.focalDevice).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          manipulated: {
            reference: expect.stringContaining("breast-device-left"),
          },
        }),
      ]),
    );
    expect(devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ manufacturer: "Allergan" }),
        expect.objectContaining({ manufacturer: "Mentor" }),
      ]),
    );
  });
});

describe("breast PDF/module summary", () => {
  it("keeps PDF and summary output aligned with the normalized mapper", () => {
    const html = buildPdfHtml([breastCase as any], { includePatientId: true });
    const summary = generateBreastSummary(breastAssessment);

    expect(summary).toContain("Allergan");
    expect(summary).toContain("Mentor");
    expect(html).toContain("Allergan");
    expect(html).toContain("Episode: breast-episode-1");
    expect(html).toContain("120ml injected");
  });
});
