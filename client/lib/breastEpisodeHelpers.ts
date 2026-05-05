import type { Case, DiagnosisGroup } from "@/types/case";
import type {
  BreastAssessmentData,
  BreastReconstructionMeta,
  BreastReconPrimaryType,
} from "@/types/breast";
import type {
  TreatmentEpisode,
  EpisodeType,
  PendingAction,
} from "@/types/episode";
import { normalizeBreastAssessment } from "@/lib/breastState";

// ── Override type for surgeon-editable episode fields ────────────────────────

export interface BreastEpisodeOverrides {
  title?: string;
  episodeType?: EpisodeType;
  onsetDate?: string;
  pendingAction?: PendingAction;
  pendingActions?: PendingAction[];
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
  _diagnosisDisplay?: string,
): string {
  const lateralityLabel =
    assessment.laterality === "bilateral"
      ? "Bilat"
      : assessment.laterality === "left"
        ? "L"
        : "R";

  return `${lateralityLabel} Breast reconstruction`;
}

// ── Context-aware prompt labels ──────────────────────────────────────────────

export function getBreastEpisodePromptLabel(
  assessment: BreastAssessmentData,
  _diagnosisClinicalGroup?: string,
): { title: string; subtitle: string } {
  const subtitle = "Track stages across multiple operations";

  // Always call it "reconstruction pathway" for breast.
  // The cancer diagnosis is already captured on the case —
  // the episode tracks the reconstruction journey.
  const hasReconstructive = Object.values(assessment.sides).some(
    (s) => s?.clinicalContext === "reconstructive",
  );

  if (hasReconstructive) {
    return { title: "Start a reconstruction pathway?", subtitle };
  }
  return { title: "Start a treatment pathway?", subtitle };
}

// ── Context-aware episode type suggestion ────────────────────────────────────

export function suggestBreastEpisodeType(
  _assessment: BreastAssessmentData,
  _diagnosisClinicalGroup?: string,
): EpisodeType {
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
          pendingActions: ["awaiting_reconstruction"],
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
    Object.values(target.assessment.sides).some((side) => side?.nippleDetails)
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
      pendingActions:
        overrides?.pendingActions ??
        (overrides?.pendingAction
          ? [overrides.pendingAction]
          : autoPendingAction
            ? [autoPendingAction]
            : undefined),
      pendingAction:
        overrides?.pendingActions?.[0] ??
        overrides?.pendingAction ??
        autoPendingAction,
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

/**
 * Given the breast assessment from the case just saved, suggest
 * the next pending action for the reconstruction episode.
 * Returns undefined if no suggestion can be inferred.
 */
export function suggestNextBreastPendingAction(
  assessment: BreastAssessmentData,
): PendingAction | undefined {
  const sides = Object.values(assessment.sides).filter(Boolean);

  // Check what was done in this case
  const hasNippleRecon = sides.some((s) => s?.nippleDetails);
  const hasLipofilling = !!assessment.lipofilling;
  const hasExpander = sides.some(
    (s) =>
      s?.implantDetails?.deviceType === "tissue_expander" ||
      s?.implantDetails?.deviceType === "expander_implant",
  );
  const hasDefinitiveImplant = sides.some(
    (s) => s?.implantDetails?.deviceType === "permanent_implant",
  );
  const hasFlap = sides.some((s) => !!s?.flapDetails);

  // Nipple recon was done → tattoo or completed
  if (hasNippleRecon) {
    return "awaiting_tattoo";
  }

  // Lipofilling session → probably more fat grafting or nipple recon next
  if (hasLipofilling && !hasFlap && !hasExpander) {
    return "awaiting_nipple_recon";
  }

  // Flap done → fat grafting or nipple recon next
  if (hasFlap) {
    return "awaiting_fat_grafting";
  }

  // Definitive implant placed (exchange done) → fat grafting or nipple recon
  if (hasDefinitiveImplant && !hasExpander) {
    return "awaiting_fat_grafting";
  }

  // Expander placed → expansion in progress
  if (hasExpander) {
    return "expansion_in_progress";
  }

  // Fallback — no specific suggestion
  return "awaiting_reconstruction";
}

export function buildBreastEpisodeUpdatePlan(
  caseData: Pick<Case, "diagnosisGroups" | "episodeId">,
  episode: TreatmentEpisode,
): Partial<TreatmentEpisode> | null {
  const target = getBreastEpisodeTarget(caseData);
  if (!target) return null;
  if (!target.assessment.reconstructionEpisodeId) return null;
  if (episode.id !== target.assessment.reconstructionEpisodeId) return null;

  const suggestedAction = suggestNextBreastPendingAction(target.assessment);

  return {
    title: buildBreastEpisodeTitle(target.assessment, target.diagnosisDisplay),
    laterality: target.assessment.laterality,
    status: episode.status === "planned" ? "active" : episode.status,
    breastReconstructionMeta: deriveBreastReconstructionMeta(target.assessment),
    pendingAction: suggestedAction ?? episode.pendingAction,
    pendingActions: suggestedAction
      ? [suggestedAction]
      : episode.pendingActions,
  };
}
