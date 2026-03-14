import type { Case, DiagnosisGroup } from "@/types/case";
import type {
  BreastAssessmentData,
  BreastReconstructionMeta,
  BreastReconPrimaryType,
} from "@/types/breast";
import type { TreatmentEpisode, EpisodeType, PendingAction } from "@/types/episode";
import { normalizeBreastAssessment } from "@/lib/breastState";

// ── Override type for surgeon-editable episode fields ────────────────────────

export interface BreastEpisodeOverrides {
  title?: string;
  episodeType?: EpisodeType;
  onsetDate?: string;
  pendingAction?: PendingAction;
}

interface BreastEpisodeTarget {
  assessment: BreastAssessmentData;
  diagnosisDisplay?: string;
  diagnosisCode?: string;
}

function getBreastEpisodeTarget(
  caseData: Pick<Case, "diagnosisGroups">,
): BreastEpisodeTarget | null {
  for (const group of caseData.diagnosisGroups ?? []) {
    if (!group.breastAssessment) continue;
    const assessment = normalizeBreastAssessment(group.breastAssessment);

    // Accept any group with a breast assessment that has at least one side
    // with a clinical context, or an existing episode link
    const hasAnySide = Object.values(assessment.sides).some(
      (side) => side?.clinicalContext != null,
    );

    if (!hasAnySide && !assessment.reconstructionEpisodeId) {
      continue;
    }

    return {
      assessment,
      diagnosisDisplay: group.diagnosis?.displayName,
      diagnosisCode: group.diagnosis?.snomedCtCode,
    };
  }

  return null;
}

function inferPrimaryReconstructionType(
  assessment: BreastAssessmentData,
): BreastReconPrimaryType | undefined {
  const sides = Object.values(assessment.sides).filter(Boolean);
  const hasImplant = sides.some((side) => !!side?.implantDetails?.deviceType);
  const hasFlap = sides.some((side) => !!side?.flapDetails);
  const hasLipofilling = !!assessment.lipofilling;

  if (hasImplant && hasFlap) return "combined_autologous_implant";
  if (hasFlap) return "autologous_other";

  const expanderType = sides.find(
    (side) =>
      side?.implantDetails?.deviceType === "tissue_expander" ||
      side?.implantDetails?.deviceType === "expander_implant",
  )?.implantDetails?.deviceType;
  if (expanderType) return "implant_two_stage";
  if (hasImplant) return "implant_dti";
  if (hasLipofilling) return "fat_only";

  return undefined;
}

export function deriveBreastReconstructionMeta(
  assessment: BreastAssessmentData,
): BreastReconstructionMeta | undefined {
  const reconstructiveSides = Object.values(assessment.sides).filter(
    (side) => side?.clinicalContext === "reconstructive",
  );
  if (reconstructiveSides.length === 0) return undefined;

  const firstReconstructiveSide = reconstructiveSides[0];
  if (!firstReconstructiveSide) return undefined;

  return {
    laterality: assessment.laterality,
    primaryReconstructionType: inferPrimaryReconstructionType(assessment),
    timingClassification: firstReconstructiveSide.reconstructionTiming,
    radiationStatus: reconstructiveSides.some((side) => side?.priorRadiotherapy)
      ? "pre_reconstruction"
      : "none",
    reconEpisodeStatus: firstReconstructiveSide.nippleDetails
      ? "nipple_reconstruction"
      : assessment.lipofilling
        ? "secondary_procedures"
        : firstReconstructiveSide.implantDetails?.deviceType ===
              "tissue_expander" ||
            firstReconstructiveSide.implantDetails?.deviceType ===
              "expander_implant"
          ? "expansion_phase"
          : "primary_reconstruction",
  };
}

export function getBreastEpisodeLinkedId(
  caseData: Pick<Case, "diagnosisGroups">,
): string | undefined {
  return getBreastEpisodeTarget(caseData)?.assessment.reconstructionEpisodeId;
}

export function buildBreastEpisodeTitle(
  assessment: BreastAssessmentData,
  diagnosisDisplay?: string,
): string {
  const lateralityLabel =
    assessment.laterality === "bilateral"
      ? "Bilat"
      : assessment.laterality === "left"
        ? "L"
        : "R";

  if (diagnosisDisplay?.trim()) {
    return `${lateralityLabel} ${diagnosisDisplay.trim()}`.trim();
  }

  return `${lateralityLabel} breast reconstruction`;
}

// ── Context-aware prompt labels ──────────────────────────────────────────────

export function getBreastEpisodePromptLabel(
  assessment: BreastAssessmentData,
  diagnosisClinicalGroup?: string,
): { title: string; subtitle: string } {
  const subtitle = "Track stages across multiple operations";

  const isOncological = diagnosisClinicalGroup === "oncological";
  const hasReconstructive = Object.values(assessment.sides).some(
    (s) => s?.clinicalContext === "reconstructive",
  );

  if (isOncological && hasReconstructive) {
    return { title: "Start a cancer pathway episode?", subtitle };
  }
  if (hasReconstructive) {
    return { title: "Start a reconstruction episode?", subtitle };
  }
  return { title: "Start a treatment episode?", subtitle };
}

// ── Context-aware episode type suggestion ────────────────────────────────────

export function suggestBreastEpisodeType(
  assessment: BreastAssessmentData,
  diagnosisClinicalGroup?: string,
): EpisodeType {
  const isOncological = diagnosisClinicalGroup === "oncological";
  if (isOncological) return "cancer_pathway";
  return "staged_reconstruction";
}

// ── Breast-relevant pending actions (ordered first in dropdown) ──────────────

export const BREAST_PENDING_ACTIONS: PendingAction[] = [
  "awaiting_expander_exchange",
  "expansion_in_progress",
  "awaiting_nipple_recon",
  "awaiting_fat_grafting",
  "awaiting_symmetrisation",
  "awaiting_tattoo",
  "awaiting_reconstruction",
  "staged_procedure_planned",
];

export function buildBreastEpisodeCreatePlan(
  caseData: Pick<
    Case,
    | "diagnosisGroups"
    | "patientIdentifier"
    | "procedureDate"
    | "ownerId"
    | "specialty"
    | "episodeId"
  >,
  existingEpisodes: TreatmentEpisode[],
  now: string,
  episodeId: string,
  overrides?: BreastEpisodeOverrides,
): {
  linkedEpisodeId: string;
  linkedEpisodeTitle: string;
  episodeToCreate?: TreatmentEpisode;
} | null {
  if (!caseData.patientIdentifier) return null;

  const target = getBreastEpisodeTarget(caseData);
  if (!target) return null;

  if (target.assessment.reconstructionEpisodeId) {
    const existingEpisode = existingEpisodes.find(
      (episode) => episode.id === target.assessment.reconstructionEpisodeId,
    );
    if (!existingEpisode) {
      const title = buildBreastEpisodeTitle(
        target.assessment,
        target.diagnosisDisplay,
      );

      return {
        linkedEpisodeId: target.assessment.reconstructionEpisodeId,
        linkedEpisodeTitle: title,
        episodeToCreate: {
          id: target.assessment.reconstructionEpisodeId,
          patientIdentifier: caseData.patientIdentifier,
          title,
          primaryDiagnosisCode: target.diagnosisCode ?? "",
          primaryDiagnosisDisplay:
            target.diagnosisDisplay ?? "Breast reconstruction",
          laterality: target.assessment.laterality,
          type: "staged_reconstruction",
          specialty: caseData.specialty,
          status: "planned",
          pendingAction: "awaiting_reconstruction",
          onsetDate: caseData.procedureDate,
          notes: "Breast reconstruction pathway",
          ownerId: caseData.ownerId,
          createdAt: now,
          updatedAt: now,
          breastReconstructionMeta: deriveBreastReconstructionMeta(
            target.assessment,
          ),
        },
      };
    }

    return {
      linkedEpisodeId: target.assessment.reconstructionEpisodeId,
      linkedEpisodeTitle:
        existingEpisode?.title ??
        buildBreastEpisodeTitle(target.assessment, target.diagnosisDisplay),
    };
  }

  if (caseData.episodeId) {
    const existingEpisode = existingEpisodes.find(
      (episode) => episode.id === caseData.episodeId,
    );
    if (existingEpisode?.type === "staged_reconstruction") {
      return {
        linkedEpisodeId: existingEpisode.id,
        linkedEpisodeTitle: existingEpisode.title,
      };
    }
  }

  const reusableEpisode = existingEpisodes.find(
    (episode) =>
      episode.type === "staged_reconstruction" &&
      (episode.status === "active" || episode.status === "planned"),
  );
  if (reusableEpisode) {
    return {
      linkedEpisodeId: reusableEpisode.id,
      linkedEpisodeTitle: reusableEpisode.title,
    };
  }

  const autoTitle = buildBreastEpisodeTitle(
    target.assessment,
    target.diagnosisDisplay,
  );
  const title = overrides?.title?.trim() || autoTitle;

  const autoPendingAction: PendingAction | undefined =
    target.assessment.lipofilling ||
    Object.values(target.assessment.sides).some(
      (side) => side?.nippleDetails,
    )
      ? "staged_procedure_planned"
      : "awaiting_reconstruction";

  return {
    linkedEpisodeId: episodeId,
    linkedEpisodeTitle: title,
    episodeToCreate: {
      id: episodeId,
      patientIdentifier: caseData.patientIdentifier,
      title,
      primaryDiagnosisCode: target.diagnosisCode ?? "",
      primaryDiagnosisDisplay:
        target.diagnosisDisplay ?? "Breast reconstruction",
      laterality: target.assessment.laterality,
      type: overrides?.episodeType ?? "staged_reconstruction",
      specialty: caseData.specialty,
      status: "planned",
      pendingAction: overrides?.pendingAction ?? autoPendingAction,
      onsetDate: overrides?.onsetDate ?? caseData.procedureDate,
      notes: "Breast reconstruction pathway",
      ownerId: caseData.ownerId,
      createdAt: now,
      updatedAt: now,
      breastReconstructionMeta: deriveBreastReconstructionMeta(
        target.assessment,
      ),
    },
  };
}

export function applyBreastEpisodeLinkToGroup(
  group: DiagnosisGroup,
  episodeId: string | undefined,
): DiagnosisGroup {
  if (!group.breastAssessment) return group;

  return {
    ...group,
    breastAssessment: {
      ...normalizeBreastAssessment(group.breastAssessment),
      reconstructionEpisodeId: episodeId,
    },
  };
}

export function applyBreastEpisodeLinkToCase(
  caseData: Case,
  episodeId: string | undefined,
  episodeSequence: number,
): Case {
  return {
    ...caseData,
    diagnosisGroups: (caseData.diagnosisGroups ?? []).map((group) =>
      applyBreastEpisodeLinkToGroup(group, episodeId),
    ),
    episodeId,
    episodeSequence: episodeId ? episodeSequence : undefined,
  };
}

export function buildBreastEpisodeUpdatePlan(
  caseData: Pick<Case, "diagnosisGroups" | "episodeId">,
  episode: TreatmentEpisode,
): Partial<TreatmentEpisode> | null {
  const target = getBreastEpisodeTarget(caseData);
  if (!target) return null;
  if (!target.assessment.reconstructionEpisodeId) return null;
  if (episode.id !== target.assessment.reconstructionEpisodeId) return null;

  return {
    title: buildBreastEpisodeTitle(target.assessment, target.diagnosisDisplay),
    laterality: target.assessment.laterality,
    status: episode.status === "planned" ? "active" : episode.status,
    breastReconstructionMeta: deriveBreastReconstructionMeta(target.assessment),
    pendingAction:
      target.assessment.lipofilling &&
      !Object.values(target.assessment.sides).some(
        (side) => side?.nippleDetails,
      )
        ? "awaiting_fat_grafting"
        : Object.values(target.assessment.sides).some(
              (side) => side?.implantDetails?.deviceType === "tissue_expander",
            )
          ? "awaiting_expander_exchange"
          : episode.pendingAction,
  };
}
