/**
 * BoneTumourDetails — Inline assessment card for bone tumour curettage/graft.
 *
 * Renders inside DiagnosisGroupEditor when a bone tumour curettage/graft
 * procedure is selected (e.g. enchondroma curettage + bone graft). Captures
 * which bone the lesion was in, which digit, and the graft type / donor site
 * via chip-based selections.
 *
 * Activation: procedure-driven (BONE_TUMOUR_PROCEDURE_IDS).
 * Storage: CaseProcedure.boneTumourDetails
 */

import React, { useCallback } from "react";
import { View, Pressable, LayoutAnimation, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { DigitId } from "@/types/case";
import type { BoneTumourBone, BoneTumourData } from "@/types/boneTumour";
import {
  BONE_TUMOUR_BONE_LABELS,
  isDigitBearingBone,
} from "@/types/boneTumour";
import type {
  OsteotomyGraftType,
  OsteotomyGraftDonorSite,
} from "@/types/osteotomy";
import { GRAFT_TYPE_LABELS, GRAFT_DONOR_SITE_LABELS } from "@/types/osteotomy";
import { DIGIT_LABELS } from "@/lib/diagnosisPicklists/multiDigitConfig";

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface BoneTumourDetailsProps {
  value: BoneTumourData;
  onChange: (data: BoneTumourData) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SMOOTH_LAYOUT = LayoutAnimation.Presets.easeInEaseOut;

const ALL_BONES: BoneTumourBone[] = [
  "metacarpal",
  "proximal_phalanx",
  "middle_phalanx",
  "distal_phalanx",
  "carpal",
  "other",
];

const ALL_DIGITS: DigitId[] = ["I", "II", "III", "IV", "V"];

const ALL_GRAFT_TYPES: OsteotomyGraftType[] = [
  "none",
  "autograft",
  "allograft",
  "synthetic",
];

const ALL_DONOR_SITES: OsteotomyGraftDonorSite[] = [
  "iliac_crest",
  "distal_radius",
  "olecranon",
  "local",
  "other",
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const BoneTumourDetails = React.memo(function BoneTumourDetails({
  value,
  onChange,
}: BoneTumourDetailsProps) {
  const { theme } = useTheme();

  // ── Field updaters ──────────────────────────────────────────────────────

  const setBone = useCallback(
    (bone: BoneTumourBone) => {
      LayoutAnimation.configureNext(SMOOTH_LAYOUT);
      Haptics.selectionAsync();
      const newBone = value.bone === bone ? null : bone;
      onChange({
        ...value,
        bone: newBone,
        // digit only applies to metacarpal / phalanges
        digit: isDigitBearingBone(newBone) ? value.digit : null,
      });
    },
    [value, onChange],
  );

  const setDigit = useCallback(
    (digit: DigitId) => {
      Haptics.selectionAsync();
      onChange({
        ...value,
        digit: value.digit === digit ? null : digit,
      });
    },
    [value, onChange],
  );

  const setGraftType = useCallback(
    (type: OsteotomyGraftType) => {
      Haptics.selectionAsync();
      LayoutAnimation.configureNext(SMOOTH_LAYOUT);
      const newType = value.graftType === type ? null : type;
      onChange({
        ...value,
        graftType: newType,
        graftDonorSite: newType === "autograft" ? value.graftDonorSite : null,
      });
    },
    [value, onChange],
  );

  const setDonorSite = useCallback(
    (site: OsteotomyGraftDonorSite) => {
      Haptics.selectionAsync();
      onChange({
        ...value,
        graftDonorSite: value.graftDonorSite === site ? null : site,
      });
    },
    [value, onChange],
  );

  // ── Derived state ───────────────────────────────────────────────────────

  const showDigitRow = isDigitBearingBone(value.bone);
  const showDonorSite = value.graftType === "autograft";

  // ── Render helpers ──────────────────────────────────────────────────────

  const renderChip = (
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          borderColor: selected ? theme.link : theme.border,
          backgroundColor: selected
            ? theme.accentSurface
            : theme.backgroundElevated,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.chipText,
          { color: selected ? theme.text : theme.textSecondary },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  const renderSectionHeader = (number: number, title: string) => (
    <View style={styles.sectionHeader}>
      <View
        style={[styles.sectionNumber, { backgroundColor: theme.accentSurface }]}
      >
        <ThemedText style={[styles.sectionNumberText, { color: theme.link }]}>
          {number}
        </ThemedText>
      </View>
      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
        {title}
      </ThemedText>
    </View>
  );

  const renderLabel = (text: string) => (
    <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
      {text}
    </ThemedText>
  );

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.border,
          borderLeftColor: theme.link,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Feather
          name="crosshair"
          size={16}
          color={theme.link}
          style={styles.headerIcon}
        />
        <View style={styles.headerText}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Tumour Site & Graft
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Record which bone the lesion was in and the graft donor site.
          </ThemedText>
        </View>
      </View>

      {/* 1. Site */}
      {renderSectionHeader(1, "Site")}
      {renderLabel("BONE")}
      <View style={styles.chipRow}>
        {ALL_BONES.map((b) =>
          renderChip(BONE_TUMOUR_BONE_LABELS[b], value.bone === b, () =>
            setBone(b),
          ),
        )}
      </View>

      {showDigitRow && (
        <>
          {renderLabel("DIGIT")}
          <View style={styles.chipRow}>
            {ALL_DIGITS.map((d) =>
              renderChip(`${d} — ${DIGIT_LABELS[d]}`, value.digit === d, () =>
                setDigit(d),
              ),
            )}
          </View>
        </>
      )}

      {/* 2. Graft */}
      {renderSectionHeader(2, "Graft")}
      {renderLabel("BONE GRAFT")}
      <View style={styles.chipRow}>
        {ALL_GRAFT_TYPES.map((g) =>
          renderChip(GRAFT_TYPE_LABELS[g], value.graftType === g, () =>
            setGraftType(g),
          ),
        )}
      </View>

      {showDonorSite && (
        <>
          {renderLabel("DONOR SITE")}
          <View style={styles.chipRow}>
            {ALL_DONOR_SITES.map((s) =>
              renderChip(
                GRAFT_DONOR_SITE_LABELS[s],
                value.graftDonorSite === s,
                () => setDonorSite(s),
              ),
            )}
          </View>
        </>
      )}
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  headerIcon: {
    marginTop: 2,
    marginRight: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.xs,
  },
  sectionNumberText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
