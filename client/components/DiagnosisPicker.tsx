import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
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
  searchDiagnoses,
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
}: DiagnosisPickerProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

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

  const allSubcategories = getDiagnosisSubcategories(specialty);

  // Filter tabs to only show those with at least one matching diagnosis
  const subcategories = useMemo(() => {
    if (!clinicalGroupFilter) return allSubcategories;
    return allSubcategories.filter((subcat) => {
      const dxInSubcat = getDiagnosesForSubcategory(specialty, subcat);
      return dxInSubcat.some((dx) =>
        matchesGroupFilter(dx, clinicalGroupFilter),
      );
    });
  }, [allSubcategories, clinicalGroupFilter, specialty]);

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

  const isSearching = searchQuery.length >= 2;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const results = searchDiagnoses(searchQuery, specialty);
    return clinicalGroupFilter
      ? results.filter((dx) => matchesGroupFilter(dx, clinicalGroupFilter))
      : results;
  }, [searchQuery, specialty, isSearching, clinicalGroupFilter]);

  const diagnosesInSubcat = useMemo(() => {
    if (isSearching) return searchResults;
    const raw = getDiagnosesForSubcategory(specialty, activeSubcategory);
    return clinicalGroupFilter
      ? raw.filter((dx) => matchesGroupFilter(dx, clinicalGroupFilter))
      : raw;
  }, [
    isSearching,
    searchResults,
    specialty,
    activeSubcategory,
    clinicalGroupFilter,
  ]);

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

  // Filter favourites/recents by clinical group filter
  const filteredFavourites = useMemo(
    () =>
      favouriteDiagnoses.filter((dx) =>
        matchesGroupFilter(dx, clinicalGroupFilter),
      ),
    [favouriteDiagnoses, clinicalGroupFilter],
  );

  const filteredRecents = useMemo(
    () =>
      recentDiagnoses.filter((dx) =>
        matchesGroupFilter(dx, clinicalGroupFilter),
      ),
    [recentDiagnoses, clinicalGroupFilter],
  );

  if (!hasDiagnosisPicklist(specialty)) {
    return null;
  }

  return (
    <View style={styles.container}>
      {specialty !== "skin_cancer" ? (
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="search" size={16} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search diagnoses..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            testID="input-diagnosis-search"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={8}
              testID="button-clear-diagnosis-search"
            >
              <Feather name="x" size={16} color={theme.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Favourites & Recents chips — only when not searching */}
      {!isSearching &&
      favsLoaded &&
      (filteredFavourites.length > 0 || filteredRecents.length > 0) ? (
        <FavouritesRecentsChips
          favourites={filteredFavourites}
          recents={filteredRecents}
          favouriteIds={favouriteDiagnosisIds}
          onSelect={handleChipSelect}
          onToggleFavourite={handleToggleFavouriteDiagnosis}
        />
      ) : null}

      {!isSearching ? (
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
      ) : null}

      <View style={styles.diagnosisList}>
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
                style={[
                  styles.diagnosisRow,
                  {
                    backgroundColor: isSelected
                      ? theme.link + "15"
                      : theme.backgroundDefault,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                testID={`button-diagnosis-${dx.id}`}
              >
                <View style={styles.diagnosisRowLeft}>
                  <ThemedText
                    style={[
                      styles.diagnosisName,
                      {
                        color: isSelected ? theme.link : theme.text,
                        fontWeight: isSelected ? "600" : "400",
                      },
                    ]}
                  >
                    {dx.displayName}
                  </ThemedText>
                  <ThemedText
                    style={[styles.snomedCode, { color: theme.textTertiary }]}
                  >
                    {dx.snomedCtCode}
                  </ThemedText>
                </View>
                <View style={styles.diagnosisRowRight}>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      Haptics.selectionAsync();
                      toggleFavourite("diagnosis", dx.id);
                    }}
                    hitSlop={6}
                    style={styles.starButton}
                  >
                    <Feather
                      name="star"
                      size={16}
                      color={isFav ? theme.link : theme.textTertiary}
                    />
                  </Pressable>
                  {isSelected ? (
                    <Feather name="check" size={18} color={theme.link} />
                  ) : null}
                </View>
              </Pressable>
            );
          })
        ) : isSearching ? (
          <ThemedText
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            No matching diagnoses found
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  subcatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
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
  diagnosisList: {
    gap: Spacing.xs,
  },
  diagnosisRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  diagnosisRowLeft: {
    flex: 1,
    gap: 2,
  },
  diagnosisRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  starButton: {
    padding: 4,
  },
  diagnosisName: {
    fontSize: 14,
  },
  snomedCode: {
    fontSize: 11,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
});
