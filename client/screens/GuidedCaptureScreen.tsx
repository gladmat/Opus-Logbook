import React, { useState, useMemo, useCallback, useLayoutEffect } from "react";
import {
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ALL_PROTOCOLS } from "@/data/mediaCaptureProtocols";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function GuidedCaptureScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [patientId, setPatientId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  const canStart = useMemo(
    () => patientId.trim().length > 0 && selectedTemplateId !== null,
    [patientId, selectedTemplateId],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ padding: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ThemedText style={{ color: theme.link, fontSize: 17 }}>
            Cancel
          </ThemedText>
        </Pressable>
      ),
    });
  }, [navigation, theme.link]);

  const handleStartCapture = useCallback(() => {
    if (!canStart || !selectedTemplateId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.replace("OpusCamera", {
      templateId: selectedTemplateId,
      patientIdentifier: patientId.trim(),
      targetMode: "inbox",
    });
  }, [canStart, selectedTemplateId, patientId, navigation]);

  return (
    <ScrollView
      testID="screen-guidedCapture"
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
          Patient Identifier{" "}
          <ThemedText style={{ color: theme.error }}>*</ThemedText>
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
          autoFocus
          returnKeyType="next"
        />
      </View>

      {/* Template Picker */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Capture Template{" "}
          <ThemedText style={{ color: theme.error }}>*</ThemedText>
        </ThemedText>
        <View style={styles.chipWrap}>
          {ALL_PROTOCOLS.map((protocol) => {
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
                <ThemedText
                  style={[
                    styles.chipCount,
                    {
                      color: isActive
                        ? theme.accentContrast
                        : theme.textTertiary,
                    },
                  ]}
                >
                  {protocol.steps.length} steps
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Start Capture */}
      <Pressable
        onPress={handleStartCapture}
        disabled={!canStart}
        style={[
          styles.startButton,
          {
            backgroundColor: theme.accent,
            opacity: canStart ? 1 : 0.4,
          },
        ]}
      >
        <ThemedText
          style={[styles.startButtonText, { color: theme.accentContrast }]}
        >
          Start Capture
        </ThemedText>
      </Pressable>

      <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
        Photos will be saved to your Inbox with the patient identifier and
        template metadata. No case is created.
      </ThemedText>
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
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  chipCount: {
    fontSize: 11,
    fontWeight: "400",
  },
  startButton: {
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
