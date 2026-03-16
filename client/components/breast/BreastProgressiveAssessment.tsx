import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, LayoutAnimation, StyleSheet } from "react-native";
import { v4 as uuidv4 } from "uuid";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { FavouritesRecentsChips } from "@/components/FavouritesRecentsChips";
import { PickerField } from "@/components/FormField";
import { CompactProcedureList } from "@/components/CompactProcedureList";
import { ProcedureEntryCard } from "@/components/ProcedureEntryCard";
import { ProcedureSubcategoryPicker } from "@/components/ProcedureSubcategoryPicker";
import { SnomedSearchPicker } from "@/components/SnomedSearchPicker";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { useTheme } from "@/hooks/useTheme";
import { useFavouritesRecents } from "@/hooks/useFavouritesRecents";
import { BorderRadius, Spacing } from "@/constants/theme";
import { evaluateSuggestions, getDiagnosesForSpecialty } from "@/lib/diagnosisPicklists";
import {
  getBreastAssessmentSummary,
  getBreastAssessmentSummaryParts,
  getBreastDiagnosisBuckets,
  getChestMascSummary,
  getFlapSummary,
  getImplantSummary,
  getLipofillingSummary,
  getLiposuctionSummary,
  getNippleSummary,
  type BreastModuleFlags,
} from "@/lib/breastConfig";
import {
  copyBreastSide,
  getBreastAssessmentActiveSides,
  isBreastSideEmpty,
  normalizeBreastAssessment,
} from "@/lib/breastState";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type { DiagnosisStagingConfig } from "@/lib/snomedApi";
import type {
  BreastAssessmentData,
  BreastClinicalContext,
  BreastLaterality,
  BreastSideAssessment,
} from "@/types/breast";
import type { CaseProcedure, FreeFlapDetails } from "@/types/case";
import { procedureHasFreeFlap } from "@/lib/moduleVisibility";
import { BreastSideCard } from "./BreastSideCard";
import { BreastFlapCard } from "./BreastFlapCard";
import { BreastSummaryPanel } from "./BreastSummaryPanel";
import { ChestMasculinisationCard } from "./ChestMasculinisationCard";
import { ImplantDetailsCard } from "./ImplantDetailsCard";
import { LipofillingCard } from "./LipofillingCard";
import { LiposuctionCard } from "./LiposuctionCard";
import { NippleDetailsCard } from "./NippleDetailsCard";

interface BreastProgressiveAssessmentProps {
  assessment: BreastAssessmentData;
  onAssessmentChange: (assessment: BreastAssessmentData) => void;
  defaultClinicalContext?: BreastClinicalContext;
  hasPersistedAssessment: boolean;
  isTransmasculine?: boolean;
  breastPreferences?: import("@/types/surgicalPreferences").BreastPreferences;
  selectedDiagnosis: DiagnosisPicklistEntry | null;
  primaryDiagnosis: { conceptId: string; term: string } | null;
  diagnosisStaging: DiagnosisStagingConfig | null;
  stagingValues: Record<string, string>;
  onDiagnosisSelect: (diagnosis: DiagnosisPicklistEntry) => void;
  onSnomedDiagnosisSelect: (
    diagnosis: { conceptId: string; term: string } | null,
  ) => void;
  onDiagnosisClear: () => void;
  onStagingChange: (systemName: string, value: string) => void;
  committedProcedures: CaseProcedure[];
  hasAcceptedMapping: boolean;
  onCommittedProceduresChange: (procedures: CaseProcedure[]) => void;
  createProcedureFromPicklistId: (picklistId: string) => CaseProcedure | undefined;
  histologyPending?: boolean;
  onHistologyPendingChange?: (pending: boolean) => void;
  showHistologyToggle?: boolean;
  /** When true, suppresses inline BreastFlapCard for free flap cases (handled by hub row FreeFlapSheet) */
  suppressFreeFlap?: boolean;
}

const EMPTY_MODULE_FLAGS: BreastModuleFlags = {
  showImplantDetails: false,
  showBreastFlapDetails: false,
  showPedicledFlapDetails: false,
  showLipofilling: false,
  showChestMasculinisation: false,
  showNippleDetails: false,
};

const CATEGORY_LABELS: Record<string, string> = {
  Oncological: "ONCOLOGICAL",
  Reconstruction: "RECONSTRUCTION",
  "Implant Complications": "IMPLANT COMPLICATIONS",
  "Aesthetic / Functional": "AESTHETIC / FUNCTIONAL",
  "Gender-Affirming": "GENDER-AFFIRMING",
  "Post-Treatment": "POST-TREATMENT",
  "Congenital & Other": "CONGENITAL & OTHER",
};

function cloneProcedures(procedures: CaseProcedure[]): CaseProcedure[] {
  if (typeof structuredClone === "function") {
    return structuredClone(procedures);
  }
  return JSON.parse(JSON.stringify(procedures)) as CaseProcedure[];
}

function normalizeDraftProcedures(procedures: CaseProcedure[]): CaseProcedure[] {
  return procedures.map((procedure, index) => ({
    ...procedure,
    sequenceOrder: index + 1,
  }));
}

function getNamedProcedures(procedures: CaseProcedure[]): CaseProcedure[] {
  return normalizeDraftProcedures(
    procedures.filter((procedure) => procedure.procedureName.trim().length > 0),
  );
}

/**
 * Expand bilateral free flap procedures into one entry per side.
 * Stacked DIEP (two flaps → same breast) is NOT split.
 * Non-flap procedures pass through unchanged.
 */
function expandBilateralFreeFlaps(
  procedures: CaseProcedure[],
  activeSides: BreastLaterality[],
): CaseProcedure[] {
  const result: CaseProcedure[] = [];

  for (const proc of procedures) {
    if (!procedureHasFreeFlap(proc)) {
      result.push(proc);
      continue;
    }

    // Stacked / bipedicled: two flaps to same breast — do NOT split per side
    if (proc.picklistEntryId === "breast_recon_stacked") {
      result.push(proc);
      continue;
    }

    // Also detect stacked via flapSpecificDetails config
    const details = proc.clinicalDetails as FreeFlapDetails | undefined;
    if (
      details?.flapSpecificDetails?.diepFlapConfiguration === "stacked" ||
      details?.flapSpecificDetails?.diepFlapConfiguration === "conjoined_double_pedicle" ||
      details?.flapSpecificDetails?.diepFlapConfiguration === "bipedicled"
    ) {
      result.push(proc);
      continue;
    }

    // Standard bilateral: one procedure entry per side
    for (const side of activeSides) {
      // For standard bilateral DIEP: harvest from same side as target breast
      const harvestSide: "left" | "right" = side as "left" | "right";
      result.push({
        ...proc,
        id: side === activeSides[0] ? proc.id : uuidv4(),
        laterality: side as "left" | "right",
        clinicalDetails: details
          ? { ...details, harvestSide }
          : undefined,
      });
    }
  }

  return normalizeDraftProcedures(result);
}

/**
 * Collapse laterality-tagged bilateral procedure pairs back to a single
 * draft entry for editing. Keeps the first (left) entry's data.
 */
function collapseBilateralFreeFlaps(
  procedures: CaseProcedure[],
): CaseProcedure[] {
  const seenFlaps = new Set<string>();
  const result: CaseProcedure[] = [];

  for (const proc of procedures) {
    if (proc.laterality && proc.picklistEntryId && procedureHasFreeFlap(proc)) {
      if (seenFlaps.has(proc.picklistEntryId)) {
        // Skip the second laterality copy — already represented by the first
        continue;
      }
      seenFlaps.add(proc.picklistEntryId);
      // Strip laterality for draft editing
      result.push({ ...proc, laterality: undefined });
    } else {
      result.push(proc);
    }
  }
  return normalizeDraftProcedures(result);
}

function getBreastSectionSummaryText(
  assessment: BreastAssessmentData,
  summaryBuilder: (value: any) => string,
  activeSides: BreastLaterality[],
  options?: { valueKey?: keyof BreastSideAssessment; includeEmptySides?: boolean },
): string {
  const includeEmptySides = options?.includeEmptySides ?? true;
  const valueKey = options?.valueKey;
  const parts = activeSides
    .map((side) => {
      const sideData = assessment.sides[side];
      if (!sideData) return "";
      const summary = summaryBuilder(
        valueKey ? sideData[valueKey] : sideData.implantDetails,
      );
      if (!summary) {
        return includeEmptySides ? "" : "";
      }
      return `${side === "left" ? "L" : "R"}: ${summary}`;
    })
    .filter(Boolean);

  return parts.join(" · ");
}

function findProcedureIndexByPicklistId(
  procedures: CaseProcedure[],
  picklistId: string,
): number {
  return procedures.findIndex((procedure) => procedure.picklistEntryId === picklistId);
}

export function BreastProgressiveAssessment({
  assessment: rawAssessment,
  onAssessmentChange,
  defaultClinicalContext,
  hasPersistedAssessment,
  isTransmasculine,
  breastPreferences,
  selectedDiagnosis,
  primaryDiagnosis,
  diagnosisStaging,
  stagingValues,
  onDiagnosisSelect,
  onSnomedDiagnosisSelect,
  onDiagnosisClear,
  onStagingChange,
  committedProcedures,
  hasAcceptedMapping,
  onCommittedProceduresChange,
  createProcedureFromPicklistId,
  histologyPending,
  onHistologyPendingChange,
  showHistologyToggle,
  suppressFreeFlap,
}: BreastProgressiveAssessmentProps) {
  const { theme } = useTheme();
  const assessment = useMemo(
    () => normalizeBreastAssessment(rawAssessment, defaultClinicalContext),
    [defaultClinicalContext, rawAssessment],
  );
  const activeSides = useMemo(
    () => getBreastAssessmentActiveSides(assessment.laterality),
    [assessment.laterality],
  );
  const diagnosisLabel = selectedDiagnosis?.displayName ?? primaryDiagnosis?.term ?? "";
  const diagnosisCode = selectedDiagnosis?.snomedCtCode ?? primaryDiagnosis?.conceptId;
  const diagnosisKey = selectedDiagnosis?.id ?? primaryDiagnosis?.conceptId ?? "";
  const allBreastDiagnoses = useMemo(
    () => getDiagnosesForSpecialty("breast"),
    [],
  );

  const {
    favouriteDiagnoses,
    recentDiagnoses,
    isFavourite,
    toggleFavourite,
    loaded: favouritesLoaded,
  } = useFavouritesRecents("breast");

  const [lateralityConfirmed, setLateralityConfirmed] = useState(true);
  const [showAllDiagnoses, setShowAllDiagnoses] = useState(false);
  const [showSnomedSearch, setShowSnomedSearch] = useState(false);
  const [showFullProcedurePicker, setShowFullProcedurePicker] = useState(false);
  const [draftProcedures, setDraftProcedures] = useState<CaseProcedure[]>([]);
  const [draftDirty, setDraftDirty] = useState(false);
  const [activeCustomProcedureId, setActiveCustomProcedureId] = useState<
    string | null
  >(null);
  const [pickerSelectionId, setPickerSelectionId] = useState<string | undefined>(
    undefined,
  );
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(
    {},
  );

  const prevAssessmentCompleteRef = useRef(false);
  const prevDiagnosisKeyRef = useRef(diagnosisKey);
  const prevAcceptedRef = useRef(hasAcceptedMapping);

  const setSectionCollapsed = useCallback((key: string, collapsed: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections((current) => ({ ...current, [key]: collapsed }));
  }, []);

  const isSectionCollapsed = useCallback(
    (key: string) => collapsedSections[key] ?? false,
    [collapsedSections],
  );

  const canShowDiagnosisSection = lateralityConfirmed && activeSides.length > 0;

  const isAssessmentComplete = useMemo(
    () =>
      lateralityConfirmed &&
      activeSides.every((side) => {
        const sideData = assessment.sides[side];
        if (!sideData?.clinicalContext) return false;
        if (
          sideData.clinicalContext === "reconstructive" &&
          !sideData.reconstructionTiming
        ) {
          return false;
        }
        return true;
      }),
    [activeSides, assessment.sides, lateralityConfirmed],
  );

  useEffect(() => {
    if (isAssessmentComplete && !prevAssessmentCompleteRef.current) {
      setSectionCollapsed("assessment", true);
    }
    prevAssessmentCompleteRef.current = isAssessmentComplete;
  }, [isAssessmentComplete, setSectionCollapsed]);

  const evaluatedSuggestions = useMemo(() => {
    if (!selectedDiagnosis) return [];
    return evaluateSuggestions(selectedDiagnosis, stagingValues).sort(
      (left, right) => (left.sortOrder ?? 99) - (right.sortOrder ?? 99),
    );
  }, [selectedDiagnosis, stagingValues]);

  const suggestedProcedures = useMemo(
    () =>
      evaluatedSuggestions
        .filter((suggestion) => suggestion.isActive || !suggestion.isConditional)
        .map((suggestion) => ({
          id: suggestion.procedurePicklistId,
          name: suggestion.displayName,
          isActive: suggestion.isActive,
        })),
    [evaluatedSuggestions],
  );

  const buildDefaultDraftProcedures = useCallback(() => {
    const nextProcedures = suggestedProcedures
      .filter((procedure) => procedure.isActive)
      .map((procedure) => createProcedureFromPicklistId(procedure.id))
      .filter((procedure): procedure is CaseProcedure => !!procedure);
    return normalizeDraftProcedures(nextProcedures);
  }, [createProcedureFromPicklistId, suggestedProcedures]);

  useEffect(() => {
    if (diagnosisKey !== prevDiagnosisKeyRef.current) {
      prevDiagnosisKeyRef.current = diagnosisKey;
      setShowAllDiagnoses(false);
      setShowSnomedSearch(false);
      setShowFullProcedurePicker(false);
      setActiveCustomProcedureId(null);
      setPickerSelectionId(undefined);
      setDraftDirty(false);
      setDraftProcedures(buildDefaultDraftProcedures());
    }
  }, [buildDefaultDraftProcedures, diagnosisKey]);

  useEffect(() => {
    if (diagnosisKey && !draftDirty && committedProcedures.length === 0) {
      setDraftProcedures(buildDefaultDraftProcedures());
    }
  }, [
    buildDefaultDraftProcedures,
    committedProcedures.length,
    diagnosisKey,
    draftDirty,
    suggestedProcedures,
  ]);

  useEffect(() => {
    const isAccepted = hasAcceptedMapping;
    if (isAccepted) {
      setDraftProcedures(cloneProcedures(committedProcedures));
      setDraftDirty(true);
    } else if (prevAcceptedRef.current) {
      setDraftDirty(true);
    }
    prevAcceptedRef.current = isAccepted;
  }, [committedProcedures, hasAcceptedMapping]);

  const selectedSuggestedProcedureIds = useMemo(() => {
    const suggestedIds = new Set(suggestedProcedures.map((procedure) => procedure.id));
    return new Set(
      draftProcedures
        .map((procedure) => procedure.picklistEntryId)
        .filter(
          (picklistId): picklistId is string =>
            !!picklistId && suggestedIds.has(picklistId),
        ),
    );
  }, [draftProcedures, suggestedProcedures]);

  const accepted = hasAcceptedMapping;

  const draftProcedureCount = useMemo(
    () => getNamedProcedures(draftProcedures).length,
    [draftProcedures],
  );

  const committedModuleFlags = useMemo(() => {
    const procedureIds = committedProcedures
      .map((procedure) => procedure.picklistEntryId)
      .filter((picklistId): picklistId is string => !!picklistId);

    const tagSet = new Set(
      committedProcedures.flatMap((procedure) => procedure.tags ?? []),
    );

    return {
      showImplantDetails: procedureIds.some((picklistId) =>
        [
          "breast_aes_augmentation_implant",
          "breast_impl_dti",
          "breast_impl_expander_insertion",
          "breast_impl_expander_to_implant",
          "breast_impl_adm_assisted",
          "breast_impl_prepectoral",
          "breast_impl_combined_autologous",
          "breast_ga_augmentation_transfem",
          "breast_rev_implant_exchange",
          "breast_rev_capsulectomy_total",
          "breast_rev_capsulectomy_en_bloc",
          "breast_rev_implant_removal",
        ].includes(picklistId),
      ),
      showBreastFlapDetails: tagSet.has("free_flap") || tagSet.has("microsurgery"),
      showPedicledFlapDetails:
        tagSet.has("pedicled_flap") &&
        !(tagSet.has("free_flap") || tagSet.has("microsurgery")),
      showLipofilling:
        tagSet.has("lipofilling") ||
        procedureIds.some((picklistId) => picklistId.startsWith("breast_fat_")),
      showChestMasculinisation: procedureIds.some((picklistId) =>
        picklistId.startsWith("breast_ga_chest_masc"),
      ),
      showNippleDetails: procedureIds.some((picklistId) =>
        [
          "breast_nipple_reconstruction",
          "breast_nipple_tattooing",
          "breast_nipple_inverted_correction",
        ].includes(picklistId),
      ),
    };
  }, [committedProcedures]);

  const handleAssessmentChange = useCallback(
    (nextAssessment: BreastAssessmentData) => {
      onAssessmentChange(
        normalizeBreastAssessment(nextAssessment, defaultClinicalContext),
      );
    },
    [defaultClinicalContext, onAssessmentChange],
  );

  const handleLateralityChange = useCallback(
    (option: BreastAssessmentData["laterality"]) => {
      if (option === assessment.laterality) {
        setLateralityConfirmed(true);
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLateralityConfirmed(true);
      handleAssessmentChange({ ...assessment, laterality: option });
    },
    [assessment, handleAssessmentChange],
  );

  const handleSideChange = useCallback(
    (side: BreastLaterality, sideData: BreastSideAssessment) => {
      handleAssessmentChange({
        ...assessment,
        sides: { ...assessment.sides, [side]: sideData },
      });
    },
    [assessment, handleAssessmentChange],
  );

  const handleCopy = useCallback(
    (fromSide: BreastLaterality) => {
      const otherSide: BreastLaterality = fromSide === "left" ? "right" : "left";
      const source = assessment.sides[fromSide];
      if (!source || !isBreastSideEmpty(assessment.sides[otherSide])) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      handleAssessmentChange({
        ...assessment,
        sides: {
          ...assessment.sides,
          [otherSide]: copyBreastSide(source, otherSide),
        },
      });
    },
    [assessment, handleAssessmentChange],
  );

  const visibleDiagnosisBuckets = useMemo(
    () => getBreastDiagnosisBuckets(assessment),
    [assessment],
  );

  const visibleSubcategories = useMemo(() => {
    if (showAllDiagnoses) {
      return [
        ...visibleDiagnosisBuckets.prioritizedSubcategories,
        ...visibleDiagnosisBuckets.overflowSubcategories,
      ];
    }
    return visibleDiagnosisBuckets.prioritizedSubcategories;
  }, [showAllDiagnoses, visibleDiagnosisBuckets]);

  const visibleDiagnosisIds = useMemo(
    () =>
      new Set(
        allBreastDiagnoses
          .filter((diagnosis) =>
            visibleSubcategories.includes(diagnosis.subcategory),
          )
          .map((diagnosis) => diagnosis.id),
      ),
    [allBreastDiagnoses, visibleSubcategories],
  );

  const favouriteDiagnosisIds = useMemo(
    () => new Set(favouriteDiagnoses.map((diagnosis) => diagnosis.id)),
    [favouriteDiagnoses],
  );

  const filteredFavourites = useMemo(
    () =>
      favouriteDiagnoses.filter((diagnosis) => visibleDiagnosisIds.has(diagnosis.id)),
    [favouriteDiagnoses, visibleDiagnosisIds],
  );

  const filteredRecents = useMemo(
    () =>
      recentDiagnoses.filter((diagnosis) => visibleDiagnosisIds.has(diagnosis.id)),
    [recentDiagnoses, visibleDiagnosisIds],
  );

  const handlePicklistDiagnosisSelect = useCallback(
    (diagnosis: DiagnosisPicklistEntry) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onDiagnosisSelect(diagnosis);
      setSectionCollapsed("diagnosis", true);
    },
    [onDiagnosisSelect, setSectionCollapsed],
  );

  const handleSnomedSelect = useCallback(
    (diagnosis: { conceptId: string; term: string } | null) => {
      if (!diagnosis) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSnomedDiagnosisSelect(diagnosis);
      setShowSnomedSearch(false);
      setSectionCollapsed("diagnosis", true);
    },
    [onSnomedDiagnosisSelect, setSectionCollapsed],
  );

  const updateDraftProcedures = useCallback(
    (updater: (procedures: CaseProcedure[]) => CaseProcedure[]) => {
      setDraftDirty(true);
      setDraftProcedures((current) =>
        normalizeDraftProcedures(updater(cloneProcedures(current))),
      );
    },
    [],
  );

  const handleToggleSuggestedProcedure = useCallback(
    (picklistId: string) => {
      updateDraftProcedures((current) => {
        const next = [...current];
        const existingIndex = findProcedureIndexByPicklistId(next, picklistId);
        if (existingIndex >= 0) {
          next.splice(existingIndex, 1);
          if (activeCustomProcedureId === next[existingIndex]?.id) {
            setActiveCustomProcedureId(null);
          }
          return next;
        }

        const procedure = createProcedureFromPicklistId(picklistId);
        if (!procedure) return next;
        return [...next, procedure];
      });
    },
    [activeCustomProcedureId, createProcedureFromPicklistId, updateDraftProcedures],
  );

  const handleAddPicklistProcedure = useCallback(
    (picklistId: string) => {
      setPickerSelectionId(picklistId);
      updateDraftProcedures((current) => {
        if (findProcedureIndexByPicklistId(current, picklistId) >= 0) {
          return current;
        }
        const procedure = createProcedureFromPicklistId(picklistId);
        if (!procedure) return current;
        return [...current, procedure];
      });
    },
    [createProcedureFromPicklistId, updateDraftProcedures],
  );

  const handleRemoveDraftProcedure = useCallback(
    (procedureId: string) => {
      updateDraftProcedures((current) =>
        current.filter((procedure) => procedure.id !== procedureId),
      );
      if (activeCustomProcedureId === procedureId) {
        setActiveCustomProcedureId(null);
      }
    },
    [activeCustomProcedureId, updateDraftProcedures],
  );

  const moveDraftProcedure = useCallback(
    (procedureId: string, direction: -1 | 1) => {
      updateDraftProcedures((current) => {
        const index = current.findIndex((procedure) => procedure.id === procedureId);
        const swapIndex = index + direction;
        if (index < 0 || swapIndex < 0 || swapIndex >= current.length) {
          return current;
        }
        const next = [...current];
        const [moved] = next.splice(index, 1);
        next.splice(swapIndex, 0, moved!);
        return next;
      });
    },
    [updateDraftProcedures],
  );

  const handleUpdateDraftProcedure = useCallback(
    (updatedProcedure: CaseProcedure) => {
      updateDraftProcedures((current) =>
        current.map((procedure) =>
          procedure.id === updatedProcedure.id ? updatedProcedure : procedure,
        ),
      );
    },
    [updateDraftProcedures],
  );

  const handleAddCustomProcedure = useCallback(() => {
    const customProcedure: CaseProcedure = {
      id: uuidv4(),
      sequenceOrder: draftProcedures.length + 1,
      procedureName: "",
      specialty: "breast",
      surgeonRole: "PS",
    };

    setActiveCustomProcedureId(customProcedure.id);
    updateDraftProcedures((current) => [...current, customProcedure]);
  }, [draftProcedures.length, updateDraftProcedures]);

  const handleAcceptMapping = useCallback(() => {
    const named = getNamedProcedures(draftProcedures);

    if (assessment.laterality === "bilateral") {
      // Bilateral: split free flap procedures into one per side
      onCommittedProceduresChange(expandBilateralFreeFlaps(named, activeSides));
    } else {
      // Unilateral: tag laterality on free flap procedures
      const side = assessment.laterality as "left" | "right";
      const tagged = named.map((proc) =>
        procedureHasFreeFlap(proc) ? { ...proc, laterality: side } : proc,
      );
      onCommittedProceduresChange(tagged);
    }

    setShowFullProcedurePicker(false);
    setActiveCustomProcedureId(null);
  }, [draftProcedures, assessment.laterality, activeSides, onCommittedProceduresChange]);

  const handleEditMapping = useCallback(() => {
    // Collapse bilateral pairs back to single draft entries for editing
    const collapsed = collapseBilateralFreeFlaps(committedProcedures);
    setDraftProcedures(cloneProcedures(collapsed));
    setDraftDirty(true);
    setShowFullProcedurePicker(false);
    setActiveCustomProcedureId(null);
    onCommittedProceduresChange([]);
  }, [committedProcedures, onCommittedProceduresChange]);

  const draftCustomProcedure = draftProcedures.find(
    (procedure) => procedure.id === activeCustomProcedureId,
  );

  const detailSectionConfigs = useMemo(() => {
    const sections: {
      key: string;
      title: string;
      icon: React.ComponentProps<typeof Feather>["name"];
      subtitle?: string;
      render: () => React.ReactNode;
    }[] = [];

    const renderSideGroup = (
      title: string,
      children: React.ReactNode,
      side: BreastLaterality,
    ) => (
      <View
        key={`${title}-${side}`}
        style={[
          styles.sideGroup,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <ThemedText style={[styles.sideGroupTitle, { color: theme.text }]}>
          {side === "left" ? "Left Breast" : "Right Breast"}
        </ThemedText>
        {children}
      </View>
    );

    if (committedModuleFlags.showImplantDetails) {
      sections.push({
        key: "implant",
        title: "Implant Details",
        icon: "disc",
        subtitle: getBreastSectionSummaryText(
          assessment,
          getImplantSummary,
          activeSides,
        ),
        render: () => (
          <>
            {activeSides.map((side) =>
              renderSideGroup(
                "implant",
                <ImplantDetailsCard
                  value={assessment.sides[side]?.implantDetails ?? {}}
                  onChange={(implantDetails) =>
                    handleSideChange(side, {
                      ...(assessment.sides[side] ?? {
                        side,
                        clinicalContext:
                          defaultClinicalContext ?? "reconstructive",
                      }),
                      implantDetails,
                    })
                  }
                  breastPreferences={breastPreferences}
                />,
                side,
              ),
            )}
          </>
        ),
      });
    }

    const showInlineFreeFlap = committedModuleFlags.showBreastFlapDetails && !suppressFreeFlap;
    if (
      showInlineFreeFlap ||
      committedModuleFlags.showPedicledFlapDetails
    ) {
      sections.push({
        key: "flap",
        title: "Flap Details",
        icon: "scissors",
        subtitle: getBreastSectionSummaryText(
          assessment,
          getFlapSummary,
          activeSides,
          { includeEmptySides: false },
        ),
        render: () => (
          <>
            {activeSides.map((side) =>
              renderSideGroup(
                "flap",
                <View style={styles.moduleStack}>
                  {committedModuleFlags.showBreastFlapDetails && !suppressFreeFlap ? (
                    <BreastFlapCard
                      value={assessment.sides[side]?.flapDetails ?? {}}
                      onChange={(flapDetails) =>
                        handleSideChange(side, {
                          ...(assessment.sides[side] ?? {
                            side,
                            clinicalContext:
                              defaultClinicalContext ?? "reconstructive",
                          }),
                          flapDetails,
                        })
                      }
                    />
                  ) : null}
                  {committedModuleFlags.showPedicledFlapDetails ? (
                    <BreastFlapCard
                      mode="pedicled"
                      value={assessment.sides[side]?.flapDetails ?? {}}
                      onChange={(flapDetails) =>
                        handleSideChange(side, {
                          ...(assessment.sides[side] ?? {
                            side,
                            clinicalContext:
                              defaultClinicalContext ?? "reconstructive",
                          }),
                          flapDetails,
                        })
                      }
                    />
                  ) : null}
                </View>,
                side,
              ),
            )}
          </>
        ),
      });
    }

    if (committedModuleFlags.showLipofilling) {
      sections.push({
        key: "lipofilling",
        title: "Lipofilling Details",
        icon: "droplet",
        subtitle: [getLiposuctionSummary(assessment.liposuction), getLipofillingSummary(assessment.lipofilling)]
          .filter(Boolean)
          .join(" · "),
        render: () => (
          <View style={styles.moduleStack}>
            <LiposuctionCard
              value={assessment.liposuction ?? {}}
              onChange={(liposuction) =>
                handleAssessmentChange({ ...assessment, liposuction })
              }
            />
            <LipofillingCard
              activeSides={activeSides}
              value={assessment.lipofilling ?? {}}
              onChange={(lipofilling) =>
                handleAssessmentChange({ ...assessment, lipofilling })
              }
            />
          </View>
        ),
      });
    }

    if (committedModuleFlags.showChestMasculinisation) {
      sections.push({
        key: "chest-masc",
        title: "Chest Masculinisation Details",
        icon: "user",
        subtitle: getBreastSectionSummaryText(
          assessment,
          getChestMascSummary,
          activeSides,
          { valueKey: "chestMasculinisation" },
        ),
        render: () => (
          <>
            {activeSides.map((side) =>
              renderSideGroup(
                "chest-masc",
                <ChestMasculinisationCard
                  value={assessment.sides[side]?.chestMasculinisation ?? {}}
                  onChange={(chestMasculinisation) =>
                    handleSideChange(side, {
                      ...(assessment.sides[side] ?? {
                        side,
                        clinicalContext:
                          defaultClinicalContext ?? "reconstructive",
                      }),
                      chestMasculinisation,
                    })
                  }
                />,
                side,
              ),
            )}
          </>
        ),
      });
    }

    if (committedModuleFlags.showNippleDetails) {
      sections.push({
        key: "nipple",
        title: "Nipple Details",
        icon: "circle",
        subtitle: getBreastSectionSummaryText(
          assessment,
          getNippleSummary,
          activeSides,
          { valueKey: "nippleDetails" },
        ),
        render: () => (
          <>
            {activeSides.map((side) =>
              renderSideGroup(
                "nipple",
                <NippleDetailsCard
                  value={assessment.sides[side]?.nippleDetails ?? {}}
                  onChange={(nippleDetails) =>
                    handleSideChange(side, {
                      ...(assessment.sides[side] ?? {
                        side,
                        clinicalContext:
                          defaultClinicalContext ?? "reconstructive",
                      }),
                      nippleDetails,
                    })
                  }
                />,
                side,
              ),
            )}
          </>
        ),
      });
    }

    return sections;
  }, [
    activeSides,
    assessment,
    breastPreferences,
    committedModuleFlags,
    defaultClinicalContext,
    handleAssessmentChange,
    handleSideChange,
    theme.backgroundDefault,
    theme.border,
    theme.text,
  ]);

  let sectionNumber = 0;

  return (
    <View style={styles.container}>
      <SectionWrapper
        title={`${++sectionNumber}. Breast Assessment`}
        icon="layers"
        collapsible
        isCollapsed={isSectionCollapsed("assessment")}
        onCollapsedChange={(collapsed) => {
          if (collapsed && !isAssessmentComplete) return;
          setSectionCollapsed("assessment", collapsed);
        }}
        subtitle={
          isAssessmentComplete ? getBreastAssessmentSummary(assessment) : undefined
        }
      >
        <View style={styles.chipRow}>
          {([
            { key: "left", label: "Left" },
            { key: "right", label: "Right" },
            { key: "bilateral", label: "Bilateral" },
          ] as const).map(({ key, label }) => {
            const selected = assessment.laterality === key;
            return (
              <Pressable
                key={key}
                onPress={() => handleLateralityChange(key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? theme.link
                      : theme.backgroundSecondary,
                    borderColor: selected ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: selected ? theme.buttonText : theme.text,
                    fontWeight: selected ? "600" : "400",
                  }}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {activeSides.map((side) => {
          const sideData = assessment.sides[side];
          if (!sideData) return null;

          const otherSide: BreastLaterality = side === "left" ? "right" : "left";
          const showCopyButton =
            assessment.laterality === "bilateral" &&
            isBreastSideEmpty(assessment.sides[otherSide]);

          return (
            <BreastSideCard
              key={side}
              side={side}
              value={sideData}
              onChange={(updated) => handleSideChange(side, updated)}
              moduleFlags={EMPTY_MODULE_FLAGS}
              showCopyButton={showCopyButton}
              onCopy={() => handleCopy(side)}
              isTransmasculine={isTransmasculine}
              renderMode="context_only"
            />
          );
        })}
      </SectionWrapper>

      {canShowDiagnosisSection ? (
        <SectionWrapper
          title={`${++sectionNumber}. Diagnosis`}
          icon="activity"
          collapsible
          isCollapsed={isSectionCollapsed("diagnosis")}
          onCollapsedChange={(collapsed) => {
            if (collapsed && !diagnosisLabel) return;
            setSectionCollapsed("diagnosis", collapsed);
          }}
          subtitle={diagnosisLabel || undefined}
        >
          {favouritesLoaded &&
          (filteredFavourites.length > 0 || filteredRecents.length > 0) ? (
            <FavouritesRecentsChips
              favourites={filteredFavourites}
              recents={filteredRecents}
              favouriteIds={favouriteDiagnosisIds}
              onSelect={(id) => {
                const diagnosis = allBreastDiagnoses.find((entry) => entry.id === id);
                if (diagnosis) handlePicklistDiagnosisSelect(diagnosis);
              }}
              onToggleFavourite={(id) => toggleFavourite("diagnosis", id)}
            />
          ) : null}

          {visibleDiagnosisBuckets.prioritizedSubcategories.map((subcategory) => {
            const diagnoses = allBreastDiagnoses.filter(
              (entry) => entry.subcategory === subcategory,
            );
            if (diagnoses.length === 0) return null;

            return (
              <View key={subcategory} style={styles.categorySection}>
                <ThemedText
                  style={[styles.categoryLabel, { color: theme.textSecondary }]}
                >
                  {CATEGORY_LABELS[subcategory] ?? subcategory.toUpperCase()}
                </ThemedText>
                <View style={styles.diagnosisChipGrid}>
                  {diagnoses.map((diagnosis) => {
                    const selected = selectedDiagnosis?.id === diagnosis.id;
                    const isFav = isFavourite("diagnosis", diagnosis.id);
                    return (
                      <Pressable
                        key={diagnosis.id}
                        style={[
                          styles.diagnosisChip,
                          {
                            backgroundColor: selected
                              ? theme.link
                              : theme.backgroundDefault,
                            borderColor: selected ? theme.link : theme.border,
                          },
                        ]}
                        onPress={() => handlePicklistDiagnosisSelect(diagnosis)}
                        onLongPress={() => {
                          Haptics.selectionAsync();
                          toggleFavourite("diagnosis", diagnosis.id);
                        }}
                      >
                        {isFav ? (
                          <Feather
                            name="star"
                            size={11}
                            color={selected ? theme.buttonText : theme.link}
                          />
                        ) : null}
                        <ThemedText
                          numberOfLines={1}
                          style={[
                            styles.diagnosisChipText,
                            {
                              color: selected ? theme.buttonText : theme.text,
                              fontWeight: selected ? "600" : "400",
                            },
                          ]}
                        >
                          {diagnosis.shortName ?? diagnosis.displayName}
                        </ThemedText>
                        {selected ? (
                          <Feather
                            name="check"
                            size={13}
                            color={theme.buttonText}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {visibleDiagnosisBuckets.overflowSubcategories.length > 0 ? (
            <>
              <Pressable
                style={styles.showAllRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAllDiagnoses((value) => !value);
                }}
              >
                <Feather
                  name={showAllDiagnoses ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={theme.link}
                />
                <ThemedText
                  style={[styles.showAllText, { color: theme.link }]}
                >
                  {showAllDiagnoses
                    ? "Hide additional breast diagnoses"
                    : "Show all breast diagnoses"}
                </ThemedText>
              </Pressable>

              {showAllDiagnoses
                ? visibleDiagnosisBuckets.overflowSubcategories.map((subcategory) => {
                    const diagnoses = allBreastDiagnoses.filter(
                      (entry) => entry.subcategory === subcategory,
                    );
                    if (diagnoses.length === 0) return null;

                    return (
                      <View key={subcategory} style={styles.categorySection}>
                        <ThemedText
                          style={[
                            styles.categoryLabel,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {CATEGORY_LABELS[subcategory] ?? subcategory.toUpperCase()}
                        </ThemedText>
                        <View style={styles.diagnosisChipGrid}>
                          {diagnoses.map((diagnosis) => {
                            const selected = selectedDiagnosis?.id === diagnosis.id;
                            const isFav = isFavourite("diagnosis", diagnosis.id);
                            return (
                              <Pressable
                                key={diagnosis.id}
                                style={[
                                  styles.diagnosisChip,
                                  {
                                    backgroundColor: selected
                                      ? theme.link
                                      : theme.backgroundDefault,
                                    borderColor: selected
                                      ? theme.link
                                      : theme.border,
                                  },
                                ]}
                                onPress={() =>
                                  handlePicklistDiagnosisSelect(diagnosis)
                                }
                                onLongPress={() => {
                                  Haptics.selectionAsync();
                                  toggleFavourite("diagnosis", diagnosis.id);
                                }}
                              >
                                {isFav ? (
                                  <Feather
                                    name="star"
                                    size={11}
                                    color={
                                      selected ? theme.buttonText : theme.link
                                    }
                                  />
                                ) : null}
                                <ThemedText
                                  numberOfLines={1}
                                  style={[
                                    styles.diagnosisChipText,
                                    {
                                      color: selected
                                        ? theme.buttonText
                                        : theme.text,
                                      fontWeight: selected ? "600" : "400",
                                    },
                                  ]}
                                >
                                  {diagnosis.shortName ?? diagnosis.displayName}
                                </ThemedText>
                                {selected ? (
                                  <Feather
                                    name="check"
                                    size={13}
                                    color={theme.buttonText}
                                  />
                                ) : null}
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                : null}
            </>
          ) : null}

          {/* Selected diagnosis full-name detail row */}
          {selectedDiagnosis?.shortName && selectedDiagnosis.shortName !== selectedDiagnosis.displayName ? (
            <View
              style={[
                styles.selectedDiagnosisDetail,
                {
                  backgroundColor: theme.link + "10",
                  borderColor: theme.link + "30",
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{ color: theme.text, fontWeight: "500" }}
                numberOfLines={2}
              >
                {selectedDiagnosis.displayName}
              </ThemedText>
            </View>
          ) : null}

          <Pressable
            style={styles.showAllRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSnomedSearch((value) => !value);
            }}
          >
            <Feather
              name={showSnomedSearch ? "chevron-up" : "search"}
              size={14}
              color={theme.link}
            />
            <ThemedText style={[styles.showAllText, { color: theme.link }]}>
              {showSnomedSearch
                ? "Hide diagnosis search"
                : "Can't find your diagnosis? Search SNOMED CT"}
            </ThemedText>
          </Pressable>

          {showSnomedSearch ? (
            <SnomedSearchPicker
              label="Search Diagnosis"
              value={
                primaryDiagnosis
                  ? {
                      conceptId: primaryDiagnosis.conceptId,
                      term: primaryDiagnosis.term,
                    }
                  : undefined
              }
              onSelect={handleSnomedSelect}
              searchType="diagnosis"
              specialty="breast"
              placeholder="Search breast diagnoses..."
            />
          ) : null}

          {diagnosisStaging && diagnosisStaging.stagingSystems.length > 0 ? (
            <View style={styles.stagingContainer}>
              <ThemedText
                style={[styles.stagingLabel, { color: theme.textSecondary }]}
              >
                Classification / Staging
              </ThemedText>
              {diagnosisStaging.stagingSystems.map((system) => (
                <PickerField
                  key={system.name}
                  label={system.name}
                  value={stagingValues[system.name] || ""}
                  options={system.options.map((option) => ({
                    value: option.value,
                    label: option.description
                      ? `${option.label} - ${option.description}`
                      : option.label,
                  }))}
                  onSelect={(value) => onStagingChange(system.name, value)}
                  placeholder={`Select ${system.name.toLowerCase()}...`}
                />
              ))}
            </View>
          ) : null}
        </SectionWrapper>
      ) : null}

      {diagnosisLabel ? (
        <SectionWrapper
          title={`${++sectionNumber}. Summary & Procedures`}
          icon="file-text"
          collapsible
          isCollapsed={isSectionCollapsed("summary")}
          onCollapsedChange={(collapsed) => setSectionCollapsed("summary", collapsed)}
          subtitle={
            accepted
              ? `${diagnosisLabel} · ${committedProcedures.length} procedure${committedProcedures.length === 1 ? "" : "s"}`
              : diagnosisLabel
          }
        >
          <BreastSummaryPanel
            diagnosisName={diagnosisLabel}
            diagnosisCode={diagnosisCode}
            summaryChips={getBreastAssessmentSummaryParts(assessment)}
            suggestedProcedures={suggestedProcedures}
            selectedSuggestedProcedureIds={selectedSuggestedProcedureIds}
            acceptedProcedures={committedProcedures}
            draftProcedureCount={draftProcedureCount}
            isAccepted={accepted}
            onToggleSuggestedProcedure={handleToggleSuggestedProcedure}
            onBrowseFullPicker={() => setShowFullProcedurePicker((value) => !value)}
            onAccept={handleAcceptMapping}
            onEditMapping={accepted ? handleEditMapping : undefined}
          />

          {showHistologyToggle && onHistologyPendingChange ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onHistologyPendingChange(!histologyPending);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: BorderRadius.sm,
                borderWidth: 1,
                borderColor: histologyPending ? theme.warning : theme.border,
                backgroundColor: histologyPending
                  ? theme.warning + "10"
                  : theme.backgroundDefault,
                marginTop: Spacing.sm,
              }}
            >
              <Feather
                name={histologyPending ? "check-square" : "square"}
                size={18}
                color={histologyPending ? theme.warning : theme.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: histologyPending ? theme.warning : theme.text,
                  }}
                >
                  Histology pending
                </ThemedText>
                <ThemedText
                  style={{
                    fontSize: 12,
                    color: theme.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Specimen sent for pathology — add results later
                </ThemedText>
              </View>
            </Pressable>
          ) : null}

          {showFullProcedurePicker && !accepted ? (
            <View
              style={[
                styles.fullPickerShell,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText
                style={[styles.fullPickerTitle, { color: theme.text }]}
              >
                Full Procedure Picker
              </ThemedText>
              <ProcedureSubcategoryPicker
                specialty="breast"
                selectedEntryId={pickerSelectionId}
                onSelect={(entry) => handleAddPicklistProcedure(entry.id)}
              />

              <CompactProcedureList
                procedures={getNamedProcedures(draftProcedures)}
                onRemove={(procedure) => handleRemoveDraftProcedure(procedure.id)}
                onMoveUp={(procedureId) => moveDraftProcedure(procedureId, -1)}
                onMoveDown={(procedureId) => moveDraftProcedure(procedureId, 1)}
                hideSnomedCodes
                title="Selected Procedures"
              />

              {draftCustomProcedure ? (
                <>
                  <ProcedureEntryCard
                    procedure={draftCustomProcedure}
                    index={draftProcedures.findIndex(
                      (procedure) => procedure.id === draftCustomProcedure.id,
                    )}
                    isOnlyProcedure={draftProcedures.length === 1}
                    onUpdate={handleUpdateDraftProcedure}
                    onDelete={() => handleRemoveDraftProcedure(draftCustomProcedure.id)}
                    onMoveUp={() => moveDraftProcedure(draftCustomProcedure.id, -1)}
                    onMoveDown={() =>
                      moveDraftProcedure(draftCustomProcedure.id, 1)
                    }
                    canMoveUp={
                      draftProcedures.findIndex(
                        (procedure) => procedure.id === draftCustomProcedure.id,
                      ) > 0
                    }
                    canMoveDown={
                      draftProcedures.findIndex(
                        (procedure) => procedure.id === draftCustomProcedure.id,
                      ) < draftProcedures.length - 1
                    }
                    diagnosisId={selectedDiagnosis?.id}
                    clinicalGroup={selectedDiagnosis?.clinicalGroup}
                    diagnosisLaterality={assessment.laterality}
                  />
                  <Pressable
                    style={styles.showAllRow}
                    onPress={() => setActiveCustomProcedureId(null)}
                  >
                    <Feather
                      name="chevron-up"
                      size={14}
                      color={theme.textSecondary}
                    />
                    <ThemedText
                      style={[styles.showAllText, { color: theme.textSecondary }]}
                    >
                      Collapse custom procedure editor
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={styles.showAllRow}
                  onPress={handleAddCustomProcedure}
                >
                  <Feather name="plus" size={14} color={theme.link} />
                  <ThemedText
                    style={[styles.showAllText, { color: theme.link }]}
                  >
                    Add custom procedure
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ) : null}
        </SectionWrapper>
      ) : null}

      {accepted
        ? detailSectionConfigs.map((section) => (
            <SectionWrapper
              key={section.key}
              title={`${++sectionNumber}. ${section.title}`}
              icon={section.icon}
              collapsible
              isCollapsed={isSectionCollapsed(section.key)}
              onCollapsedChange={(collapsed) =>
                setSectionCollapsed(section.key, collapsed)
              }
              subtitle={section.subtitle || undefined}
            >
              {section.render()}
            </SectionWrapper>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minWidth: 72,
    alignItems: "center",
  },
  categorySection: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  diagnosisChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  diagnosisChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  diagnosisChipText: {
    fontSize: 13,
  },
  selectedDiagnosisDetail: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  showAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  showAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  stagingContainer: {
    gap: Spacing.sm,
  },
  stagingLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  fullPickerShell: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  fullPickerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  sideGroup: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sideGroupTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  moduleStack: {
    gap: Spacing.md,
  },
});
