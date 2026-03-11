import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import { ThemedText } from "@/components/ThemedText";
import { DatePickerField } from "@/components/FormField";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { Specialty, SPECIALTY_LABELS, Case } from "@/types/case";
import { getVisibleSpecialties } from "@/lib/personalization";
import { saveCase } from "@/lib/storage";
import { ALL_PROTOCOLS } from "@/data/mediaCaptureProtocols";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PlanCaseScreen() {
  const { theme } = useTheme();
  const { profile, user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const visibleSpecialties = useMemo(
    () => getVisibleSpecialties(profile),
    [profile],
  );

  const [patientId, setPatientId] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(
    null,
  );
  const [plannedNote, setPlannedNote] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const filteredProtocols = useMemo(() => {
    if (!selectedSpecialty) return ALL_PROTOCOLS;
    return ALL_PROTOCOLS.filter((p) => {
      const rules = p.activationRules;
      if ("specialties" in rules && rules.specialties) {
        return rules.specialties.includes(selectedSpecialty);
      }
      return true;
    });
  }, [selectedSpecialty]);

  const buildPlannedCase = useCallback((): Case | null => {
    const trimmedId = patientId.trim();
    if (!trimmedId) {
      Alert.alert("Required", "Patient identifier is required.");
      return null;
    }
    if (!user?.id) return null;

    const now = new Date().toISOString();
    const caseId = Crypto.randomUUID();

    return {
      id: caseId,
      patientIdentifier: trimmedId,
      procedureDate: plannedDate || new Date().toISOString().split("T")[0]!,
      facility: "",
      specialty: selectedSpecialty ?? "general",
      procedureType: "",
      diagnosisGroups: [],
      operativeMedia: [],
      clinicalDetails: {} as any,
      teamMembers: [],
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
      caseStatus: "planned" as const,
      plannedDate: plannedDate || undefined,
      plannedNote: plannedNote.trim() || undefined,
      plannedTemplateId: selectedTemplateId ?? undefined,
      schemaVersion: 4,
    } as Case;
  }, [patientId, plannedDate, plannedNote, selectedSpecialty, selectedTemplateId, user?.id]);

  const handleSave = useCallback(async () => {
    const plannedCase = buildPlannedCase();
    if (!plannedCase) return;

    setSaving(true);
    try {
      await saveCase(plannedCase);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("[PlanCaseScreen] Save failed:", error);
      Alert.alert("Error", "Failed to save planned case.");
    } finally {
      setSaving(false);
    }
  }, [
    buildPlannedCase,
    navigation,
  ]);

  const handleOpenCamera = useCallback(() => {
    const openCamera = async () => {
      const plannedCase = buildPlannedCase();
      if (!plannedCase) return;

      setSaving(true);
      try {
        await saveCase(plannedCase);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.replace("OpusCamera", {
          templateId: selectedTemplateId ?? undefined,
          patientIdentifier: plannedCase.patientIdentifier,
          procedureDate: plannedCase.procedureDate,
          targetMode: "case",
          targetCaseId: plannedCase.id,
          returnTo: {
            screen: "CaseDetail",
            params: { caseId: plannedCase.id },
          },
        });
      } catch (error) {
        console.error("[PlanCaseScreen] Save before camera failed:", error);
        Alert.alert("Error", "Failed to save planned case before opening camera.");
      } finally {
        setSaving(false);
      }
    };

    void openCamera();
  }, [buildPlannedCase, navigation, selectedTemplateId]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + Spacing.xl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Patient Identifier */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Patient Identifier <ThemedText style={{ color: theme.error }}>*</ThemedText>
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          value={patientId}
          onChangeText={setPatientId}
          placeholder="e.g. MRN or NHI"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="next"
        />
      </View>

      {/* Planned Date */}
      <View style={styles.fieldGroup}>
        <DatePickerField
          label="Planned Date"
          value={plannedDate}
          onChange={setPlannedDate}
          placeholder="Not scheduled"
          clearable
          minimumDate={new Date()}
        />
      </View>

      {/* Specialty */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Specialty
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {visibleSpecialties.map((sp) => {
            const isActive = selectedSpecialty === sp;
            return (
              <Pressable
                key={sp}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedSpecialty(isActive ? null : sp);
                  if (isActive) setSelectedTemplateId(null);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? theme.accent
                      : theme.backgroundDefault,
                    borderColor: isActive ? theme.accent : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: isActive ? theme.accentContrast : theme.text },
                  ]}
                >
                  {SPECIALTY_LABELS[sp]}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Planning Note */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Planning Note
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            styles.noteInput,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          value={plannedNote}
          onChangeText={setPlannedNote}
          placeholder="Brief planning note..."
          placeholderTextColor={theme.textTertiary}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>

      {/* Template Picker */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Capture Template
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {filteredProtocols.map((protocol) => {
            const isActive = selectedTemplateId === protocol.id;
            return (
              <Pressable
                key={protocol.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedTemplateId(isActive ? null : protocol.id);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? theme.accent
                      : theme.backgroundDefault,
                    borderColor: isActive ? theme.accent : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: isActive ? theme.accentContrast : theme.text },
                  ]}
                >
                  {protocol.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={handleOpenCamera}
          disabled={saving}
          style={[
            styles.secondaryButton,
            { borderColor: theme.accent },
            saving && { opacity: 0.6 },
          ]}
        >
          <ThemedText style={[styles.secondaryButtonText, { color: theme.accent }]}>
            {saving ? "Saving..." : "Save & Open Opus Camera"}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[
            styles.primaryButton,
            { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 },
          ]}
        >
          <ThemedText
            style={[styles.primaryButtonText, { color: theme.accentContrast }]}
          >
            {saving ? "Saving..." : "Save Planned Case"}
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  fieldGroup: { gap: Spacing.xs },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  noteInput: {
    minHeight: 60,
    paddingTop: Spacing.sm,
  },
  chipRow: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
