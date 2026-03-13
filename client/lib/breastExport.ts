import type { DiagnosisGroup } from "@/types/case";
import type { BreastAssessmentData, BreastLaterality } from "@/types/breast";
import {
  BREAST_CLINICAL_CONTEXT_LABELS,
  BREAST_RECON_TIMING_LABELS,
  CHEST_MASC_TECHNIQUE_LABELS,
  HARVEST_TECHNIQUE_LABELS,
  IMPLANT_FILL_LABELS,
  IMPLANT_INCISION_LABELS,
  IMPLANT_PLANE_LABELS,
  IMPLANT_PROFILE_LABELS,
  IMPLANT_SHAPE_LABELS,
  IMPLANT_SURFACE_LABELS,
  LIPOFILLING_CONTEXT_LABELS,
  LIPOFILLING_INDICATION_LABELS,
  NIPPLE_RECON_TECHNIQUE_LABELS,
  PROCESSING_METHOD_LABELS,
  BREAST_RECIPIENT_ARTERY_LABELS,
} from "@/types/breast";
import { normalizeBreastAssessment } from "@/lib/breastState";
import { getImplantManufacturerLabel } from "@/lib/breastConfig";

export interface BreastSideExportData {
  clinicalContextKey?: string;
  clinicalContextLabel?: string;
  reconstructionTimingKey?: string;
  reconstructionTimingLabel?: string;
  implant?: {
    deviceType?: string;
    manufacturerId?: string;
    manufacturerLabel?: string;
    volumeCc?: number;
    surfaceLabel?: string;
    fillLabel?: string;
    shapeLabel?: string;
    profileLabel?: string;
    planeLabel?: string;
    incisionLabel?: string;
    admUsed?: boolean;
    admProduct?: string;
  };
  flap?: {
    weightGrams?: number;
    perforatorCount?: number;
    recipientArteryLabel?: string;
    couplerUsed?: boolean;
    couplerSizeMm?: number;
  };
  chestMasculinisation?: {
    techniqueLabel?: string;
    specimenWeightGrams?: number;
  };
  nipple?: {
    techniqueLabel?: string;
  };
  lipofillingVolumeMl?: number;
}

export interface BreastExportData {
  assessment: BreastAssessmentData;
  laterality: BreastAssessmentData["laterality"];
  reconstructionEpisodeId?: string;
  sides: Partial<Record<BreastLaterality, BreastSideExportData>>;
  lipofilling?: {
    harvestTechniqueLabel?: string;
    processingMethodLabel?: string;
    totalVolumeHarvestedMl?: number;
    sessionNumber?: number;
    indicationLabel?: string;
    contextLabel?: string;
  };
}

export function getBreastExportData(
  groups: DiagnosisGroup[],
): BreastExportData | undefined {
  const group = groups.find((entry) => entry.breastAssessment);
  if (!group?.breastAssessment) return undefined;

  const assessment = normalizeBreastAssessment(group.breastAssessment);
  const sides: BreastExportData["sides"] = {};

  for (const side of ["left", "right"] as const) {
    const sideData = assessment.sides[side];
    if (!sideData) continue;

    sides[side] = {
      clinicalContextKey: sideData.clinicalContext,
      clinicalContextLabel:
        BREAST_CLINICAL_CONTEXT_LABELS[sideData.clinicalContext],
      reconstructionTimingKey: sideData.reconstructionTiming,
      reconstructionTimingLabel: sideData.reconstructionTiming
        ? BREAST_RECON_TIMING_LABELS[sideData.reconstructionTiming]
        : undefined,
      implant: sideData.implantDetails
        ? {
            deviceType: sideData.implantDetails.deviceType,
            manufacturerId: sideData.implantDetails.manufacturer,
            manufacturerLabel: getImplantManufacturerLabel(
              sideData.implantDetails.manufacturer,
            ),
            volumeCc: sideData.implantDetails.volumeCc,
            surfaceLabel: sideData.implantDetails.shellSurface
              ? IMPLANT_SURFACE_LABELS[sideData.implantDetails.shellSurface]
              : undefined,
            fillLabel: sideData.implantDetails.fillMaterial
              ? IMPLANT_FILL_LABELS[sideData.implantDetails.fillMaterial]
              : undefined,
            shapeLabel: sideData.implantDetails.shape
              ? IMPLANT_SHAPE_LABELS[sideData.implantDetails.shape]
              : undefined,
            profileLabel: sideData.implantDetails.profile
              ? IMPLANT_PROFILE_LABELS[sideData.implantDetails.profile]
              : undefined,
            planeLabel: sideData.implantDetails.implantPlane
              ? IMPLANT_PLANE_LABELS[sideData.implantDetails.implantPlane]
              : undefined,
            incisionLabel: sideData.implantDetails.incisionSite
              ? IMPLANT_INCISION_LABELS[sideData.implantDetails.incisionSite]
              : undefined,
            admUsed: sideData.implantDetails.admUsed,
            admProduct: sideData.implantDetails.admDetails?.productName,
          }
        : undefined,
      flap: sideData.flapDetails
        ? {
            weightGrams: sideData.flapDetails.flapWeightGrams,
            perforatorCount: sideData.flapDetails.perforators?.length,
            recipientArteryLabel: sideData.flapDetails.recipientArtery
              ? BREAST_RECIPIENT_ARTERY_LABELS[
                  sideData.flapDetails.recipientArtery
                ]
              : undefined,
            couplerUsed: sideData.flapDetails.venousCouplerUsed,
            couplerSizeMm: sideData.flapDetails.venousCouplerSizeMm,
          }
        : undefined,
      chestMasculinisation: sideData.chestMasculinisation
        ? {
            techniqueLabel: sideData.chestMasculinisation.technique
              ? CHEST_MASC_TECHNIQUE_LABELS[
                  sideData.chestMasculinisation.technique
                ]
              : undefined,
            specimenWeightGrams:
              side === "left"
                ? sideData.chestMasculinisation.specimenWeightLeftGrams
                : sideData.chestMasculinisation.specimenWeightRightGrams,
          }
        : undefined,
      nipple: sideData.nippleDetails?.technique
        ? {
            techniqueLabel:
              NIPPLE_RECON_TECHNIQUE_LABELS[sideData.nippleDetails.technique],
          }
        : undefined,
      lipofillingVolumeMl:
        assessment.lipofilling?.injections?.[side]?.volumeInjectedMl,
    };
  }

  return {
    assessment,
    laterality: assessment.laterality,
    reconstructionEpisodeId: assessment.reconstructionEpisodeId,
    sides,
    lipofilling: assessment.lipofilling
      ? {
          harvestTechniqueLabel: assessment.lipofilling.harvestTechnique
            ? HARVEST_TECHNIQUE_LABELS[assessment.lipofilling.harvestTechnique]
            : undefined,
          processingMethodLabel: assessment.lipofilling.processingMethod
            ? PROCESSING_METHOD_LABELS[assessment.lipofilling.processingMethod]
            : undefined,
          totalVolumeHarvestedMl: assessment.lipofilling.totalVolumeHarvestedMl,
          sessionNumber: assessment.lipofilling.sessionNumber,
          indicationLabel: assessment.lipofilling.indication
            ? LIPOFILLING_INDICATION_LABELS[assessment.lipofilling.indication]
            : undefined,
          contextLabel: assessment.lipofilling.context
            ? LIPOFILLING_CONTEXT_LABELS[assessment.lipofilling.context]
            : undefined,
        }
      : undefined,
  };
}
