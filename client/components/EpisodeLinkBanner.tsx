import React, { useState, useEffect, useRef } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { findEpisodesByPatientIdentifier } from "@/lib/episodeStorage";
import type { TreatmentEpisode } from "@/types/episode";

interface EpisodeLinkBannerProps {
  patientIdentifier: string;
  currentEpisodeId: string;
  onLinkEpisode: (episode: TreatmentEpisode) => void;
}

export function EpisodeLinkBanner({
  patientIdentifier,
  currentEpisodeId,
  onLinkEpisode,
}: EpisodeLinkBannerProps) {
  const { theme } = useTheme();
  const [matchingEpisodes, setMatchingEpisodes] = useState<
    TreatmentEpisode[]
  >([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Hide if no patient ID or already linked
    if (!patientIdentifier.trim() || currentEpisodeId) {
      setMatchingEpisodes([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const episodes = await findEpisodesByPatientIdentifier(
          patientIdentifier,
        );
        const active = episodes.filter(
          (e) =>
            e.status === "active" ||
            e.status === "on_hold" ||
            e.status === "planned",
        );
        setMatchingEpisodes(active);
      } catch {
        setMatchingEpisodes([]);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [patientIdentifier, currentEpisodeId]);

  if (matchingEpisodes.length === 0) return null;

  const primary = matchingEpisodes[0]!;
  const moreCount = matchingEpisodes.length - 1;

  return (
    <Pressable
      onPress={() => onLinkEpisode(primary)}
      style={[
        styles.banner,
        {
          backgroundColor: theme.info + "10",
          borderColor: theme.info + "40",
        },
      ]}
    >
      <View style={styles.content}>
        <Feather name="link" size={16} color={theme.info} />
        <View style={styles.textContainer}>
          <ThemedText
            style={[styles.title, { color: theme.info }]}
            numberOfLines={1}
          >
            Active episode: {primary.title}
          </ThemedText>
          <ThemedText
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Tap to link this case
            {moreCount > 0 ? ` (+${moreCount} more)` : ""}
          </ThemedText>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={theme.info} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginRight: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
