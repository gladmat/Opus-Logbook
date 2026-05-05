/**
 * Breast Surgery Module — Configuration & Activation
 *
 * Activation check, clinical context resolution, module visibility rules,
 * implant manufacturer lists, ADM product lists.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type { ProcedurePicklistEntry } from "@/lib/procedurePicklist";
import type {
  BreastAssessmentData,
  BreastClinicalContext,
  BreastLaterality,
  BreastSideAssessment,
  LipofillingData,
  ImplantDetailsData,
  BreastFlapDetailsData,
  LiposuctionData,
  ChestMasculinisationData,
} from "@/types/breast";

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY STRING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

import {
  IMPLANT_PLANE_LABELS,
  IMPLANT_SHAPE_LABELS,
  IMA_INTERSPACE_LABELS,
  CHEST_MASC_TECHNIQUE_LABELS,
  NAC_MANAGEMENT_LABELS,
  BREAST_CLINICAL_CONTEXT_LABELS,
  BREAST_RECON_TIMING_LABELS,
  NIPPLE_RECON_TECHNIQUE_LABELS,
} from "@/types/breast";

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns true if the breast module should activate for this specialty.
 * The breast module activates on specialty, not diagnosis metadata
 * (unlike skin cancer which activates on diagnosis).
 */
export function isBreastSpecialty(specialty: string): boolean {
  return specialty === "breast";
}

/**
 * Infer the clinical context for a breast side from the selected diagnosis.
 */
export function getBreastClinicalContext(
  diagnosisEntry?: DiagnosisPicklistEntry,
): BreastClinicalContext {
  if (!diagnosisEntry) return "reconstructive";
  if (diagnosisEntry.clinicalGroup === "gender_affirming")
    return "gender_affirming";
  if (diagnosisEntry.clinicalGroup === "aesthetic") return "aesthetic";
  return "reconstructive";
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT → DIAGNOSIS FILTERING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps each clinical context to the clinicalGroup values it should show.
 * Reconstructive includes oncological, reconstructive, and congenital diagnoses.
 */
const CONTEXT_TO_CLINICAL_GROUPS: Record<BreastClinicalContext, string[]> = {
  reconstructive: ["oncological", "reconstructive", "congenital"],
  aesthetic: ["elective"],
  gender_affirming: ["gender_affirming"],
};

const BREAST_SUBCATEGORY_ORDER = [
  "Oncological",
  "Reconstruction",
  "Implant Complications",
  "Aesthetic / Functional",
  "Gender-Affirming",
  "Post-Treatment",
  "Congenital & Other",
] as const;

const CONTEXT_PRIORITY_SUBCATEGORIES: Record<BreastClinicalContext, string[]> =
  {
    reconstructive: ["Oncological", "Reconstruction"],
    aesthetic: ["Aesthetic / Functional", "Implant Complications"],
    gender_affirming: ["Gender-Affirming"],
  };

function getActiveBreastSides(
  laterality: BreastAssessmentData["laterality"],
): BreastLaterality[] {
  if (laterality === "bilateral") return ["left", "right"];
  return [laterality];
}

function getTimingShortLabel(timing: string | undefined): string {
  if (!timing) return "";
  return (
    BREAST_RECON_TIMING_LABELS[
      timing as keyof typeof BREAST_RECON_TIMING_LABELS
    ]?.split(" (")[0] ?? timing
  );
}

function uniqInOrder<T>(values: T[]): T[] {
  const seen = new Set<T>();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function getBreastAssessmentContextOrder(
  assessment: BreastAssessmentData | undefined,
): BreastClinicalContext[] {
  if (!assessment) return [];

  return uniqInOrder(
    getActiveBreastSides(assessment.laterality)
      .map((side) => assessment.sides[side]?.clinicalContext)
      .filter((context): context is BreastClinicalContext => !!context),
  );
}

export function getBreastDiagnosisBuckets(
  assessment: BreastAssessmentData | undefined,
): {
  prioritizedSubcategories: string[];
  overflowSubcategories: string[];
} {
  const contexts = getBreastAssessmentContextOrder(assessment);
  if (contexts.length === 0) {
    return {
      prioritizedSubcategories: [...BREAST_SUBCATEGORY_ORDER],
      overflowSubcategories: [],
    };
  }

  const prioritizedSubcategories = uniqInOrder(
    contexts.flatMap((context) => CONTEXT_PRIORITY_SUBCATEGORIES[context]),
  );

  if (
    contexts.length === 1 &&
    prioritizedSubcategories.length === 1 &&
    prioritizedSubcategories[0] === "Gender-Affirming"
  ) {
    return {
      prioritizedSubcategories,
      overflowSubcategories: [],
    };
  }

  return {
    prioritizedSubcategories,
    overflowSubcategories: BREAST_SUBCATEGORY_ORDER.filter(
      (subcategory) => !prioritizedSubcategories.includes(subcategory),
    ),
  };
}

export function getBreastAssessmentSummaryParts(
  assessment: BreastAssessmentData | undefined,
): string[] {
  if (!assessment) return [];

  const activeSides = getActiveBreastSides(assessment.laterality);
  const sideEntries = activeSides
    .map((side) => {
      const sideData = assessment.sides[side];
      if (!sideData) return null;

      return {
        side,
        context: sideData.clinicalContext,
        timing:
          sideData.clinicalContext === "reconstructive"
            ? getTimingShortLabel(sideData.reconstructionTiming)
            : "",
      };
    })
    .filter(Boolean) as {
    side: BreastLaterality;
    context: BreastClinicalContext;
    timing: string;
  }[];

  if (sideEntries.length === 0) return [];

  if (assessment.laterality !== "bilateral") {
    const entry = sideEntries[0]!;
    const label = entry.side === "left" ? "Left" : "Right";
    const parts = [label, BREAST_CLINICAL_CONTEXT_LABELS[entry.context]];
    if (entry.timing) parts.push(entry.timing);
    return parts;
  }

  const contextLabels = uniqInOrder(
    sideEntries.map((entry) => BREAST_CLINICAL_CONTEXT_LABELS[entry.context]),
  );
  const timingLabels = uniqInOrder(
    sideEntries.map((entry) => entry.timing).filter(Boolean),
  );
  const timedEntries = sideEntries.filter((entry) => entry.timing);

  const parts = ["Bilateral"];

  if (contextLabels.length === 1) {
    parts.push(contextLabels[0]!);
  } else {
    for (const entry of sideEntries) {
      parts.push(
        `${entry.side === "left" ? "L" : "R"}: ${BREAST_CLINICAL_CONTEXT_LABELS[entry.context]}`,
      );
    }
  }

  if (
    timedEntries.length === sideEntries.length &&
    timingLabels.length === 1 &&
    timingLabels[0]
  ) {
    parts.push(timingLabels[0]);
  } else {
    for (const entry of timedEntries) {
      if (!entry.timing) continue;
      parts.push(`${entry.side === "left" ? "L" : "R"}: ${entry.timing}`);
    }
  }

  return parts;
}

export function getBreastAssessmentSummary(
  assessment: BreastAssessmentData | undefined,
): string {
  return getBreastAssessmentSummaryParts(assessment).join(" · ");
}

/**
 * Filter breast diagnoses by clinical context.
 * Returns diagnoses whose clinicalGroup matches the selected context,
 * plus any crossContextVisible diagnoses (except in gender_affirming context).
 */
export function getBreastDiagnosesForContext(
  context: BreastClinicalContext,
  allDiagnoses: DiagnosisPicklistEntry[],
): DiagnosisPicklistEntry[] {
  const groups = CONTEXT_TO_CLINICAL_GROUPS[context];
  return allDiagnoses.filter(
    (d) =>
      groups.includes(d.clinicalGroup ?? "") ||
      (d.crossContextVisible === true && context !== "gender_affirming"),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE VISIBILITY — which specialty cards to show per procedure
// ═══════════════════════════════════════════════════════════════════════════════

export interface BreastModuleFlags {
  showImplantDetails: boolean;
  showBreastFlapDetails: boolean;
  showPedicledFlapDetails: boolean;
  showLipofilling: boolean;
  showChestMasculinisation: boolean;
  showNippleDetails: boolean;
}

export interface BreastSideVisibility extends BreastModuleFlags {
  showReconstructiveFields: boolean;
  showReconstructionEpisode: boolean;
  showGenderAffirmingContext: boolean;
}

/**
 * Determine which breast specialty modules to show based on selected procedures.
 * These flags are shared across the whole breast group.
 */
export function getBreastModuleFlags(
  procedures: ProcedurePicklistEntry[],
): BreastModuleFlags {
  const tags = new Set(procedures.flatMap((p) => p.tags ?? []));
  const ids = new Set(procedures.map((p) => p.id));

  const hasImplantProc =
    ids.has("breast_aes_augmentation_implant") ||
    ids.has("breast_impl_dti") ||
    ids.has("breast_impl_expander_insertion") ||
    ids.has("breast_impl_expander_to_implant") ||
    ids.has("breast_impl_adm_assisted") ||
    ids.has("breast_impl_prepectoral") ||
    ids.has("breast_impl_combined_autologous") ||
    ids.has("breast_ga_augmentation_transfem") ||
    ids.has("breast_rev_implant_exchange") ||
    ids.has("breast_rev_capsulectomy_total") ||
    ids.has("breast_rev_capsulectomy_en_bloc") ||
    ids.has("breast_rev_implant_removal");

  const hasFreeFlap = tags.has("free_flap") || tags.has("microsurgery");
  const hasPedicledFlap = tags.has("pedicled_flap") && !hasFreeFlap;
  const hasLipofilling =
    tags.has("lipofilling") ||
    [...ids].some((id) => id.startsWith("breast_fat_"));
  const hasChestMasc = [...ids].some((id) =>
    id.startsWith("breast_ga_chest_masc"),
  );
  const hasNipple =
    ids.has("breast_nipple_reconstruction") ||
    ids.has("breast_nipple_tattooing") ||
    ids.has("breast_nipple_inverted_correction");

  return {
    showImplantDetails: hasImplantProc,
    showBreastFlapDetails: hasFreeFlap,
    showPedicledFlapDetails: hasPedicledFlap,
    showLipofilling: hasLipofilling,
    showChestMasculinisation: hasChestMasc,
    showNippleDetails: hasNipple,
  };
}

/**
 * Returns true if at least one breast module-specific card should render.
 * Used to gate BreastAssessment rendering until procedures are selected.
 */
export function hasAnyBreastModuleFlag(flags: BreastModuleFlags): boolean {
  return (
    flags.showImplantDetails ||
    flags.showBreastFlapDetails ||
    flags.showPedicledFlapDetails ||
    flags.showLipofilling ||
    flags.showChestMasculinisation ||
    flags.showNippleDetails
  );
}

/**
 * Returns true if a breast assessment has existing data (edit mode preservation).
 * Prevents hiding BreastAssessment when loading a saved case.
 */
export function hasExistingBreastData(
  assessment: BreastAssessmentData | undefined,
): boolean {
  if (!assessment?.sides) return false;
  return !!(assessment.sides.left || assessment.sides.right);
}

export function getBreastSideVisibility(
  side: BreastSideAssessment | undefined,
  moduleFlags: BreastModuleFlags,
): BreastSideVisibility {
  const clinicalContext = side?.clinicalContext;
  const showReconstructiveFields = clinicalContext === "reconstructive";
  const showGenderAffirmingContext = clinicalContext === "gender_affirming";

  return {
    ...moduleFlags,
    showReconstructiveFields,
    showReconstructionEpisode: showReconstructiveFields,
    showGenderAffirmingContext,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETION CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface BreastCompletionStatus {
  lateralityComplete: boolean;
  contextComplete: boolean;
  implantComplete: boolean;
  flapComplete: boolean;
  lipofillingComplete: boolean;
  chestMascComplete: boolean;
  nippleComplete: boolean;
  overallPercentage: number;
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

export function calculateBreastCompletion(
  side: BreastSideAssessment | undefined,
  visibility: BreastSideVisibility,
  lipofilling: LipofillingData | undefined,
): BreastCompletionStatus {
  if (!side) {
    return {
      lateralityComplete: false,
      contextComplete: false,
      implantComplete: false,
      flapComplete: false,
      lipofillingComplete: false,
      chestMascComplete: false,
      nippleComplete: false,
      overallPercentage: 0,
    };
  }

  const lateralityComplete = true; // Side exists, so laterality was selected
  const contextComplete =
    !!side.clinicalContext &&
    (!visibility.showReconstructiveFields || !!side.reconstructionTiming) &&
    (!visibility.showGenderAffirmingContext ||
      hasMeaningfulValue(side.genderAffirmingContext));

  const implantComplete =
    !visibility.showImplantDetails ||
    (!!side.implantDetails?.deviceType && !!side.implantDetails?.implantPlane);

  const flapComplete =
    (!visibility.showBreastFlapDetails &&
      !visibility.showPedicledFlapDetails) ||
    (visibility.showBreastFlapDetails
      ? hasMeaningfulValue(side.flapDetails)
      : hasMeaningfulValue(side.flapDetails));

  const lipofillingComplete =
    !visibility.showLipofilling ||
    (!!lipofilling &&
      hasMeaningfulValue(lipofilling.harvestSites) &&
      !!lipofilling.injections?.[side.side]?.volumeInjectedMl);

  const chestMascComplete =
    !visibility.showChestMasculinisation ||
    !!side.chestMasculinisation?.technique;

  const nippleComplete =
    !visibility.showNippleDetails ||
    !!side.nippleDetails?.technique ||
    hasMeaningfulValue(side.nippleDetails?.nacPosition);

  const sections = [
    lateralityComplete,
    contextComplete,
    implantComplete,
    flapComplete,
    lipofillingComplete,
    chestMascComplete,
    nippleComplete,
  ];
  const complete = sections.filter(Boolean).length;
  const overallPercentage = Math.round((complete / sections.length) * 100);

  return {
    lateralityComplete,
    contextComplete,
    implantComplete,
    flapComplete,
    lipofillingComplete,
    chestMascComplete,
    nippleComplete,
    overallPercentage,
  };
}

/**
 * One-line implant summary for card headers.
 * e.g. "350cc Allergan Round Dual Plane"
 */
export function getImplantSummary(
  data: ImplantDetailsData | undefined,
): string {
  if (!data) return "";
  const parts: string[] = [];
  if (data.volumeCc) parts.push(`${data.volumeCc}cc`);
  if (data.manufacturer) {
    const mfr = IMPLANT_MANUFACTURERS.find((m) => m.id === data.manufacturer);
    parts.push(mfr ? mfr.label.split(" (")[0]! : data.manufacturer);
  }
  if (data.shape) parts.push(IMPLANT_SHAPE_LABELS[data.shape]);
  if (data.implantPlane) parts.push(IMPLANT_PLANE_LABELS[data.implantPlane]);
  return parts.join(" ");
}

export function getImplantManufacturerLabel(
  manufacturerId: string | undefined,
): string {
  if (!manufacturerId) return "";
  const manufacturer = IMPLANT_MANUFACTURERS.find(
    (entry) => entry.id === manufacturerId,
  );

  return manufacturer
    ? (manufacturer.label.split(" (")[0] ?? manufacturer.label)
    : manufacturerId;
}

/**
 * One-line flap summary for card headers.
 * e.g. "2 perforators, IMA 3rd Interspace, coupler 2.8mm, 485g"
 */
export function getFlapSummary(
  data: BreastFlapDetailsData | undefined,
): string {
  if (!data) return "";
  const parts: string[] = [];
  const perfCount = data.perforators?.length ?? 0;
  if (perfCount > 0)
    parts.push(`${perfCount} perforator${perfCount > 1 ? "s" : ""}`);
  if (data.imaInterspace) {
    parts.push(`IMA ${IMA_INTERSPACE_LABELS[data.imaInterspace]}`);
  }
  if (data.flapWeightGrams) parts.push(`${data.flapWeightGrams}g`);
  return parts.join(", ");
}

/**
 * One-line lipofilling summary for card headers.
 * e.g. "2 sites, 120ml harvested, 80ml injected (L)"
 */
export function getLipofillingSummary(
  data: LipofillingData | undefined,
): string {
  if (!data) return "";
  const parts: string[] = [];
  const siteCount = data.harvestSites?.length ?? 0;
  if (siteCount > 0) parts.push(`${siteCount} site${siteCount > 1 ? "s" : ""}`);
  if (data.totalVolumeHarvestedMl)
    parts.push(`${data.totalVolumeHarvestedMl}ml harvested`);
  const leftVol = data.injections?.left?.volumeInjectedMl;
  const rightVol = data.injections?.right?.volumeInjectedMl;
  if (leftVol && rightVol) {
    parts.push(`${leftVol}ml (L), ${rightVol}ml (R)`);
  } else if (leftVol) {
    parts.push(`${leftVol}ml injected (L)`);
  } else if (rightVol) {
    parts.push(`${rightVol}ml injected (R)`);
  }
  return parts.join(", ");
}

/**
 * One-line liposuction summary for card headers.
 * e.g. "2 areas, 450ml"
 */
export function getLiposuctionSummary(
  data: LiposuctionData | undefined,
): string {
  if (!data) return "";
  const parts: string[] = [];
  const areaCount = data.areas?.length ?? 0;
  if (areaCount > 0) parts.push(`${areaCount} area${areaCount > 1 ? "s" : ""}`);
  const totalMl =
    data.totalAspirateMl ??
    (data.areas ?? []).reduce((sum, a) => sum + (a.volumeAspirateMl ?? 0), 0);
  if (totalMl > 0) parts.push(`${totalMl}ml`);
  return parts.join(", ");
}

/**
 * One-line chest masculinisation summary for card headers.
 * e.g. "Double incision + FNG, L 320g R 310g"
 */
export function getChestMascSummary(
  data: ChestMasculinisationData | undefined,
): string {
  if (!data) return "";
  const parts: string[] = [];
  if (data.technique) {
    // Use a shorter label for the summary
    const shortLabels: Partial<Record<string, string>> = {
      double_incision_fng: "Double incision + FNG",
      periareolar: "Periareolar",
      keyhole: "Keyhole",
      inverted_t: "Inverted-T",
      buttonhole: "Buttonhole",
    };
    parts.push(
      shortLabels[data.technique] ??
        CHEST_MASC_TECHNIQUE_LABELS[data.technique],
    );
  }
  if (data.nacManagement && data.nacManagement !== "not_applicable") {
    parts.push(NAC_MANAGEMENT_LABELS[data.nacManagement]);
  }
  const leftW = data.specimenWeightLeftGrams;
  const rightW = data.specimenWeightRightGrams;
  if (leftW && rightW) {
    parts.push(`L ${leftW}g R ${rightW}g`);
  } else if (leftW) {
    parts.push(`L ${leftW}g`);
  } else if (rightW) {
    parts.push(`R ${rightW}g`);
  }
  return parts.join(", ");
}

export function getNippleSummary(
  data: BreastSideAssessment["nippleDetails"],
): string {
  if (!data) return "";
  const parts: string[] = [];
  if (data.technique) {
    parts.push(NIPPLE_RECON_TECHNIQUE_LABELS[data.technique]);
  }
  if (data.nacPosition?.xCm != null || data.nacPosition?.yCm != null) {
    parts.push("Position marked");
  }
  return parts.join(", ");
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREDEFINED PRODUCT LISTS
// ═══════════════════════════════════════════════════════════════════════════════

export const IMPLANT_MANUFACTURERS = [
  { id: "allergan", label: "Allergan (Natrelle)" },
  { id: "mentor", label: "Mentor (Johnson & Johnson)" },
  { id: "sientra", label: "Sientra" },
  { id: "motiva", label: "Motiva (Establishment Labs)" },
  { id: "polytech", label: "Polytech" },
  { id: "sebbin", label: "Sebbin" },
  { id: "eurosilicone", label: "Eurosilicone" },
  { id: "gc_aesthetics", label: "GC Aesthetics (Nagor)" },
  { id: "hansbiomed", label: "Hans Biomed" },
  { id: "ideal_implant", label: "IDEAL Implant" },
  { id: "other", label: "Other" },
] as const;

export const ADM_PRODUCTS = [
  {
    id: "alloderm",
    label: "AlloDerm (Allergan)",
    origin: "human_allograft" as const,
  },
  {
    id: "flexhd",
    label: "FlexHD (MTF Biologics)",
    origin: "human_allograft" as const,
  },
  {
    id: "strattice",
    label: "Strattice (Allergan)",
    origin: "porcine_xenograft" as const,
  },
  {
    id: "surgimend",
    label: "SurgiMend (Integra)",
    origin: "bovine_xenograft" as const,
  },
  {
    id: "tigr_matrix",
    label: "TIGR Matrix",
    origin: "synthetic_absorbable" as const,
  },
  {
    id: "galaflex",
    label: "GalaFLEX (Galatea)",
    origin: "synthetic_absorbable" as const,
  },
  {
    id: "tiloop_bra",
    label: "TiLOOP Bra (pfm medical)",
    origin: "synthetic_nonabsorbable" as const,
  },
  {
    id: "phasix",
    label: "Phasix ST (Bard/BD)",
    origin: "synthetic_absorbable" as const,
  },
  { id: "other", label: "Other" },
] as const;
