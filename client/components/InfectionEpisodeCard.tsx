import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { FormField, SelectField } from "@/components/FormField";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  InfectionEpisode,
  EpisodeIntent,
  DebridementExtent,
  CompartmentsInvolved,
  ReconstructionType,
  AmputationLevel,
  EPISODE_INTENT_LABELS,
  DEBRIDEMENT_EXTENT_LABELS,
  DEBRIDEMENT_EXTENT_DESCRIPTIONS,
  COMPARTMENTS_INVOLVED_LABELS,
  RECONSTRUCTION_TYPE_LABELS,
  AMPUTATION_LEVEL_LABELS,
} from "@/types/infection";

interface InfectionEpisodeCardProps {
  episode: InfectionEpisode;
  onChange: (episode: InfectionEpisode) => void;
  onDelete: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const INTENT_OPTIONS = Object.entries(EPISODE_INTENT_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const DEBRIDEMENT_EXTENT_OPTIONS = Object.entries(
  DEBRIDEMENT_EXTENT_LABELS,
).map(([value, label]) => ({
  value,
  label,
}));

const COMPARTMENTS_OPTIONS = Object.entries(COMPARTMENTS_INVOLVED_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const RECONSTRUCTION_OPTIONS = Object.entries(RECONSTRUCTION_TYPE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const AMPUTATION_OPTIONS = Object.entries(AMPUTATION_LEVEL_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export function InfectionEpisodeCard({
  episode,
  onChange,
  onDelete,
  isExpanded = false,
  onToggleExpand,
}: InfectionEpisodeCardProps) {
  const { theme } = useTheme();

  const updateEpisode = (updates: Partial<InfectionEpisode>) => {
    onChange({
      ...episode,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleIntent = (intent: EpisodeIntent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentIntents = episode.intents || [];
    const hasIntent = currentIntents.includes(intent);

    if (hasIntent) {
      updateEpisode({ intents: currentIntents.filter((i) => i !== intent) });
    } else {
      updateEpisode({ intents: [...currentIntents, intent] });
    }
  };

  const showDebridementExtent = episode.intents?.includes("debridement");
  const showReconstruction = episode.intents?.includes(
    "reconstruction_coverage",
  );
  const showAmputation = episode.intents?.includes("amputation");

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getIntentSummary = () => {
    if (!episode.intents?.length) return "No procedures";
    return episode.intents.map((i) => EPISODE_INTENT_LABELS[i]).join(", ");
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
      ]}
    >
      <Pressable onPress={onToggleExpand} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.episodeBadge, { backgroundColor: theme.link }]}>
            <ThemedText style={styles.episodeBadgeText}>
              #{episode.episodeNumber}
            </ThemedText>
          </View>
          <View style={styles.headerInfo}>
            <ThemedText style={[styles.dateText, { color: theme.text }]}>
              {formatDate(episode.episodeDatetime)}
            </ThemedText>
            <ThemedText
              style={[styles.summaryText, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {getIntentSummary()}
            </ThemedText>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Feather name="trash-2" size={16} color={theme.error} />
          </Pressable>
          <Feather
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.textSecondary}
          />
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.content}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Procedure Intent (select all that apply)
          </ThemedText>
          <View style={styles.intentGrid}>
            {INTENT_OPTIONS.map((option) => {
              const isSelected = episode.intents?.includes(
                option.value as EpisodeIntent,
              );
              return (
                <Pressable
                  key={option.value}
                  onPress={() => toggleIntent(option.value as EpisodeIntent)}
                  style={[
                    styles.intentChip,
                    {
                      backgroundColor: isSelected
                        ? theme.link
                        : theme.backgroundRoot,
                      borderColor: isSelected ? theme.link : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.intentChipText,
                      { color: isSelected ? theme.buttonText : theme.text },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {showDebridementExtent ? (
            <View style={styles.modifierSection}>
              <SelectField
                label="Debridement Extent"
                value={episode.debridementExtent || ""}
                options={[
                  { value: "", label: "Select extent..." },
                  ...DEBRIDEMENT_EXTENT_OPTIONS,
                ]}
                onSelect={(v) =>
                  updateEpisode({
                    debridementExtent: (v as DebridementExtent) || undefined,
                  })
                }
              />
              {episode.debridementExtent ? (
                <View
                  style={[
                    styles.extentDescription,
                    { backgroundColor: theme.backgroundRoot },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.extentDescriptionText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {DEBRIDEMENT_EXTENT_DESCRIPTIONS[episode.debridementExtent]}
                  </ThemedText>
                </View>
              ) : null}
              <SelectField
                label="Compartments Involved"
                value={episode.compartmentsInvolved || ""}
                options={[
                  { value: "", label: "Select..." },
                  ...COMPARTMENTS_OPTIONS,
                ]}
                onSelect={(v) =>
                  updateEpisode({
                    compartmentsInvolved:
                      (v as CompartmentsInvolved) || undefined,
                  })
                }
              />
            </View>
          ) : null}

          {showReconstruction ? (
            <View style={styles.modifierSection}>
              <SelectField
                label="Reconstruction Type"
                value={episode.reconstructionType || ""}
                options={[
                  { value: "", label: "Select type..." },
                  ...RECONSTRUCTION_OPTIONS,
                ]}
                onSelect={(v) =>
                  updateEpisode({
                    reconstructionType: (v as ReconstructionType) || undefined,
                  })
                }
              />
            </View>
          ) : null}

          {showAmputation ? (
            <View style={styles.modifierSection}>
              <SelectField
                label="Amputation Level"
                value={episode.amputationLevel || ""}
                options={[
                  { value: "", label: "Select level..." },
                  ...AMPUTATION_OPTIONS,
                ]}
                onSelect={(v) =>
                  updateEpisode({
                    amputationLevel: (v as AmputationLevel) || undefined,
                  })
                }
              />
            </View>
          ) : null}

          <FormField
            label="Notes"
            value={episode.notes || ""}
            onChangeText={(v) => updateEpisode({ notes: v })}
            placeholder="Additional notes for this episode..."
            multiline
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  episodeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  episodeBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  headerInfo: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryText: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  content: {
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  intentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  intentChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  intentChipText: {
    fontSize: 13,
  },
  modifierSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  extentDescription: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  extentDescriptionText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
