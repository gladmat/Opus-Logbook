import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
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
} from "@/types/case";
import { PickerField } from "@/components/FormField";
import { SnomedSearchPicker } from "@/components/SnomedSearchPicker";
import { getDiagnosisStaging, DiagnosisStagingConfig } from "@/lib/snomedApi";
import { DiagnosisClinicalFields } from "@/components/DiagnosisClinicalFields";
import { FractureClassificationWizard } from "@/components/FractureClassificationWizard";
import { ProcedureEntryCard } from "@/components/ProcedureEntryCard";
import { DiagnosisPicker } from "@/components/DiagnosisPicker";
import { ProcedureSuggestions } from "@/components/ProcedureSuggestions";
import { getAoToSnomedSuggestion } from "@/data/aoToSnomedMapping";
import {
  hasDiagnosisPicklist,
  getActiveProcedureIds,
  evaluateSuggestions,
  findDiagnosisById,
} from "@/lib/diagnosisPicklists";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import { findPicklistEntry, PICKLIST_TO_FLAP_TYPE } from "@/lib/procedurePicklist";
import { FLAP_SNOMED_MAP, type FreeFlapDetails } from "@/types/case";
import { SectionHeader } from "@/components/SectionHeader";
import { DiagnosisSuggestions } from "@/components/DiagnosisSuggestions";
import { HandTraumaStructurePicker } from "@/components/hand-trauma/HandTraumaStructurePicker";
import { MultiLesionEditor } from "@/components/MultiLesionEditor";
import type { LesionInstance, LesionPathologyType } from "@/types/case";
import { SelectedDiagnosisCard } from "@/components/SelectedDiagnosisCard";
import { resolveAOToDiagnosis, applyProcedureHints, type AOProcedureHint } from "@/lib/aoToDiagnosisMapping";

interface DiagnosisGroupEditorProps {
  group: DiagnosisGroup;
  index: number;
  isOnly: boolean;
  onChange: (updatedGroup: DiagnosisGroup) => void;
  onDelete: () => void;
}

export function DiagnosisGroupEditor({ group, index, isOnly, onChange, onDelete }: DiagnosisGroupEditorProps) {
  const { theme } = useTheme();
  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [groupSpecialty, setGroupSpecialty] = useState<Specialty>(group.specialty);
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState<{ conceptId: string; term: string } | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisStaging, setDiagnosisStaging] = useState<DiagnosisStagingConfig | null>(null);
  const [stagingValues, setStagingValues] = useState<Record<string, string>>(group.diagnosisStagingSelections || {});
  const [diagnosisClinicalDetails, setDiagnosisClinicalDetails] = useState<DiagnosisClinicalDetails>(group.diagnosisClinicalDetails || {});
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosisPicklistEntry | null>(null);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [procedures, setProcedures] = useState<CaseProcedure[]>(group.procedures);
  const [fractures, setFractures] = useState<FractureEntry[]>(group.fractures || []);
  const [showFractureWizard, setShowFractureWizard] = useState(false);
  const [snomedSuggestion, setSnomedSuggestion] = useState<{ searchTerm: string; displayName: string } | null>(null);
  const [isMultiLesion, setIsMultiLesion] = useState<boolean>(group.isMultiLesion ?? false);
  const [lesionInstances, setLesionInstances] = useState<LesionInstance[]>(group.lesionInstances ?? []);
  const [isExpanded, setIsExpanded] = useState<boolean>(!group.diagnosis?.displayName);
  const [clinicalSuspicion, setClinicalSuspicion] = useState<ClinicalSuspicion | undefined>(group.clinicalSuspicion);

  // Feature 1: collapse diagnosis picklist after selection
  const [isDiagnosisPickerCollapsed, setIsDiagnosisPickerCollapsed] = useState<boolean>(!!group.diagnosisPicklistId);

  // Feature 2: procedure filtering
  const [showAllProcedures, setShowAllProcedures] = useState<boolean>(false);

  // Feature 3: hand surgery trauma/elective branching
  const [handCaseType, setHandCaseType] = useState<"trauma" | "elective" | null>(null);
  const [isDiagnosisFromAO, setIsDiagnosisFromAO] = useState<boolean>(false);
  const [aoSourceLabel, setAoSourceLabel] = useState<string | undefined>(undefined);
  const [aoHints, setAoHints] = useState<AOProcedureHint[]>([]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (group.diagnosis?.snomedCtCode) {
      setPrimaryDiagnosis({ conceptId: group.diagnosis.snomedCtCode, term: group.diagnosis.displayName });
    } else if (group.diagnosis?.displayName) {
      setDiagnosis(group.diagnosis.displayName);
    }

    if (group.diagnosisPicklistId) {
      const dx = findDiagnosisById(group.diagnosisPicklistId);
      if (dx) {
        setSelectedDiagnosis(dx);
        const procIds = group.procedures
          .map(p => p.picklistEntryId)
          .filter(Boolean) as string[];
        setSelectedSuggestionIds(new Set(procIds));

        // Infer hand case type from loaded diagnosis
        if (group.specialty === "hand_surgery") {
          setHandCaseType(dx.clinicalGroup === "trauma" ? "trauma" : "elective");
        }
      }
    }
  }, [group]);

  const hasFractureSubcategory = groupSpecialty === "hand_surgery" && procedures.some(
    (p) => p.subcategory === "Fracture & Joint Fixation"
  );

  useEffect(() => {
    if (!hasFractureSubcategory) {
      setFractures([]);
    }
  }, [hasFractureSubcategory]);

  useEffect(() => {
    const fetchStaging = async () => {
      if (primaryDiagnosis) {
        const staging = await getDiagnosisStaging(primaryDiagnosis.conceptId, primaryDiagnosis.term);
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
      id: group.id,
      sequenceOrder: group.sequenceOrder,
      specialty: groupSpecialty,
      diagnosis: primaryDiagnosis
        ? { snomedCtCode: primaryDiagnosis.conceptId, displayName: primaryDiagnosis.term }
        : (diagnosis.trim() ? { displayName: diagnosis.trim() } : undefined),
      diagnosisPicklistId: selectedDiagnosis?.id || undefined,
      diagnosisStagingSelections: Object.keys(stagingValues).length > 0 ? stagingValues : undefined,
      diagnosisClinicalDetails: Object.keys(diagnosisClinicalDetails).length > 0 ? diagnosisClinicalDetails : undefined,
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
    groupSpecialty, primaryDiagnosis, diagnosis, selectedDiagnosis,
    stagingValues, diagnosisClinicalDetails, fractures, procedures,
    isMultiLesion, lesionInstances, clinicalSuspicion,
    group.id, group.sequenceOrder,
  ]);

  const buildDefaultProcedures = useCallback((): CaseProcedure[] => ([
    {
      id: uuidv4(),
      sequenceOrder: 1,
      procedureName: PROCEDURE_TYPES[groupSpecialty]?.[0] || "",
      specialty: groupSpecialty,
      surgeonRole: "PS",
    },
  ]), [groupSpecialty]);

  const handleDiagnosisSelect = useCallback((dx: DiagnosisPicklistEntry, hints: AOProcedureHint[] = []) => {
    setSelectedDiagnosis(dx);
    setPrimaryDiagnosis({ conceptId: dx.snomedCtCode, term: dx.displayName });
    setDiagnosis(dx.displayName);
    setStagingValues({});
    setIsDiagnosisPickerCollapsed(true);
    setShowAllProcedures(false);

    // Apply AO procedure hints if provided (promote/demote defaults)
    const effectiveSuggestions = hints.length > 0 && dx.suggestedProcedures
      ? applyProcedureHints(dx.suggestedProcedures, hints)
      : dx.suggestedProcedures;
    const effectiveDx = hints.length > 0
      ? { ...dx, suggestedProcedures: effectiveSuggestions }
      : dx;
    const activeIds = getActiveProcedureIds(effectiveDx, {});
    setSelectedSuggestionIds(new Set(activeIds));

    const newProcedures: CaseProcedure[] = activeIds.map((picklistId, idx) => {
      const entry = findPicklistEntry(picklistId);
      let clinicalDetails: FreeFlapDetails | undefined = undefined;
      if (entry?.hasFreeFlap) {
        const mappedFlapType = PICKLIST_TO_FLAP_TYPE[picklistId];
        if (mappedFlapType) {
          const snomedEntry = FLAP_SNOMED_MAP[mappedFlapType];
          clinicalDetails = {
            flapType: mappedFlapType,
            flapSnomedCode: snomedEntry?.code,
            flapSnomedDisplay: snomedEntry?.display,
            harvestSide: "left",
            indication: "trauma",
            anastomoses: [],
          } as FreeFlapDetails;
        }
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
    });
    setProcedures(newProcedures.length > 0 ? newProcedures : buildDefaultProcedures());
  }, [groupSpecialty, buildDefaultProcedures]);

  const handleStagingChangeForSuggestions = useCallback((systemName: string, value: string) => {
    const newStagingValues = { ...stagingValues, [systemName]: value };
    setStagingValues(newStagingValues);

    if (selectedDiagnosis) {
      const evaluated = evaluateSuggestions(selectedDiagnosis, newStagingValues);
      const activeIds = new Set(evaluated.filter((s) => s.isActive).map((s) => s.procedurePicklistId));
      const allSuggestionIds = new Set(evaluated.map((s) => s.procedurePicklistId));

      const manuallySelected = new Set<string>();
      selectedSuggestionIds.forEach((id) => {
        if (!allSuggestionIds.has(id) || activeIds.has(id)) {
          manuallySelected.add(id);
        }
      });
      const newSelected = new Set([...activeIds, ...manuallySelected]);

      const idsToAdd = [...activeIds].filter(
        (id) => !procedures.some((p) => p.picklistEntryId === id)
      );

      const conditionalIds = new Set(
        evaluated.filter((s) => s.isConditional).map((s) => s.procedurePicklistId)
      );
      const idsToRemove = new Set(
        [...conditionalIds].filter((id) => !activeIds.has(id) && !manuallySelected.has(id))
      );

      setProcedures((prev) => {
        let updated = prev.filter((p) => !p.picklistEntryId || !idsToRemove.has(p.picklistEntryId));
        if (idsToAdd.length > 0) {
          const addedProcedures: CaseProcedure[] = idsToAdd.map((picklistId) => {
            const entry = findPicklistEntry(picklistId);
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
            };
          });
          updated = [...updated, ...addedProcedures];
        }
        return updated.map((p, i) => ({ ...p, sequenceOrder: i + 1 }));
      });
      setSelectedSuggestionIds(newSelected);
    }
  }, [stagingValues, selectedDiagnosis, selectedSuggestionIds, procedures, groupSpecialty]);

  const handleToggleProcedureSuggestion = useCallback((procedurePicklistId: string, isSelected: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSelected) {
      setSelectedSuggestionIds((prev) => new Set([...prev, procedurePicklistId]));
      const entry = findPicklistEntry(procedurePicklistId);
      if (entry && !procedures.some((p) => p.picklistEntryId === procedurePicklistId)) {
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
        const filtered = prev.filter((p) => p.picklistEntryId !== procedurePicklistId);
        return filtered.map((p, i) => ({ ...p, sequenceOrder: i + 1 }));
      });
    }
  }, [procedures, groupSpecialty]);

  const procedurePicklistIds = useMemo(
    () => procedures
      .map((p) => p.picklistEntryId)
      .filter((id): id is string => !!id),
    [procedures]
  );

  const showDiagnosisSuggestions =
    procedurePicklistIds.length > 0 &&
    !selectedDiagnosis &&
    !primaryDiagnosis;

  const handleReverseDiagnosisSelect = useCallback((dx: DiagnosisPicklistEntry) => {
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
        prev
          .map((p) => p.picklistEntryId)
          .filter((id): id is string => !!id)
      );

      const newProcedures: CaseProcedure[] = [];
      for (const picklistId of activeIds) {
        if (!existingPicklistIds.has(picklistId)) {
          const entry = findPicklistEntry(picklistId);
          if (entry) {
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
  }, [groupSpecialty]);

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
    setProcedures((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
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
      [newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]];
      return newArr.map((p, i) => ({ ...p, sequenceOrder: i + 1 }));
    });
  };

  const moveProcedureDown = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProcedures((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const newArr = [...prev];
      [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
      return newArr.map((p, i) => ({ ...p, sequenceOrder: i + 1 }));
    });
  };


  const handleFractureWizardSave = async (newFractures: FractureEntry[]) => {
    setFractures(newFractures);
    setShowFractureWizard(false);

    if (newFractures.length > 0) {
      const firstFracture = newFractures[0];

      // Try new AO → diagnosis mapping first (hand surgery)
      if (groupSpecialty === "hand_surgery" && firstFracture.aoCode) {
        const familyCode = firstFracture.details?.familyCode ?? firstFracture.aoCode.slice(0, 2);
        const resolution = resolveAOToDiagnosis({
          familyCode,
          finger: firstFracture.details?.finger,
          segment: firstFracture.details?.segment,
          type: firstFracture.details?.type,
        });

        if (resolution) {
          const dx = findDiagnosisById(resolution.diagnosisPicklistId);
          if (dx) {
            setIsDiagnosisFromAO(true);
            setAoSourceLabel(resolution.matchedRefinement ?? "AO classification");
            setAoHints(resolution.procedureHints);
            handleDiagnosisSelect(dx, resolution.procedureHints);
            return;
          }
        }
      }

      // Fallback: old AO → SNOMED suggestion lookup
      const suggestion = getAoToSnomedSuggestion(firstFracture.aoCode);
      setSnomedSuggestion(suggestion);

      if (suggestion) {
        setPrimaryDiagnosis({ conceptId: "", term: suggestion.displayName });
        setDiagnosis(suggestion.displayName);
      }
    }
  };

  const handleFractureWizardClose = () => {
    setShowFractureWizard(false);
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
    setProcedures([{
      id: uuidv4(),
      sequenceOrder: 1,
      procedureName: PROCEDURE_TYPES[s]?.[0] || "",
      specialty: s,
      surgeonRole: "PS",
    }]);
  };

  const clearDiagnosis = useCallback(() => {
    setSelectedDiagnosis(null);
    setPrimaryDiagnosis(null);
    setDiagnosis("");
    setStagingValues({});
    setIsDiagnosisPickerCollapsed(false);
    setShowAllProcedures(false);
    setIsDiagnosisFromAO(false);
    setAoSourceLabel(undefined);
    setAoHints([]);
    setSnomedSuggestion(null);
  }, []);

  const specialtyOptions = Object.entries(SPECIALTY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  function deriveDefaultPathologyType(
    dx: DiagnosisPicklistEntry | null,
  ): LesionPathologyType {
    if (!dx) return "bcc";
    const id = dx.id.toLowerCase();
    if (id.includes("melanoma")) return "melanoma";
    if (id.includes("scc")) return "scc";
    if (id.includes("bcc")) return "bcc";
    if (id.includes("benign") || id.includes("naevus") || id.includes("cyst")) return "benign";
    return "bcc";
  }

  if (!isExpanded && !isOnly) {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsExpanded(true);
        }}
        style={[
          styles.collapsedGroupCard,
          { backgroundColor: theme.backgroundElevated, borderColor: theme.border },
        ]}
      >
        <View style={styles.collapsedGroupHeader}>
          <View style={[styles.orderBadge, { backgroundColor: theme.link + "20" }]}>
            <ThemedText style={[styles.orderText, { color: theme.link }]}>
              {index + 1}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: "600", fontSize: 15 }}>
              {SPECIALTY_LABELS[groupSpecialty]}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>
              {group.diagnosis?.displayName || "No diagnosis"} · {procedures.length} procedure{procedures.length !== 1 ? "s" : ""}
            </ThemedText>
          </View>
          <Feather name="chevron-down" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.groupContainer, !isOnly ? { borderColor: theme.border } : undefined]}>
      {!isOnly ? (
        <View style={styles.groupHeader}>
          <ThemedText style={[styles.groupTitle, { color: theme.textSecondary }]}>
            Diagnosis Group {index + 1}
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsExpanded(false);
              }}
              hitSlop={8}
            >
              <Feather name="chevron-up" size={20} color={theme.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onDelete();
              }}
              hitSlop={8}
            >
              <Feather name="trash-2" size={18} color={theme.error} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {index > 0 ? (
        <PickerField
          label="Specialty"
          value={groupSpecialty}
          options={specialtyOptions}
          onSelect={handleSpecialtyChange}
        />
      ) : null}

      {/* Feature 3: Hand surgery case type selector */}
      {groupSpecialty === "hand_surgery" ? (
        <View style={styles.caseTypeSelectorContainer}>
          <ThemedText style={[styles.caseTypeLabel, { color: theme.textSecondary }]}>
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
                    }
                    setHandCaseType(type);
                  }}
                  style={[
                    styles.caseTypeButton,
                    {
                      backgroundColor: isActive ? theme.link : theme.backgroundDefault,
                      borderColor: isActive ? theme.link : theme.border,
                    },
                  ]}
                  testID={`button-case-type-${type}`}
                >
                  <ThemedText
                    style={[
                      styles.caseTypeButtonText,
                      { color: isActive ? theme.buttonText : theme.textSecondary },
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

      {/* Feature 3: HandTraumaStructurePicker — trauma pathway (shown first) */}
      {groupSpecialty === "hand_surgery" && handCaseType === "trauma" ? (
        <HandTraumaStructurePicker
          value={diagnosisClinicalDetails.handTrauma || {}}
          onChange={(handTrauma) =>
            setDiagnosisClinicalDetails((prev) => ({ ...prev, handTrauma }))
          }
          selectedDiagnosis={selectedDiagnosis ?? undefined}
          procedures={procedures}
          onProceduresChange={setProcedures}
        />
      ) : null}

      {/* Feature 3: AO Classification section (trauma pathway only) */}
      {groupSpecialty === "hand_surgery" && handCaseType === "trauma" ? (
        <View style={[styles.aoSection, { borderColor: theme.border }]}>
          <ThemedText style={[styles.aoSectionLabel, { color: theme.textSecondary }]}>
            AO Classification{" "}
            <ThemedText style={{ color: theme.textTertiary, fontWeight: "400" }}>(optional)</ThemedText>
          </ThemedText>
          {fractures.length > 0 ? (
            <View style={styles.aoSummaryRow}>
              <Feather name="check-circle" size={14} color={theme.link} />
              <ThemedText style={[styles.aoSummaryText, { color: theme.textSecondary }]}>
                {fractures.length} fracture{fractures.length !== 1 ? "s" : ""} classified
              </ThemedText>
              <Pressable
                onPress={() => {
                  setFractures([]);
                  if (isDiagnosisFromAO) {
                    clearDiagnosis();
                  }
                }}
                hitSlop={8}
              >
                <Feather name="x" size={16} color={theme.textTertiary} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.aoOpenButton, { borderColor: theme.link + "60" }]}
              onPress={() => setShowFractureWizard(true)}
              testID="button-open-ao-classifier"
            >
              <Feather name="layers" size={16} color={theme.link} />
              <ThemedText style={[styles.aoOpenButtonText, { color: theme.link }]}>
                Open AO Classifier
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : null}

      <SectionHeader title="Primary Diagnosis" subtitle={hasDiagnosisPicklist(groupSpecialty) ? "Select from structured list or search SNOMED CT" : "SNOMED CT coded diagnosis"} />

      {/* Feature 1: collapsed card OR full picker */}
      {hasDiagnosisPicklist(groupSpecialty) ? (
        isDiagnosisPickerCollapsed && selectedDiagnosis ? (
          <SelectedDiagnosisCard
            diagnosis={selectedDiagnosis}
            onClear={clearDiagnosis}
            sourceLabel={isDiagnosisFromAO ? aoSourceLabel : undefined}
          />
        ) : (
          <DiagnosisPicker
            specialty={groupSpecialty}
            selectedDiagnosisId={selectedDiagnosis?.id}
            onSelect={handleDiagnosisSelect}
            clinicalGroupFilter={
              groupSpecialty === "hand_surgery" && handCaseType === "trauma"
                ? "trauma"
                : groupSpecialty === "hand_surgery" && handCaseType === "elective"
                ? "non-trauma"
                : undefined
            }
          />
        )
      ) : null}

      {/* SNOMED-only specialties: collapse when selected */}
      {!hasDiagnosisPicklist(groupSpecialty) ? (
        isDiagnosisPickerCollapsed && primaryDiagnosis ? (
          <SelectedDiagnosisCard
            diagnosis={{ displayName: primaryDiagnosis.term, snomedCtCode: primaryDiagnosis.conceptId }}
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
      {hasDiagnosisPicklist(groupSpecialty) && !isDiagnosisPickerCollapsed ? (
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

      {hasFractureSubcategory && snomedSuggestion && primaryDiagnosis && !isDiagnosisFromAO ? (
        <View style={[styles.suggestionBanner, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="zap" size={16} color={theme.link} />
          <ThemedText style={[styles.suggestionText, { color: theme.textSecondary }]}>
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
          <ThemedText style={[styles.stagingTitle, { color: theme.textSecondary }]}>
            Classification / Staging
          </ThemedText>
          {diagnosisStaging.stagingSystems.map((system) => (
            <PickerField
              key={system.name}
              label={system.name}
              value={stagingValues[system.name] || ""}
              options={system.options.map((opt) => ({
                value: opt.value,
                label: opt.description ? `${opt.label} - ${opt.description}` : opt.label,
              }))}
              onSelect={(value) => {
                if (selectedDiagnosis) {
                  handleStagingChangeForSuggestions(system.name, value);
                } else {
                  setStagingValues((prev) => ({ ...prev, [system.name]: value }));
                }
              }}
              placeholder={`Select ${system.name.toLowerCase()}...`}
            />
          ))}
        </View>
      ) : null}

      {/* Clinical suspicion picker for excision biopsy diagnoses */}
      {isExcisionBiopsyDiagnosis(selectedDiagnosis?.id) ? (
        <View style={styles.stagingContainer}>
          <PickerField
            label="Clinical suspicion (optional)"
            value={clinicalSuspicion || ""}
            options={Object.entries(CLINICAL_SUSPICION_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            onSelect={(val) => setClinicalSuspicion(val as ClinicalSuspicion)}
            placeholder="Select clinical impression..."
          />
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
            setDiagnosisClinicalDetails(updatedDiagnosis.clinicalDetails || {});
          }}
          specialty={groupSpecialty}
          fractures={fractures}
          onFracturesChange={setFractures}
          showFractureClassification={hasFractureSubcategory}
          onOpenFractureWizard={() => setShowFractureWizard(true)}
        />
      ) : null}

      <SectionHeader title="Procedures Performed" />

      <ThemedText style={[styles.sectionDescription, { color: theme.textSecondary }]}>
        Add all procedures performed during this surgery. Each procedure can have its own specialty and SNOMED CT code.
      </ThemedText>

      {(selectedDiagnosis?.hasEnhancedHistology || groupSpecialty === "general" || groupSpecialty === "head_neck") ? (
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
                    pathologyType: deriveDefaultPathologyType(selectedDiagnosis),
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
              backgroundColor: isMultiLesion ? theme.link + "10" : theme.backgroundDefault,
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
              <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
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
      ) : (() => {
        // Feature 2: procedure filtering
        const hasSuggestedProcedures = (selectedDiagnosis?.suggestedProcedures?.length ?? 0) > 0;
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
                <ThemedText style={[styles.showAllProceduresText, { color: theme.link }]}>
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
                    <Feather name="chevron-up" size={16} color={theme.textSecondary} />
                    <ThemedText style={[styles.showAllProceduresText, { color: theme.textSecondary }]}>
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
                  />
                ))}

                <Pressable
                  style={[styles.addButton, { borderColor: theme.link }]}
                  onPress={addProcedure}
                >
                  <Feather name="plus" size={18} color={theme.link} />
                  <ThemedText style={[styles.addButtonText, { color: theme.link }]}>
                    Add Another Procedure
                  </ThemedText>
                </Pressable>
              </>
            )}
          </>
        );
      })()}

      <FractureClassificationWizard
        visible={showFractureWizard}
        onClose={handleFractureWizardClose}
        onSave={handleFractureWizardSave}
        initialFractures={fractures}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  groupContainer: {
    marginBottom: Spacing.md,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  collapsedGroupCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  collapsedGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
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
});
