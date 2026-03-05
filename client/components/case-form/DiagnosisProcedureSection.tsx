import React, { useCallback, useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { DiagnosisGroupEditor } from "@/components/DiagnosisGroupEditor";
import { InlineEpisodeCreator } from "@/components/InlineEpisodeCreator";
import {
  useCaseFormState,
  useCaseFormDispatch,
} from "@/contexts/CaseFormContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { DiagnosisGroup } from "@/types/case";
import type { InfectionOverlay } from "@/types/infection";
import type { TreatmentEpisode, EpisodeType } from "@/types/episode";

interface DiagnosisProcedureSectionProps {
  scrollViewRef: React.RefObject<any>;
  scrollPositionRef: React.MutableRefObject<number>;
  /** Episode type from linked episode — triggers wound module for wound/burns episodes */
  episodeType?: EpisodeType;
}

export const DiagnosisProcedureSection = React.memo(
  function DiagnosisProcedureSection({
    scrollViewRef,
    scrollPositionRef,
    episodeType,
  }: DiagnosisProcedureSectionProps) {
    const { theme } = useTheme();
    const { state } = useCaseFormState();
    const {
      dispatch,
      handleDiagnosisGroupChange: dispatchGroupChange,
      handleDeleteDiagnosisGroup,
      addDiagnosisGroup,
      reorderDiagnosisGroups,
      fieldErrors,
    } = useCaseFormDispatch();

    const infectionOverlay = state.infectionOverlay;

    const handleInfectionChange = useCallback(
      (overlay: InfectionOverlay | undefined) => {
        dispatch({
          type: "SET_FIELD",
          field: "infectionOverlay",
          value: overlay,
        });
      },
      [dispatch],
    );

    // ── Episode creation handler ──────────────────────────────────────────
    const handleEpisodeCreated = useCallback(
      (episode: TreatmentEpisode) => {
        dispatch({
          type: "BULK_UPDATE",
          updates: {
            episodeId: episode.id,
            episodeSequence: 1, // Placeholder — recomputed at save time
          },
        });
      },
      [dispatch],
    );

    // Check if diagnosis is selected and no episode linked
    const primaryGroup = state.diagnosisGroups[0];
    const hasDiagnosis = !!primaryGroup?.diagnosis;
    const showInlineEpisodeCreator =
      hasDiagnosis && !state.episodeId && !state.saving;

    // Determine which group index is the first to trigger infection visibility
    const firstInfectionGroupIndex = useMemo(() => {
      return state.diagnosisGroups.findIndex(
        (g) =>
          g.procedures.some(
            (p) => p.subcategory === "Chronic Wounds / Infection",
          ) || !!infectionOverlay,
      );
    }, [state.diagnosisGroups, infectionOverlay]);

    const onGroupChange = useCallback(
      (index: number, updated: DiagnosisGroup) => {
        dispatchGroupChange(index, updated, scrollViewRef, scrollPositionRef);
      },
      [dispatchGroupChange, scrollViewRef, scrollPositionRef],
    );

    const handleMoveUp = useCallback(
      (index: number) => {
        if (index <= 0) return;
        const groups = [...state.diagnosisGroups];
        const a = groups[index - 1]!;
        const b = groups[index]!;
        groups[index - 1] = b;
        groups[index] = a;
        reorderDiagnosisGroups(groups);
      },
      [state.diagnosisGroups, reorderDiagnosisGroups],
    );

    const handleMoveDown = useCallback(
      (index: number) => {
        if (index >= state.diagnosisGroups.length - 1) return;
        const groups = [...state.diagnosisGroups];
        const a = groups[index]!;
        const b = groups[index + 1]!;
        groups[index] = b;
        groups[index + 1] = a;
        reorderDiagnosisGroups(groups);
      },
      [state.diagnosisGroups, reorderDiagnosisGroups],
    );

    return (
      <>
        {state.diagnosisGroups.map((group, idx) => (
          <DiagnosisGroupEditor
            key={group.id}
            group={group}
            index={idx}
            isOnly={state.diagnosisGroups.length === 1}
            totalGroups={state.diagnosisGroups.length}
            onChange={(updated) => onGroupChange(idx, updated)}
            onDelete={() => handleDeleteDiagnosisGroup(idx)}
            onMoveUp={() => handleMoveUp(idx)}
            onMoveDown={() => handleMoveDown(idx)}
            infectionOverlay={infectionOverlay}
            onInfectionChange={handleInfectionChange}
            isFirstInfectionGroup={idx === firstInfectionGroupIndex}
            episodeType={episodeType}
          />
        ))}

        <InlineEpisodeCreator
          visible={showInlineEpisodeCreator}
          specialty={primaryGroup?.specialty ?? "general"}
          diagnosisName={primaryGroup?.diagnosis?.displayName}
          diagnosisCode={primaryGroup?.diagnosis?.snomedCtCode}
          laterality={primaryGroup?.diagnosisClinicalDetails?.laterality}
          subcategory={primaryGroup?.procedures[0]?.subcategory}
          patientIdentifier={state.patientIdentifier}
          procedureDate={state.procedureDate}
          onEpisodeCreated={handleEpisodeCreated}
          onDismiss={() => {}}
        />

        {fieldErrors.diagnosisGroups ? (
          <View
            style={[
              styles.diagnosisError,
              {
                backgroundColor: theme.error + "10",
                borderColor: theme.error + "40",
              },
            ]}
          >
            <Feather name="alert-circle" size={14} color={theme.error} />
            <ThemedText
              style={[styles.diagnosisErrorText, { color: theme.error }]}
            >
              {fieldErrors.diagnosisGroups}
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.addGroupButton,
            {
              borderColor: theme.link,
              backgroundColor: theme.backgroundSecondary,
            },
          ]}
          onPress={addDiagnosisGroup}
        >
          <Feather name="plus-circle" size={18} color={theme.link} />
          <ThemedText
            style={[styles.addGroupButtonText, { color: theme.link }]}
          >
            Add Diagnosis Group
          </ThemedText>
        </Pressable>
      </>
    );
  },
);

const styles = StyleSheet.create({
  addGroupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: Spacing.xl,
  },
  addGroupButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  diagnosisError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  diagnosisErrorText: {
    fontSize: 13,
    flex: 1,
  },
});
