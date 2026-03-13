import { describe, expect, it } from "vitest";
import { caseNeedsJointContext } from "@/lib/moduleVisibility";
import { exportCasesAsCsv } from "@/lib/exportCsv";
import { exportSingleCaseAsFhir } from "@/lib/exportFhir";
import { buildPdfHtml } from "@/lib/exportPdfHtml";

const headNeckCase = {
  id: "hn-case-1",
  patientIdentifier: "HN-001",
  procedureDate: "2026-03-10",
  facility: "Opus Hospital",
  specialty: "head_neck",
  ownerId: "owner-1",
  caseStatus: "active",
  responsibleConsultantName: "Mr Reconstructive",
  jointCaseContext: {
    isJointCase: true,
    partnerSpecialty: "ent",
    partnerConsultantName: "Mr Ablation",
    ablativeSurgeon: "partner",
    reconstructionSequence: "immediate",
    ablativeProcedureDescription:
      "Composite oral cavity resection with segmental mandibulectomy",
    defectDimensions: {
      length: 72,
      width: 38,
      depth: 24,
    },
    structuresResected: ["bone_mandible", "tongue", "floor_of_mouth"],
  },
  diagnosisGroups: [
    {
      id: "hn-group-1",
      specialty: "head_neck",
      diagnosis: {
        displayName: "Mandibular tumour",
        snomedCtCode: "93832008",
      },
      procedures: [
        {
          id: "hn-proc-1",
          specialty: "head_neck",
          sequenceOrder: 1,
          procedureName: "Fibula free flap reconstruction",
          snomedCtCode: "122465003",
          tags: ["free_flap", "microsurgery"],
          clinicalDetails: {
            harvestSide: "left",
            recipientSiteRegion: "head_neck",
            anastomoses: [],
            recipientVesselQuality: "irradiated_vein_graft_required",
            veinGraftUsed: true,
            veinGraftSource: "saphenous",
            veinGraftLength: 9,
            flapSpecificDetails: {
              fibulaReconSite: "mandible",
              fibulaBrownClass: "IIc",
              fibulaMandibleSegments: ["body", "symphysis"],
            },
          },
        },
      ],
    },
  ],
} as const;

describe("Head & Neck joint case visibility", () => {
  it("shows joint case context for neck dissection procedures even without a flap", () => {
    expect(
      caseNeedsJointContext("head_neck", [
        {
          id: "group-1",
          specialty: "head_neck",
          procedures: [
            {
              id: "proc-1",
              procedureName: "Selective neck dissection",
              picklistEntryId: "hn_neck_dissection_selective",
            },
          ],
        } as any,
      ]),
    ).toBe(true);
  });
});

describe("Head & Neck export integration", () => {
  it("serializes the richer joint case and flap fields into CSV", () => {
    const csv = exportCasesAsCsv([headNeckCase as any], {
      includePatientId: true,
    });

    expect(csv).toContain("ENT (Otolaryngology)");
    expect(csv).toContain(
      "Composite oral cavity resection with segmental mandibulectomy",
    );
    expect(csv).toContain("Great saphenous");
    expect(csv).toContain("Class IIc — Anterior + lateral, condyle preserved");
  });

  it("emits encounter and procedure extensions for the new Head & Neck fields", () => {
    const bundle = JSON.parse(exportSingleCaseAsFhir(headNeckCase as any));

    const encounter = bundle.entry.find(
      (entry: any) => entry.resource.resourceType === "Encounter",
    )?.resource;
    const procedure = bundle.entry.find(
      (entry: any) =>
        entry.resource.resourceType === "Procedure" &&
        entry.resource.id === "procedure-hn-proc-1",
    )?.resource;

    const jointCaseExtension = encounter.extension.find(
      (ext: any) => ext.url === "urn:opus:joint-case-context",
    );
    expect(jointCaseExtension.extension).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "ablativeProcedureDescription",
          valueString:
            "Composite oral cavity resection with segmental mandibulectomy",
        }),
        expect.objectContaining({
          url: "structuresResected",
          valueString: "bone_mandible",
        }),
      ]),
    );

    const flapExtension = procedure.extension.find(
      (ext: any) => ext.url === "urn:opus:head-neck-free-flap",
    );
    expect(flapExtension.extension).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "recipientVesselQuality",
          valueString: "irradiated_vein_graft_required",
        }),
        expect.objectContaining({
          url: "fibulaBrownClass",
          valueString: "IIc",
        }),
      ]),
    );
  });

  it("includes the new Head & Neck summaries in PDF export output", () => {
    const html = buildPdfHtml([headNeckCase as any], {
      includePatientId: true,
    });

    expect(html).toContain("Joint: ENT (Otolaryngology) (Mr Ablation)");
    expect(html).toContain("Ablative: Partner team");
    expect(html).toContain("Resected: Mandible, Tongue, Floor of mouth");
    expect(html).toContain("Great saphenous");
  });
});
