import {
  IMPLANT_CATALOGUE,
  PROCEDURE_TO_JOINT_TYPE,
} from "@/data/implantCatalogue";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import type { CaseProcedure, DigitId, Laterality } from "@/types/case";
import {
  APPROACH_LABELS,
  BEARING_LABELS,
  FIXATION_LABELS,
  JOINT_TYPE_LABELS,
  type JointImplantDetails,
  type ImplantJointType,
} from "@/types/jointImplant";

export const IMPLANT_DIGIT_LABELS: Record<DigitId, string> = {
  I: "Thumb",
  II: "Index",
  III: "Middle",
  IV: "Ring",
  V: "Little",
};

export const IMPLANT_LATERALITY_LABELS: Record<Laterality, string> = {
  left: "Left",
  right: "Right",
  bilateral: "Bilateral",
  not_applicable: "Not applicable",
};

export function isRegistryImplantLaterality(
  laterality: Laterality | undefined,
): laterality is "left" | "right" {
  return laterality === "left" || laterality === "right";
}

export interface ImplantDisplayFields {
  summary: string | null;
  system: string;
  size: string;
  fixation: string;
  approach: string;
  bearing: string;
  jointType: string;
  digit: string;
  laterality: string;
}

export function getImplantJointType(
  procedurePicklistId?: string,
): ImplantJointType | undefined {
  if (!procedurePicklistId) return undefined;
  return PROCEDURE_TO_JOINT_TYPE[procedurePicklistId];
}

export function procedureHasImplant(proc: {
  picklistEntryId?: string;
}): boolean {
  if (!proc.picklistEntryId) return false;
  return findPicklistEntry(proc.picklistEntryId)?.hasImplant ?? false;
}

export function getImplantBearingProcedures(
  procedures: CaseProcedure[],
): CaseProcedure[] {
  return procedures.filter((procedure) => procedureHasImplant(procedure));
}

function isImplantReusableForJoint(
  details: JointImplantDetails | undefined,
  jointType: ImplantJointType,
): boolean {
  if (!details) return false;
  if (details.jointType !== jointType) return false;
  if (!details.implantSystemId) return true;
  const implantEntry = IMPLANT_CATALOGUE[details.implantSystemId];
  return implantEntry?.jointTypes.includes(jointType) ?? false;
}

export function getDefaultImplantDetails(params: {
  procedurePicklistId?: string;
  diagnosisId?: string;
  diagnosisLaterality?: Laterality;
  indication?: JointImplantDetails["indication"];
  existingDetails?: JointImplantDetails;
}): JointImplantDetails | undefined {
  const {
    procedurePicklistId,
    diagnosisLaterality,
    indication = "other",
    existingDetails,
  } = params;
  const jointType = getImplantJointType(procedurePicklistId);
  if (!jointType) return undefined;

  const canReuseExisting = isImplantReusableForJoint(
    existingDetails,
    jointType,
  );
  if (canReuseExisting && existingDetails) {
    return {
      ...existingDetails,
      jointType,
      indication,
      laterality:
        existingDetails.laterality ??
        (isRegistryImplantLaterality(diagnosisLaterality)
          ? diagnosisLaterality
          : undefined),
      digit: jointType === "cmc1" ? "I" : existingDetails.digit,
    };
  }

  return {
    jointType,
    indication,
    procedureType: existingDetails?.procedureType ?? "primary",
    implantSystemId: "",
    laterality:
      existingDetails?.laterality ??
      (isRegistryImplantLaterality(diagnosisLaterality)
        ? diagnosisLaterality
        : undefined),
    digit: jointType === "cmc1" ? "I" : undefined,
  };
}

export function getImplantCompletionIssues(
  details: JointImplantDetails | undefined,
  procedurePicklistId?: string,
): string[] {
  const jointType =
    getImplantJointType(procedurePicklistId) ?? details?.jointType;
  if (!jointType) return [];

  const missing: string[] = [];
  if (!details?.implantSystemId) {
    missing.push("implant system");
    missing.push("laterality");
    if (jointType !== "cmc1") {
      missing.push("digit");
    }
    missing.push("size");
    missing.push("approach");
    missing.push("fixation");
    missing.push("bearing surface");
    return missing;
  }

  if (
    details.implantSystemId === "other" &&
    !details.implantSystemOther?.trim()
  ) {
    missing.push("implant name");
  }

  if (jointType !== "cmc1" && !details.digit) {
    missing.push("digit");
  }
  if (!isRegistryImplantLaterality(details.laterality)) {
    missing.push("laterality");
  }
  if (!details.approach) {
    missing.push("approach");
  }
  if (!details.fixation) {
    missing.push("fixation");
  }
  if (!details.bearingSurface) {
    missing.push("bearing surface");
  }

  const implantEntry = IMPLANT_CATALOGUE[details.implantSystemId];
  if (!implantEntry) return missing;

  switch (implantEntry.sizes.type) {
    case "unified":
    case "matched":
      if (implantEntry.sizes.options.length > 0 && !details.sizeUnified) {
        missing.push("size");
      }
      break;
    case "components":
      if (implantEntry.sizes.cup.length > 0 && !details.cupSize) {
        missing.push("cup size");
      }
      if (implantEntry.sizes.stem.length > 0 && !details.stemSize) {
        missing.push("stem size");
      }
      if (implantEntry.sizes.neck?.length && !details.neckVariant) {
        missing.push("neck");
      }
      if (implantEntry.sizes.liner?.length && !details.linerType) {
        missing.push("liner");
      }
      break;
  }

  return missing;
}

export function isImplantDetailsComplete(
  details: JointImplantDetails | undefined,
  procedurePicklistId?: string,
): boolean {
  return getImplantCompletionIssues(details, procedurePicklistId).length === 0;
}

export function formatImplantSize(
  details: JointImplantDetails | undefined,
): string | null {
  if (!details) return null;

  const parts: string[] = [];
  if (details.sizeUnified) {
    parts.push(`Size ${details.sizeUnified}`);
  } else {
    if (details.cupSize) parts.push(`Cup ${details.cupSize}`);
    if (details.stemSize) parts.push(`Stem ${details.stemSize}`);
  }

  if (details.neckVariant) {
    parts.push(`Neck ${details.neckVariant}`);
  }
  if (details.linerType) {
    parts.push(`Liner ${details.linerType}`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function generateImplantSummary(
  details: JointImplantDetails | undefined,
): string | null {
  if (!details?.implantSystemId) return null;

  const implant = IMPLANT_CATALOGUE[details.implantSystemId];
  const implantLabel =
    (details.implantSystemId === "other"
      ? details.implantSystemOther?.trim()
      : undefined) ??
    implant?.displayName ??
    details.implantSystemOther?.trim() ??
    "Unknown implant";

  const parts: string[] = [implantLabel];

  if (details.laterality) {
    parts.push(IMPLANT_LATERALITY_LABELS[details.laterality]);
  }
  if (details.digit) {
    parts.push(IMPLANT_DIGIT_LABELS[details.digit]);
  }

  const size = formatImplantSize(details);
  if (size) parts.push(size);
  if (details.approach) parts.push(APPROACH_LABELS[details.approach]);
  if (details.fixation) parts.push(FIXATION_LABELS[details.fixation]);
  if (details.bearingSurface)
    parts.push(BEARING_LABELS[details.bearingSurface]);
  if (details.procedureType === "revision") parts.push("Revision");

  return parts.join(" · ");
}

export function getImplantDisplayFields(
  details: JointImplantDetails | undefined,
): ImplantDisplayFields {
  return {
    summary: generateImplantSummary(details),
    system: details?.implantSystemId
      ? (IMPLANT_CATALOGUE[details.implantSystemId]?.displayName ??
        details.implantSystemOther?.trim() ??
        "Unknown implant")
      : "",
    size: formatImplantSize(details) ?? "",
    fixation: details?.fixation ? FIXATION_LABELS[details.fixation] : "",
    approach: details?.approach ? APPROACH_LABELS[details.approach] : "",
    bearing: details?.bearingSurface
      ? BEARING_LABELS[details.bearingSurface]
      : "",
    jointType: details?.jointType ? JOINT_TYPE_LABELS[details.jointType] : "",
    digit: details?.digit ? IMPLANT_DIGIT_LABELS[details.digit] : "",
    laterality: details?.laterality
      ? IMPLANT_LATERALITY_LABELS[details.laterality]
      : "",
  };
}
