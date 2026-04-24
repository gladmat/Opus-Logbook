/**
 * HandElectivePicker
 * ══════════════════
 * Two-step subcategory-browse → diagnosis-list picker for elective hand cases.
 * Rendered inline in DiagnosisGroupEditor when handCaseType === "elective".
 *
 * Step 1: 8 subcategory cards in a 2-column grid + search bar
 * Step 2: Flat diagnosis list within selected subcategory
 *
 * Replaces the generic DiagnosisPicker for elective hand, providing a curated
 * browse experience optimised for the most common elective hand operations.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Pressable,
  TextInput,
  LayoutAnimation,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { SnomedSearchPicker } from "@/components/SnomedSearchPicker";
import { Spacing, BorderRadius } from "@/constants/theme";
import { HAND_SURGERY_DIAGNOSES } from "@/lib/diagnosisPicklists/handSurgeryDiagnoses";
import { PERIPHERAL_NERVE_DIAGNOSES } from "@/lib/diagnosisPicklists/peripheralNerveDiagnoses";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════
// Subcategory config
// ═══════════════════════════════════════════════════════════════

const ELECTIVE_SUBCATEGORIES: {
  key: string;
  icon: string;
  label: string;
}[] = [
  {
    key: "Stenosing Tenosynovitis",
    icon: "zap",
    label: "Stenosing Tenosynovitis",
  },
  { key: "Dupuytren's Disease", icon: "layers", label: "Dupuytren's Disease" },
  { key: "Joint & Degenerative", icon: "disc", label: "Joint & Degenerative" },
  { key: "Elective Tendon", icon: "link", label: "Elective Tendon" },
  { key: "Post-traumatic Bone", icon: "tool", label: "Post-traumatic Bone" },
  { key: "Rheumatoid Hand", icon: "activity", label: "Rheumatoid Hand" },
  {
    key: "Tumours & Other",
    icon: "target",
    label: "Tumours & Soft Tissue Masses",
  },
  { key: "Congenital", icon: "star", label: "Congenital" },
];

// IDs of nerve compression diagnoses moved to Peripheral Nerve — shown as
// cross-references in search results so hand surgeons can still find them.
const PN_CROSS_REF_IDS = new Set([
  "pn_dx_carpal_tunnel",
  "pn_dx_cubital_tunnel",
  "pn_dx_guyon_canal",
]);

const PN_CROSS_REFS = PERIPHERAL_NERVE_DIAGNOSES.filter((d) =>
  PN_CROSS_REF_IDS.has(d.id),
);

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface HandElectivePickerProps {
  onSelect: (diagnosis: DiagnosisPicklistEntry) => void;
  onSnomedSelect?: (
    concept: { conceptId: string; term: string } | null,
  ) => void;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function HandElectivePicker({
  onSelect,
  onSnomedSelect,
}: HandElectivePickerProps) {
  const { theme } = useTheme();
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showSnomedFallback, setShowSnomedFallback] = useState(false);

  // All elective hand diagnoses (excludes trauma + acute)
  const allElective = useMemo(
    () => HAND_SURGERY_DIAGNOSES.filter((d) => d.clinicalGroup === "elective"),
    [],
  );

  // Count per subcategory
  const subcategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const dx of allElective) {
      counts.set(dx.subcategory, (counts.get(dx.subcategory) ?? 0) + 1);
    }
    return counts;
  }, [allElective]);

  const isSearching = searchQuery.length >= 2;

  // Cross-reference IDs for checking if a result is a PN cross-ref
  const crossRefIdSet = PN_CROSS_REF_IDS;

  // Visible diagnoses based on search or subcategory selection
  const visibleDiagnoses = useMemo(() => {
    if (isSearching) {
      const q = searchQuery.toLowerCase();
      const matchFn = (d: DiagnosisPicklistEntry) =>
        d.displayName.toLowerCase().includes(q) ||
        d.shortName?.toLowerCase().includes(q) ||
        d.searchSynonyms?.some((s) => s.toLowerCase().includes(q));
      const handResults = allElective.filter(matchFn);
      const crossRefResults = PN_CROSS_REFS.filter(matchFn);
      return [...handResults, ...crossRefResults];
    }
    if (selectedSubcategory) {
      return allElective.filter((d) => d.subcategory === selectedSubcategory);
    }
    return [];
  }, [searchQuery, selectedSubcategory, isSearching, allElective]);

  const showNoSearchResults = isSearching && visibleDiagnoses.length === 0;

  const handleSubcategoryPress = useCallback((key: string) => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSubcategory(key);
    setSearchQuery("");
  }, []);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSubcategory(null);
  }, []);

  const handleDiagnosisPress = useCallback(
    (dx: DiagnosisPicklistEntry) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(dx);
    },
    [onSelect],
  );

  // ── Render ───────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Search bar — hidden when browsing inside a subcategory */}
      {!selectedSubcategory && (
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
            placeholder="Search all elective diagnoses..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={(text) => {
              if (text.length >= 2 && selectedSubcategory) {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                setSelectedSubcategory(null);
              }
              setSearchQuery(text);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            testID="caseForm.handElective.input-search"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={8}
              testID="caseForm.handElective.btn-clearSearch"
            >
              <Feather name="x" size={16} color={theme.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Subcategory grid — shown when not searching and no subcategory selected */}
      {!isSearching && !selectedSubcategory ? (
        <View style={styles.subcatGrid}>
          {ELECTIVE_SUBCATEGORIES.map((subcat) => {
            const count = subcategoryCounts.get(subcat.key) ?? 0;
            if (count === 0) return null;
            return (
              <Pressable
                key={subcat.key}
                onPress={() => handleSubcategoryPress(subcat.key)}
                style={[
                  styles.subcatCard,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                testID={`caseForm.handElective.chip-subcat-${subcat.key}`}
              >
                <Feather
                  name={subcat.icon as "zap"}
                  size={20}
                  color={theme.link}
                />
                <ThemedText
                  style={[styles.subcatCardTitle, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {subcat.label}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.subcatCardCount,
                    { color: theme.textSecondary },
                  ]}
                >
                  {count} {count === 1 ? "condition" : "conditions"}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Back button when viewing a subcategory */}
      {selectedSubcategory && !isSearching ? (
        <Pressable
          onPress={handleBack}
          style={[styles.backRow, { borderBottomColor: theme.border }]}
          testID="caseForm.handElective.btn-back"
        >
          <Feather name="arrow-left" size={16} color={theme.link} />
          <ThemedText style={[styles.backText, { color: theme.link }]}>
            Back to subcategories
          </ThemedText>
        </Pressable>
      ) : null}

      {/* Diagnosis list */}
      {visibleDiagnoses.length > 0 ? (
        <View style={styles.diagnosisList}>
          {visibleDiagnoses.map((dx) => (
            <Pressable
              key={dx.id}
              onPress={() => handleDiagnosisPress(dx)}
              style={[
                styles.diagnosisRow,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
              testID={`caseForm.handElective.chip-${dx.id}`}
            >
              <View style={styles.diagnosisRowLeft}>
                <ThemedText
                  style={[styles.diagnosisName, { color: theme.text }]}
                >
                  {dx.displayName}
                </ThemedText>
                {isSearching && crossRefIdSet.has(dx.id) ? (
                  <View style={styles.crossRefRow}>
                    <ThemedText
                      style={[
                        styles.crossRefText,
                        { color: theme.textTertiary },
                      ]}
                    >
                      ↳ Listed under Peripheral Nerve
                    </ThemedText>
                  </View>
                ) : isSearching ? (
                  <ThemedText
                    style={[styles.subcatLabel, { color: theme.textTertiary }]}
                  >
                    {dx.subcategory}
                  </ThemedText>
                ) : null}
                {dx.hasStaging ? (
                  <View
                    style={[
                      styles.stagingBadge,
                      { backgroundColor: theme.link + "20" },
                    ]}
                  >
                    <ThemedText
                      style={[styles.stagingBadgeText, { color: theme.link }]}
                    >
                      Has staging
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <Feather
                name="chevron-right"
                size={16}
                color={theme.textTertiary}
              />
            </Pressable>
          ))}
        </View>
      ) : showNoSearchResults ? (
        <View
          style={[
            styles.emptyState,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="inbox" size={18} color={theme.textTertiary} />
          <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
            No curated elective diagnoses matched
          </ThemedText>
          <ThemedText
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            Search SNOMED CT below if this elective diagnosis is not yet in the
            curated hand catalogue.
          </ThemedText>
        </View>
      ) : null}

      {onSnomedSelect ? (
        <>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setShowSnomedFallback((v) => !v);
            }}
            style={styles.snomedToggle}
          >
            <Feather
              name={showSnomedFallback ? "chevron-up" : "search"}
              size={14}
              color={theme.link}
            />
            <ThemedText
              style={[styles.snomedToggleText, { color: theme.link }]}
            >
              {showSnomedFallback
                ? "Hide search"
                : "Can't find your diagnosis? Search SNOMED CT"}
            </ThemedText>
          </Pressable>
          {showSnomedFallback ? (
            <SnomedSearchPicker
              label="Search diagnosis"
              onSelect={onSnomedSelect}
              searchType="diagnosis"
              specialty="hand_wrist"
              placeholder="Search SNOMED CT diagnoses..."
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

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
  subcatCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  subcatCardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  subcatCardCount: {
    fontSize: 12,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  backText: {
    fontSize: 14,
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
  diagnosisName: {
    fontSize: 14,
  },
  subcatLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  stagingBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 2,
  },
  stagingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  snomedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  snomedToggleText: {
    fontSize: 13,
    fontWeight: "500",
  },
  crossRefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  crossRefText: {
    fontSize: 11,
    fontWeight: "400",
  },
});
