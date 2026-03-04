import React, { useMemo, useState } from "react";
import { View, Pressable, Modal, ScrollView, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { FormField } from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { CollapsibleFormSection } from "./CollapsibleFormSection";
import {
  useCaseFormState,
  useCaseFormDispatch,
} from "@/contexts/CaseFormContext";
import { setField } from "@/hooks/useCaseForm";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SmokingStatus,
  ASA_GRADE_LABELS,
  ASAScore,
  SMOKING_STATUS_LABELS,
  COMMON_COMORBIDITIES,
} from "@/types/case";

const ASA_SHORT_LABELS: Record<ASAScore, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
};

const ASA_DESCRIPTIONS: Record<ASAScore, string> = {
  1: "A normal healthy patient",
  2: "A patient with mild systemic disease (e.g., well-controlled DM, mild obesity, social drinker)",
  3: "A patient with severe systemic disease (e.g., poorly controlled DM, morbid obesity, active hepatitis, ESRD on dialysis)",
  4: "A patient with severe systemic disease that is a constant threat to life (e.g., recent MI/CVA/TIA, ongoing cardiac ischaemia)",
  5: "A moribund patient who is not expected to survive without the operation (e.g., ruptured AAA, massive trauma)",
  6: "A declared brain-dead patient whose organs are being removed for donor purposes",
};

export const PatientFactorsSection = React.memo(
  function PatientFactorsSection() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { state, calculatedBmi } = useCaseFormState();
    const { dispatch } = useCaseFormDispatch();
    const [showAsaInfo, setShowAsaInfo] = useState(false);

    const asaNum = state.asaScore ? parseInt(state.asaScore) : 0;
    const showComorbidities = asaNum >= 2;

    const filledCount = useMemo(() => {
      let count = 0;
      if (state.asaScore) count++;
      if (state.smoker) count++;
      if (showComorbidities && state.selectedComorbidities.length > 0) count++;
      return count;
    }, [
      state.asaScore,
      state.smoker,
      state.selectedComorbidities,
      showComorbidities,
    ]);

    const totalCount = showComorbidities ? 3 : 2;

    return (
      <CollapsibleFormSection
        title="Patient Factors"
        subtitle="Risk factors and co-morbidities"
        filledCount={filledCount}
        totalCount={totalCount}
      >
        <SectionHeader title="Risk Assessment" />

        <View style={styles.labelRow}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            ASA Score
          </ThemedText>
          <Pressable
            onPress={() => setShowAsaInfo(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="info" size={16} color={theme.textTertiary} />
          </Pressable>
        </View>
        <View
          style={[
            styles.segmentedControl,
            {
              borderColor: theme.border,
              backgroundColor: theme.backgroundDefault,
            },
          ]}
        >
          {(Object.entries(ASA_SHORT_LABELS) as [string, string][]).map(
            ([value, label]) => {
              const isSelected = state.asaScore === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentedButton,
                    isSelected ? { backgroundColor: theme.link } : undefined,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    dispatch(setField("asaScore", value));
                  }}
                >
                  <ThemedText
                    style={[
                      styles.segmentedButtonText,
                      { color: isSelected ? "#FFFFFF" : theme.textSecondary },
                    ]}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              );
            },
          )}
        </View>
        {state.asaScore ? (
          <ThemedText
            style={[styles.asaDescription, { color: theme.textTertiary }]}
          >
            {ASA_GRADE_LABELS[parseInt(state.asaScore) as ASAScore]}
          </ThemedText>
        ) : null}

        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Smoking Status
        </ThemedText>
        <View
          style={[
            styles.segmentedControl,
            {
              borderColor: theme.border,
              backgroundColor: theme.backgroundDefault,
            },
          ]}
        >
          {(
            Object.entries(SMOKING_STATUS_LABELS) as [SmokingStatus, string][]
          ).map(([value, label]) => {
            const isSelected = state.smoker === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.segmentedButton,
                  isSelected ? { backgroundColor: theme.link } : undefined,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  dispatch(setField("smoker", value));
                }}
              >
                <ThemedText
                  style={[
                    styles.segmentedButtonText,
                    { color: isSelected ? "#FFFFFF" : theme.textSecondary },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={styles.thirdField}>
            <FormField
              label="Height"
              value={state.heightCm}
              onChangeText={(v: string) => dispatch(setField("heightCm", v))}
              placeholder="170"
              keyboardType="decimal-pad"
              unit="cm"
            />
          </View>
          <View style={styles.thirdField}>
            <FormField
              label="Weight"
              value={state.weightKg}
              onChangeText={(v: string) => dispatch(setField("weightKg", v))}
              placeholder="70"
              keyboardType="decimal-pad"
              unit="kg"
            />
          </View>
          <View style={styles.thirdField}>
            <View style={styles.bmiDisplay}>
              <ThemedText
                style={[styles.bmiLabel, { color: theme.textSecondary }]}
              >
                BMI
              </ThemedText>
              <ThemedText
                style={[
                  styles.bmiValue,
                  { color: calculatedBmi ? theme.text : theme.textTertiary },
                ]}
              >
                {calculatedBmi ? calculatedBmi.toFixed(1) : "--"}
              </ThemedText>
            </View>
          </View>
        </View>

        {showComorbidities ? (
          <>
            <SectionHeader
              title="Co-morbidities"
              subtitle="Select all that apply"
            />

            <View style={styles.comorbidityGrid}>
              {COMMON_COMORBIDITIES.slice(0, 20).map((comorbidity) => {
                const isSelected = state.selectedComorbidities.some(
                  (c) => c.snomedCtCode === comorbidity.snomedCtCode,
                );
                return (
                  <Pressable
                    key={comorbidity.snomedCtCode}
                    style={[
                      styles.comorbidityChip,
                      {
                        backgroundColor: isSelected
                          ? theme.link + "20"
                          : theme.backgroundDefault,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (isSelected) {
                        dispatch(
                          setField(
                            "selectedComorbidities",
                            state.selectedComorbidities.filter(
                              (c) =>
                                c.snomedCtCode !== comorbidity.snomedCtCode,
                            ),
                          ),
                        );
                      } else {
                        dispatch(
                          setField("selectedComorbidities", [
                            ...state.selectedComorbidities,
                            comorbidity,
                          ]),
                        );
                      }
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.comorbidityText,
                        { color: isSelected ? theme.link : theme.text },
                      ]}
                    >
                      {comorbidity.commonName || comorbidity.displayName}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <Modal
          visible={showAsaInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAsaInfo(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowAsaInfo(false)}
          >
            <Pressable
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.backgroundElevated,
                  paddingBottom: insets.bottom,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: theme.border },
                ]}
              >
                <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                  ASA Physical Status Classification
                </ThemedText>
                <Pressable
                  onPress={() => setShowAsaInfo(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={22} color={theme.textSecondary} />
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody}>
                {(Object.entries(ASA_SHORT_LABELS) as [string, string][]).map(
                  ([value, roman]) => (
                    <View
                      key={value}
                      style={[
                        styles.asaRow,
                        { borderBottomColor: theme.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.asaBadge,
                          {
                            backgroundColor: theme.link + "15",
                          },
                        ]}
                      >
                        <ThemedText
                          style={[styles.asaBadgeText, { color: theme.link }]}
                        >
                          {roman}
                        </ThemedText>
                      </View>
                      <View style={styles.asaTextContainer}>
                        <ThemedText
                          style={[styles.asaGradeLabel, { color: theme.text }]}
                        >
                          {ASA_GRADE_LABELS[parseInt(value) as ASAScore]}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.asaGradeDesc,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {ASA_DESCRIPTIONS[parseInt(value) as ASAScore]}
                        </ThemedText>
                      </View>
                    </View>
                  ),
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </CollapsibleFormSection>
    );
  },
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  thirdField: {
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  comorbidityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  comorbidityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  comorbidityText: {
    fontSize: 13,
    fontWeight: "500",
  },
  bmiDisplay: {
    paddingTop: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  bmiLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  bmiValue: {
    fontSize: 20,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  asaDescription: {
    fontSize: 12,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden" as const,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  segmentedButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // ASA info modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
  },
  asaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  asaBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  asaBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  asaTextContainer: {
    flex: 1,
  },
  asaGradeLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  asaGradeDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
