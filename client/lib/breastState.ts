import type {
  BreastAssessmentData,
  BreastClinicalContext,
  BreastLaterality,
  BreastSideAssessment,
  LipofillingData,
  LipofillingInjectionSide,
} from "@/types/breast";

type LegacyLipofillingData = Partial<LipofillingData> & {
  injectionLeft?: LipofillingInjectionSide;
  injectionRight?: LipofillingInjectionSide;
};

type LegacyBreastSideAssessment = Partial<BreastSideAssessment> & {
  lipofilling?: LegacyLipofillingData;
};

type BreastAssessmentInput = Partial<BreastAssessmentData> & {
  sides?: {
    left?: LegacyBreastSideAssessment;
    right?: LegacyBreastSideAssessment;
  };
  lipofilling?: LegacyLipofillingData;
};

const ACTIVE_SIDES: Record<
  BreastAssessmentData["laterality"],
  BreastLaterality[]
> = {
  left: ["left"],
  right: ["right"],
  bilateral: ["left", "right"],
};

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value))
    return value.some((item) => hasMeaningfulValue(item));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      hasMeaningfulValue(entry),
    );
  }

  return false;
}

function normalizeLipofillingCandidate(
  value: LegacyLipofillingData | undefined,
): LipofillingData | undefined {
  if (!value) return undefined;

  const { injectionLeft, injectionRight, injections, ...rest } = value;
  const nextInjections: LipofillingData["injections"] = {
    ...(injections ?? {}),
  };

  if (injectionLeft && !nextInjections.left) {
    nextInjections.left = cloneValue(injectionLeft);
  }
  if (injectionRight && !nextInjections.right) {
    nextInjections.right = cloneValue(injectionRight);
  }

  const normalized: LipofillingData = {
    ...(cloneValue(rest) as Partial<LipofillingData>),
    ...(hasMeaningfulValue(nextInjections)
      ? { injections: nextInjections }
      : {}),
  };

  return hasMeaningfulValue(normalized) ? normalized : undefined;
}

function mergeLipofillingCandidates(
  candidates: (LegacyLipofillingData | undefined)[],
  activeSides: BreastLaterality[],
): LipofillingData | undefined {
  let merged: LipofillingData | undefined;

  for (const candidate of candidates) {
    const normalized = normalizeLipofillingCandidate(candidate);
    if (!normalized) continue;

    if (!merged) {
      merged = cloneValue(normalized);
      continue;
    }

    const { injections, ...sharedFields } = normalized;
    for (const [key, rawValue] of Object.entries(sharedFields)) {
      const value = rawValue as LipofillingData[keyof LipofillingData];
      if (
        (merged as Record<string, unknown>)[key] === undefined &&
        value !== undefined
      ) {
        (merged as Record<string, unknown>)[key] = cloneValue(value);
      }
    }

    if (injections) {
      merged.injections = merged.injections ?? {};
      for (const side of ["left", "right"] as const) {
        if (!merged.injections[side] && injections[side]) {
          merged.injections[side] = cloneValue(injections[side]);
        }
      }
    }
  }

  if (!merged) return undefined;

  if (merged.injections) {
    for (const side of ["left", "right"] as const) {
      if (!activeSides.includes(side)) {
        delete merged.injections[side];
      }
    }
    if (!hasMeaningfulValue(merged.injections)) {
      delete merged.injections;
    }
  }

  return hasMeaningfulValue(merged) ? merged : undefined;
}

function normalizeBreastSide(
  side: BreastLaterality,
  value: LegacyBreastSideAssessment | undefined,
  defaultClinicalContext: BreastClinicalContext,
): BreastSideAssessment {
  const { lipofilling: _legacyLipofilling, ...rest } = value ?? {};

  return {
    ...(cloneValue(rest) as Partial<BreastSideAssessment>),
    side,
    clinicalContext: value?.clinicalContext ?? defaultClinicalContext,
  };
}

export function getBreastAssessmentActiveSides(
  laterality: BreastAssessmentData["laterality"],
): BreastLaterality[] {
  return [...ACTIVE_SIDES[laterality]];
}

export function createEmptyBreastSide(
  side: BreastLaterality,
  clinicalContext: BreastClinicalContext = "reconstructive",
): BreastSideAssessment {
  return {
    side,
    clinicalContext,
  };
}

export function createEmptyBreastAssessment(
  laterality: BreastAssessmentData["laterality"] = "left",
  clinicalContext: BreastClinicalContext = "reconstructive",
): BreastAssessmentData {
  const sides: BreastAssessmentData["sides"] = {};

  for (const side of getBreastAssessmentActiveSides(laterality)) {
    sides[side] = createEmptyBreastSide(side, clinicalContext);
  }

  return {
    laterality,
    sides,
  };
}

export function normalizeBreastAssessment(
  value: BreastAssessmentInput | undefined,
  defaultClinicalContext: BreastClinicalContext = "reconstructive",
): BreastAssessmentData {
  const laterality = value?.laterality ?? "left";
  const activeSides = getBreastAssessmentActiveSides(laterality);
  const sides: BreastAssessmentData["sides"] = {};

  for (const side of activeSides) {
    sides[side] = normalizeBreastSide(
      side,
      value?.sides?.[side],
      defaultClinicalContext,
    );
  }

  const lipofilling = mergeLipofillingCandidates(
    [
      value?.lipofilling,
      value?.sides?.left?.lipofilling,
      value?.sides?.right?.lipofilling,
    ],
    activeSides,
  );

  return {
    laterality,
    sides,
    reconstructionEpisodeId: value?.reconstructionEpisodeId,
    ...(lipofilling ? { lipofilling } : {}),
    ...(hasMeaningfulValue(value?.liposuction)
      ? { liposuction: cloneValue(value?.liposuction) }
      : {}),
  };
}

export function isBreastSideEmpty(
  side: BreastSideAssessment | undefined,
): boolean {
  if (!side) return true;

  const { side: _side, clinicalContext: _clinicalContext, ...rest } = side;

  return !hasMeaningfulValue(rest);
}

export function copyBreastSide(
  source: BreastSideAssessment,
  targetSide: BreastLaterality,
): BreastSideAssessment {
  return {
    ...cloneValue(source),
    side: targetSide,
  };
}
