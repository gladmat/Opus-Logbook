import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { ThemedText } from "@/components/ThemedText";
import { InfectionEpisodeCard } from "@/components/InfectionEpisodeCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { InfectionEpisode, InfectionOverlay } from "@/types/infection";

interface InfectionEpisodeTimelineProps {
  overlay: InfectionOverlay;
  onOverlayChange: (overlay: InfectionOverlay) => void;
}

export function InfectionEpisodeTimeline({
  overlay,
  onOverlayChange,
}: InfectionEpisodeTimelineProps) {
  const { theme } = useTheme();
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(
    null,
  );

  const episodes = overlay.episodes || [];

  const handleAddEpisode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = new Date().toISOString();
    const newEpisode: InfectionEpisode = {
      id: uuidv4(),
      episodeDatetime: now,
      episodeNumber: episodes.length + 1,
      intents: [],
      createdAt: now,
      updatedAt: now,
    };

    onOverlayChange({
      ...overlay,
      episodes: [...episodes, newEpisode],
      updatedAt: now,
    });
    setExpandedEpisodeId(newEpisode.id);
  };

  const handleUpdateEpisode = (updatedEpisode: InfectionEpisode) => {
    onOverlayChange({
      ...overlay,
      episodes: episodes.map((ep) =>
        ep.id === updatedEpisode.id ? updatedEpisode : ep,
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteEpisode = (episodeId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const updatedEpisodes = episodes
      .filter((ep) => ep.id !== episodeId)
      .map((ep, index) => ({
        ...ep,
        episodeNumber: index + 1,
      }));

    onOverlayChange({
      ...overlay,
      episodes: updatedEpisodes,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: theme.text }]}>
          Operative Episodes
        </ThemedText>
        <Pressable
          onPress={handleAddEpisode}
          style={[styles.addButton, { backgroundColor: theme.link }]}
        >
          <Feather name="plus" size={16} color={theme.buttonText} />
          <ThemedText
            style={[styles.addButtonText, { color: theme.buttonText }]}
          >
            Add Episode
          </ThemedText>
        </Pressable>
      </View>

      {episodes.length > 0 ? (
        <View style={styles.timeline}>
          {episodes.map((episode, index) => (
            <View key={episode.id} style={styles.timelineItem}>
              {index > 0 ? (
                <View
                  style={[styles.connector, { backgroundColor: theme.border }]}
                />
              ) : null}
              <InfectionEpisodeCard
                episode={episode}
                onChange={handleUpdateEpisode}
                onDelete={() => handleDeleteEpisode(episode.id)}
                isExpanded={expandedEpisodeId === episode.id}
                onToggleExpand={() =>
                  setExpandedEpisodeId(
                    expandedEpisodeId === episode.id ? null : episode.id,
                  )
                }
              />
            </View>
          ))}
        </View>
      ) : (
        <View
          style={[styles.emptyState, { backgroundColor: theme.backgroundRoot }]}
        >
          <Feather name="clipboard" size={24} color={theme.textTertiary} />
          <ThemedText
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            No episodes recorded yet
          </ThemedText>
          <ThemedText style={[styles.emptyHint, { color: theme.textTertiary }]}>
            {'Tap "Add Episode" to document the first operative intervention'}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    position: "relative",
  },
  connector: {
    position: "absolute",
    left: 16,
    top: -8,
    width: 2,
    height: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyHint: {
    fontSize: 12,
    textAlign: "center",
  },
});
