import React, { useState } from "react";
import { View, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { FractureClassificationWizard } from "@/components/FractureClassificationWizard";
import {
  type Diagnosis,
  type DiagnosisClinicalDetails,
  type Laterality,
  type FractureEntry,
  type Specialty,
} from "@/types/case";

const LATERALITY_OPTIONS: { value: Laterality; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "bilateral", label: "Bilateral" },
  { value: "not_applicable", label: "N/A" },
];

const INJURY_MECHANISM_OPTIONS = [
  { value: "fall", label: "Fall" },
  { value: "crush", label: "Crush injury" },
  { value: "saw_blade", label: "Saw/blade injury" },
  { value: "punch_assault", label: "Punch/assault" },
  { value: "sports", label: "Sports injury" },
  { value: "mva", label: "Motor vehicle accident" },
  { value: "work_related", label: "Work-related" },
  { value: "other", label: "Other" },
];

interface AOTAClassificationCardProps {
  fractures: FractureEntry[];
  onPress: () => void;
  onClear: () => void;
}

function AOTAClassificationCard({
  fractures,
  onPress,
  onClear,
}: AOTAClassificationCardProps) {
  const { theme } = useTheme();
  const firstFracture = fractures[0];
  const hasClassification = fractures.length > 0 && firstFracture != null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.aotaCard,
        {
          borderColor: hasClassification ? theme.link : theme.border,
          backgroundColor: hasClassification
            ? theme.link + "08"
            : theme.backgroundDefault,
        },
      ]}
    >
      <View
        style={[
          styles.aotaIconContainer,
          {
            backgroundColor: hasClassification
              ? theme.link
              : theme.backgroundSecondary,
          },
        ]}
      >
        <Feather
          name={hasClassification ? "check" : "layers"}
          size={16}
          color={hasClassification ? "#FFF" : theme.textSecondary}
        />
      </View>

      <View style={styles.aotaContent}>
        {hasClassification ? (
          <>
            <View style={styles.aotaCodeRow}>
              <ThemedText style={[styles.aotaCode, { color: theme.link }]}>
                {firstFracture.aoCode}
              </ThemedText>
              {fractures.length > 1 ? (
                <ThemedText
                  style={[styles.aotaExtra, { color: theme.textSecondary }]}
                >
                  +{fractures.length - 1} more
                </ThemedText>
              ) : null}
            </View>
            <ThemedText
              style={[styles.aotaDescription, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {firstFracture.boneName}
              {firstFracture.details?.type
                ? ` · Type ${firstFracture.details.type}`
                : ""}
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText style={[styles.aotaTitle, { color: theme.text }]}>
              AO/OTA Classification
            </ThemedText>
            <ThemedText
              style={[styles.aotaSubtitle, { color: theme.textTertiary }]}
            >
              Tap to classify this fracture
            </ThemedText>
          </>
        )}
      </View>

      {hasClassification ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClear();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.aotaClearButton}
        >
          <Feather name="x" size={16} color={theme.textTertiary} />
        </Pressable>
      ) : (
        <Feather name="chevron-right" size={18} color={theme.textTertiary} />
      )}
    </TouchableOpacity>
  );
}

interface DiagnosisClinicalFieldsProps {
  diagnosis: Diagnosis;
  onDiagnosisChange: (diagnosis: Diagnosis) => void;
  specialty?: Specialty;
  fractures?: FractureEntry[];
  onFracturesChange?: (fractures: FractureEntry[]) => void;
  showFractureClassification?: boolean;
  onOpenFractureWizard?: () => void;
}

export function DiagnosisClinicalFields({
  diagnosis,
  onDiagnosisChange,
  specialty,
  fractures = [],
  onFracturesChange,
  showFractureClassification = false,
  onOpenFractureWizard,
}: DiagnosisClinicalFieldsProps) {
  const { theme } = useTheme();
  const [showFractureWizard, setShowFractureWizard] = useState(false);

  const clinicalDetails = diagnosis.clinicalDetails || {};
  const isHandSurgery = specialty === "hand_wrist";

  const updateClinicalDetails = (
    updates: Partial<DiagnosisClinicalDetails>,
  ) => {
    onDiagnosisChange({
      ...diagnosis,
      clinicalDetails: { ...clinicalDetails, ...updates },
    });
  };

  const handleFractureSave = (newFractures: FractureEntry[]) => {
    onFracturesChange?.(newFractures);
    setShowFractureWizard(false);
  };

  const handleOpenWizard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onOpenFractureWizard) {
      onOpenFractureWizard();
    } else {
      setShowFractureWizard(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.lateralitySection}>
        <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>
          Laterality
        </ThemedText>
        <View style={styles.lateralityOptions}>
          {LATERALITY_OPTIONS.map((option) => {
            const isSelected = clinicalDetails.laterality === option.value;
            return (
              <Pressable
                key={option.value}
                style={[
                  styles.lateralityOption,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundSecondary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateClinicalDetails({
                    laterality: isSelected ? undefined : option.value,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.lateralityOptionText,
                    { color: isSelected ? "#FFF" : theme.text },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {showFractureClassification && onFracturesChange ? (
        <View style={styles.fractureSection}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Fracture Classification
          </ThemedText>
          <AOTAClassificationCard
            fractures={fractures}
            onPress={handleOpenWizard}
            onClear={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onFracturesChange([]);
            }}
          />
          <FractureClassificationWizard
            visible={showFractureWizard}
            onClose={() => setShowFractureWizard(false)}
            onSave={handleFractureSave}
            initialFractures={fractures}
          />
        </View>
      ) : null}

      {isHandSurgery ? (
        <View style={styles.fieldContainer}>
          <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>
            Injury Mechanism
          </ThemedText>
          <View style={styles.pickerOptions}>
            {INJURY_MECHANISM_OPTIONS.map((option) => {
              const isSelected =
                clinicalDetails.injuryMechanism === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    {
                      backgroundColor: isSelected
                        ? theme.link
                        : theme.backgroundSecondary,
                      borderColor: isSelected ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateClinicalDetails({ injuryMechanism: option.value });
                  }}
                >
                  <ThemedText
                    style={[
                      styles.pickerOptionText,
                      { color: isSelected ? "#FFF" : theme.text },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  lateralitySection: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  lateralityOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  lateralityOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  lateralityOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  pickerOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pickerOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  fractureSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  aotaCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  aotaIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  aotaContent: {
    flex: 1,
  },
  aotaCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  aotaCode: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
    fontFamily: "monospace",
  },
  aotaExtra: {
    fontSize: 12,
    fontWeight: "500",
  },
  aotaDescription: {
    fontSize: 12,
    marginTop: 1,
  },
  aotaTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  aotaSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  aotaClearButton: {
    padding: 4,
  },
});
