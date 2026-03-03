import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { DiagnosisGroupEditor } from "@/components/DiagnosisGroupEditor";
import { useCaseFormState, useCaseFormDispatch } from "@/contexts/CaseFormContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { DiagnosisGroup } from "@/types/case";

interface DiagnosisProcedureSectionProps {
  scrollViewRef: React.RefObject<any>;
  scrollPositionRef: React.MutableRefObject<number>;
}

export const DiagnosisProcedureSection = React.memo(function DiagnosisProcedureSection({
  scrollViewRef,
  scrollPositionRef,
}: DiagnosisProcedureSectionProps) {
  const { theme } = useTheme();
  const { state } = useCaseFormState();
  const {
    handleDiagnosisGroupChange: dispatchGroupChange,
    handleDeleteDiagnosisGroup,
    addDiagnosisGroup,
    reorderDiagnosisGroups,
    fieldErrors,
  } = useCaseFormDispatch();

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
      [groups[index - 1], groups[index]] = [groups[index], groups[index - 1]];
      reorderDiagnosisGroups(groups);
    },
    [state.diagnosisGroups, reorderDiagnosisGroups],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= state.diagnosisGroups.length - 1) return;
      const groups = [...state.diagnosisGroups];
      [groups[index], groups[index + 1]] = [groups[index + 1], groups[index]];
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
        />
      ))}

      {fieldErrors.diagnosisGroups ? (
        <View style={[styles.diagnosisError, { backgroundColor: theme.error + "10", borderColor: theme.error + "40" }]}>
          <Feather name="alert-circle" size={14} color={theme.error} />
          <ThemedText style={[styles.diagnosisErrorText, { color: theme.error }]}>
            {fieldErrors.diagnosisGroups}
          </ThemedText>
        </View>
      ) : null}

      <Pressable
        style={[
          styles.addGroupButton,
          { borderColor: theme.link, backgroundColor: theme.backgroundSecondary },
        ]}
        onPress={addDiagnosisGroup}
      >
        <Feather name="plus-circle" size={18} color={theme.link} />
        <ThemedText style={[styles.addGroupButtonText, { color: theme.link }]}>
          Add Diagnosis Group
        </ThemedText>
      </Pressable>
    </>
  );
});

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
