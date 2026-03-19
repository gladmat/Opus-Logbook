/**
 * AddHistologyScreen
 * ══════════════════
 * Standalone screen for entering histology results on a case.
 *
 * Skin cancer cases: renders the full HistologySection component for structured
 * pathology category, subtypes, margins, etc.
 *
 * Other cases: renders a general histology form with category, free-text report,
 * margin status, and optional SNOMED code.
 *
 * Navigation params:
 *   caseId: string — case to update
 *   diagnosisGroupIndex: number — which diagnosis group
 *   lesionIndex?: number — for multi-lesion skin cancer
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getCase, updateCase } from "@/lib/storage";
import { HistologySection } from "@/components/skin-cancer/HistologySection";
import type { SkinCancerHistology } from "@/types/skinCancer";
import type {
  Case,
  GeneralHistologyCategory,
  HistologyMarginStatus,
  GeneralHistologyResult,
} from "@/types/case";
import * as Haptics from "expo-haptics";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "AddHistology">;

// ═══════════════════════════════════════════════════════════════
// General Histology Form (non-skin-cancer cases)
// ═══════════════════════════════════════════════════════════════

const CATEGORY_OPTIONS: { value: GeneralHistologyCategory; label: string }[] = [
  { value: "benign", label: "Benign" },
  { value: "malignant", label: "Malignant" },
  { value: "uncertain", label: "Uncertain" },
  { value: "other", label: "Other" },
];

const MARGIN_OPTIONS: { value: HistologyMarginStatus; label: string }[] = [
  { value: "complete", label: "Clear" },
  { value: "close", label: "Close" },
  { value: "incomplete", label: "Involved" },
  { value: "pending", label: "Pending" },
  { value: "not_applicable", label: "N/A" },
];

interface GeneralHistologyFormProps {
  result: GeneralHistologyResult;
  onChange: (result: GeneralHistologyResult) => void;
}

function GeneralHistologyForm({ result, onChange }: GeneralHistologyFormProps) {
  const { theme } = useTheme();

  const updateField = <K extends keyof GeneralHistologyResult>(
    field: K,
    value: GeneralHistologyResult[K],
  ) => {
    onChange({ ...result, [field]: value });
  };

  return (
    <View style={styles.formContainer}>
      {/* Category */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionLabel}>Pathology Category</ThemedText>
        <View style={styles.chipRow}>
          {CATEGORY_OPTIONS.map((opt) => {
            const selected = result.category === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateField("category", opt.value);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? theme.link + "20"
                      : theme.backgroundElevated,
                    borderColor: selected ? theme.link : theme.border,
                  },
                ]}
                testID={`histology.chip-category-${opt.value}`}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: selected ? theme.link : theme.text },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Histology Report */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionLabel}>Histology Report</ThemedText>
        <TextInput
          style={[
            styles.textArea,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
          value={result.report}
          onChangeText={(text) => updateField("report", text)}
          placeholder="Enter histology findings..."
          placeholderTextColor={theme.textTertiary}
          multiline
          textAlignVertical="top"
          numberOfLines={4}
          testID="histology.input-report"
        />
      </View>

      {/* Margin Status */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionLabel}>Margin Status</ThemedText>
        <View style={styles.chipRow}>
          {MARGIN_OPTIONS.map((opt) => {
            const selected = result.marginStatus === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateField("marginStatus", opt.value);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? theme.link + "20"
                      : theme.backgroundElevated,
                    borderColor: selected ? theme.link : theme.border,
                  },
                ]}
                testID={`histology.chip-marginStatus-${opt.value}`}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: selected ? theme.link : theme.text },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* SNOMED Code (optional) */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionLabel}>
          SNOMED Code (optional)
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
          value={result.snomedCode ?? ""}
          onChangeText={(text) => updateField("snomedCode", text || undefined)}
          placeholder="e.g. 399919001"
          placeholderTextColor={theme.textTertiary}
          keyboardType="number-pad"
        />
      </View>

      {/* SNOMED Display (optional) */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionLabel}>
          Histological Diagnosis (optional)
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
          value={result.snomedDisplay ?? ""}
          onChangeText={(text) =>
            updateField("snomedDisplay", text || undefined)
          }
          placeholder="e.g. Enchondroma"
          placeholderTextColor={theme.textTertiary}
        />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════

const EMPTY_GENERAL_RESULT: GeneralHistologyResult = {
  category: "benign",
  report: "",
  marginStatus: "pending",
};

export default function AddHistologyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { theme } = useTheme();
  const { caseId, diagnosisGroupIndex, lesionIndex } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [caseData, setCaseData] = useState<Case | null>(null);

  // Skin cancer histology state
  const [skinCancerHistology, setSkinCancerHistology] = useState<
    SkinCancerHistology | undefined
  >(undefined);

  // General histology state
  const [generalResult, setGeneralResult] =
    useState<GeneralHistologyResult>(EMPTY_GENERAL_RESULT);

  const isSkinCancerRef = useRef(false);

  // Load the case on mount
  useEffect(() => {
    (async () => {
      try {
        const loaded = await getCase(caseId);
        if (!loaded) {
          Alert.alert("Error", "Case not found");
          navigation.goBack();
          return;
        }
        setCaseData(loaded);

        const group = loaded.diagnosisGroups?.[diagnosisGroupIndex];
        if (!group) {
          Alert.alert("Error", "Diagnosis group not found");
          navigation.goBack();
          return;
        }

        // Determine if skin cancer
        if (lesionIndex !== undefined) {
          // Multi-lesion skin cancer
          const lesion = group.lesionInstances?.[lesionIndex];
          if (lesion?.skinCancerAssessment) {
            isSkinCancerRef.current = true;
            setSkinCancerHistology(
              lesion.skinCancerAssessment.currentHistology ?? {
                source: "current_procedure",
                pathologyCategory:
                  undefined as unknown as SkinCancerHistology["pathologyCategory"],
                marginStatus: "pending",
              },
            );
          }
        } else if (group.skinCancerAssessment) {
          // Single-lesion skin cancer
          isSkinCancerRef.current = true;
          setSkinCancerHistology(
            group.skinCancerAssessment.currentHistology ?? {
              source: "current_procedure",
              pathologyCategory:
                undefined as unknown as SkinCancerHistology["pathologyCategory"],
              marginStatus: "pending",
            },
          );
        } else {
          // General case
          isSkinCancerRef.current = false;
          if (group.histologyResult) {
            setGeneralResult(group.histologyResult);
          }
        }
      } catch {
        Alert.alert("Error", "Failed to load case");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [caseId, diagnosisGroupIndex, lesionIndex, navigation]);

  const handleSave = useCallback(async () => {
    if (!caseData) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const updatedGroups = [...(caseData.diagnosisGroups ?? [])];
      const group = updatedGroups[diagnosisGroupIndex];
      if (!group) {
        Alert.alert("Error", "Diagnosis group not found");
        setSaving(false);
        return;
      }

      if (isSkinCancerRef.current && skinCancerHistology) {
        if (lesionIndex !== undefined) {
          // Multi-lesion: update the specific lesion instance
          const lesions = [...(group.lesionInstances ?? [])];
          const lesion = lesions[lesionIndex];
          if (lesion?.skinCancerAssessment) {
            lesions[lesionIndex] = {
              ...lesion,
              skinCancerAssessment: {
                ...lesion.skinCancerAssessment,
                currentHistology: skinCancerHistology,
              },
            };
            updatedGroups[diagnosisGroupIndex] = {
              ...group,
              lesionInstances: lesions,
            };
          }
        } else if (group.skinCancerAssessment) {
          // Single-lesion skin cancer
          updatedGroups[diagnosisGroupIndex] = {
            ...group,
            skinCancerAssessment: {
              ...group.skinCancerAssessment,
              currentHistology: skinCancerHistology,
            },
            diagnosisCertainty: skinCancerHistology.pathologyCategory
              ? "histological"
              : group.diagnosisCertainty,
          };
        }
      } else {
        // General histology
        updatedGroups[diagnosisGroupIndex] = {
          ...group,
          histologyResult: {
            ...generalResult,
            reviewedAt: new Date().toISOString(),
          },
          diagnosisCertainty: "histological",
        };
      }

      await updateCase(caseData.id, {
        diagnosisGroups: updatedGroups,
      });

      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to save histology");
    } finally {
      setSaving(false);
    }
  }, [
    caseData,
    diagnosisGroupIndex,
    lesionIndex,
    skinCancerHistology,
    generalResult,
    navigation,
  ]);

  // Header save button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={handleSave}
          disabled={saving}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="histology.btn-save"
        >
          <ThemedText
            style={[
              styles.saveButton,
              { color: saving ? theme.textTertiary : theme.link },
            ]}
          >
            {saving ? "Saving..." : "Save"}
          </ThemedText>
        </Pressable>
      ),
    });
  }, [navigation, handleSave, saving, theme]);

  if (loading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator color={theme.link} />
      </View>
    );
  }

  if (!caseData) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ThemedText style={{ color: theme.textSecondary }}>
          Case not found
        </ThemedText>
      </View>
    );
  }

  const group = caseData.diagnosisGroups?.[diagnosisGroupIndex];
  const diagnosisName =
    group?.diagnosis?.displayName ?? group?.diagnosisPicklistId ?? "Diagnosis";

  return (
    <KeyboardAvoidingView
      testID="screen-addHistology"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.screenIntro}>
          <ThemedText style={[styles.screenTitle, { color: theme.text }]}>
            Add Histology
          </ThemedText>
          <ThemedText
            style={[styles.screenSubtitle, { color: theme.textSecondary }]}
          >
            Record pathology findings and margin status for this diagnosis.
          </ThemedText>
        </View>

        {/* Context header */}
        <View
          style={[
            styles.contextCard,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.contextRow}>
            <Feather name="user" size={14} color={theme.textTertiary} />
            <ThemedText
              style={[styles.contextText, { color: theme.textSecondary }]}
            >
              {caseData.patientIdentifier}
            </ThemedText>
          </View>
          <View style={styles.contextRow}>
            <Feather name="tag" size={14} color={theme.textTertiary} />
            <ThemedText
              style={[styles.contextText, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {diagnosisName}
            </ThemedText>
          </View>
          {lesionIndex !== undefined ? (
            <View style={styles.contextRow}>
              <Feather name="layers" size={14} color={theme.textTertiary} />
              <ThemedText
                style={[styles.contextText, { color: theme.textSecondary }]}
              >
                Lesion {lesionIndex + 1}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Form content */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
        >
          {isSkinCancerRef.current ? (
            <HistologySection
              label="Specimen Histology"
              histology={skinCancerHistology}
              onHistologyChange={setSkinCancerHistology}
              defaultExpanded
              defaultSource="current_procedure"
              isPending
              hideHeader
              hideSource
            />
          ) : (
            <GeneralHistologyForm
              result={generalResult}
              onChange={setGeneralResult}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  screenIntro: {
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  contextCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  contextText: {
    fontSize: 14,
    flex: 1,
  },
  formCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  formContainer: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  textArea: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 120,
  },
  input: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontSize: 15,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
  },
});
