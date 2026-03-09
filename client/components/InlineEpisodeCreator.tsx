import React, { useState, useEffect, useCallback } from "react";
import { View, Switch, StyleSheet, Animated } from "react-native";
import * as Crypto from "expo-crypto";
import { ThemedText } from "@/components/ThemedText";
import {
  FormField,
  SelectField,
  DatePickerField,
} from "@/components/FormField";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { normalizeDateOnlyValue, toIsoDateValue } from "@/lib/dateValues";
import { saveEpisode } from "@/lib/episodeStorage";
import { suggestEpisodeType, suggestEpisodeTitle } from "@/lib/episodeHelpers";
import type { Specialty } from "@/types/case";
import type {
  TreatmentEpisode,
  EpisodeType,
  PendingAction,
  EpisodeLaterality,
} from "@/types/episode";
import { EPISODE_TYPE_LABELS, PENDING_ACTION_LABELS } from "@/types/episode";

interface InlineEpisodeCreatorProps {
  visible: boolean;
  specialty: Specialty;
  diagnosisName?: string;
  diagnosisCode?: string;
  laterality?: string;
  subcategory?: string;
  patientIdentifier: string;
  procedureDate: string;
  onEpisodeCreated: (episode: TreatmentEpisode) => void;
  onDismiss: () => void;
}

export function InlineEpisodeCreator({
  visible,
  specialty,
  diagnosisName,
  diagnosisCode,
  laterality,
  subcategory,
  patientIdentifier,
  procedureDate,
  onEpisodeCreated,
  onDismiss,
}: InlineEpisodeCreatorProps) {
  const { theme } = useTheme();
  const { profile } = useAuth();

  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("");
  const [episodeType, setEpisodeType] = useState<EpisodeType>("other");
  const [onsetDate, setOnsetDate] = useState(
    () => normalizeDateOnlyValue(procedureDate) ?? toIsoDateValue(new Date()),
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | "">("");
  const [saving, setSaving] = useState(false);

  const [heightAnim] = useState(new Animated.Value(0));

  // Auto-suggest when diagnosis changes
  useEffect(() => {
    if (diagnosisName) {
      const lat = laterality as EpisodeLaterality | undefined;
      setTitle(suggestEpisodeTitle(diagnosisName, lat));
      setEpisodeType(suggestEpisodeType(specialty, subcategory));
    }
  }, [diagnosisName, laterality, specialty, subcategory]);

  // Animate height
  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: enabled ? 1 : 0,
      useNativeDriver: false,
      tension: 60,
      friction: 12,
    }).start();
  }, [enabled, heightAnim]);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const episode: TreatmentEpisode = {
        id: Crypto.randomUUID(),
        patientIdentifier,
        title: title.trim(),
        primaryDiagnosisCode: diagnosisCode ?? "",
        primaryDiagnosisDisplay: diagnosisName ?? "",
        laterality: laterality as EpisodeLaterality | undefined,
        type: episodeType,
        specialty,
        status: "active",
        pendingAction: pendingAction || undefined,
        onsetDate,
        ownerId: profile?.id ?? "",
        createdAt: now,
        updatedAt: now,
      };
      await saveEpisode(episode);
      onEpisodeCreated(episode);
    } catch (error) {
      console.error("Error creating episode:", error);
    } finally {
      setSaving(false);
    }
  }, [
    title,
    patientIdentifier,
    diagnosisCode,
    diagnosisName,
    laterality,
    episodeType,
    specialty,
    pendingAction,
    onsetDate,
    profile?.id,
    onEpisodeCreated,
  ]);

  if (!visible) return null;

  const formHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 350],
  });

  const formOpacity = heightAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.toggleRow}>
        <ThemedText style={[styles.toggleLabel, { color: theme.text }]}>
          Start treatment episode?
        </ThemedText>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{
            false: theme.border,
            true: theme.link + "80",
          }}
          thumbColor={enabled ? theme.link : theme.textTertiary}
        />
      </View>

      <Animated.View
        style={[
          styles.formContainer,
          { maxHeight: formHeight, opacity: formOpacity },
        ]}
      >
        {enabled ? (
          <View style={styles.formContent}>
            <FormField
              label="Episode Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. L heel wound management"
            />

            <SelectField
              label="Episode Type"
              value={episodeType}
              options={Object.entries(EPISODE_TYPE_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
              onSelect={(v: string) => setEpisodeType(v as EpisodeType)}
            />

            <DatePickerField
              label="Onset Date"
              value={onsetDate}
              onChange={setOnsetDate}
            />

            <SelectField
              label="Pending Action (optional)"
              value={pendingAction}
              options={[
                { value: "", label: "None" },
                ...Object.entries(PENDING_ACTION_LABELS).map(
                  ([value, label]) => ({ value, label }),
                ),
              ]}
              onSelect={(v: string) =>
                setPendingAction(v as PendingAction | "")
              }
            />

            <Button onPress={handleCreate} disabled={saving || !title.trim()}>
              {saving ? "Creating..." : "Create Episode"}
            </Button>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.md,
    ...Shadows.card,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  formContainer: {
    overflow: "hidden",
  },
  formContent: {
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
});
