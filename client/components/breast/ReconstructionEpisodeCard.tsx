/**
 * ReconstructionEpisodeCard — Create or link to a multi-stage reconstruction episode.
 *
 * Non-intrusive: appears as a subtle prompt, not a modal. One tap to create, zero taps to skip.
 * Does NOT do episode CRUD itself — signals intent to parent via callbacks.
 */

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface Props {
  /** Existing linked episode ID, if any */
  linkedEpisodeId?: string;
  /** Existing episode title, if linked */
  linkedEpisodeTitle?: string;
  /** Called when user creates a new episode */
  onCreateEpisode: () => void;
  /** Called when user unlinks */
  onUnlinkEpisode: () => void;
}

export const ReconstructionEpisodeCard = React.memo(
  function ReconstructionEpisodeCard({
    linkedEpisodeId,
    linkedEpisodeTitle,
    onCreateEpisode,
    onUnlinkEpisode,
  }: Props) {
    const { theme } = useTheme();

    if (linkedEpisodeId) {
      return (
        <View
          style={[
            styles.linkedBanner,
            {
              backgroundColor: `${theme.link}15`,
              borderColor: `${theme.link}40`,
            },
          ]}
        >
          <Feather name="link" size={14} color={theme.link} />
          <ThemedText
            type="small"
            style={[styles.linkedText, { color: theme.link }]}
            numberOfLines={1}
          >
            {linkedEpisodeTitle ?? "Reconstruction Episode"}
          </ThemedText>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onUnlinkEpisode();
            }}
            hitSlop={8}
          >
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, fontSize: 12 }}
            >
              Unlink
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onCreateEpisode();
        }}
        style={[
          styles.promptBanner,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather name="link" size={14} color={theme.textSecondary} />
        <View style={styles.promptContent}>
          <ThemedText
            type="small"
            style={{ color: theme.text, fontWeight: "600" }}
          >
            Start a reconstruction episode?
          </ThemedText>
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, fontSize: 12 }}
          >
            Track stages across multiple operations
          </ThemedText>
        </View>
        <Feather name="plus-circle" size={18} color={theme.link} />
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  linkedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  linkedText: {
    flex: 1,
    fontWeight: "600",
  },
  promptBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  promptContent: {
    flex: 1,
    gap: 2,
  },
});
