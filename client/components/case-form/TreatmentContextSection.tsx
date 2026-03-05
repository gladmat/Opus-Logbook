import React, { useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { SelectField } from "@/components/FormField";
import { FormField } from "@/components/FormField";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { CollapsibleFormSection } from "@/components/case-form/CollapsibleFormSection";
import { useCaseFormState, useCaseFormDispatch } from "@/contexts/CaseFormContext";
import { setField } from "@/hooks/useCaseForm";
import { RECONSTRUCTION_TIMING_LABELS } from "@/types/case";
import type { ReconstructionTiming } from "@/types/case";

/**
 * Case-level treatment context fields for free flap cases.
 * Visible only when caseHasFreeFlap() returns true (Part 8D).
 * Contains: reconstruction timing, prior radiotherapy/chemo, intraoperative transfusion.
 */
export const TreatmentContextSection = React.memo(
  function TreatmentContextSection() {
    const { state } = useCaseFormState();
    const { dispatch } = useCaseFormDispatch();
    const { theme } = useTheme();

    const filledCount = useMemo(() => {
      let count = 0;
      if (state.reconstructionTiming) count++;
      if (state.priorRadiotherapy) count++;
      if (state.priorChemotherapy) count++;
      if (state.intraoperativeTransfusion) count++;
      return count;
    }, [
      state.reconstructionTiming,
      state.priorRadiotherapy,
      state.priorChemotherapy,
      state.intraoperativeTransfusion,
    ]);

    const timingOptions = useMemo(
      () =>
        Object.entries(RECONSTRUCTION_TIMING_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      [],
    );

    return (
      <CollapsibleFormSection
        title="Treatment Context"
        subtitle="Pre-op treatment & reconstruction timing"
        filledCount={filledCount}
        totalCount={4}
        defaultExpanded={false}
      >
        <View style={styles.content}>
          <SelectField
            label="Reconstruction Timing"
            value={state.reconstructionTiming}
            options={timingOptions}
            onSelect={(v) =>
              dispatch(
                setField("reconstructionTiming", v as ReconstructionTiming),
              )
            }
          />

          <View style={styles.checkboxGroup}>
            <ThemedText
              style={[styles.groupLabel, { color: theme.textSecondary }]}
            >
              Prior Treatment
            </ThemedText>

            <View style={styles.checkboxRow}>
              <Pressable
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: state.priorRadiotherapy
                      ? theme.link + "20"
                      : theme.backgroundDefault,
                    borderColor: state.priorRadiotherapy
                      ? theme.link
                      : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  dispatch(
                    setField("priorRadiotherapy", !state.priorRadiotherapy),
                  );
                }}
              >
                {state.priorRadiotherapy ? (
                  <Feather name="check" size={16} color={theme.link} />
                ) : null}
              </Pressable>
              <ThemedText style={styles.checkboxLabel}>
                Prior Radiotherapy
              </ThemedText>
            </View>

            <View style={styles.checkboxRow}>
              <Pressable
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: state.priorChemotherapy
                      ? theme.link + "20"
                      : theme.backgroundDefault,
                    borderColor: state.priorChemotherapy
                      ? theme.link
                      : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  dispatch(
                    setField("priorChemotherapy", !state.priorChemotherapy),
                  );
                }}
              >
                {state.priorChemotherapy ? (
                  <Feather name="check" size={16} color={theme.link} />
                ) : null}
              </Pressable>
              <ThemedText style={styles.checkboxLabel}>
                Prior Chemotherapy
              </ThemedText>
            </View>
          </View>

          <View style={styles.checkboxGroup}>
            <ThemedText
              style={[styles.groupLabel, { color: theme.textSecondary }]}
            >
              Intraoperative
            </ThemedText>

            <View style={styles.checkboxRow}>
              <Pressable
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: state.intraoperativeTransfusion
                      ? theme.link + "20"
                      : theme.backgroundDefault,
                    borderColor: state.intraoperativeTransfusion
                      ? theme.link
                      : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  dispatch(
                    setField(
                      "intraoperativeTransfusion",
                      !state.intraoperativeTransfusion,
                    ),
                  );
                }}
              >
                {state.intraoperativeTransfusion ? (
                  <Feather name="check" size={16} color={theme.link} />
                ) : null}
              </Pressable>
              <ThemedText style={styles.checkboxLabel}>
                Intraoperative Transfusion
              </ThemedText>
            </View>

            {state.intraoperativeTransfusion ? (
              <View style={styles.transfusionRow}>
                <FormField
                  label="Units Transfused"
                  value={state.transfusionUnits}
                  onChangeText={(v) =>
                    dispatch(setField("transfusionUnits", v))
                  }
                  placeholder="2"
                  keyboardType="numeric"
                  unit="units"
                />
              </View>
            ) : null}
          </View>
        </View>
      </CollapsibleFormSection>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  checkboxGroup: {
    gap: Spacing.sm,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 15,
  },
  transfusionRow: {
    marginLeft: 36,
    maxWidth: 180,
  },
});
