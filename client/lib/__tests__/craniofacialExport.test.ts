import { describe, expect, it } from "vitest";
import { exportCasesAsCsv } from "@/lib/exportCsv";
import { exportSingleCaseAsFhir } from "@/lib/exportFhir";
import { buildPdfHtml } from "@/lib/exportPdfHtml";
import type { CraniofacialAssessmentData } from "@/types/craniofacial";

// ── Mock data ──

const cleftAssessment: CraniofacialAssessmentData = {
  cleftClassification: {
    lahshal: {
      rightLip: "none",
      rightAlveolus: "none",
      hardPalate: "complete",
      softPalate: "complete",
      leftAlveolus: "complete",
      leftLip: "complete",
    },
    veauClass: "III",
    laterality: "left",
    associatedSyndrome: "Pierre Robin",
  },
  operativeDetails: {
    ageAtSurgery: { years: 0, months: 4 },
    namedTechnique: "Fisher",
    pathwayStage: "primary",
    estimatedBloodLossMl: 15,
    transfusionRequired: false,
  },
  outcomes: {
    speech: { vpcRating: 0, hypernasality: "none" },
    dental: { goslonScore: 2 },
    hearing: { grommetsInserted: true, grommetSets: 2 },
    feeding: { method: "bottle_specialist" },
    complications: {
      bleedingRequiringOR: false,
      infectionRequiringOR: false,
      oronasalFistula: true,
      completeDehiscence: false,
      respiratoryDistress: false,
      readmissionWithin30d: false,
    },
  },
};

const cranioAssessment: CraniofacialAssessmentData = {
  operativeDetails: {
    ageAtSurgery: { years: 0, months: 8 },
    namedTechnique: "Pi-plasty",
    pathwayStage: "primary",
    estimatedBloodLossMl: 250,
    transfusionRequired: true,
  },
  craniosynostosisDetails: {
    suturesInvolved: ["sagittal"],
    syndromic: false,
    icpAssessment: {
      preOperative: {
        measured: true,
        valueMmHg: 22,
        method: "lumbar_puncture",
      },
    },
    whitakerOutcome: "I",
  },
};

const omensAssessment: CraniofacialAssessmentData = {
  operativeDetails: {
    pathwayStage: "primary",
    namedTechnique: "Mandibular distraction",
  },
  omensClassification: {
    orbit: 1,
    mandible: "IIb",
    ear: 2,
    nerve: 0,
    softTissue: 1,
    laterality: "left",
  },
};

function makeCraniofacialCase(
  assessment: CraniofacialAssessmentData | undefined,
) {
  return {
    id: "case-cf-1",
    patientIdentifier: "PAT-CF",
    procedureDate: "2026-03-15",
    facility: "Children's Hospital",
    specialty: "cleft_cranio",
    ownerId: "owner-1",
    caseStatus: "active",
    diagnosisGroups: [
      {
        id: "group-1",
        specialty: "cleft_cranio",
        diagnosis: {
          displayName: "Unilateral cleft lip and palate — complete",
          snomedCtCode: "87979003",
        },
        diagnosisClinicalDetails: {},
        procedures: [
          {
            id: "proc-1",
            sequenceOrder: 1,
            procedureName: "Unilateral cleft lip repair",
            picklistEntryId: "cc_lip_repair_unilateral",
            surgeonRole: "PS",
          },
        ],
        craniofacialAssessment: assessment,
      },
    ],
  } as any;
}

// ── CSV tests ──

describe("Craniofacial CSV export", () => {
  it("includes cf_* headers in the CSV header row", () => {
    const csv = exportCasesAsCsv([makeCraniofacialCase(cleftAssessment)], {
      includePatientId: true,
    });
    const header = csv.split("\n")[0] ?? "";
    expect(header).toContain("cf_laterality");
    expect(header).toContain("cf_lahshal");
    expect(header).toContain("cf_veau_class");
    expect(header).toContain("cf_omens");
    expect(header).toContain("cf_complications");
  });

  it("exports cleft fields correctly", () => {
    const csv = exportCasesAsCsv([makeCraniofacialCase(cleftAssessment)], {
      includePatientId: true,
    });
    const row = csv.split("\n")[1] ?? "";

    // LAHSHAL: rightLip=none, rightAlveolus=none, hardPalate=complete,
    //   softPalate=complete, leftAlveolus=complete, leftLip=complete → ..HSAL
    expect(row).toContain("..HSAL");
    expect(row).toContain("III"); // Veau class
    expect(row).toContain("left"); // laterality
    expect(row).toContain("Pierre Robin"); // syndrome
    expect(row).toContain("Fisher"); // technique
    expect(row).toContain("primary"); // pathway stage
    expect(row).toContain("4"); // age: 0*12 + 4 = 4 months
  });

  it("exports craniosynostosis fields correctly", () => {
    const csv = exportCasesAsCsv([makeCraniofacialCase(cranioAssessment)], {
      includePatientId: true,
    });
    const row = csv.split("\n")[1] ?? "";

    expect(row).toContain("sagittal"); // sutures
    expect(row).toContain("22"); // ICP mmHg
    expect(row).toContain("Pi-plasty"); // technique
  });

  it("exports OMENS classification correctly", () => {
    const csv = exportCasesAsCsv([makeCraniofacialCase(omensAssessment)], {
      includePatientId: true,
    });
    const row = csv.split("\n")[1] ?? "";

    expect(row).toContain("O1M-IIbE2N0S1");
  });

  it("exports outcome fields correctly", () => {
    const csv = exportCasesAsCsv([makeCraniofacialCase(cleftAssessment)], {
      includePatientId: true,
    });
    const row = csv.split("\n")[1] ?? "";

    expect(row).toContain("bottle_specialist"); // feeding
    expect(row).toContain("oronasalFistula"); // complication
  });

  it("exports empty craniofacial columns when no assessment", () => {
    const csv = exportCasesAsCsv([makeCraniofacialCase(undefined)], {
      includePatientId: true,
    });
    const header = csv.split("\n")[0] ?? "";
    const row = csv.split("\n")[1] ?? "";

    // Headers should still be present
    expect(header).toContain("cf_laterality");
    expect(header).toContain("cf_complications");

    // Craniofacial-specific data should NOT appear
    expect(row).not.toContain("Fisher");
    expect(row).not.toContain("OMENS");
    expect(row).not.toContain("sagittal");
  });
});

// ── FHIR tests ──

describe("Craniofacial FHIR export", () => {
  it("adds craniofacialAssessment extension to Condition resource for cleft case", () => {
    const bundle = JSON.parse(
      exportSingleCaseAsFhir(makeCraniofacialCase(cleftAssessment)),
    );
    const condition = bundle.entry.find(
      (e: any) => e.resource.resourceType === "Condition",
    )?.resource;

    const cfExt = condition?.extension?.find(
      (e: any) => e.url === "opus:craniofacialAssessment",
    );
    expect(cfExt).toBeDefined();

    const extensions = cfExt.extension as {
      url: string;
      valueString: string;
    }[];
    const lahshal = extensions.find((e) => e.url === "lahshal");
    expect(lahshal?.valueString).toBe("..HSAL");

    const veau = extensions.find((e) => e.url === "veauClass");
    expect(veau?.valueString).toBe("III");

    const technique = extensions.find((e) => e.url === "namedTechnique");
    expect(technique?.valueString).toBe("Fisher");

    const pathwayStage = extensions.find((e) => e.url === "pathwayStage");
    expect(pathwayStage?.valueString).toBe("primary");
  });

  it("includes speech and dental outcomes in FHIR extension", () => {
    const bundle = JSON.parse(
      exportSingleCaseAsFhir(makeCraniofacialCase(cleftAssessment)),
    );
    const condition = bundle.entry.find(
      (e: any) => e.resource.resourceType === "Condition",
    )?.resource;

    const cfExt = condition?.extension?.find(
      (e: any) => e.url === "opus:craniofacialAssessment",
    );
    const extensions = cfExt.extension as {
      url: string;
      valueString: string;
    }[];

    const vpc = extensions.find((e) => e.url === "speechVpcRating");
    expect(vpc?.valueString).toBe("0");

    const goslon = extensions.find((e) => e.url === "dentalGoslonScore");
    expect(goslon?.valueString).toBe("2");

    const grommets = extensions.find((e) => e.url === "hearingGrommets");
    expect(grommets?.valueString).toBe("true");
  });

  it("includes craniosynostosis details in FHIR extension", () => {
    const bundle = JSON.parse(
      exportSingleCaseAsFhir(makeCraniofacialCase(cranioAssessment)),
    );
    const condition = bundle.entry.find(
      (e: any) => e.resource.resourceType === "Condition",
    )?.resource;

    const cfExt = condition?.extension?.find(
      (e: any) => e.url === "opus:craniofacialAssessment",
    );
    const extensions = cfExt.extension as {
      url: string;
      valueString: string;
    }[];

    const sutures = extensions.find((e) => e.url === "suturesInvolved");
    expect(sutures?.valueString).toBe("sagittal");

    const whitaker = extensions.find((e) => e.url === "whitakerOutcome");
    expect(whitaker?.valueString).toBe("I");
  });

  it("does not add extension when no craniofacial assessment", () => {
    const bundle = JSON.parse(
      exportSingleCaseAsFhir(makeCraniofacialCase(undefined)),
    );
    const condition = bundle.entry.find(
      (e: any) => e.resource.resourceType === "Condition",
    )?.resource;

    const cfExt = condition?.extension?.find(
      (e: any) => e.url === "opus:craniofacialAssessment",
    );
    expect(cfExt).toBeUndefined();
  });
});

// ── PDF tests ──

describe("Craniofacial PDF export", () => {
  it("includes cleft summary in PDF HTML", () => {
    const html = buildPdfHtml([makeCraniofacialCase(cleftAssessment)], {
      includePatientId: true,
    });
    expect(html).toContain("Veau III");
    expect(html).toContain("Fisher");
  });

  it("includes craniosynostosis summary in PDF HTML", () => {
    const html = buildPdfHtml([makeCraniofacialCase(cranioAssessment)], {
      includePatientId: true,
    });
    expect(html).toContain("Cranio: sagittal");
    expect(html).toContain("Pi-plasty");
  });

  it("includes OMENS in PDF HTML", () => {
    const html = buildPdfHtml([makeCraniofacialCase(omensAssessment)], {
      includePatientId: true,
    });
    expect(html).toContain("OMENS: O1M-IIbE2N0S1");
  });

  it("produces no summary when no craniofacial assessment", () => {
    const html = buildPdfHtml([makeCraniofacialCase(undefined)], {
      includePatientId: true,
    });
    expect(html).not.toContain("Veau");
    expect(html).not.toContain("OMENS");
    expect(html).not.toContain("Cranio:");
  });
});
