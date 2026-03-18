import React, { useMemo } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { PROCEDURE_CATEGORIES } from "@/constants/categories";
import { SPECIALTY_LABELS, Specialty } from "@/types/case";
import { HISTOLOGY_FILTER_ID } from "@/lib/dashboardSelectors";

interface SpecialtyFilterBarProps {
  selectedSpecialty: string | null;
  onSelectSpecialty: (specialty: string | null) => void;
  caseCounts: Partial<Record<Specialty, number>>;
  totalCaseCount: number;
  isSticky?: boolean;
  /** Number of cases awaiting histology. Chip hidden when 0. */
  awaitingHistologyCount?: number;
}

function SpecialtyFilterBarInner({
  selectedSpecialty,
  onSelectSpecialty,
  caseCounts,
  totalCaseCount,
  isSticky,
  awaitingHistologyCount = 0,
}: SpecialtyFilterBarProps) {
  const { theme } = useTheme();

  const visibleChips = useMemo(() => {
    const chips: {
      id: string | null;
      label: string;
      count: number;
      isSpecial?: boolean;
    }[] = [{ id: null, label: "All", count: totalCaseCount }];
    for (const cat of PROCEDURE_CATEGORIES) {
      const count = caseCounts[cat.id] ?? 0;
      if (count > 0) {
        chips.push({
          id: cat.id,
          label: SPECIALTY_LABELS[cat.id as Specialty] ?? cat.label,
          count,
        });
      }
    }
    if (awaitingHistologyCount > 0) {
      chips.push({
        id: HISTOLOGY_FILTER_ID,
        label: "Histology",
        count: awaitingHistologyCount,
        isSpecial: true,
      });
    }
    return chips;
  }, [awaitingHistologyCount, caseCounts, totalCaseCount]);

  const handlePress = (id: string | null) => {
    Haptics.selectionAsync();
    onSelectSpecialty(id === selectedSpecialty ? null : id);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundRoot },
        isSticky && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleChips.map((chip) => {
          const isSelected = chip.id === selectedSpecialty;
          const isHistology = chip.id === HISTOLOGY_FILTER_ID;
          return (
            <Pressable
              key={chip.id ?? "all"}
              testID={`dashboard.filter.chip-${chip.id ?? "all"}`}
              onPress={() => handlePress(chip.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${chip.label} filter, ${chip.count} cases`}
              accessibilityHint="Filters dashboard content by specialty"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.chip,
                isSelected
                  ? { backgroundColor: theme.accent }
                  : {
                      backgroundColor: theme.backgroundElevated,
                      borderColor: isHistology
                        ? theme.accent + "50"
                        : theme.border,
                      borderWidth: 1,
                    },
              ]}
            >
              {isHistology ? (
                <View style={styles.chipContent}>
                  <Feather
                    name="file-text"
                    size={12}
                    color={isSelected ? theme.accentContrast : theme.accent}
                  />
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? theme.accentContrast : theme.accent,
                      },
                    ]}
                  >
                    {chip.label} ({chip.count})
                  </ThemedText>
                </View>
              ) : (
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: isSelected
                        ? theme.accentContrast
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {chip.label} ({chip.count})
                </ThemedText>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const SpecialtyFilterBar = React.memo(SpecialtyFilterBarInner);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
