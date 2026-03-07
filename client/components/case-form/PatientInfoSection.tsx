import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import {
  FormField,
  PickerField,
  DatePickerField,
} from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { resolveFacilityName } from "@/lib/facilities";
import {
  useCaseFormState,
  useCaseFormDispatch,
} from "@/contexts/CaseFormContext";
import { setField } from "@/hooks/useCaseForm";
import { Spacing } from "@/constants/theme";
import { Gender, GENDER_LABELS, ETHNICITY_OPTIONS } from "@/types/case";

export const PatientInfoSection = React.memo(function PatientInfoSection() {
  const { theme } = useTheme();
  const { facilities } = useAuth();
  const { state } = useCaseFormState();
  const { dispatch, fieldErrors, onFieldBlur } = useCaseFormDispatch();

  return (
    <>
      <SectionHeader title="Patient Information" />

      <FormField
        label="Patient Identifier"
        value={state.patientIdentifier}
        onChangeText={(text: string) =>
          dispatch(setField("patientIdentifier", text.toUpperCase()))
        }
        placeholder="e.g., MRN or initials"
        required
        autoCapitalize="characters"
        onBlur={() => onFieldBlur("patientIdentifier")}
        error={fieldErrors.patientIdentifier}
      />

      <DatePickerField
        label="Procedure Date"
        value={state.procedureDate}
        onChange={(v: string) => {
          dispatch(setField("procedureDate", v));
          // Validate date immediately on change (picker, not blur)
          onFieldBlur("procedureDate");
        }}
        placeholder="Select date..."
        required
        error={fieldErrors.procedureDate}
        maximumDate={new Date()}
      />

      {facilities.length > 0 ? (
        <PickerField
          label="Facility"
          value={state.facility}
          options={facilities.map((facility) => {
            const facilityName = resolveFacilityName(facility);
            return {
              value: facilityName,
              label: facilityName,
            };
          })}
          onSelect={(v: string) => {
            dispatch(setField("facility", v));
            onFieldBlur("facility");
          }}
          placeholder="Select facility..."
          required
          error={fieldErrors.facility}
        />
      ) : (
        <FormField
          label="Facility"
          value={state.facility}
          onChangeText={(v: string) => dispatch(setField("facility", v))}
          placeholder="Hospital or clinic name"
          required
          onBlur={() => onFieldBlur("facility")}
          error={fieldErrors.facility}
        />
      )}

      <SectionHeader title="Patient Demographics" />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Gender
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
            {(Object.entries(GENDER_LABELS) as [Gender, string][]).map(
              ([value, label]) => {
                const isSelected = state.gender === value;
                return (
                  <Pressable
                    key={value}
                    testID={`toggle-gender-${value}`}
                    style={[
                      styles.segmentedButton,
                      isSelected ? { backgroundColor: theme.link } : undefined,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      dispatch(setField("gender", value));
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
        <View style={styles.halfField}>
          <FormField
            label="Age (years)"
            value={state.age}
            onChangeText={(v: string) => dispatch(setField("age", v))}
            placeholder="e.g. 51"
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <PickerField
            label="Ethnicity"
            value={state.ethnicity}
            options={ETHNICITY_OPTIONS}
            onSelect={(v: string) => dispatch(setField("ethnicity", v))}
          />
        </View>
      </View>
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
});
