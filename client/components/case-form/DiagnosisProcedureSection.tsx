import React, { useCallback, useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { DiagnosisGroupEditor } from "@/components/DiagnosisGroupEditor";
import { InlineEpisodeCreator } from "@/components/InlineEpisodeCreator";
import {
  useCaseFormDispatch,
  useCaseFormField,
  useCaseFormValidation,
} from "@/contexts/CaseFormContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { DiagnosisGroup } from "@/types/case";
import type { InfectionOverlay } from "@/types/infection";
import type { TreatmentEpisode, EpisodeType } from "@/types/episode";
import { getDiagnosisGroupTitle } from "@/lib/caseDiagnosisSummary";

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
    const {
      dispatch,
      handleDiagnosisGroupChange: dispatchGroupChange,
      handleDeleteDiagnosisGroup,
      addDiagnosisGroup,
      reorderDiagnosisGroups,
    } = useCaseFormDispatch();
    const diagnosisGroups = useCaseFormField("diagnosisGroups");
    const infectionOverlay = useCaseFormField("infectionOverlay");
    const episodeId = useCaseFormField("episodeId");
    const saving = useCaseFormField("saving");
    const returnToTheatre = useCaseFormField("returnToTheatre");
    const patientIdentifier = useCaseFormField("patientIdentifier");
    const procedureDate = useCaseFormField("procedureDate");
    const { fieldErrors } = useCaseFormValidation();

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
    const primaryGroup = diagnosisGroups[0];
    const hasDiagnosis = !!primaryGroup?.diagnosis;
    const isBreastCase = primaryGroup?.specialty === "breast";
    const showInlineEpisodeCreator = hasDiagnosis && !episodeId && !saving && !isBreastCase;

    // Determine which group index is the first to trigger infection visibility
    const firstInfectionGroupIndex = useMemo(() => {
      return diagnosisGroups.findIndex(
        (g) =>
          g.procedures.some(
            (p) => p.subcategory === "Chronic Wounds / Infection",
          ) || !!infectionOverlay,
      );
    }, [diagnosisGroups, infectionOverlay]);

    const onGroupChange = useCallback(
      (index: number, updated: DiagnosisGroup) => {
        dispatchGroupChange(index, updated, scrollViewRef, scrollPositionRef);
      },
      [dispatchGroupChange, scrollViewRef, scrollPositionRef],
    );

    const handleMoveUp = useCallback(
      (index: number) => {
        if (index <= 0) return;
        const groups = [...diagnosisGroups];
        const a = groups[index - 1]!;
        const b = groups[index]!;
        groups[index - 1] = b;
        groups[index] = a;
        reorderDiagnosisGroups(groups);
      },
      [diagnosisGroups, reorderDiagnosisGroups],
    );

    const handleMoveDown = useCallback(
      (index: number) => {
        if (index >= diagnosisGroups.length - 1) return;
        const groups = [...diagnosisGroups];
        const a = groups[index]!;
        const b = groups[index + 1]!;
        groups[index] = b;
        groups[index + 1] = a;
        reorderDiagnosisGroups(groups);
      },
      [diagnosisGroups, reorderDiagnosisGroups],
    );

    const handleAddElectiveHandGroup = useCallback(
      (sourceGroupIndex: number) => {
        const sourceGroup = diagnosisGroups[sourceGroupIndex];
        const inheritedLaterality =
          sourceGroup?.diagnosisClinicalDetails?.laterality;
        addDiagnosisGroup({
          specialty: "hand_wrist",
          handCaseTypeHint: "elective",
          ...(inheritedLaterality
            ? { diagnosisClinicalDetails: { laterality: inheritedLaterality } }
            : {}),
        });
      },
      [diagnosisGroups, addDiagnosisGroup],
    );

    return (
      <>
        {diagnosisGroups.map((group, idx) => (
          <DiagnosisGroupEditor
            key={group.id}
            group={group}
            index={idx}
            isOnly={diagnosisGroups.length === 1}
            totalGroups={diagnosisGroups.length}
            onChange={(updated) => onGroupChange(idx, updated)}
            onDelete={() => handleDeleteDiagnosisGroup(idx)}
            onMoveUp={() => handleMoveUp(idx)}
            onMoveDown={() => handleMoveDown(idx)}
            infectionOverlay={infectionOverlay}
            onInfectionChange={handleInfectionChange}
            isFirstInfectionGroup={idx === firstInfectionGroupIndex}
            episodeType={episodeType}
            returnToTheatre={returnToTheatre}
            scrollViewRef={scrollViewRef}
            scrollPositionRef={scrollPositionRef}
            onAddElectiveHandGroup={
              group.specialty === "hand_wrist"
                ? () => handleAddElectiveHandGroup(idx)
                : undefined
            }
          />
        ))}

        <InlineEpisodeCreator
          visible={showInlineEpisodeCreator}
          specialty={primaryGroup?.specialty ?? "general"}
          diagnosisName={getDiagnosisGroupTitle(primaryGroup)}
          diagnosisCode={primaryGroup?.diagnosis?.snomedCtCode}
          laterality={primaryGroup?.diagnosisClinicalDetails?.laterality}
          subcategory={primaryGroup?.procedures[0]?.subcategory}
          patientIdentifier={patientIdentifier}
          procedureDate={procedureDate}
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
          onPress={() => addDiagnosisGroup()}
          testID="caseForm.case.btn-addGroup"
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
