import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

export interface ChipItem {
  id: string;
  displayName: string;
  shortName?: string;
}

interface FavouritesRecentsChipsProps {
  favourites: ChipItem[];
  recents: ChipItem[];
  favouriteIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleFavourite: (id: string) => void;
}

export function FavouritesRecentsChips({
  favourites,
  recents,
  favouriteIds,
  onSelect,
  onToggleFavourite,
}: FavouritesRecentsChipsProps) {
  const { theme } = useTheme();

  if (favourites.length === 0 && recents.length === 0) return null;

  return (
    <View style={styles.container}>
      {favourites.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="star" size={12} color={theme.link} />
            <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Favourites
            </ThemedText>
          </View>
          <View style={styles.chipRow}>
            {favourites.map((item) => (
              <View key={item.id} style={styles.chipWrapper}>
                <Pressable
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.link + "15",
                      borderColor: theme.link + "40",
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelect(item.id);
                  }}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      onToggleFavourite(item.id);
                    }}
                    hitSlop={4}
                    style={styles.starButton}
                  >
                    <Feather
                      name="star"
                      size={14}
                      color={theme.link}
                    />
                  </Pressable>
                  <ThemedText
                    style={[styles.chipText, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {item.shortName ?? item.displayName}
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {recents.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="clock" size={12} color={theme.textTertiary} />
            <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Recent
            </ThemedText>
          </View>
          <View style={styles.chipRow}>
            {recents.map((item) => {
              const isFav = favouriteIds.has(item.id);
              return (
                <View key={item.id} style={styles.chipWrapper}>
                  <Pressable
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelect(item.id);
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        onToggleFavourite(item.id);
                      }}
                      hitSlop={4}
                      style={styles.starButton}
                    >
                      <Feather
                        name={isFav ? "star" : "star"}
                        size={14}
                        color={isFav ? theme.link : theme.textTertiary}
                      />
                    </Pressable>
                    <ThemedText
                      style={[styles.chipText, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {item.shortName ?? item.displayName}
                    </ThemedText>
                  </Pressable>
                </View>
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
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionLabel: {
    ...Typography.caption,
    fontWeight: "500",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chipWrapper: {},
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  starButton: {
    padding: 2,
  },
  chipText: {
    ...Typography.small,
    flexShrink: 1,
  },
});
