import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { FavouritesRecentsChips } from "@/components/FavouritesRecentsChips";
import { useTheme } from "@/hooks/useTheme";
import { useFavouritesRecents } from "@/hooks/useFavouritesRecents";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  getDiagnosisSubcategories,
  getDiagnosesForSubcategory,
  getDiagnosesForSpecialty,
  hasDiagnosisPicklist,
  findDiagnosisById,
} from "@/lib/diagnosisPicklists";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type { Specialty } from "@/types/case";

interface DiagnosisPickerProps {
  specialty: Specialty;
  selectedDiagnosisId?: string;
  onSelect: (diagnosis: DiagnosisPicklistEntry) => void;
  clinicalGroupFilter?: "trauma" | "acute" | "non-trauma";
  /**
   * When provided, overrides the built-in specialty picklist.
   * Subcategories and search derive from this list instead.
   * Used by breast module for context-filtered diagnosis display.
   */
  filteredDiagnoses?: DiagnosisPicklistEntry[];
}

function matchesGroupFilter(
  dx: DiagnosisPicklistEntry,
  filter: "trauma" | "acute" | "non-trauma" | undefined,
): boolean {
  if (!filter) return true;
  if (filter === "trauma") return dx.clinicalGroup === "trauma";
  if (filter === "acute") return dx.clinicalGroup === "acute";
  // "non-trauma" = elective: exclude both trauma and acute
  return dx.clinicalGroup !== "trauma" && dx.clinicalGroup !== "acute";
}

export function DiagnosisPicker({
  specialty,
  selectedDiagnosisId,
  onSelect,
  clinicalGroupFilter,
  filteredDiagnoses,
}: DiagnosisPickerProps) {
  const { theme } = useTheme();

  const {
    favouriteDiagnoses,
    recentDiagnoses,
    isFavourite,
    toggleFavourite,
    loaded: favsLoaded,
  } = useFavouritesRecents(specialty);

  const favouriteDiagnosisIds = useMemo(
    () => new Set(favouriteDiagnoses.map((d) => d.id)),
    [favouriteDiagnoses],
  );

  const allSubcategories = useMemo(() => {
    if (filteredDiagnoses) {
      // Derive unique subcategories from filtered list, preserving order
      const seen = new Set<string>();
      return filteredDiagnoses
        .map((d) => d.subcategory)
        .filter((s) => {
          if (seen.has(s)) return false;
          seen.add(s);
          return true;
        });
    }
    return getDiagnosisSubcategories(specialty);
  }, [filteredDiagnoses, specialty]);

  // Filter tabs to only show those with at least one matching diagnosis
  const subcategories = useMemo(() => {
    if (filteredDiagnoses) return allSubcategories; // Already filtered
    if (!clinicalGroupFilter) return allSubcategories;
    return allSubcategories.filter((subcat) => {
      const dxInSubcat = getDiagnosesForSubcategory(specialty, subcat);
      return dxInSubcat.some((dx) =>
        matchesGroupFilter(dx, clinicalGroupFilter),
      );
    });
  }, [allSubcategories, clinicalGroupFilter, filteredDiagnoses, specialty]);

  const initialSubcat = () => {
    if (selectedDiagnosisId) {
      const all = getDiagnosesForSpecialty(specialty);
      const entry = all.find((e) => e.id === selectedDiagnosisId);
      if (entry && subcategories.includes(entry.subcategory))
        return entry.subcategory;
    }
    return subcategories[0] ?? "";
  };

  const [activeSubcategory, setActiveSubcategory] =
    useState<string>(initialSubcat);

  const diagnosesInSubcat = useMemo(() => {
    if (filteredDiagnoses) {
      return filteredDiagnoses.filter(
        (dx) => dx.subcategory === activeSubcategory,
      );
    }
    const raw = getDiagnosesForSubcategory(specialty, activeSubcategory);
    return clinicalGroupFilter
      ? raw.filter((dx) => matchesGroupFilter(dx, clinicalGroupFilter))
      : raw;
  }, [filteredDiagnoses, specialty, activeSubcategory, clinicalGroupFilter]);

  // Favourites/recents chip handlers
  const handleChipSelect = useCallback(
    (id: string) => {
      const dx = findDiagnosisById(id);
      if (dx) onSelect(dx);
    },
    [onSelect],
  );

  const handleToggleFavouriteDiagnosis = useCallback(
    (id: string) => {
      toggleFavourite("diagnosis", id);
    },
    [toggleFavourite],
  );

  // Filter favourites/recents by clinical group filter or filteredDiagnoses
  const filteredDiagnosisIds = useMemo(
    () =>
      filteredDiagnoses
        ? new Set(filteredDiagnoses.map((d) => d.id))
        : undefined,
    [filteredDiagnoses],
  );

  const filteredFavourites = useMemo(
    () =>
      favouriteDiagnoses.filter((dx) =>
        filteredDiagnosisIds
          ? filteredDiagnosisIds.has(dx.id)
          : matchesGroupFilter(dx, clinicalGroupFilter),
      ),
    [favouriteDiagnoses, clinicalGroupFilter, filteredDiagnosisIds],
  );

  const filteredRecents = useMemo(
    () =>
      recentDiagnoses.filter((dx) =>
        filteredDiagnosisIds
          ? filteredDiagnosisIds.has(dx.id)
          : matchesGroupFilter(dx, clinicalGroupFilter),
      ),
    [recentDiagnoses, clinicalGroupFilter, filteredDiagnosisIds],
  );

  // Resolve selected diagnosis entry for the detail panel below chips
  const selectedDiagnosisEntry = useMemo(() => {
    if (!selectedDiagnosisId) return undefined;
    if (filteredDiagnoses) {
      return filteredDiagnoses.find((d) => d.id === selectedDiagnosisId);
    }
    return findDiagnosisById(selectedDiagnosisId);
  }, [selectedDiagnosisId, filteredDiagnoses]);

  if (!hasDiagnosisPicklist(specialty)) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Favourites & Recents chips */}
      {favsLoaded &&
      (filteredFavourites.length > 0 || filteredRecents.length > 0) ? (
        <FavouritesRecentsChips
          favourites={filteredFavourites}
          recents={filteredRecents}
          favouriteIds={favouriteDiagnosisIds}
          onSelect={handleChipSelect}
          onToggleFavourite={handleToggleFavouriteDiagnosis}
        />
      ) : null}

      <View style={styles.subcatGrid}>
          {subcategories.map((subcat) => {
            const isActive = subcat === activeSubcategory;
            return (
              <Pressable
                key={subcat}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveSubcategory(subcat);
                }}
                style={[
                  styles.subcatChip,
                  {
                    backgroundColor: isActive
                      ? theme.link
                      : theme.backgroundDefault,
                    borderColor: isActive ? theme.link : theme.border,
                  },
                ]}
                testID={`button-subcat-${subcat}`}
              >
                <ThemedText
                  style={[
                    styles.subcatChipText,
                    {
                      color: isActive ? theme.buttonText : theme.textSecondary,
                    },
                  ]}
                >
                  {subcat}
                </ThemedText>
              </Pressable>
            );
          })}
      </View>

      {/* Section label for active subcategory */}
      {activeSubcategory ? (
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          {activeSubcategory}
        </ThemedText>
      ) : null}

      <View style={styles.diagnosisChipGrid}>
        {diagnosesInSubcat.length > 0 ? (
          diagnosesInSubcat.map((dx) => {
            const isSelected = dx.id === selectedDiagnosisId;
            const isFav = isFavourite("diagnosis", dx.id);
            return (
              <Pressable
                key={dx.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(dx);
                }}
                onLongPress={() => {
                  Haptics.selectionAsync();
                  toggleFavourite("diagnosis", dx.id);
                }}
                style={[
                  styles.diagnosisChip,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundSecondary,
                    borderColor: isSelected
                      ? theme.link
                      : theme.border + "80",
                  },
                ]}
                testID={`button-diagnosis-${dx.id}`}
              >
                {isFav ? (
                  <Feather
                    name="star"
                    size={12}
                    color={isSelected ? theme.buttonText : theme.link}
                  />
                ) : null}
                <ThemedText
                  style={[
                    styles.diagnosisChipText,
                    {
                      color: isSelected ? theme.buttonText : theme.text,
                      fontWeight: isSelected ? "600" : "400",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {dx.shortName ?? dx.displayName}
                </ThemedText>
                {isSelected ? (
                  <Feather
                    name="check"
                    size={14}
                    color={theme.buttonText}
                  />
                ) : null}
              </Pressable>
            );
          })
        ) : null}
      </View>

      {/* Full name detail for selected diagnosis (chips show shortName) */}
      {selectedDiagnosisEntry ? (
        <SelectedDiagnosisDetail
          diagnosis={selectedDiagnosisEntry}
          theme={theme}
        />
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Selected diagnosis detail (shows full name below chips)
// ═══════════════════════════════════════════════════════════════

const SelectedDiagnosisDetail = React.memo(function SelectedDiagnosisDetail({
  diagnosis,
  theme,
}: {
  diagnosis: DiagnosisPicklistEntry;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <View
      style={[
        styles.selectedDetail,
        {
          backgroundColor: theme.link + "10",
          borderColor: theme.link + "30",
        },
      ]}
    >
      <ThemedText
        type="small"
        style={{ color: theme.text, fontWeight: "500" }}
        numberOfLines={2}
      >
        {diagnosis.displayName}
      </ThemedText>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  subcatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  subcatChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  subcatChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  diagnosisChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  diagnosisChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  diagnosisChipText: {
    fontSize: 13,
  },
  selectedDetail: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
});
