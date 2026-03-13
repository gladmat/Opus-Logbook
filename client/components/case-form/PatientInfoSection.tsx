import React, { useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
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
  useCaseFormDispatch,
  useCaseFormField,
  useCaseFormValidation,
} from "@/contexts/CaseFormContext";
import { setField } from "@/hooks/useCaseForm";
import { Spacing } from "@/constants/theme";
import {
  Gender,
  GENDER_LABELS,
  ETHNICITY_OPTIONS,
  calculateAgeFromDob,
} from "@/types/case";
import { formatNhi } from "@/lib/nhiValidation";

export const PatientInfoSection = React.memo(function PatientInfoSection() {
  const { theme } = useTheme();
  const { facilities, profile } = useAuth();
  const patientNhi = useCaseFormField("patientNhi");
  const patientIdentifier = useCaseFormField("patientIdentifier");
  const patientDateOfBirth = useCaseFormField("patientDateOfBirth");
  const patientFirstName = useCaseFormField("patientFirstName");
  const patientLastName = useCaseFormField("patientLastName");
  const procedureDate = useCaseFormField("procedureDate");
  const facility = useCaseFormField("facility");
  const gender = useCaseFormField("gender");
  const ethnicity = useCaseFormField("ethnicity");
  const isPlanMode = useCaseFormField("isPlanMode");
  const { dispatch } = useCaseFormDispatch();
  const { fieldErrors, onFieldBlur } = useCaseFormValidation();

  const isNZ = profile?.countryOfPractice === "NZ";

  const calculatedAge = useMemo(
    () => calculateAgeFromDob(patientDateOfBirth),
    [patientDateOfBirth],
  );

  const togglePlanMode = () => {
    Haptics.selectionAsync();
    dispatch(setField("isPlanMode", !isPlanMode));
  };

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <SectionHeader title="Patient Information" />
        <Pressable
          onPress={togglePlanMode}
          style={[
            styles.planToggle,
            {
              backgroundColor: isPlanMode
                ? theme.info + "20"
                : theme.backgroundDefault,
              borderColor: isPlanMode ? theme.info : theme.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            isPlanMode ? "Plan mode active" : "Switch to plan mode"
          }
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Feather
            name="calendar"
            size={13}
            color={isPlanMode ? theme.info : theme.textTertiary}
          />
          <ThemedText
            style={[
              styles.planToggleText,
              { color: isPlanMode ? theme.info : theme.textTertiary },
            ]}
          >
            Plan
          </ThemedText>
        </Pressable>
      </View>

      {/* Row 1: NHI/Identifier + Date of Birth */}
      <View style={styles.row}>
        <View style={styles.halfField}>
          {isNZ ? (
            <FormField
              label="NHI"
              value={patientNhi}
              onChangeText={(text: string) => {
                const formatted = formatNhi(text);
                dispatch(setField("patientNhi", formatted));
                dispatch(setField("patientIdentifier", formatted));
              }}
              placeholder="ABC1234"
              required
              autoCapitalize="characters"
              onBlur={() => onFieldBlur("patientIdentifier")}
              error={fieldErrors.patientIdentifier}
            />
          ) : (
            <FormField
              label="Identifier"
              value={patientIdentifier}
              onChangeText={(text: string) =>
                dispatch(setField("patientIdentifier", text.toUpperCase()))
              }
              placeholder="MRN or initials"
              required
              autoCapitalize="characters"
              onBlur={() => onFieldBlur("patientIdentifier")}
              error={fieldErrors.patientIdentifier}
            />
          )}
        </View>
        <View style={styles.halfField}>
          <DatePickerField
            label="Date of Birth"
            value={patientDateOfBirth}
            onChange={(v: string) => {
              dispatch(setField("patientDateOfBirth", v));
            }}
            placeholder="DOB..."
            maximumDate={new Date()}
          />
        </View>
      </View>

      {/* Privacy + Age inline */}
      <View style={styles.privacyAgeRow}>
        <View style={styles.privacyRow}>
          <Feather name="lock" size={12} color={theme.textTertiary} />
          <ThemedText
            style={[styles.privacyText, { color: theme.textTertiary }]}
          >
            On-device only
          </ThemedText>
        </View>
        {calculatedAge !== undefined && (
          <ThemedText
            style={[styles.ageDisplay, { color: theme.textSecondary }]}
          >
            Age: {calculatedAge}y
          </ThemedText>
        )}
      </View>

      {/* Row 2: First Name + Last Name */}
      <View style={styles.row}>
        <View style={styles.halfField}>
          <FormField
            label="First Name"
            value={patientFirstName}
            onChangeText={(v: string) =>
              dispatch(setField("patientFirstName", v))
            }
            placeholder="First name"
            autoCapitalize="words"
          />
        </View>
        <View style={styles.halfField}>
          <FormField
            label="Last Name"
            value={patientLastName}
            onChangeText={(v: string) =>
              dispatch(setField("patientLastName", v))
            }
            placeholder="Last name"
            autoCapitalize="words"
          />
        </View>
      </View>

      {/* Row 3: Procedure Date + Facility */}
      <View style={styles.row}>
        <View style={styles.halfField}>
          <DatePickerField
            label="Procedure Date"
            value={procedureDate}
            onChange={(v: string) => {
              dispatch(setField("procedureDate", v));
              onFieldBlur("procedureDate");
            }}
            placeholder="Date..."
            required
            error={fieldErrors.procedureDate}
            maximumDate={new Date()}
          />
        </View>
        <View style={styles.halfField}>
          {facilities.length > 0 ? (
            <PickerField
              label="Facility"
              value={facility}
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
              placeholder="Select..."
              required
              error={fieldErrors.facility}
            />
          ) : (
            <FormField
              label="Facility"
              value={facility}
              onChangeText={(v: string) => dispatch(setField("facility", v))}
              placeholder="Hospital name"
              required
              onBlur={() => onFieldBlur("facility")}
              error={fieldErrors.facility}
            />
          )}
        </View>
      </View>

      {/* Row 4: Gender + Ethnicity */}
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
                const isSelected = gender === value;
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
          <PickerField
            label="Ethnicity"
            value={ethnicity}
            options={ETHNICITY_OPTIONS}
            onSelect={(v: string) => dispatch(setField("ethnicity", v))}
          />
        </View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  planToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  privacyAgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  privacyText: {
    fontSize: 12,
  },
  ageDisplay: {
    fontSize: 14,
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
