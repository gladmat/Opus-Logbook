/**
 * TenolysisDetails — Inline assessment card for tenolysis procedures.
 *
 * Renders inside DiagnosisGroupEditor when a tenolysis procedure is selected
 * (flexor / extensor / generic). Captures which tendons were released per
 * digit and at which zone level(s) via chip-based selections. The
 * side-specific procedures (hand_tend_tenolysis_flexor / _extensor) force
 * their side; the generic hand_tend_tenolysis shows both side sections and an
 * untouched side simply stays empty (normalize drops it — nothing to toggle).
 *
 * Activation: procedure-driven (TENOLYSIS_PROCEDURE_IDS).
 * Storage: CaseProcedure.tenolysisDetails
 */

import React, { useCallback, useState } from "react";
import { View, Pressable, LayoutAnimation, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { DigitId } from "@/types/case";
import type {
  TenolysisData,
  TenolysisSide,
  TenolysisSideData,
} from "@/types/tenolysis";
import {
  createEmptyTenolysisData,
  createEmptyTenolysisSideData,
  getForcedTenolysisSide,
  normalizeTenolysisDetails,
  FLEXOR_TENOLYSIS_ZONES,
  EXTENSOR_TENOLYSIS_ZONES,
  TENOLYSIS_SIDE_LABELS,
} from "@/types/tenolysis";
import {
  ALL_DIGITS,
  DIGIT_LABELS,
  DIGIT_FLEXOR_MAP,
  DIGIT_EXTENSOR_MAP,
} from "@/components/hand-trauma/structureConfig";

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface TenolysisDetailsProps {
  procedureId: string;
  /** Shown to disambiguate when multiple tenolysis cards render in one case */
  procedureName?: string;
  value: TenolysisData | undefined;
  onChange: (data: TenolysisData | undefined) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SMOOTH_LAYOUT = LayoutAnimation.Presets.easeInEaseOut;

const TENDON_MAP_BY_SIDE: Record<TenolysisSide, Record<DigitId, string[]>> = {
  flexor: DIGIT_FLEXOR_MAP,
  extensor: DIGIT_EXTENSOR_MAP,
};

// Zone tokens split back into finger vs thumb sets for digit-driven option
// building (mirrors the trauma tendon sections' union logic).
const FINGER_ZONES_BY_SIDE: Record<TenolysisSide, readonly string[]> = {
  flexor: FLEXOR_TENOLYSIS_ZONES.filter((z) => !z.startsWith("T")),
  extensor: EXTENSOR_TENOLYSIS_ZONES.filter((z) => !z.startsWith("T")),
};
const THUMB_ZONES_BY_SIDE: Record<TenolysisSide, readonly string[]> = {
  flexor: FLEXOR_TENOLYSIS_ZONES.filter((z) => z.startsWith("T")),
  extensor: EXTENSOR_TENOLYSIS_ZONES.filter((z) => z.startsWith("T")),
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const TenolysisDetails = React.memo(function TenolysisDetails({
  procedureId,
  procedureName,
  value,
  onChange,
}: TenolysisDetailsProps) {
  const { theme } = useTheme();

  const data = value ?? createEmptyTenolysisData();
  const forcedSide = getForcedTenolysisSide(procedureId);
  const sides: TenolysisSide[] = forcedSide
    ? [forcedSide]
    : ["flexor", "extensor"];

  // Digits activated but with no tendon picked yet (selections-derived digits
  // are always active; this only bridges the gap until the first tendon tap).
  const [pendingDigits, setPendingDigits] = useState<
    Record<TenolysisSide, DigitId[]>
  >({ flexor: [], extensor: [] });

  const emit = useCallback(
    (next: TenolysisData) => {
      onChange(normalizeTenolysisDetails(next));
    },
    [onChange],
  );

  const getSideData = useCallback(
    (side: TenolysisSide): TenolysisSideData =>
      data[side] ?? createEmptyTenolysisSideData(),
    [data],
  );

  const getActiveDigits = useCallback(
    (side: TenolysisSide): DigitId[] => {
      const fromSelections = new Set<DigitId>(
        getSideData(side).selections.map((s) => s.digit),
      );
      for (const d of pendingDigits[side]) fromSelections.add(d);
      return ALL_DIGITS.filter((d) => fromSelections.has(d));
    },
    [getSideData, pendingDigits],
  );

  // ── Toggles ─────────────────────────────────────────────────────────────

  const toggleDigit = useCallback(
    (side: TenolysisSide, digit: DigitId) => {
      LayoutAnimation.configureNext(SMOOTH_LAYOUT);
      Haptics.selectionAsync();
      const sideData = getSideData(side);
      const isActive = getActiveDigits(side).includes(digit);

      if (isActive) {
        setPendingDigits((prev) => ({
          ...prev,
          [side]: prev[side].filter((d) => d !== digit),
        }));
        emit({
          ...data,
          [side]: {
            ...sideData,
            selections: sideData.selections.filter((s) => s.digit !== digit),
          },
        });
        return;
      }

      const options = TENDON_MAP_BY_SIDE[side][digit];
      if (options.length === 1) {
        // Single-option digits (e.g. thumb flexor → FPL) auto-select.
        emit({
          ...data,
          [side]: {
            ...sideData,
            selections: [
              ...sideData.selections,
              { digit, tendon: options[0] as string },
            ],
          },
        });
      } else {
        setPendingDigits((prev) => ({
          ...prev,
          [side]: [...prev[side], digit],
        }));
      }
    },
    [data, emit, getActiveDigits, getSideData],
  );

  const toggleTendon = useCallback(
    (side: TenolysisSide, digit: DigitId, tendon: string) => {
      Haptics.selectionAsync();
      const sideData = getSideData(side);
      const exists = sideData.selections.some(
        (s) => s.digit === digit && s.tendon === tendon,
      );
      const selections = exists
        ? sideData.selections.filter(
            (s) => !(s.digit === digit && s.tendon === tendon),
          )
        : [...sideData.selections, { digit, tendon }];
      if (exists) {
        // Keep the digit row open while its last tendon is untoggled.
        setPendingDigits((prev) =>
          prev[side].includes(digit)
            ? prev
            : { ...prev, [side]: [...prev[side], digit] },
        );
      }
      emit({ ...data, [side]: { ...sideData, selections } });
    },
    [data, emit, getSideData],
  );

  const toggleZone = useCallback(
    (side: TenolysisSide, zone: string) => {
      Haptics.selectionAsync();
      const sideData = getSideData(side);
      const zones = sideData.zones.includes(zone)
        ? sideData.zones.filter((z) => z !== zone)
        : [...sideData.zones, zone];
      emit({ ...data, [side]: { ...sideData, zones } });
    },
    [data, emit, getSideData],
  );

  // ── Render helpers ──────────────────────────────────────────────────────

  const renderChip = (
    key: string,
    label: string,
    selected: boolean,
    onPress: () => void,
    testID?: string,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      testID={testID}
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

  const renderLabel = (text: string) => (
    <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
      {text}
    </ThemedText>
  );

  const renderSide = (side: TenolysisSide, sectionNumber: number) => {
    const sideData = getSideData(side);
    const activeDigits = getActiveDigits(side);
    const zoneOptions: string[] = [
      ...(activeDigits.some((d) => d !== "I")
        ? FINGER_ZONES_BY_SIDE[side]
        : []),
      ...(activeDigits.includes("I") ? THUMB_ZONES_BY_SIDE[side] : []),
    ];

    return (
      <View key={side}>
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionNumber,
              { backgroundColor: theme.accentSurface },
            ]}
          >
            <ThemedText
              style={[styles.sectionNumberText, { color: theme.link }]}
            >
              {sectionNumber}
            </ThemedText>
          </View>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {forcedSide
              ? "Tendons & level"
              : `${TENOLYSIS_SIDE_LABELS[side]} tendons`}
          </ThemedText>
        </View>

        {renderLabel("DIGITS")}
        <View style={styles.chipRow}>
          {ALL_DIGITS.map((d) =>
            renderChip(
              `digit-${side}-${d}`,
              `${d} — ${DIGIT_LABELS[d]}`,
              activeDigits.includes(d),
              () => toggleDigit(side, d),
              `caseForm.hand.tenolysis.chip-digit-${side}-${d}`,
            ),
          )}
        </View>

        {activeDigits
          .filter((d) => TENDON_MAP_BY_SIDE[side][d].length > 1)
          .map((d) => (
            <View key={`tendons-${side}-${d}`}>
              {renderLabel(`${d} — ${DIGIT_LABELS[d].toUpperCase()} TENDONS`)}
              <View style={styles.chipRow}>
                {TENDON_MAP_BY_SIDE[side][d].map((tendon) =>
                  renderChip(
                    `tendon-${side}-${d}-${tendon}`,
                    tendon,
                    sideData.selections.some(
                      (s) => s.digit === d && s.tendon === tendon,
                    ),
                    () => toggleTendon(side, d, tendon),
                    `caseForm.hand.tenolysis.chip-tendon-${side}-${d}-${tendon}`,
                  ),
                )}
              </View>
            </View>
          ))}

        {activeDigits.length > 0 && zoneOptions.length > 0 && (
          <>
            {renderLabel("ZONE(S) RELEASED")}
            <View style={styles.chipRow}>
              {zoneOptions.map((zone) =>
                renderChip(
                  `zone-${side}-${zone}`,
                  `Zone ${zone}`,
                  sideData.zones.includes(zone),
                  () => toggleZone(side, zone),
                  `caseForm.hand.tenolysis.chip-zone-${side}-${zone}`,
                ),
              )}
            </View>
          </>
        )}
      </View>
    );
  };

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
          name="scissors"
          size={16}
          color={theme.link}
          style={styles.headerIcon}
        />
        <View style={styles.headerText}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Tenolysis — Tendons & Level
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            {procedureName
              ? `${procedureName} — record which tendons were released and at which zone(s).`
              : "Record which tendons were released and at which zone(s)."}
          </ThemedText>
        </View>
      </View>

      {sides.map((side, idx) => renderSide(side, idx + 1))}
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
