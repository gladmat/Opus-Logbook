import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import {
  DiagnosisGroup,
  CaseProcedure,
  Specialty,
  SPECIALTY_LABELS,
  PROCEDURE_TYPES,
  Role,
  FractureEntry,
  DiagnosisClinicalDetails,
  ClinicalSuspicion,
  CLINICAL_SUSPICION_LABELS,
  isExcisionBiopsyDiagnosis,
  FLAP_SNOMED_MAP,
  RECIPIENT_SITE_SNOMED_MAP,
} from "@/types/case";
import type {
  FreeFlapDetails,
  HandTraumaDetails,
  AnastomosisEntry,
  LesionInstance,
  LesionPathologyType,
  FreeFlapOutcomeDetails,
} from "@/types/case";
import type { InfectionOverlay } from "@/types/infection";
import { PickerField } from "@/components/FormField";
import { SnomedSearchPicker } from "@/components/SnomedSearchPicker";
import { getDiagnosisStaging, DiagnosisStagingConfig } from "@/lib/snomedApi";
import { DiagnosisClinicalFields } from "@/components/DiagnosisClinicalFields";
import { ProcedureEntryCard } from "@/components/ProcedureEntryCard";
import { DiagnosisPicker } from "@/components/DiagnosisPicker";
import { ProcedureSuggestions } from "@/components/ProcedureSuggestions";
import { FractureClassificationWizard } from "@/components/FractureClassificationWizard";
import {
  hasDiagnosisPicklist,
  getActiveProcedureIds,
  evaluateSuggestions,
  findDiagnosisById,
} from "@/lib/diagnosisPicklists";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import {
  findPicklistEntry,
  PICKLIST_TO_FLAP_TYPE,
} from "@/lib/procedurePicklist";
import {
  DIAGNOSIS_TO_RECIPIENT_SITE,
  CLINICAL_GROUP_TO_INDICATION,
  getDefaultFlapSpecificDetails,
  getGracilisContextDefaults,
  getFibulaContextDefaults,
  BREAST_RECON_DEFAULT_RECIPIENT_VESSELS,
  DIEP_BILATERAL_DEFAULTS,
} from "@/data/autoFillMappings";
import { SectionHeader } from "@/components/SectionHeader";
import { DiagnosisSuggestions } from "@/components/DiagnosisSuggestions";
import { MultiLesionEditor } from "@/components/MultiLesionEditor";
import { useAuth } from "@/contexts/AuthContext";
import { SelectedDiagnosisCard } from "@/components/SelectedDiagnosisCard";
import {
  applyProcedureHints,
  type AOProcedureHint,
} from "@/lib/aoToDiagnosisMapping";
import { DetailModuleRow } from "@/components/detail-sheets/DetailModuleRow";
import { FreeFlapSheet } from "@/components/detail-sheets/FreeFlapSheet";
import { FlapOutcomeSheet } from "@/components/detail-sheets/FlapOutcomeSheet";
import {
  HandTraumaAssessment,
  type HandTraumaAssessmentAcceptPayload,
} from "@/components/hand-trauma/HandTraumaAssessment";
import { InfectionSheet } from "@/components/detail-sheets/InfectionSheet";
import { WoundAssessmentSheet } from "@/components/detail-sheets/WoundAssessmentSheet";
import {
  getModuleVisibility,
  procedureHasFreeFlap,
} from "@/lib/moduleVisibility";
import { generateFlapOutcomeSummary } from "@/components/FlapOutcomeSection";
import { withDefaultFlapOutcome } from "@/lib/flapOutcomeDefaults";
import {
  generateFlapSummary,
  generateInfectionSummary,
  generateWoundSummary,
} from "@/lib/moduleSummary";
import type { WoundAssessment } from "@/types/wound";
import type { EpisodeType } from "@/types/episode";
import type { TraumaMappingResult } from "@/lib/handTraumaMapping";

interface DiagnosisGroupEditorProps {
  group: DiagnosisGroup;
  index: number;
  isOnly: boolean;
  totalGroups: number;
  onChange: (updatedGroup: DiagnosisGroup) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  infectionOverlay?: InfectionOverlay;
  onInfectionChange?: (overlay: InfectionOverlay | undefined) => void;
  /** Whether this is the first group that triggers infection visibility */
  isFirstInfectionGroup?: boolean;
  /** Episode type from linked episode — triggers wound module for wound/burns episodes */
  episodeType?: EpisodeType;
  /** Case-level return to theatre flag used for free flap outcome defaults. */
  returnToTheatre?: boolean;
}

interface HandTraumaDiagnosisResolution {
  mappingResult: TraumaMappingResult;
  fractures: FractureEntry[];
  handTrauma: HandTraumaDetails;
  procedures: CaseProcedure[];
  selectedSuggestedProcedureIds?: string[];
}

export function DiagnosisGroupEditor({
  group,
  index,
  isOnly,
  totalGroups,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  infectionOverlay,
  onInfectionChange,
  isFirstInfectionGroup,
  episodeType,
  returnToTheatre,
}: DiagnosisGroupEditorProps) {
  const { theme } = useTheme();
  const { profile } = useAuth();

  // Accent color: monochromatic amber — primary full, then fading
  const accentColor =
    index === 0
      ? theme.link
      : index === 1
        ? theme.link + "99"
        : theme.link + "59";

  // Completion check: group has diagnosis + at least one named procedure
  const isComplete = !!(
    group.diagnosis?.displayName &&
    group.procedures.some((p) => p.procedureName.trim())
  );

  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [groupSpecialty, setGroupSpecialty] = useState<Specialty>(
    group.specialty,
  );
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState<{
    conceptId: string;
    term: string;
  } | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisStaging, setDiagnosisStaging] =
    useState<DiagnosisStagingConfig | null>(null);
  const [stagingValues, setStagingValues] = useState<Record<string, string>>(
    group.diagnosisStagingSelections || {},
  );
  const [diagnosisClinicalDetails, setDiagnosisClinicalDetails] =
    useState<DiagnosisClinicalDetails>(group.diagnosisClinicalDetails || {});
  const [selectedDiagnosis, setSelectedDiagnosis] =
    useState<DiagnosisPicklistEntry | null>(null);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<
    Set<string>
  >(new Set());
  const [procedures, setProcedures] = useState<CaseProcedure[]>(
    group.procedures,
  );
  const [fractures, setFractures] = useState<FractureEntry[]>(
    group.fractures || [],
  );
  const [showFractureWizard, setShowFractureWizard] = useState(false); // kept for standalone fracture wizard (non-trauma)
  const [isDiagnosisFromTrauma, setIsDiagnosisFromTrauma] = useState(false);
  const [traumaSourceLabel, setTraumaSourceLabel] = useState<
    string | undefined
  >(undefined);
  const [snomedSuggestion, setSnomedSuggestion] = useState<{
    searchTerm: string;
    displayName: string;
  } | null>(null);
  const [isMultiLesion, setIsMultiLesion] = useState<boolean>(
    group.isMultiLesion ?? false,
  );
  const [lesionInstances, setLesionInstances] = useState<LesionInstance[]>(
    group.lesionInstances ?? [],
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(
    !group.diagnosis?.displayName,
  );
  const [clinicalSuspicion, setClinicalSuspicion] = useState<
    ClinicalSuspicion | undefined
  >(group.clinicalSuspicion);

  // Hub-and-spoke sheet visibility
  const [activeFlapSheetProcedureId, setActiveFlapSheetProcedureId] = useState<
    string | null
  >(null);
  const [activeFlapOutcomeProcedureId, setActiveFlapOutcomeProcedureId] =
    useState<string | null>(null);
  const [showInfectionSheet, setShowInfectionSheet] = useState(false);
  const [showWoundSheet, setShowWoundSheet] = useState(false);

  // Feature 1: collapse diagnosis picklist after selection
  const [isDiagnosisPickerCollapsed, setIsDiagnosisPickerCollapsed] =
    useState<boolean>(!!group.diagnosisPicklistId);

  // Feature 2: procedure filtering
  const [showAllProcedures, setShowAllProcedures] = useState<boolean>(false);

  // Feature 3: hand surgery trauma/elective branching
  const [handCaseType, setHandCaseType] = useState<
    "trauma" | "elective" | null
  >(null);
  const [isDiagnosisFromAO, setIsDiagnosisFromAO] = useState<boolean>(false);
  const [aoSourceLabel, setAoSourceLabel] = useState<string | undefined>(
    undefined,
  );
  const [, setAoHints] = useState<AOProcedureHint[]>([]);
  const [showManualTraumaDiagnosisPicker, setShowManualTraumaDiagnosisPicker] =
    useState(false);
  const [autoAppliedTraumaSuggestionIds, setAutoAppliedTraumaSuggestionIds] =
    useState<Set<string>>(new Set());
  const latestGroupRef = useRef(group);

  useEffect(() => {
    latestGroupRef.current = group;
  }, [group]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (group.diagnosis?.snomedCtCode) {
      setPrimaryDiagnosis({
        conceptId: group.diagnosis.snomedCtCode,
        term: group.diagnosis.displayName,
      });
    } else if (group.diagnosis?.displayName) {
      setDiagnosis(group.diagnosis.displayName);
    }

    if (group.diagnosisPicklistId) {
      const dx = findDiagnosisById(group.diagnosisPicklistId);
      if (dx) {
        setSelectedDiagnosis(dx);
        const procIds = group.procedures
          .map((p) => p.picklistEntryId)
          .filter(Boolean) as string[];
        setSelectedSuggestionIds(new Set(procIds));

        // Infer hand case type from loaded diagnosis
        if (group.specialty === "hand_wrist") {
          setHandCaseType(
            dx.clinicalGroup === "trauma" ? "trauma" : "elective",
          );
        }
      }
    }
  }, [group]);

  const hasFractureSubcategory =
    groupSpecialty === "hand_wrist" &&
    procedures.some((p) => p.subcategory === "Fracture & Joint Fixation");

  useEffect(() => {
    if (groupSpecialty !== "hand_wrist") {
      setHandCaseType(null);
      return;
    }

    if (selectedDiagnosis?.clinicalGroup) {
      setHandCaseType(
        selectedDiagnosis.clinicalGroup === "trauma" ? "trauma" : "elective",
      );
      return;
    }

    if (diagnosisClinicalDetails.handTrauma) {
      setHandCaseType("trauma");
    }
  }, [
    groupSpecialty,
    selectedDiagnosis?.clinicalGroup,
    diagnosisClinicalDetails.handTrauma,
  ]);

  useEffect(() => {
    if (!hasFractureSubcategory) {
      setFractures([]);
    }
  }, [hasFractureSubcategory]);

  useEffect(() => {
    const fetchStaging = async () => {
      if (primaryDiagnosis) {
        const staging = await getDiagnosisStaging(
          primaryDiagnosis.conceptId,
          primaryDiagnosis.term,
        );
        setDiagnosisStaging(staging);
        if (!initializedRef.current) {
          setStagingValues({});
        }
      } else {
        setDiagnosisStaging(null);
        setStagingValues({});
      }
    };
    fetchStaging();
  }, [primaryDiagnosis]);

  useEffect(() => {
    if (!initializedRef.current) return;

    const isExcBiopsy = isExcisionBiopsyDiagnosis(selectedDiagnosis?.id);
    const assembled: DiagnosisGroup = {
      // Preserve fields managed outside this editor without forcing a sync loop.
      ...latestGroupRef.current,
      specialty: groupSpecialty,
      diagnosis: primaryDiagnosis
        ? {
            snomedCtCode: primaryDiagnosis.conceptId,
            displayName: primaryDiagnosis.term,
          }
        : diagnosis.trim()
          ? { displayName: diagnosis.trim() }
          : undefined,
      diagnosisPicklistId: selectedDiagnosis?.id || undefined,
      diagnosisStagingSelections:
        Object.keys(stagingValues).length > 0 ? stagingValues : undefined,
      diagnosisClinicalDetails:
        Object.keys(diagnosisClinicalDetails).length > 0
          ? diagnosisClinicalDetails
          : undefined,
      procedureSuggestionSource: selectedDiagnosis ? "picklist" : "manual",
      fractures: fractures.length > 0 ? fractures : undefined,
      procedures,
      isMultiLesion,
      lesionInstances: isMultiLesion ? lesionInstances : undefined,
      diagnosisCertainty: isExcBiopsy ? "clinical" : undefined,
      clinicalSuspicion: isExcBiopsy ? clinicalSuspicion : undefined,
    };
    onChangeRef.current(assembled);
  }, [
    groupSpecialty,
    primaryDiagnosis,
    diagnosis,
    selectedDiagnosis,
    stagingValues,
    diagnosisClinicalDetails,
    fractures,
    procedures,
    isMultiLesion,
    lesionInstances,
    clinicalSuspicion,
  ]);

  const buildDefaultProcedures = useCallback(
    (): CaseProcedure[] => [
      {
        id: uuidv4(),
        sequenceOrder: 1,
        procedureName: PROCEDURE_TYPES[groupSpecialty]?.[0] || "",
        specialty: groupSpecialty,
        surgeonRole: "PS",
      },
    ],
    [groupSpecialty],
  );

  const buildFreeFlapClinicalDetails = useCallback(
    (
      picklistId: string,
      diagnosisEntry?: DiagnosisPicklistEntry | null,
    ): FreeFlapDetails | undefined => {
      const mappedFlapType = PICKLIST_TO_FLAP_TYPE[picklistId];
      if (!mappedFlapType) return undefined;

      const snomedEntry = FLAP_SNOMED_MAP[mappedFlapType];
      const prefAnticoag =
        profile?.surgicalPreferences?.microsurgery?.anticoagulationProtocol;
      const recipientSite = diagnosisEntry
        ? DIAGNOSIS_TO_RECIPIENT_SITE[diagnosisEntry.id]
        : undefined;
      const recipientSiteSnomed = recipientSite
        ? RECIPIENT_SITE_SNOMED_MAP[recipientSite]
        : undefined;
      const indication = diagnosisEntry?.clinicalGroup
        ? CLINICAL_GROUP_TO_INDICATION[diagnosisEntry.clinicalGroup]
        : undefined;

      let flapSpecificDetails = getDefaultFlapSpecificDetails(mappedFlapType);
      let skinIsland: boolean | undefined;

      // Gracilis: facial reanimation vs soft tissue.
      if (mappedFlapType === "gracilis" && diagnosisEntry) {
        const gracilisDefaults = getGracilisContextDefaults(diagnosisEntry.id);
        flapSpecificDetails = gracilisDefaults.flapSpecificDetails;
        skinIsland = gracilisDefaults.skinIsland;
      }

      // Fibula: head & neck vs limb reconstruction defaults.
      if (mappedFlapType === "fibula") {
        flapSpecificDetails = getFibulaContextDefaults(recipientSite);
      }

      // Bilateral DIEP context from diagnosis laterality.
      if (
        mappedFlapType === "diep" &&
        diagnosisClinicalDetails.laterality === "bilateral"
      ) {
        flapSpecificDetails = {
          ...flapSpecificDetails,
          ...DIEP_BILATERAL_DEFAULTS,
        };
      }

      // Breast recon defaults: IMA + IMV.
      let anastomoses: AnastomosisEntry[] = [];
      if (recipientSite === "breast_chest") {
        anastomoses = [
          {
            id: uuidv4(),
            vesselType: "artery",
            recipientVesselName: BREAST_RECON_DEFAULT_RECIPIENT_VESSELS.artery,
            couplingMethod: "hand_sewn",
          },
          {
            id: uuidv4(),
            vesselType: "vein",
            recipientVesselName: BREAST_RECON_DEFAULT_RECIPIENT_VESSELS.vein,
            couplingMethod: "coupler",
          },
        ];
      }

      return {
        flapType: mappedFlapType,
        flapSnomedCode: snomedEntry?.code,
        flapSnomedDisplay: snomedEntry?.display,
        harvestSide: "left",
        anastomoses,
        ...(indication ? { indication } : {}),
        recipientSiteRegion: recipientSite,
        recipientSiteSnomedCode: recipientSiteSnomed?.code,
        recipientSiteSnomedDisplay: recipientSiteSnomed?.display,
        ...(skinIsland !== undefined ? { skinIsland } : {}),
        ...(Object.keys(flapSpecificDetails).length > 0
          ? { flapSpecificDetails }
          : {}),
        ...(prefAnticoag ? { anticoagulationProtocol: prefAnticoag } : {}),
      };
    },
    [diagnosisClinicalDetails.laterality, profile?.surgicalPreferences],
  );

  const handleDiagnosisSelect = useCallback(
    (dx: DiagnosisPicklistEntry, hints: AOProcedureHint[] = []) => {
      setSelectedDiagnosis(dx);
      setPrimaryDiagnosis({ conceptId: dx.snomedCtCode, term: dx.displayName });
      setDiagnosis(dx.displayName);
      setStagingValues({});
      setIsDiagnosisPickerCollapsed(true);
      setShowAllProcedures(false);

      if (groupSpecialty === "hand_wrist" && dx.clinicalGroup) {
        setHandCaseType(dx.clinicalGroup === "trauma" ? "trauma" : "elective");
      }

      // Apply AO procedure hints if provided (promote/demote defaults)
      const effectiveSuggestions =
        hints.length > 0 && dx.suggestedProcedures
          ? applyProcedureHints(dx.suggestedProcedures, hints)
          : dx.suggestedProcedures;
      const effectiveDx =
        hints.length > 0
          ? { ...dx, suggestedProcedures: effectiveSuggestions }
          : dx;
      const activeIds = getActiveProcedureIds(effectiveDx, {});
      setSelectedSuggestionIds(new Set(activeIds));

      const newProcedures: CaseProcedure[] = activeIds.map(
        (picklistId, idx) => {
          const entry = findPicklistEntry(picklistId);
          let clinicalDetails: FreeFlapDetails | undefined = undefined;
          if (
            entry?.hasFreeFlap ||
            procedureHasFreeFlap({
              picklistEntryId: picklistId,
              tags: entry?.tags,
            })
          ) {
            clinicalDetails = buildFreeFlapClinicalDetails(picklistId, dx);
          }
          return {
            id: uuidv4(),
            sequenceOrder: idx + 1,
            procedureName: entry?.displayName || "",
            specialty: groupSpecialty,
            surgeonRole: "PS" as Role,
            picklistEntryId: picklistId,
            snomedCtCode: entry?.snomedCtCode,
            snomedCtDisplay: entry?.snomedCtDisplay,
            subcategory: entry?.subcategory,
            tags: entry?.tags,
            clinicalDetails,
          };
        },
      );
      setProcedures(
        newProcedures.length > 0 ? newProcedures : buildDefaultProcedures(),
      );
    },
    [groupSpecialty, buildDefaultProcedures, buildFreeFlapClinicalDetails],
  );

  const handleStagingChangeForSuggestions = useCallback(
    (systemName: string, value: string) => {
      const newStagingValues = { ...stagingValues, [systemName]: value };
      setStagingValues(newStagingValues);

      if (selectedDiagnosis) {
        const evaluated = evaluateSuggestions(
          selectedDiagnosis,
          newStagingValues,
        );
        const activeIds = new Set(
          evaluated.filter((s) => s.isActive).map((s) => s.procedurePicklistId),
        );
        const allSuggestionIds = new Set(
          evaluated.map((s) => s.procedurePicklistId),
        );

        const manuallySelected = new Set<string>();
        selectedSuggestionIds.forEach((id) => {
          if (!allSuggestionIds.has(id) || activeIds.has(id)) {
            manuallySelected.add(id);
          }
        });
        const newSelected = new Set([...activeIds, ...manuallySelected]);

        const idsToAdd = [...activeIds].filter(
          (id) => !procedures.some((p) => p.picklistEntryId === id),
        );

        const conditionalIds = new Set(
          evaluated
            .filter((s) => s.isConditional)
            .map((s) => s.procedurePicklistId),
        );
        const idsToRemove = new Set(
          [...conditionalIds].filter(
            (id) => !activeIds.has(id) && !manuallySelected.has(id),
          ),
        );

        setProcedures((prev) => {
          let updated = prev.filter(
            (p) => !p.picklistEntryId || !idsToRemove.has(p.picklistEntryId),
          );
          if (idsToAdd.length > 0) {
            const addedProcedures: CaseProcedure[] = idsToAdd.map(
              (picklistId) => {
                const entry = findPicklistEntry(picklistId);
                const clinicalDetails =
                  entry?.hasFreeFlap && selectedDiagnosis
                    ? buildFreeFlapClinicalDetails(
                        picklistId,
                        selectedDiagnosis,
                      )
                    : undefined;
                return {
                  id: uuidv4(),
                  sequenceOrder: 1,
                  procedureName: entry?.displayName || "",
                  specialty: groupSpecialty,
                  surgeonRole: "PS" as Role,
                  picklistEntryId: picklistId,
                  snomedCtCode: entry?.snomedCtCode,
                  snomedCtDisplay: entry?.snomedCtDisplay,
                  subcategory: entry?.subcategory,
                  tags: entry?.tags,
                  clinicalDetails,
                };
              },
            );
            updated = [...updated, ...addedProcedures];
          }
          return updated.map((p, i) => ({ ...p, sequenceOrder: i + 1 }));
        });
        setSelectedSuggestionIds(newSelected);
      }
    },
    [
      stagingValues,
      selectedDiagnosis,
      selectedSuggestionIds,
      procedures,
      groupSpecialty,
      buildFreeFlapClinicalDetails,
    ],
  );

  const handleToggleProcedureSuggestion = useCallback(
    (procedurePicklistId: string, isSelected: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isSelected) {
        setSelectedSuggestionIds(
          (prev) => new Set([...prev, procedurePicklistId]),
        );
        const entry = findPicklistEntry(procedurePicklistId);
        if (
          entry &&
          !procedures.some((p) => p.picklistEntryId === procedurePicklistId)
        ) {
          const clinicalDetails = entry.hasFreeFlap
            ? buildFreeFlapClinicalDetails(
                procedurePicklistId,
                selectedDiagnosis,
              )
            : undefined;
          const newProc: CaseProcedure = {
            id: uuidv4(),
            sequenceOrder: procedures.length + 1,
            procedureName: entry.displayName,
            specialty: groupSpecialty,
            surgeonRole: "PS" as Role,
            picklistEntryId: procedurePicklistId,
            snomedCtCode: entry.snomedCtCode,
            snomedCtDisplay: entry.snomedCtDisplay,
            subcategory: entry.subcategory,
            tags: entry.tags,
            clinicalDetails,
          };
          setProcedures((prev) => [...prev, newProc]);
        }
      } else {
        setSelectedSuggestionIds((prev) => {
          const next = new Set(prev);
          next.delete(procedurePicklistId);
          return next;
        });
        setProcedures((prev) => {
          const filtered = prev.filter(
            (p) => p.picklistEntryId !== procedurePicklistId,
          );
          return filtered.map((p, i) => ({ ...p, sequenceOrder: i + 1 }));
        });
      }
    },
    [
      procedures,
      groupSpecialty,
      selectedDiagnosis,
      buildFreeFlapClinicalDetails,
    ],
  );

  const procedurePicklistIds = useMemo(
    () =>
      procedures
        .map((p) => p.picklistEntryId)
        .filter((id): id is string => !!id),
    [procedures],
  );

  const showDiagnosisSuggestions =
    procedurePicklistIds.length > 0 && !selectedDiagnosis && !primaryDiagnosis;

  // Hub-and-spoke: module visibility + summaries
  const moduleVisibility = useMemo(
    () =>
      getModuleVisibility(
        { ...group, procedures, specialty: groupSpecialty },
        handCaseType ?? undefined,
        infectionOverlay,
        isFirstInfectionGroup,
        episodeType,
      ),
    [
      group,
      procedures,
      groupSpecialty,
      handCaseType,
      infectionOverlay,
      isFirstInfectionGroup,
      episodeType,
    ],
  );

  const isInlineHandTraumaFlow =
    groupSpecialty === "hand_wrist" && handCaseType === "trauma";

  useEffect(() => {
    if (!isInlineHandTraumaFlow) {
      setShowManualTraumaDiagnosisPicker(false);
    }
  }, [isInlineHandTraumaFlow]);

  const freeFlapProcedures = useMemo(
    () => procedures.filter((p) => procedureHasFreeFlap(p)),
    [procedures],
  );

  const activeFlapSheetProcedure = useMemo(
    () =>
      activeFlapSheetProcedureId
        ? freeFlapProcedures.find((p) => p.id === activeFlapSheetProcedureId) ||
          null
        : null,
    [activeFlapSheetProcedureId, freeFlapProcedures],
  );

  const activeFlapOutcomeProcedure = useMemo(
    () =>
      activeFlapOutcomeProcedureId
        ? freeFlapProcedures.find(
            (p) => p.id === activeFlapOutcomeProcedureId,
          ) || null
        : null,
    [activeFlapOutcomeProcedureId, freeFlapProcedures],
  );

  useEffect(() => {
    if (
      activeFlapSheetProcedureId &&
      !freeFlapProcedures.some((p) => p.id === activeFlapSheetProcedureId)
    ) {
      setActiveFlapSheetProcedureId(null);
    }

    if (
      activeFlapOutcomeProcedureId &&
      !freeFlapProcedures.some((p) => p.id === activeFlapOutcomeProcedureId)
    ) {
      setActiveFlapOutcomeProcedureId(null);
    }
  }, [
    activeFlapOutcomeProcedureId,
    activeFlapSheetProcedureId,
    freeFlapProcedures,
  ]);

  useEffect(() => {
    if (diagnosisClinicalDetails.laterality !== "bilateral") return;

    setProcedures((prev) => {
      let hasChanges = false;
      const next = prev.map((procedure) => {
        const details = procedure.clinicalDetails as
          | FreeFlapDetails
          | undefined;
        const flapType =
          details?.flapType ||
          (procedure.picklistEntryId
            ? PICKLIST_TO_FLAP_TYPE[procedure.picklistEntryId]
            : undefined);
        const isBreastDiep =
          procedure.picklistEntryId === "breast_recon_diep" ||
          flapType === "diep";
        if (!isBreastDiep) return procedure;

        const currentSpecific = details?.flapSpecificDetails || {};
        const alreadyApplied = Object.entries(DIEP_BILATERAL_DEFAULTS).every(
          ([key, value]) =>
            currentSpecific[key as keyof typeof currentSpecific] === value,
        );
        if (alreadyApplied) return procedure;

        hasChanges = true;
        const updatedDetails: FreeFlapDetails = {
          ...(details || { harvestSide: "left", anastomoses: [] }),
          harvestSide: details?.harvestSide || "left",
          anastomoses: details?.anastomoses || [],
          flapType: "diep",
          flapSpecificDetails: {
            ...currentSpecific,
            ...DIEP_BILATERAL_DEFAULTS,
          },
        };
        return {
          ...procedure,
          clinicalDetails: updatedDetails,
        };
      });
      return hasChanges ? next : prev;
    });
  }, [diagnosisClinicalDetails.laterality]);

  const monitoringPreference =
    profile?.surgicalPreferences?.microsurgery?.monitoringProtocol;

  const getFlapSummaryForProcedure = useCallback((procedure: CaseProcedure) => {
    return procedure.clinicalDetails
      ? generateFlapSummary(procedure.clinicalDetails as FreeFlapDetails)
      : null;
  }, []);

  const getFlapOutcomeForProcedure = useCallback(
    (procedure: CaseProcedure): FreeFlapOutcomeDetails => {
      const details = procedure.clinicalDetails as FreeFlapDetails | undefined;
      return withDefaultFlapOutcome(details?.flapOutcome, {
        monitoringProtocol: monitoringPreference,
        returnToTheatre,
      });
    },
    [monitoringPreference, returnToTheatre],
  );

  const getFlapOutcomeSummaryForProcedure = useCallback(
    (procedure: CaseProcedure) =>
      generateFlapOutcomeSummary(getFlapOutcomeForProcedure(procedure)),
    [getFlapOutcomeForProcedure],
  );

  const infectionSummary = useMemo(
    () =>
      infectionOverlay ? generateInfectionSummary(infectionOverlay) : null,
    [infectionOverlay],
  );

  const woundSummary = useMemo(
    () => generateWoundSummary(group.woundAssessment),
    [group.woundAssessment],
  );

  const hasAnyModule =
    moduleVisibility.flapDetails ||
    moduleVisibility.infection ||
    moduleVisibility.woundAssessment;

  const hideManualTraumaDiagnosisPicker =
    isInlineHandTraumaFlow && !showManualTraumaDiagnosisPicker;

  const handleReverseDiagnosisSelect = useCallback(
    (dx: DiagnosisPicklistEntry) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setSelectedDiagnosis(dx);
      setPrimaryDiagnosis({ conceptId: dx.snomedCtCode, term: dx.displayName });
      setDiagnosis(dx.displayName);
      setStagingValues({});
      setIsDiagnosisPickerCollapsed(true);
      setShowAllProcedures(false);

      const activeIds = getActiveProcedureIds(dx, {});

      setProcedures((prev) => {
        const existingPicklistIds = new Set(
          prev.map((p) => p.picklistEntryId).filter((id): id is string => !!id),
        );

        const newProcedures: CaseProcedure[] = [];
        for (const picklistId of activeIds) {
          if (!existingPicklistIds.has(picklistId)) {
            const entry = findPicklistEntry(picklistId);
            if (entry) {
              const clinicalDetails = entry.hasFreeFlap
                ? buildFreeFlapClinicalDetails(picklistId, dx)
                : undefined;
              newProcedures.push({
                id: uuidv4(),
                sequenceOrder: prev.length + newProcedures.length + 1,
                procedureName: entry.displayName,
                specialty: groupSpecialty,
                surgeonRole: "PS" as Role,
                picklistEntryId: picklistId,
                snomedCtCode: entry.snomedCtCode,
                snomedCtDisplay: entry.snomedCtDisplay,
                subcategory: entry.subcategory,
                tags: entry.tags,
                clinicalDetails,
              });
            }
          }
        }

        const allIds = new Set([...existingPicklistIds, ...activeIds]);
        setSelectedSuggestionIds(allIds);

        if (newProcedures.length > 0) {
          return [...prev, ...newProcedures];
        }
        return prev;
      });
    },
    [groupSpecialty, buildFreeFlapClinicalDetails],
  );

  const addProcedure = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newProcedure: CaseProcedure = {
      id: uuidv4(),
      sequenceOrder: procedures.length + 1,
      procedureName: "",
      specialty: groupSpecialty,
      surgeonRole: "PS",
    };
    setProcedures((prev) => [...prev, newProcedure]);
  };

  const updateProcedure = (updated: CaseProcedure) => {
    setProcedures((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  };

  const removeProcedure = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProcedures((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      return filtered.map((p, idx) => ({ ...p, sequenceOrder: idx + 1 }));
    });
  };

  const moveProcedureUp = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProcedures((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx <= 0) return prev;
      const newArr = [...prev];
      const a = newArr[idx - 1]!;
      const b = newArr[idx]!;
      newArr[idx - 1] = b;
      newArr[idx] = a;
      return newArr.map((p, i) => ({ ...p, sequenceOrder: i + 1 }));
    });
  };

  const moveProcedureDown = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProcedures((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const newArr = [...prev];
      const a = newArr[idx]!;
      const b = newArr[idx + 1]!;
      newArr[idx] = b;
      newArr[idx + 1] = a;
      return newArr.map((p, i) => ({ ...p, sequenceOrder: i + 1 }));
    });
  };

  const handleSpecialtyChange = (newSpecialty: string) => {
    const s = newSpecialty as Specialty;
    setGroupSpecialty(s);
    setPrimaryDiagnosis(null);
    setDiagnosis("");
    setDiagnosisStaging(null);
    setStagingValues({});
    setDiagnosisClinicalDetails({});
    setSelectedDiagnosis(null);
    setSelectedSuggestionIds(new Set());
    setFractures([]);
    setSnomedSuggestion(null);
    setIsDiagnosisPickerCollapsed(false);
    setShowAllProcedures(false);
    setHandCaseType(null);
    setIsDiagnosisFromAO(false);
    setAoSourceLabel(undefined);
    setAoHints([]);
    setShowManualTraumaDiagnosisPicker(false);
    setAutoAppliedTraumaSuggestionIds(new Set());
    setProcedures([
      {
        id: uuidv4(),
        sequenceOrder: 1,
        procedureName: PROCEDURE_TYPES[s]?.[0] || "",
        specialty: s,
        surgeonRole: "PS",
      },
    ]);
  };

  const clearDiagnosis = useCallback(() => {
    setSelectedDiagnosis(null);
    setPrimaryDiagnosis(null);
    setDiagnosis("");
    setStagingValues({});
    setIsDiagnosisPickerCollapsed(handCaseType === "trauma");
    setShowAllProcedures(false);
    setIsDiagnosisFromAO(false);
    setAoSourceLabel(undefined);
    setAoHints([]);
    setSnomedSuggestion(null);
    setIsDiagnosisFromTrauma(false);
    setTraumaSourceLabel(undefined);
    setShowManualTraumaDiagnosisPicker(false);
    setAutoAppliedTraumaSuggestionIds(new Set());
  }, [handCaseType]);

  const specialtyOptions = Object.entries(SPECIALTY_LABELS).map(
    ([value, label]) => ({
      value,
      label,
    }),
  );

  function deriveDefaultPathologyType(
    dx: DiagnosisPicklistEntry | null,
  ): LesionPathologyType {
    if (!dx) return "bcc";
    const id = dx.id.toLowerCase();
    if (id.includes("melanoma")) return "melanoma";
    if (id.includes("scc")) return "scc";
    if (id.includes("bcc")) return "bcc";
    if (id.includes("benign") || id.includes("naevus") || id.includes("cyst"))
      return "benign";
    return "bcc";
  }

  // Hub-and-spoke save handlers
  const handleFlapSave = useCallback(
    (details: FreeFlapDetails) => {
      if (!activeFlapSheetProcedure) return;
      updateProcedure({
        ...activeFlapSheetProcedure,
        clinicalDetails: details,
      });
    },
    [activeFlapSheetProcedure],
  );

  const handleFlapOutcomeSave = useCallback(
    (outcomeDetails: FreeFlapOutcomeDetails) => {
      if (!activeFlapOutcomeProcedure) return;
      const currentDetails =
        (activeFlapOutcomeProcedure.clinicalDetails as FreeFlapDetails) || {};
      updateProcedure({
        ...activeFlapOutcomeProcedure,
        clinicalDetails: { ...currentDetails, flapOutcome: outcomeDetails },
      });
    },
    [activeFlapOutcomeProcedure],
  );

  const handleFractureWizardClose = useCallback(() => {
    setShowFractureWizard(false);
  }, []);

  const handleFractureWizardSave = useCallback(
    (newFractures: FractureEntry[]) => {
      setFractures(newFractures);
      setShowFractureWizard(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [],
  );

  const handleTraumaDiagnosisResolved = useCallback(
    (resolution: HandTraumaDiagnosisResolution) => {
      const {
        mappingResult,
        fractures: resolvedFractures,
        handTrauma,
        selectedSuggestedProcedureIds,
      } = resolution;

      setDiagnosisClinicalDetails((prev) => ({ ...prev, handTrauma }));
      setFractures(resolvedFractures);

      // Auto-set diagnosis from mapping result
      const dxId = mappingResult.primaryDiagnosis.diagnosisPicklistId;
      const picklist = dxId ? findDiagnosisById(dxId) : null;

      if (picklist) {
        setSelectedDiagnosis(picklist);
        setPrimaryDiagnosis({
          conceptId: picklist.snomedCtCode,
          term: picklist.displayName,
        });
        setDiagnosis(picklist.displayName);
        setIsDiagnosisPickerCollapsed(true);
        setIsDiagnosisFromTrauma(true);
        setTraumaSourceLabel("Hand trauma assessment");
      } else if (mappingResult.primaryDiagnosis.displayName) {
        setPrimaryDiagnosis({
          conceptId: mappingResult.primaryDiagnosis.snomedCtCode,
          term: mappingResult.primaryDiagnosis.displayName,
        });
        setDiagnosis(mappingResult.primaryDiagnosis.displayName);
        setIsDiagnosisPickerCollapsed(true);
        setIsDiagnosisFromTrauma(true);
        setTraumaSourceLabel("Hand trauma assessment");
      }

      const suggestedIds = new Set(
        mappingResult.suggestedProcedures.map((sp) => sp.procedurePicklistId),
      );
      const selectedIds =
        selectedSuggestedProcedureIds &&
        selectedSuggestedProcedureIds.length > 0
          ? new Set(selectedSuggestedProcedureIds)
          : new Set(
              mappingResult.suggestedProcedures
                .filter((sp) => sp.isDefault)
                .map((sp) => sp.procedurePicklistId),
            );

      setSelectedSuggestionIds(selectedIds);
      setAutoAppliedTraumaSuggestionIds(new Set(selectedIds));
      setProcedures((prev) => {
        const retained = prev.filter((p) => {
          const id = p.picklistEntryId;
          if (!id) return true;
          if (!autoAppliedTraumaSuggestionIds.has(id)) return true;
          return selectedIds.has(id);
        });

        const existingIds = new Set(
          retained.map((p) => p.picklistEntryId).filter(Boolean),
        );
        const toAdd: CaseProcedure[] = [];
        for (const selectedId of selectedIds) {
          if (existingIds.has(selectedId)) continue;
          if (!suggestedIds.has(selectedId)) continue;
          const entry = findPicklistEntry(selectedId);
          if (!entry) continue;
          toAdd.push({
            id: uuidv4(),
            sequenceOrder: retained.length + toAdd.length + 1,
            procedureName: entry.displayName,
            specialty: groupSpecialty,
            surgeonRole: "PS" as Role,
            picklistEntryId: selectedId,
            snomedCtCode: entry.snomedCtCode,
            snomedCtDisplay: entry.snomedCtDisplay,
            subcategory: entry.subcategory,
            tags: entry.tags,
          });
        }

        return [...retained, ...toAdd].map((p, idx) => ({
          ...p,
          sequenceOrder: idx + 1,
        }));
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [groupSpecialty, autoAppliedTraumaSuggestionIds],
  );

  const handleTraumaAssessmentAccept = useCallback(
    ({
      mappingResult,
      selectedProcedureIds,
    }: HandTraumaAssessmentAcceptPayload) => {
      if (!mappingResult) return;
      handleTraumaDiagnosisResolved({
        mappingResult,
        fractures,
        handTrauma: diagnosisClinicalDetails.handTrauma || {},
        procedures,
        selectedSuggestedProcedureIds: selectedProcedureIds,
      });
      setIsDiagnosisPickerCollapsed(true);
      setShowManualTraumaDiagnosisPicker(false);
    },
    [
      diagnosisClinicalDetails.handTrauma,
      fractures,
      procedures,
      handleTraumaDiagnosisResolved,
    ],
  );

  const handleInfectionSave = useCallback(
    (overlay: InfectionOverlay) => {
      onInfectionChange?.(overlay);
    },
    [onInfectionChange],
  );

  const handleWoundSave = useCallback(
    (assessment: WoundAssessment) => {
      onChange({ ...group, woundAssessment: assessment });
    },
    [group, onChange],
  );

  if (!isExpanded && !isOnly) {
    return (
      <View
        style={[
          styles.diagnosisCard,
          {
            backgroundColor: theme.backgroundElevated,
            borderLeftColor: accentColor,
          },
          Shadows.card,
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsExpanded(true);
          }}
          style={styles.collapsedGroupCardInner}
        >
          <View style={styles.collapsedGroupHeader}>
            <View
              style={[
                styles.orderBadge,
                { backgroundColor: accentColor + "20" },
              ]}
            >
              <ThemedText style={[styles.orderText, { color: accentColor }]}>
                {index + 1}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: Spacing.sm,
                }}
              >
                <ThemedText style={{ fontWeight: "600", fontSize: 15 }}>
                  {SPECIALTY_LABELS[groupSpecialty]}
                </ThemedText>
                {index === 0 && !isOnly ? (
                  <View
                    style={[
                      styles.primaryBadge,
                      { backgroundColor: theme.link },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.primaryBadgeText,
                        { color: theme.buttonText },
                      ]}
                    >
                      Primary
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText
                style={{
                  color: theme.textSecondary,
                  fontSize: 13,
                  marginTop: 2,
                }}
              >
                {group.diagnosis?.displayName || "No diagnosis"} ·{" "}
                {procedures.length} procedure
                {procedures.length !== 1 ? "s" : ""}
              </ThemedText>
            </View>
            {isComplete ? (
              <Feather
                name="check-circle"
                size={16}
                color={theme.success}
                style={{ marginRight: Spacing.sm }}
              />
            ) : null}
            {totalGroups > 1 ? (
              <View style={styles.reorderButtons}>
                {onMoveUp && index > 0 ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      onMoveUp();
                    }}
                    hitSlop={8}
                  >
                    <Feather
                      name="chevron-up"
                      size={18}
                      color={theme.textTertiary}
                    />
                  </Pressable>
                ) : null}
                {onMoveDown && index < totalGroups - 1 ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      onMoveDown();
                    }}
                    hitSlop={8}
                  >
                    <Feather
                      name="chevron-down"
                      size={18}
                      color={theme.textTertiary}
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <Feather
              name="chevron-right"
              size={20}
              color={theme.textSecondary}
            />
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.diagnosisCard,
        {
          backgroundColor: theme.backgroundElevated,
          borderLeftColor: accentColor,
        },
        !isOnly ? Shadows.card : undefined,
      ]}
    >
      {!isOnly ? (
        <View style={[styles.groupHeader, { borderBottomColor: theme.border }]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.sm,
              flex: 1,
            }}
          >
            <View
              style={[
                styles.orderBadge,
                { backgroundColor: accentColor + "20" },
              ]}
            >
              <ThemedText style={[styles.orderText, { color: accentColor }]}>
                {index + 1}
              </ThemedText>
            </View>
            <ThemedText style={[styles.groupTitle, { color: theme.text }]}>
              Diagnosis Group {index + 1}
            </ThemedText>
            {index === 0 ? (
              <View
                style={[styles.primaryBadge, { backgroundColor: theme.link }]}
              >
                <ThemedText
                  style={[styles.primaryBadgeText, { color: theme.buttonText }]}
                >
                  Primary
                </ThemedText>
              </View>
            ) : null}
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.sm,
            }}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsExpanded(false);
              }}
              hitSlop={8}
            >
              <Feather name="minus" size={20} color={theme.textSecondary} />
            </Pressable>
            {index > 0 ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onDelete();
                }}
                hitSlop={8}
              >
                <Feather name="trash-2" size={18} color={theme.error} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={!isOnly ? styles.cardContent : undefined}>
        {index > 0 ? (
          <PickerField
            label="Specialty"
            value={groupSpecialty}
            options={specialtyOptions}
            onSelect={handleSpecialtyChange}
          />
        ) : null}

        {/* Feature 3: Hand surgery case type selector */}
        {groupSpecialty === "hand_wrist" ? (
          <View style={styles.caseTypeSelectorContainer}>
            <ThemedText
              style={[styles.caseTypeLabel, { color: theme.textSecondary }]}
            >
              Case Type
            </ThemedText>
            <View style={styles.caseTypeButtons}>
              {(["trauma", "elective"] as const).map((type) => {
                const isActive = handCaseType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (handCaseType !== type) {
                        clearDiagnosis();
                        setAoHints([]);
                        setAutoAppliedTraumaSuggestionIds(new Set());
                      }
                      setHandCaseType(type);
                      setShowManualTraumaDiagnosisPicker(false);
                      if (type === "trauma") {
                        setIsDiagnosisPickerCollapsed(true);
                      }
                    }}
                    style={[
                      styles.caseTypeButton,
                      {
                        backgroundColor: isActive
                          ? theme.link
                          : theme.backgroundDefault,
                        borderColor: isActive ? theme.link : theme.border,
                      },
                    ]}
                    testID={`button-case-type-${type}`}
                  >
                    <ThemedText
                      style={[
                        styles.caseTypeButtonText,
                        {
                          color: isActive
                            ? theme.buttonText
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {type === "trauma" ? "Trauma" : "Elective"}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {isInlineHandTraumaFlow ? (
          <>
            <SectionHeader
              title="Hand Trauma Assessment"
              subtitle="Describe injury pattern first. Diagnosis and procedures are auto-suggested."
            />
            <HandTraumaAssessment
              value={diagnosisClinicalDetails.handTrauma || {}}
              onChange={(details) =>
                setDiagnosisClinicalDetails((prev) => ({
                  ...prev,
                  handTrauma: details,
                }))
              }
              fractures={fractures}
              onFracturesChange={setFractures}
              procedures={procedures}
              onProceduresChange={(updater) =>
                setProcedures((prev) =>
                  updater(prev).map((proc, idx) => ({
                    ...proc,
                    sequenceOrder: idx + 1,
                  })),
                )
              }
              selectedDiagnosis={selectedDiagnosis ?? undefined}
              onAccept={handleTraumaAssessmentAccept}
              onEditDiagnosis={() => setShowManualTraumaDiagnosisPicker(true)}
              onAddProcedureManual={addProcedure}
            />
          </>
        ) : null}

        <SectionHeader
          title="Primary Diagnosis"
          subtitle={
            isInlineHandTraumaFlow && !showManualTraumaDiagnosisPicker
              ? "Auto-populated from trauma assessment. You can still edit manually."
              : hasDiagnosisPicklist(groupSpecialty)
                ? "Select from structured list or search SNOMED CT"
                : "SNOMED CT coded diagnosis"
          }
        />

        {/* Feature 1: collapsed card OR full picker */}
        {hasDiagnosisPicklist(groupSpecialty) ? (
          hideManualTraumaDiagnosisPicker ? (
            selectedDiagnosis ? (
              <SelectedDiagnosisCard
                diagnosis={selectedDiagnosis}
                onClear={clearDiagnosis}
                sourceLabel={
                  isDiagnosisFromAO
                    ? aoSourceLabel
                    : isDiagnosisFromTrauma
                      ? traumaSourceLabel
                      : undefined
                }
              />
            ) : (
              <View
                style={[
                  styles.suggestionBanner,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="target" size={16} color={theme.link} />
                <ThemedText
                  style={[
                    styles.suggestionText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Complete trauma assessment and tap Accept to set diagnosis.
                </ThemedText>
              </View>
            )
          ) : isDiagnosisPickerCollapsed && selectedDiagnosis ? (
            <SelectedDiagnosisCard
              diagnosis={selectedDiagnosis}
              onClear={clearDiagnosis}
              sourceLabel={
                isDiagnosisFromAO
                  ? aoSourceLabel
                  : isDiagnosisFromTrauma
                    ? traumaSourceLabel
                    : undefined
              }
            />
          ) : (
            <DiagnosisPicker
              specialty={groupSpecialty}
              selectedDiagnosisId={selectedDiagnosis?.id}
              onSelect={handleDiagnosisSelect}
              clinicalGroupFilter={
                groupSpecialty === "hand_wrist" && handCaseType === "trauma"
                  ? "trauma"
                  : groupSpecialty === "hand_wrist" &&
                      handCaseType === "elective"
                    ? "non-trauma"
                    : undefined
              }
            />
          )
        ) : null}

        {isInlineHandTraumaFlow ? (
          <Pressable
            style={styles.inlineDiagnosisToggle}
            onPress={() => setShowManualTraumaDiagnosisPicker((prev) => !prev)}
          >
            <Feather
              name={hideManualTraumaDiagnosisPicker ? "edit-3" : "refresh-ccw"}
              size={14}
              color={theme.link}
            />
            <ThemedText
              style={[styles.inlineDiagnosisToggleText, { color: theme.link }]}
            >
              {hideManualTraumaDiagnosisPicker
                ? "Change diagnosis manually"
                : "Use trauma auto-diagnosis"}
            </ThemedText>
          </Pressable>
        ) : null}

        {/* SNOMED-only specialties: collapse when selected */}
        {!hasDiagnosisPicklist(groupSpecialty) ? (
          isDiagnosisPickerCollapsed && primaryDiagnosis ? (
            <SelectedDiagnosisCard
              diagnosis={{
                displayName: primaryDiagnosis.term,
                snomedCtCode: primaryDiagnosis.conceptId,
              }}
              onClear={clearDiagnosis}
            />
          ) : (
            <SnomedSearchPicker
              label="Search Diagnosis"
              value={primaryDiagnosis || undefined}
              onSelect={(val) => {
                setPrimaryDiagnosis(val);
                if (val) setIsDiagnosisPickerCollapsed(true);
              }}
              searchType="diagnosis"
              specialty={groupSpecialty}
              placeholder="Search for diagnosis (e.g., fracture, Dupuytren)..."
            />
          )
        ) : null}

        {/* For specialties with picklist: still show SNOMED search below picker (unless collapsed) */}
        {hasDiagnosisPicklist(groupSpecialty) &&
        !isDiagnosisPickerCollapsed &&
        !hideManualTraumaDiagnosisPicker ? (
          <SnomedSearchPicker
            label="Search Diagnosis"
            value={primaryDiagnosis || undefined}
            onSelect={(val) => {
              setPrimaryDiagnosis(val);
              if (val) setIsDiagnosisPickerCollapsed(true);
            }}
            searchType="diagnosis"
            specialty={groupSpecialty}
            placeholder="Search for diagnosis (e.g., fracture, Dupuytren)..."
          />
        ) : null}

        {hasFractureSubcategory &&
        snomedSuggestion &&
        primaryDiagnosis &&
        !isDiagnosisFromAO ? (
          <View
            style={[
              styles.suggestionBanner,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="zap" size={16} color={theme.link} />
            <ThemedText
              style={[styles.suggestionText, { color: theme.textSecondary }]}
            >
              Auto-suggested from AO code
            </ThemedText>
          </View>
        ) : null}

        {showDiagnosisSuggestions ? (
          <DiagnosisSuggestions
            procedurePicklistIds={procedurePicklistIds}
            specialty={groupSpecialty}
            onSelect={handleReverseDiagnosisSelect}
          />
        ) : null}

        {diagnosisStaging && diagnosisStaging.stagingSystems.length > 0 ? (
          <View style={styles.stagingContainer}>
            <ThemedText
              style={[styles.stagingTitle, { color: theme.textSecondary }]}
            >
              Classification / Staging
            </ThemedText>
            {diagnosisStaging.stagingSystems.map((system) => (
              <PickerField
                key={system.name}
                label={system.name}
                value={stagingValues[system.name] || ""}
                options={system.options.map((opt) => ({
                  value: opt.value,
                  label: opt.description
                    ? `${opt.label} - ${opt.description}`
                    : opt.label,
                }))}
                onSelect={(value) => {
                  if (selectedDiagnosis) {
                    handleStagingChangeForSuggestions(system.name, value);
                  } else {
                    setStagingValues((prev) => ({
                      ...prev,
                      [system.name]: value,
                    }));
                  }
                }}
                placeholder={`Select ${system.name.toLowerCase()}...`}
              />
            ))}
          </View>
        ) : null}

        {/* Clinical suspicion buttons for excision biopsy diagnoses */}
        {isExcisionBiopsyDiagnosis(selectedDiagnosis?.id) ? (
          <View style={styles.stagingContainer}>
            <ThemedText
              style={[styles.clinicalSuspicionLabel, { color: theme.text }]}
            >
              Clinical suspicion (optional)
            </ThemedText>
            <View style={styles.clinicalSuspicionOptions}>
              {(
                Object.entries(CLINICAL_SUSPICION_LABELS) as [
                  ClinicalSuspicion,
                  string,
                ][]
              ).map(([value, label]) => {
                const isSelected = clinicalSuspicion === value;
                return (
                  <Pressable
                    key={value}
                    style={[
                      styles.clinicalSuspicionButton,
                      {
                        backgroundColor: isSelected
                          ? theme.link
                          : theme.backgroundSecondary,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setClinicalSuspicion(
                        isSelected ? undefined : (value as ClinicalSuspicion),
                      );
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.clinicalSuspicionButtonText,
                        { color: isSelected ? "#FFF" : theme.text },
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {primaryDiagnosis ? (
          <DiagnosisClinicalFields
            diagnosis={{
              snomedCtCode: primaryDiagnosis.conceptId,
              displayName: primaryDiagnosis.term,
              clinicalDetails: diagnosisClinicalDetails,
            }}
            onDiagnosisChange={(updatedDiagnosis) => {
              setDiagnosisClinicalDetails(
                updatedDiagnosis.clinicalDetails || {},
              );
            }}
            specialty={groupSpecialty}
            fractures={fractures}
            onFracturesChange={setFractures}
            showFractureClassification={
              hasFractureSubcategory && !isInlineHandTraumaFlow
            }
            onOpenFractureWizard={() => setShowFractureWizard(true)}
          />
        ) : null}

        {/* Visual connector between diagnosis and procedures */}
        <View style={styles.connector}>
          <Feather name="arrow-down" size={16} color={theme.textTertiary} />
        </View>

        <SectionHeader title="Procedures Performed" />

        <ThemedText
          style={[styles.sectionDescription, { color: theme.textSecondary }]}
        >
          Add all procedures performed during this surgery. Each procedure can
          have its own specialty and SNOMED CT code.
        </ThemedText>

        {selectedDiagnosis?.hasEnhancedHistology ||
        groupSpecialty === "general" ||
        groupSpecialty === "head_neck" ||
        groupSpecialty === "skin_cancer" ? (
          <View style={{ marginBottom: Spacing.md }}>
            <Pressable
              onPress={() => {
                const newValue = !isMultiLesion;
                setIsMultiLesion(newValue);
                if (newValue && lesionInstances.length === 0) {
                  setLesionInstances([
                    {
                      id: uuidv4(),
                      site: "",
                      pathologyType:
                        deriveDefaultPathologyType(selectedDiagnosis),
                      reconstruction: "primary_closure",
                      marginStatus: "pending",
                      histologyConfirmed: false,
                    },
                  ]);
                }
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: BorderRadius.sm,
                borderWidth: 1,
                borderColor: isMultiLesion ? theme.link : theme.border,
                backgroundColor: isMultiLesion
                  ? theme.link + "10"
                  : theme.backgroundDefault,
              }}
            >
              <Feather
                name={isMultiLesion ? "check-square" : "square"}
                size={18}
                color={isMultiLesion ? theme.link : theme.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: isMultiLesion ? theme.link : theme.text,
                  }}
                >
                  Multiple lesions in this session
                </ThemedText>
                <ThemedText
                  style={{
                    fontSize: 12,
                    color: theme.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Log each excision site separately
                </ThemedText>
              </View>
            </Pressable>
          </View>
        ) : null}

        {isMultiLesion ? (
          <MultiLesionEditor
            lesions={lesionInstances}
            onChange={setLesionInstances}
            defaultPathologyType={deriveDefaultPathologyType(selectedDiagnosis)}
          />
        ) : (
          (() => {
            // Feature 2: procedure filtering
            const hasSuggestedProcedures =
              (selectedDiagnosis?.suggestedProcedures?.length ?? 0) > 0;
            const showFiltered = hasSuggestedProcedures && !showAllProcedures;

            return (
              <>
                {selectedDiagnosis ? (
                  <ProcedureSuggestions
                    diagnosis={selectedDiagnosis}
                    stagingSelections={stagingValues}
                    selectedProcedureIds={selectedSuggestionIds}
                    onToggle={handleToggleProcedureSuggestion}
                  />
                ) : null}

                {showFiltered ? (
                  <Pressable
                    style={styles.showAllProceduresLink}
                    onPress={() => setShowAllProcedures(true)}
                    testID="button-show-all-procedures"
                  >
                    <Feather name="chevron-down" size={16} color={theme.link} />
                    <ThemedText
                      style={[
                        styles.showAllProceduresText,
                        { color: theme.link },
                      ]}
                    >
                      Show all procedures
                    </ThemedText>
                  </Pressable>
                ) : (
                  <>
                    {showAllProcedures ? (
                      <Pressable
                        style={styles.showAllProceduresLink}
                        onPress={() => setShowAllProcedures(false)}
                        testID="button-show-fewer-procedures"
                      >
                        <Feather
                          name="chevron-up"
                          size={16}
                          color={theme.textSecondary}
                        />
                        <ThemedText
                          style={[
                            styles.showAllProceduresText,
                            { color: theme.textSecondary },
                          ]}
                        >
                          Show fewer procedures
                        </ThemedText>
                      </Pressable>
                    ) : null}

                    {procedures.map((proc, idx) => (
                      <ProcedureEntryCard
                        key={proc.id}
                        procedure={proc}
                        index={idx}
                        isOnlyProcedure={procedures.length === 1}
                        onUpdate={updateProcedure}
                        onDelete={() => removeProcedure(proc.id)}
                        onMoveUp={() => moveProcedureUp(proc.id)}
                        onMoveDown={() => moveProcedureDown(proc.id)}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < procedures.length - 1}
                        diagnosisId={selectedDiagnosis?.id}
                        clinicalGroup={selectedDiagnosis?.clinicalGroup}
                        diagnosisLaterality={
                          diagnosisClinicalDetails.laterality
                        }
                      />
                    ))}

                    <Pressable
                      style={[styles.addButton, { borderColor: theme.link }]}
                      onPress={addProcedure}
                    >
                      <Feather name="plus" size={18} color={theme.link} />
                      <ThemedText
                        style={[styles.addButtonText, { color: theme.link }]}
                      >
                        Add Another Procedure
                      </ThemedText>
                    </Pressable>
                  </>
                )}
              </>
            );
          })()
        )}

        {/* Hub-and-spoke: Clinical Details module rows */}
        {hasAnyModule ? (
          <View style={styles.hubSection}>
            <ThemedText
              style={[styles.hubSectionTitle, { color: theme.textSecondary }]}
            >
              Clinical Details
            </ThemedText>
            {moduleVisibility.flapDetails
              ? freeFlapProcedures.map((procedure, flapIndex) => {
                  const flapSummary = getFlapSummaryForProcedure(procedure);
                  const title =
                    freeFlapProcedures.length === 1
                      ? "Flap Details"
                      : `${
                          procedure.procedureName || `Flap ${flapIndex + 1}`
                        } Details`;

                  return (
                    <DetailModuleRow
                      key={`flap-details-${procedure.id}`}
                      title={title}
                      summary={flapSummary}
                      isComplete={flapSummary !== null}
                      onPress={() =>
                        setActiveFlapSheetProcedureId(procedure.id)
                      }
                      icon="activity"
                    />
                  );
                })
              : null}
            {moduleVisibility.flapOutcome
              ? freeFlapProcedures.map((procedure, flapIndex) => {
                  const flapOutcomeSummary =
                    getFlapOutcomeSummaryForProcedure(procedure);
                  const title =
                    freeFlapProcedures.length === 1
                      ? "Flap Outcome"
                      : `${
                          procedure.procedureName || `Flap ${flapIndex + 1}`
                        } Outcome`;

                  return (
                    <DetailModuleRow
                      key={`flap-outcome-${procedure.id}`}
                      title={title}
                      summary={flapOutcomeSummary}
                      isComplete={flapOutcomeSummary !== null}
                      onPress={() =>
                        setActiveFlapOutcomeProcedureId(procedure.id)
                      }
                      icon="heart"
                    />
                  );
                })
              : null}
            {moduleVisibility.infection ? (
              <DetailModuleRow
                title="Infection Details"
                summary={infectionSummary}
                isComplete={infectionSummary !== null}
                onPress={() => setShowInfectionSheet(true)}
                icon="alert-triangle"
              />
            ) : null}
            {moduleVisibility.woundAssessment ? (
              <DetailModuleRow
                title="Wound Assessment"
                summary={woundSummary}
                isComplete={woundSummary !== null}
                onPress={() => setShowWoundSheet(true)}
                icon="thermometer"
              />
            ) : null}
          </View>
        ) : null}

        {/* Modal sheets */}

        {/* Standalone fracture wizard for non-trauma cases (elective hand surgery) */}
        {!isInlineHandTraumaFlow ? (
          <FractureClassificationWizard
            visible={showFractureWizard}
            onClose={handleFractureWizardClose}
            onSave={handleFractureWizardSave}
            initialFractures={fractures}
          />
        ) : null}

        {moduleVisibility.flapDetails && activeFlapSheetProcedure ? (
          <FreeFlapSheet
            visible
            onClose={() => setActiveFlapSheetProcedureId(null)}
            onSave={handleFlapSave}
            initialDetails={
              (activeFlapSheetProcedure.clinicalDetails as FreeFlapDetails) || {
                flapType: "",
                harvestSide: "left",
                anastomoses: [],
              }
            }
            procedureType={activeFlapSheetProcedure.procedureName}
            picklistEntryId={activeFlapSheetProcedure.picklistEntryId}
          />
        ) : null}

        {moduleVisibility.flapOutcome && activeFlapOutcomeProcedure ? (
          <FlapOutcomeSheet
            visible
            onClose={() => setActiveFlapOutcomeProcedureId(null)}
            onSave={handleFlapOutcomeSave}
            initialOutcome={getFlapOutcomeForProcedure(
              activeFlapOutcomeProcedure,
            )}
          />
        ) : null}

        {moduleVisibility.infection ? (
          <InfectionSheet
            visible={showInfectionSheet}
            onClose={() => setShowInfectionSheet(false)}
            onSave={handleInfectionSave}
            initialOverlay={infectionOverlay}
          />
        ) : null}

        {moduleVisibility.woundAssessment ? (
          <WoundAssessmentSheet
            visible={showWoundSheet}
            onClose={() => setShowWoundSheet(false)}
            onSave={handleWoundSave}
            initialAssessment={group.woundAssessment}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clinicalSuspicionLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  clinicalSuspicionOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  clinicalSuspicionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  clinicalSuspicionButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  diagnosisCard: {
    borderLeftWidth: 4,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  cardContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  primaryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  primaryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  connector: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  suggestionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  suggestionText: {
    fontSize: 13,
  },
  stagingContainer: {
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  stagingTitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.md,
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  showAllProceduresLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  showAllProceduresText: {
    fontSize: 14,
    fontWeight: "500",
  },
  inlineDiagnosisToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inlineDiagnosisToggleText: {
    fontSize: 13,
    fontWeight: "500",
  },
  caseTypeSelectorContainer: {
    marginBottom: Spacing.md,
  },
  caseTypeLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  caseTypeButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  caseTypeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
  },
  caseTypeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  aoSection: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  aoSectionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  aoSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  aoSummaryText: {
    flex: 1,
    fontSize: 13,
  },
  aoOpenButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  aoOpenButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  collapsedGroupCardInner: {
    padding: Spacing.md,
  },
  collapsedGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reorderButtons: {
    gap: 2,
    marginRight: Spacing.xs,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: {
    fontSize: 14,
    fontWeight: "700",
  },
  hubSection: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  hubSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
});
