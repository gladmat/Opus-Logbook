import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { SelectField, DatePickerField } from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import {
  useCaseFormState,
  useCaseFormDispatch,
} from "@/contexts/CaseFormContext";
import { setField } from "@/hooks/useCaseForm";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  AdmissionUrgency,
  StayType,
  UnplannedReadmissionReason,
  ADMISSION_URGENCY_LABELS,
  STAY_TYPE_LABELS,
  UNPLANNED_READMISSION_LABELS,
} from "@/types/case";
import {
  EncounterClass,
  ENCOUNTER_CLASS_LABELS,
} from "@/types/episode";

export const AdmissionSection = React.memo(function AdmissionSection() {
  const { theme } = useTheme();
  const { state, showInjuryDate } = useCaseFormState();
  const { dispatch } = useCaseFormDispatch();

  return (
    <>
      <SectionHeader title="Admission Details" />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Urgency
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
              Object.entries(ADMISSION_URGENCY_LABELS) as [
                AdmissionUrgency,
                string,
              ][]
            ).map(([value, label]) => {
              const isSelected = state.admissionUrgency === value;
              return (
                <Pressable
                  key={value}
                  testID={`toggle-urgency-${value}`}
                  style={[
                    styles.segmentedButton,
                    isSelected ? { backgroundColor: theme.link } : undefined,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    dispatch(setField("admissionUrgency", value));
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
        </View>
        <View style={styles.halfField}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Stay Type
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
            {(Object.entries(STAY_TYPE_LABELS) as [StayType, string][]).map(
              ([value, label]) => {
                const isSelected = state.stayType === value;
                return (
                  <Pressable
                    key={value}
                    testID={`toggle-stay-${value}`}
                    style={[
                      styles.segmentedButton,
                      isSelected ? { backgroundColor: theme.link } : undefined,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      dispatch(setField("stayType", value));
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
        </View>
      </View>

      {state.episodeId ? (
        <SelectField
          label="Encounter Class"
          value={state.encounterClass}
          options={Object.entries(ENCOUNTER_CLASS_LABELS).map(
            ([value, label]) => ({ value, label }),
          )}
          onSelect={(v: string) =>
            dispatch(setField("encounterClass", v as EncounterClass))
          }
        />
      ) : null}

      <View style={styles.row}>
        <View style={styles.halfField}>
          <DatePickerField
            label="Admission Date"
            value={state.admissionDate}
            onChange={(v: string) => dispatch(setField("admissionDate", v))}
            disabled={state.stayType === "day_case"}
          />
        </View>
        <View style={styles.halfField}>
          <DatePickerField
            label="Discharge Date"
            value={state.dischargeDate}
            onChange={(v: string) => dispatch(setField("dischargeDate", v))}
            disabled={state.stayType === "day_case"}
            clearable
          />
        </View>
      </View>

      {showInjuryDate ? (
        <View style={styles.row}>
          <View style={styles.halfField}>
            <DatePickerField
              label="Day of Injury"
              value={state.injuryDate}
              onChange={(v: string) => dispatch(setField("injuryDate", v))}
              placeholder="Select date..."
            />
          </View>
        </View>
      ) : null}

      <Pressable
        style={styles.checkboxRow}
        testID="checkbox-unplanned-readmission"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const newValue = !state.isUnplannedReadmission;
          dispatch(setField("isUnplannedReadmission", newValue));
          if (!newValue) {
            dispatch(setField("unplannedReadmission", "no"));
          }
        }}
      >
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: state.isUnplannedReadmission
                ? theme.warning + "20"
                : theme.backgroundDefault,
              borderColor: state.isUnplannedReadmission
                ? theme.warning
                : theme.border,
            },
          ]}
        >
          {state.isUnplannedReadmission ? (
            <Feather name="check" size={16} color={theme.warning} />
          ) : null}
        </View>
        <ThemedText style={styles.checkboxLabel}>
          Unplanned Readmission (within 28 days)
        </ThemedText>
      </Pressable>

      {state.isUnplannedReadmission ? (
        <SelectField
          label="Readmission Reason"
          value={state.unplannedReadmission}
          options={Object.entries(UNPLANNED_READMISSION_LABELS)
            .filter(([value]) => value !== "no")
            .map(([value, label]) => ({
              value,
              label: label.replace("Yes - ", ""),
            }))}
          onSelect={(v: string) =>
            dispatch(
              setField("unplannedReadmission", v as UnplannedReadmissionReason),
            )
          }
        />
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
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
