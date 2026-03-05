import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { EpisodeCard } from "@/components/EpisodeCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { EpisodeWithCases } from "@/hooks/useActiveEpisodes";
import type { TreatmentEpisode } from "@/types/episode";

interface ActiveEpisodesSectionProps {
  episodes: EpisodeWithCases[];
  onNavigateEpisode: (episodeId: string) => void;
  onLogCase: (episode: TreatmentEpisode) => void;
  onViewAll: () => void;
}

const MAX_VISIBLE = 3;

export function ActiveEpisodesSection({
  episodes,
  onNavigateEpisode,
  onLogCase,
  onViewAll,
}: ActiveEpisodesSectionProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(true);

  if (episodes.length === 0) return null;

  const visibleEpisodes = episodes.slice(0, MAX_VISIBLE);
  const hasMore = episodes.length > MAX_VISIBLE;

  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.header}
      >
        <View style={styles.titleRow}>
          <Feather name="layers" size={18} color={theme.link} />
          <ThemedText style={[styles.title, { color: theme.link }]}>
            Active Episodes ({episodes.length})
          </ThemedText>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>

      {expanded ? (
        <>
          {visibleEpisodes.map(({ episode, cases }) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              linkedCases={cases}
              onPress={() => onNavigateEpisode(episode.id)}
              onLogCase={() => onLogCase(episode)}
            />
          ))}

          {hasMore ? (
            <Pressable onPress={onViewAll} style={styles.viewAllRow}>
              <ThemedText style={[styles.viewAllText, { color: theme.link }]}>
                View all ({episodes.length})
              </ThemedText>
              <Feather name="arrow-right" size={16} color={theme.link} />
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
