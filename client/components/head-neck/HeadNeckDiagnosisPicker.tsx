/**
 * HeadNeckDiagnosisPicker
 * ════════════════════════
 * Chip-based diagnosis picker for head & neck cases.
 *
 * Renders H&N diagnoses as compact shortName chips within subcategory tabs,
 * replacing the generic row-based DiagnosisPicker for head_neck specialty.
 *
 * Features:
 * - 9 subcategory tabs (horizontal wrapping chips)
 * - Diagnosis chips within selected subcategory using shortName labels
 * - Search across all subcategories (min 2 chars)
 * - Favourites & recents integration
 * - Selected state with accent highlight + check icon
 */

import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { FavouritesRecentsChips } from "@/components/FavouritesRecentsChips";
import { useTheme } from "@/hooks/useTheme";
import { useFavouritesRecents } from "@/hooks/useFavouritesRecents";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  HEAD_NECK_DIAGNOSES,
  getHeadNeckSubcategories,
  getHeadNeckDiagnosesForSubcategory,
} from "@/lib/diagnosisPicklists/headNeckDiagnoses";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface HeadNeckDiagnosisPickerProps {
  selectedDiagnosisId?: string;
  onSelect: (diagnosis: DiagnosisPicklistEntry) => void;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function HeadNeckDiagnosisPicker({
  selectedDiagnosisId,
  onSelect,
}: HeadNeckDiagnosisPickerProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    favouriteDiagnoses,
    recentDiagnoses,
    isFavourite,
    toggleFavourite,
    loaded: favsLoaded,
  } = useFavouritesRecents("head_neck");

  const favouriteDiagnosisIds = useMemo(
    () => new Set(favouriteDiagnoses.map((d) => d.id)),
    [favouriteDiagnoses],
  );

  const subcategories = useMemo(() => getHeadNeckSubcategories(), []);

  // Initialise active subcategory from selected diagnosis if present
  const initialSubcat = () => {
    if (selectedDiagnosisId) {
      const entry = HEAD_NECK_DIAGNOSES.find(
        (e) => e.id === selectedDiagnosisId,
      );
      if (entry) return entry.subcategory;
    }
    return subcategories[0] ?? "";
  };

  const [activeSubcategory, setActiveSubcategory] =
    useState<string>(initialSubcat);

  const isSearching = searchQuery.length >= 2;

  // Search results across all subcategories
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.toLowerCase();
    return HEAD_NECK_DIAGNOSES.filter(
      (d) =>
        d.displayName.toLowerCase().includes(q) ||
        (d.shortName && d.shortName.toLowerCase().includes(q)) ||
        d.snomedCtCode.includes(q) ||
        (d.searchSynonyms &&
          d.searchSynonyms.some((s) => s.toLowerCase().includes(q))),
    );
  }, [searchQuery, isSearching]);

  // Diagnoses for current view (search or subcategory)
  const visibleDiagnoses = useMemo(() => {
    if (isSearching) return searchResults;
    return getHeadNeckDiagnosesForSubcategory(activeSubcategory);
  }, [isSearching, searchResults, activeSubcategory]);

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

  return (
    <View style={styles.container}>
      {/* Search bar */}
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
          testID="caseForm.headNeck.input-search"
        />
        {searchQuery.length > 0 ? (
          <Pressable
            onPress={() => setSearchQuery("")}
            hitSlop={8}
            testID="caseForm.headNeck.btn-clearSearch"
          >
            <Feather name="x" size={16} color={theme.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {/* Favourites & Recents chips — only when not searching */}
      {!isSearching &&
      favsLoaded &&
      (favouriteDiagnoses.length > 0 || recentDiagnoses.length > 0) ? (
        <FavouritesRecentsChips
          favourites={favouriteDiagnoses}
          recents={recentDiagnoses}
          favouriteIds={favouriteDiagnosisIds}
          onSelect={handleChipSelect}
          onToggleFavourite={handleToggleFavouriteDiagnosis}
        />
      ) : null}

      {/* Subcategory tabs */}
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
                testID={`caseForm.headNeck.chip-subcat-${subcat}`}
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

      {/* Diagnosis chips */}
      <View style={styles.diagnosisChipGrid}>
        {visibleDiagnoses.length > 0 ? (
          visibleDiagnoses.map((dx) => {
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
                      : theme.backgroundDefault,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                testID={`caseForm.headNeck.chip-${dx.id}`}
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
                      color: isSelected
                        ? theme.buttonText
                        : theme.text,
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
        ) : isSearching ? (
          <ThemedText
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            No matching diagnoses found
          </ThemedText>
        ) : null}
      </View>

      {/* Full name tooltip for selected diagnosis */}
      {selectedDiagnosisId ? (
        <SelectedDiagnosisDetail
          diagnosisId={selectedDiagnosisId}
          theme={theme}
        />
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Selected diagnosis detail (shows full name + SNOMED code below chips)
// ═══════════════════════════════════════════════════════════════

const SelectedDiagnosisDetail = React.memo(function SelectedDiagnosisDetail({
  diagnosisId,
  theme,
}: {
  diagnosisId: string;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const dx = useMemo(
    () => HEAD_NECK_DIAGNOSES.find((d) => d.id === diagnosisId),
    [diagnosisId],
  );
  if (!dx) return null;

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
        {dx.displayName}
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
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: Spacing.lg,
    width: "100%",
  },
  selectedDetail: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
});
