import React, { useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { FormField, PickerField } from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { CollapsibleFormSection } from "./CollapsibleFormSection";
import {
  useCaseFormState,
  useCaseFormDispatch,
} from "@/contexts/CaseFormContext";
import { setField } from "@/hooks/useCaseForm";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  UnplannedICUReason,
  DischargeOutcome,
  MortalityClassification,
  UNPLANNED_ICU_LABELS,
  DISCHARGE_OUTCOME_LABELS,
  MORTALITY_CLASSIFICATION_LABELS,
} from "@/types/case";

export const OutcomesSection = React.memo(function OutcomesSection() {
  const { theme } = useTheme();
  const { state } = useCaseFormState();
  const { dispatch } = useCaseFormDispatch();

  const filledCount = useMemo(() => {
    let count = 0;
    if (state.outcome) count++;
    return count;
  }, [state.outcome]);

  return (
    <CollapsibleFormSection
      title="Outcomes"
      subtitle="Discharge and complications"
      filledCount={filledCount}
      totalCount={1}
    >
      <SectionHeader title="Outcomes" />

      <PickerField
        label="Unplanned ICU Admission"
        value={state.unplannedICU}
        options={Object.entries(UNPLANNED_ICU_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        onSelect={(v: string) =>
          dispatch(setField("unplannedICU", v as UnplannedICUReason))
        }
      />

      <View style={styles.checkboxRow}>
        <Pressable
          style={[
            styles.checkbox,
            {
              backgroundColor: state.returnToTheatre
                ? theme.error + "20"
                : theme.backgroundDefault,
              borderColor: state.returnToTheatre ? theme.error : theme.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dispatch(setField("returnToTheatre", !state.returnToTheatre));
          }}
        >
          {state.returnToTheatre ? (
            <Feather name="check" size={16} color={theme.error} />
          ) : null}
        </Pressable>
        <ThemedText style={styles.checkboxLabel}>
          Unplanned Return to Theatre
        </ThemedText>
      </View>

      {state.returnToTheatre ? (
        <FormField
          label="Reason for Return"
          value={state.returnToTheatreReason}
          onChangeText={(v: string) =>
            dispatch(setField("returnToTheatreReason", v))
          }
          placeholder="e.g., Wound dehiscence"
        />
      ) : null}

      <PickerField
        label="Discharge Outcome"
        value={state.outcome}
        options={Object.entries(DISCHARGE_OUTCOME_LABELS).map(
          ([value, label]) => ({ value, label }),
        )}
        onSelect={(v: string) =>
          dispatch(setField("outcome", v as DischargeOutcome))
        }
      />

      {state.outcome === "died" ? (
        <PickerField
          label="Mortality Classification"
          value={state.mortalityClassification}
          options={Object.entries(MORTALITY_CLASSIFICATION_LABELS).map(
            ([value, label]) => ({ value, label }),
          )}
          onSelect={(v: string) =>
            dispatch(
              setField("mortalityClassification", v as MortalityClassification),
            )
          }
        />
      ) : null}

      <View style={styles.checkboxRow}>
        <Pressable
          style={[
            styles.checkbox,
            {
              backgroundColor: state.discussedAtMDM
                ? theme.link + "20"
                : theme.backgroundDefault,
              borderColor: state.discussedAtMDM ? theme.link : theme.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dispatch(setField("discussedAtMDM", !state.discussedAtMDM));
          }}
        >
          {state.discussedAtMDM ? (
            <Feather name="check" size={16} color={theme.link} />
          ) : null}
        </Pressable>
        <ThemedText style={styles.checkboxLabel}>Discussed at MDM</ThemedText>
      </View>
    </CollapsibleFormSection>
  );
});

const styles = StyleSheet.create({
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginVertical: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    fontSize: 15,
    flex: 1,
  },
});
