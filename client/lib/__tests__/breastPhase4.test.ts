import { describe, expect, it } from "vitest";
import type { Case } from "@/types/case";
import type { TreatmentEpisode } from "@/types/episode";
import {
  applyBreastEpisodeLinkToCase,
  applyBreastEpisodeLinkToGroup,
  buildBreastEpisodeCreatePlan,
  buildBreastEpisodeUpdatePlan,
  deriveBreastReconstructionMeta,
  getBreastEpisodeLinkedId,
  getBreastEpisodePromptLabel,
  suggestBreastEpisodeType,
} from "@/lib/breastEpisodeHelpers";
import {
  copyBreastSide,
  createEmptyBreastAssessment,
  isBreastSideEmpty,
  normalizeBreastAssessment,
} from "@/lib/breastState";

describe("breastState", () => {
  it("creates the default left side on first open", () => {
    const assessment = createEmptyBreastAssessment();

    expect(assessment.laterality).toBe("left");
    expect(assessment.sides.left).toEqual({
      side: "left",
      clinicalContext: "reconstructive",
    });
    expect(assessment.sides.right).toBeUndefined();
  });

  it("normalizes laterality and migrates legacy side-local lipofilling", () => {
    const assessment = normalizeBreastAssessment({
      laterality: "bilateral",
      sides: {
        left: {
          side: "left",
          clinicalContext: "reconstructive",
          lipofilling: {
            harvestSites: ["abdomen"],
            injectionLeft: { volumeInjectedMl: 120 },
          } as any,
        },
      },
    });

    expect(assessment.sides.left?.side).toBe("left");
    expect(assessment.sides.right?.side).toBe("right");
    expect(assessment.lipofilling?.harvestSites).toEqual(["abdomen"]);
    expect(assessment.lipofilling?.injections?.left?.volumeInjectedMl).toBe(
      120,
    );
  });

  it("prunes inactive sides when laterality becomes unilateral", () => {
    const assessment = normalizeBreastAssessment({
      laterality: "right",
      sides: {
        left: { side: "left", clinicalContext: "aesthetic" },
        right: { side: "right", clinicalContext: "reconstructive" },
      },
    });

    expect(assessment.sides.left).toBeUndefined();
    expect(assessment.sides.right?.side).toBe("right");
  });

  it("treats a seeded default side as empty but a touched side as populated", () => {
    expect(
      isBreastSideEmpty({
        side: "left",
        clinicalContext: "reconstructive",
      }),
    ).toBe(true);

    expect(
      isBreastSideEmpty({
        side: "left",
        clinicalContext: "reconstructive",
        implantDetails: { admUsed: false },
      }),
    ).toBe(false);
  });

  it("copies a populated side into the target side without sharing references", () => {
    const source = {
      side: "left" as const,
      clinicalContext: "gender_affirming" as const,
      chestMasculinisation: {
        technique: "double_incision_fng" as const,
        specimenWeightLeftGrams: 320,
      },
    };

    const copied = copyBreastSide(source, "right");
    expect(copied.side).toBe("right");
    expect(copied.chestMasculinisation?.technique).toBe("double_incision_fng");
    expect(copied.chestMasculinisation).not.toBe(source.chestMasculinisation);
  });
});

describe("breastEpisodeHelpers", () => {
  const caseData: Case = {
    id: "case-1",
    patientIdentifier: "PAT-1",
    procedureDate: "2026-03-10",
    facility: "Test Hospital",
    specialty: "breast",
    procedureType: "Breast reconstruction",
    diagnosisGroups: [
      {
        id: "group-1",
        specialty: "breast",
        diagnosis: {
          displayName: "Delayed breast reconstruction",
          snomedCtCode: "123",
        },
        procedures: [],
        breastAssessment: {
          laterality: "left",
          sides: {
            left: {
              side: "left",
              clinicalContext: "reconstructive",
              reconstructionTiming: "delayed",
              implantDetails: {
                deviceType: "tissue_expander",
                implantPlane: "prepectoral",
              },
            },
          },
        },
      },
    ],
    teamMembers: [],
    ownerId: "user-1",
    createdAt: "2026-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
  };

  it("derives reconstruction metadata from the normalized assessment", () => {
    expect(
      deriveBreastReconstructionMeta(
        normalizeBreastAssessment(
          caseData.diagnosisGroups[0]?.breastAssessment,
        ),
      ),
    ).toMatchObject({
      laterality: "left",
      primaryReconstructionType: "implant_two_stage",
      timingClassification: "delayed",
      reconEpisodeStatus: "expansion_phase",
    });
  });

  it("reuses an existing staged reconstruction episode when available", () => {
    const existingEpisode: TreatmentEpisode = {
      id: "episode-existing",
      patientIdentifier: "PAT-1",
      title: "Existing breast reconstruction",
      primaryDiagnosisCode: "123",
      primaryDiagnosisDisplay: "Breast reconstruction",
      type: "staged_reconstruction",
      specialty: "breast",
      status: "active",
      onsetDate: "2026-03-01",
      ownerId: "user-1",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    };

    const plan = buildBreastEpisodeCreatePlan(
      caseData,
      [existingEpisode],
      "2026-03-10T10:00:00.000Z",
      "episode-new",
    );

    expect(plan?.linkedEpisodeId).toBe("episode-existing");
    expect(plan?.episodeToCreate).toBeUndefined();
  });

  it("creates a new episode when none exists and mirrors the id back to the case", () => {
    const plan = buildBreastEpisodeCreatePlan(
      caseData,
      [],
      "2026-03-10T10:00:00.000Z",
      "episode-new",
    );

    expect(plan?.linkedEpisodeId).toBe("episode-new");
    expect(plan?.episodeToCreate?.type).toBe("staged_reconstruction");
    expect(plan?.episodeToCreate?.breastReconstructionMeta).toBeDefined();

    const linkedCase = applyBreastEpisodeLinkToCase(caseData, "episode-new", 2);
    expect(linkedCase.episodeId).toBe("episode-new");
    expect(linkedCase.episodeSequence).toBe(2);
    expect(getBreastEpisodeLinkedId(linkedCase)).toBe("episode-new");
  });

  it("clears the mirrored link when the user unlinks the breast episode", () => {
    const linkedGroup = applyBreastEpisodeLinkToGroup(
      caseData.diagnosisGroups[0]!,
      "episode-existing",
    );
    const unlinkedGroup = applyBreastEpisodeLinkToGroup(linkedGroup, undefined);

    expect(
      unlinkedGroup.breastAssessment?.reconstructionEpisodeId,
    ).toBeUndefined();
  });

  it("builds an update plan that keeps the local episode in sync", () => {
    const linkedCase = applyBreastEpisodeLinkToCase(caseData, "episode-1", 1);
    const updatePlan = buildBreastEpisodeUpdatePlan(linkedCase, {
      id: "episode-1",
      patientIdentifier: "PAT-1",
      title: "Old title",
      primaryDiagnosisCode: "123",
      primaryDiagnosisDisplay: "Breast reconstruction",
      type: "staged_reconstruction",
      specialty: "breast",
      status: "planned",
      onsetDate: "2026-03-01",
      ownerId: "user-1",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    });

    expect(updatePlan).toMatchObject({
      status: "active",
      laterality: "left",
    });
    expect(
      updatePlan?.breastReconstructionMeta?.primaryReconstructionType,
    ).toBe("implant_two_stage");
  });
});

describe("getBreastEpisodePromptLabel", () => {
  it("returns reconstruction pathway label for oncological + reconstructive", () => {
    const assessment = normalizeBreastAssessment({
      laterality: "left",
      sides: {
        left: { side: "left", clinicalContext: "reconstructive" },
      },
    });
    const result = getBreastEpisodePromptLabel(assessment, "oncological");
    expect(result.title).toBe("Start a reconstruction pathway?");
    expect(result.subtitle).toBe("Track stages across multiple operations");
  });

  it("returns reconstruction pathway label for reconstructive context", () => {
    const assessment = normalizeBreastAssessment({
      laterality: "left",
      sides: {
        left: { side: "left", clinicalContext: "reconstructive" },
      },
    });
    const result = getBreastEpisodePromptLabel(assessment, "reconstructive");
    expect(result.title).toBe("Start a reconstruction pathway?");
  });

  it("returns generic treatment pathway label for aesthetic context", () => {
    const assessment = normalizeBreastAssessment({
      laterality: "left",
      sides: {
        left: { side: "left", clinicalContext: "aesthetic" },
      },
    });
    const result = getBreastEpisodePromptLabel(assessment, "aesthetic");
    expect(result.title).toBe("Start a treatment pathway?");
  });
});

describe("suggestBreastEpisodeType", () => {
  it("always returns staged_reconstruction regardless of diagnosis context", () => {
    const assessment = normalizeBreastAssessment({
      laterality: "left",
      sides: {
        left: { side: "left", clinicalContext: "reconstructive" },
      },
    });
    expect(suggestBreastEpisodeType(assessment, "oncological")).toBe(
      "staged_reconstruction",
    );
    expect(suggestBreastEpisodeType(assessment, "aesthetic")).toBe(
      "staged_reconstruction",
    );
  });
});

describe("buildBreastEpisodeCreatePlan with overrides", () => {
  const caseData: Case = {
    id: "case-1",
    patientIdentifier: "PAT-1",
    procedureDate: "2026-03-10",
    facility: "Test Hospital",
    specialty: "breast",
    procedureType: "Breast reconstruction",
    diagnosisGroups: [
      {
        id: "group-1",
        specialty: "breast",
        diagnosis: {
          displayName: "Delayed breast reconstruction",
          snomedCtCode: "123",
        },
        procedures: [],
        breastAssessment: {
          laterality: "left",
          sides: {
            left: {
              side: "left",
              clinicalContext: "reconstructive",
              reconstructionTiming: "delayed",
              implantDetails: {
                deviceType: "tissue_expander",
                implantPlane: "prepectoral",
              },
            },
          },
        },
      },
    ],
    teamMembers: [],
    ownerId: "user-1",
    createdAt: "2026-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
  };

  it("applies title override when creating a new episode", () => {
    const plan = buildBreastEpisodeCreatePlan(
      caseData,
      [],
      "2026-03-10T10:00:00.000Z",
      "episode-new",
      { title: "Custom Episode Title" },
    );
    expect(plan?.episodeToCreate?.title).toBe("Custom Episode Title");
  });

  it("applies episodeType override", () => {
    const plan = buildBreastEpisodeCreatePlan(
      caseData,
      [],
      "2026-03-10T10:00:00.000Z",
      "episode-new",
      { episodeType: "cancer_pathway" },
    );
    expect(plan?.episodeToCreate?.type).toBe("cancer_pathway");
  });

  it("applies pendingAction and onsetDate overrides", () => {
    const plan = buildBreastEpisodeCreatePlan(
      caseData,
      [],
      "2026-03-10T10:00:00.000Z",
      "episode-new",
      {
        pendingAction: "awaiting_fat_grafting",
        onsetDate: "2026-01-15",
      },
    );
    expect(plan?.episodeToCreate?.pendingAction).toBe("awaiting_fat_grafting");
    expect(plan?.episodeToCreate?.onsetDate).toBe("2026-01-15");
  });

  it("uses auto-derived values when no overrides provided", () => {
    const plan = buildBreastEpisodeCreatePlan(
      caseData,
      [],
      "2026-03-10T10:00:00.000Z",
      "episode-new",
    );
    expect(plan?.episodeToCreate?.type).toBe("staged_reconstruction");
    expect(plan?.episodeToCreate?.onsetDate).toBe("2026-03-10");
  });
});

describe("broadened getBreastEpisodeTarget", () => {
  it("finds aesthetic breast groups (not just reconstructive)", () => {
    const aestheticCase: Case = {
      id: "case-2",
      patientIdentifier: "PAT-2",
      procedureDate: "2026-03-10",
      facility: "Test Hospital",
      specialty: "breast",
      procedureType: "Breast augmentation",
      diagnosisGroups: [
        {
          id: "group-2",
          specialty: "breast",
          diagnosis: {
            displayName: "Breast augmentation",
            snomedCtCode: "456",
          },
          procedures: [],
          breastAssessment: {
            laterality: "bilateral",
            sides: {
              left: { side: "left", clinicalContext: "aesthetic" },
              right: { side: "right", clinicalContext: "aesthetic" },
            },
          },
        },
      ],
      teamMembers: [],
      ownerId: "user-1",
      createdAt: "2026-03-10T10:00:00.000Z",
      updatedAt: "2026-03-10T10:00:00.000Z",
    };

    const plan = buildBreastEpisodeCreatePlan(
      aestheticCase,
      [],
      "2026-03-10T10:00:00.000Z",
      "episode-new",
    );
    expect(plan).not.toBeNull();
    expect(plan?.linkedEpisodeId).toBe("episode-new");
    expect(plan?.episodeToCreate).toBeDefined();
  });
});
