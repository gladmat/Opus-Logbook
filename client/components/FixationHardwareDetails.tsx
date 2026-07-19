/**
 * FixationHardwareDetails — Optional per-procedure fixation hardware card.
 *
 * Collapsed-by-default disclosure that documents K-wire gauge/count, screw
 * system/diameter/length/count, and plate system/type/profile for fracture
 * fixation, corrective osteotomy, and wrist plating procedures. Lightweight
 * by design — no catalogue/lot/UDI (see client/types/fixationHardware.ts).
 *
 * Activation: procedure-driven (FIXATION_HARDWARE_PROCEDURE_IDS).
 * Storage: CaseProcedure.fixationHardware
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Pressable,
  TextInput,
  LayoutAnimation,
  StyleSheet,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { OsteotomyFixation } from "@/types/osteotomy";
import type {
  FixationHardwareData,
  HardwareSectionId,
  KwireGaugeMm,
  ScrewSystem,
  ScrewDiameterMm,
  PlateSystem,
  PlateType,
  PlateProfileMm,
} from "@/types/fixationHardware";
import {
  HARDWARE_SECTION_LABELS,
  KWIRE_GAUGE_OPTIONS,
  KWIRE_GAUGE_LABELS,
  SCREW_SYSTEM_OPTIONS,
  SCREW_SYSTEM_LABELS,
  SCREW_DIAMETER_OPTIONS,
  SCREW_DIAMETER_LABELS,
  PLATE_SYSTEM_OPTIONS,
  PLATE_SYSTEM_LABELS,
  PLATE_TYPE_OPTIONS,
  PLATE_TYPE_LABELS,
  PLATE_PROFILE_OPTIONS,
  PLATE_PROFILE_LABELS,
  createEmptyFixationHardwareData,
  createEmptyKwireHardware,
  createEmptyScrewHardware,
  createEmptyPlateHardware,
  getSuggestedHardwareSections,
  getFixationHardwareSummary,
  normalizeFixationHardware,
} from "@/types/fixationHardware";

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface FixationHardwareDetailsProps {
  /** Picklist entry ID of the owning procedure (drives section hints) */
  procedureId?: string;
  /** Owning procedure name — disambiguates multiple cards (multi-fracture cases) */
  procedureName?: string;
  /** Sibling osteotomy card's fixation method — overrides the ID-based hint */
  osteotomyFixation?: OsteotomyFixation | null;
  value: FixationHardwareData | undefined;
  onChange: (data: FixationHardwareData | undefined) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SMOOTH_LAYOUT = LayoutAnimation.Presets.easeInEaseOut;

const SECTION_ORDER: readonly HardwareSectionId[] = [
  "kwires",
  "screws",
  "plate",
];

const COUNT_OPTIONS = [1, 2, 3, 4] as const;

function hasSubstantiveData(data: FixationHardwareData | undefined): boolean {
  return !!data && (!!data.kwires || !!data.screws || !!data.plate);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const FixationHardwareDetails = React.memo(
  function FixationHardwareDetails({
    procedureId,
    procedureName,
    osteotomyFixation,
    value,
    onChange,
  }: FixationHardwareDetailsProps) {
    const { theme } = useTheme();
    const reduceMotion = useReduceMotion();

    const data = value ?? createEmptyFixationHardwareData();
    const hasData = hasSubstantiveData(value);
    const summary = getFixationHardwareSummary(value);

    // ── Disclosure state ────────────────────────────────────────────────────
    const [expanded, setExpanded] = useState(hasData);
    const progress = useSharedValue(hasData ? 1 : 0);

    const toggleExpanded = useCallback(() => {
      Haptics.selectionAsync();
      setExpanded((prev) => {
        const next = !prev;
        progress.value = withTiming(next ? 1 : 0, {
          duration: reduceMotion ? 0 : 250,
          easing: Easing.out(Easing.cubic),
        });
        return next;
      });
    }, [progress, reduceMotion]);

    const animatedContentStyle = useAnimatedStyle(() => ({
      overflow: "hidden" as const,
      maxHeight: interpolate(progress.value, [0, 1], [0, 3000]),
      opacity: progress.value,
    }));

    // ── Section open state (UI-only; data writes happen on field picks) ─────
    const [openSections, setOpenSections] = useState<Set<HardwareSectionId>>(
      () => new Set(SECTION_ORDER.filter((s) => data[s] !== null && hasData)),
    );

    const suggestedSections = useMemo(
      () => getSuggestedHardwareSections(procedureId, osteotomyFixation),
      [procedureId, osteotomyFixation],
    );

    const orderedSections = useMemo(() => {
      const rest = SECTION_ORDER.filter((s) => !suggestedSections.includes(s));
      return [...suggestedSections, ...rest];
    }, [suggestedSections]);

    // ── Count "Other" input visibility ──────────────────────────────────────
    const [showKwireCountInput, setShowKwireCountInput] = useState(
      (data.kwires?.count ?? 0) > 4,
    );
    const [showScrewCountInput, setShowScrewCountInput] = useState(
      (data.screws?.count ?? 0) > 4,
    );

    // ── Emit helper ─────────────────────────────────────────────────────────
    const emit = useCallback(
      (next: FixationHardwareData) => {
        onChange(normalizeFixationHardware(next));
      },
      [onChange],
    );

    const toggleSection = useCallback(
      (section: HardwareSectionId) => {
        Haptics.selectionAsync();
        if (!reduceMotion) LayoutAnimation.configureNext(SMOOTH_LAYOUT);
        setOpenSections((prev) => {
          const next = new Set(prev);
          if (next.has(section)) {
            next.delete(section);
            // Closing a section clears its data
            emit({ ...data, [section]: null });
          } else {
            next.add(section);
          }
          return next;
        });
      },
      [data, emit, reduceMotion],
    );

    // ── Sub-entry updaters ──────────────────────────────────────────────────
    const kwires = data.kwires ?? createEmptyKwireHardware();
    const screws = data.screws ?? createEmptyScrewHardware();
    const plate = data.plate ?? createEmptyPlateHardware();

    const setKwireGauge = (gauge: KwireGaugeMm) => {
      Haptics.selectionAsync();
      emit({
        ...data,
        kwires: {
          ...kwires,
          gaugeMm: kwires.gaugeMm === gauge ? null : gauge,
        },
      });
    };

    const setKwireCount = (count: number | null) => {
      emit({ ...data, kwires: { ...kwires, count } });
    };

    const setScrewSystem = (system: ScrewSystem) => {
      Haptics.selectionAsync();
      if (!reduceMotion) LayoutAnimation.configureNext(SMOOTH_LAYOUT);
      emit({
        ...data,
        screws: {
          ...screws,
          system: screws.system === system ? null : system,
        },
      });
    };

    const setScrewDiameter = (d: ScrewDiameterMm) => {
      Haptics.selectionAsync();
      emit({
        ...data,
        screws: {
          ...screws,
          diameterMm: screws.diameterMm === d ? null : d,
        },
      });
    };

    const setScrewCount = (count: number | null) => {
      emit({ ...data, screws: { ...screws, count } });
    };

    const setPlateSystem = (system: PlateSystem) => {
      Haptics.selectionAsync();
      if (!reduceMotion) LayoutAnimation.configureNext(SMOOTH_LAYOUT);
      emit({
        ...data,
        plate: {
          ...plate,
          system: plate.system === system ? null : system,
        },
      });
    };

    const setPlateType = (t: PlateType) => {
      Haptics.selectionAsync();
      emit({
        ...data,
        plate: { ...plate, plateType: plate.plateType === t ? null : t },
      });
    };

    const setPlateProfile = (p: PlateProfileMm) => {
      Haptics.selectionAsync();
      emit({
        ...data,
        plate: { ...plate, profileMm: plate.profileMm === p ? null : p },
      });
    };

    // ── Render helpers ──────────────────────────────────────────────────────

    const renderChip = (
      key: string,
      label: string,
      selected: boolean,
      onPress: () => void,
      hinted = false,
    ) => (
      <Pressable
        key={key}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={[
          styles.chip,
          {
            borderColor: selected
              ? theme.link
              : hinted
                ? theme.accentBorder
                : theme.border,
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

    const renderTextInput = (
      inputValue: string,
      onChangeText: (text: string) => void,
      placeholder: string,
      keyboardType: "default" | "number-pad" = "default",
      accessibilityLabel?: string,
    ) => (
      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        value={inputValue}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        accessibilityLabel={accessibilityLabel ?? placeholder}
      />
    );

    const parseCount = (text: string): number | null => {
      const digits = text.replace(/[^0-9]/g, "");
      if (!digits) return null;
      const n = parseInt(digits, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const renderCountRow = (
      current: number | null,
      showInput: boolean,
      setShowInput: (show: boolean) => void,
      setCount: (count: number | null) => void,
    ) => (
      <>
        {renderLabel("COUNT")}
        <View style={styles.chipRow}>
          {COUNT_OPTIONS.map((n) =>
            renderChip(
              `count-${n}`,
              `${n}`,
              !showInput && current === n,
              () => {
                Haptics.selectionAsync();
                setShowInput(false);
                setCount(current === n && !showInput ? null : n);
              },
            ),
          )}
          {renderChip(
            "count-other",
            "Other",
            showInput || (current !== null && current > 4),
            () => {
              Haptics.selectionAsync();
              if (!reduceMotion) LayoutAnimation.configureNext(SMOOTH_LAYOUT);
              if (showInput) {
                setShowInput(false);
                setCount(null);
              } else {
                setShowInput(true);
              }
            },
          )}
        </View>
        {(showInput || (current !== null && current > 4)) &&
          renderTextInput(
            current !== null && current > 4 ? `${current}` : "",
            (text) => setCount(parseCount(text)),
            "Number",
            "number-pad",
            "Count",
          )}
      </>
    );

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: theme.border,
          },
        ]}
      >
        {/* Disclosure header */}
        <Pressable
          onPress={toggleExpanded}
          accessibilityRole="button"
          accessibilityLabel="Fixation hardware"
          accessibilityState={{ expanded }}
          style={styles.header}
        >
          <Feather
            name="tool"
            size={16}
            color={hasData ? theme.link : theme.textSecondary}
            style={styles.headerIcon}
          />
          <View style={styles.headerText}>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              Fixation hardware
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {hasData && summary
                ? summary
                : (procedureName ?? "Optional — K-wires · screws · plate")}
            </ThemedText>
          </View>
          <Feather
            name={expanded ? "chevron-down" : "chevron-right"}
            size={18}
            color={theme.textSecondary}
          />
        </Pressable>

        <Animated.View style={animatedContentStyle}>
          <View style={styles.content}>
            {/* Section toggles */}
            {renderLabel("HARDWARE USED")}
            <View style={styles.chipRow}>
              {orderedSections.map((s) =>
                renderChip(
                  `section-${s}`,
                  HARDWARE_SECTION_LABELS[s],
                  openSections.has(s),
                  () => toggleSection(s),
                  suggestedSections.includes(s),
                ),
              )}
            </View>

            {/* K-wires */}
            {openSections.has("kwires") && (
              <View style={styles.section}>
                {renderLabel("K-WIRE GAUGE (MM)")}
                <View style={styles.chipRow}>
                  {KWIRE_GAUGE_OPTIONS.map((g) =>
                    renderChip(
                      `kwire-gauge-${g}`,
                      KWIRE_GAUGE_LABELS[g],
                      kwires.gaugeMm === g,
                      () => setKwireGauge(g),
                    ),
                  )}
                </View>
                {renderCountRow(
                  kwires.count,
                  showKwireCountInput,
                  setShowKwireCountInput,
                  setKwireCount,
                )}
              </View>
            )}

            {/* Screws */}
            {openSections.has("screws") && (
              <View style={styles.section}>
                {renderLabel("SCREW SYSTEM")}
                <View style={styles.chipRow}>
                  {SCREW_SYSTEM_OPTIONS.map((s) =>
                    renderChip(
                      `screw-system-${s}`,
                      SCREW_SYSTEM_LABELS[s],
                      screws.system === s,
                      () => setScrewSystem(s),
                    ),
                  )}
                </View>
                {screws.system === "other" &&
                  renderTextInput(
                    screws.systemOther ?? "",
                    (text) =>
                      emit({
                        ...data,
                        screws: { ...screws, systemOther: text },
                      }),
                    "Screw system name",
                    "default",
                    "Screw system name",
                  )}
                {renderLabel("DIAMETER (MM)")}
                <View style={styles.chipRow}>
                  {SCREW_DIAMETER_OPTIONS.map((d) =>
                    renderChip(
                      `screw-diameter-${d}`,
                      SCREW_DIAMETER_LABELS[d],
                      screws.diameterMm === d,
                      () => setScrewDiameter(d),
                    ),
                  )}
                </View>
                {renderLabel("LENGTH (MM)")}
                {renderTextInput(
                  screws.lengthMm !== null ? `${screws.lengthMm}` : "",
                  (text) =>
                    emit({
                      ...data,
                      screws: { ...screws, lengthMm: parseCount(text) },
                    }),
                  "e.g. 22",
                  "number-pad",
                  "Screw length in millimetres",
                )}
                {renderCountRow(
                  screws.count,
                  showScrewCountInput,
                  setShowScrewCountInput,
                  setScrewCount,
                )}
              </View>
            )}

            {/* Plate */}
            {openSections.has("plate") && (
              <View style={styles.section}>
                {renderLabel("PLATE SYSTEM")}
                <View style={styles.chipRow}>
                  {PLATE_SYSTEM_OPTIONS.map((s) =>
                    renderChip(
                      `plate-system-${s}`,
                      PLATE_SYSTEM_LABELS[s],
                      plate.system === s,
                      () => setPlateSystem(s),
                    ),
                  )}
                </View>
                {plate.system === "other" &&
                  renderTextInput(
                    plate.systemOther ?? "",
                    (text) =>
                      emit({
                        ...data,
                        plate: { ...plate, systemOther: text },
                      }),
                    "Plate system name",
                    "default",
                    "Plate system name",
                  )}
                {renderLabel("PLATE TYPE")}
                <View style={styles.chipRow}>
                  {PLATE_TYPE_OPTIONS.map((t) =>
                    renderChip(
                      `plate-type-${t}`,
                      PLATE_TYPE_LABELS[t],
                      plate.plateType === t,
                      () => setPlateType(t),
                    ),
                  )}
                </View>
                {renderLabel("PROFILE (MM)")}
                <View style={styles.chipRow}>
                  {PLATE_PROFILE_OPTIONS.map((p) =>
                    renderChip(
                      `plate-profile-${p}`,
                      PLATE_PROFILE_LABELS[p],
                      plate.profileMm === p,
                      () => setPlateProfile(p),
                    ),
                  )}
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  headerIcon: {
    marginRight: Spacing.sm,
  },
  headerText: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  content: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  section: {
    marginTop: Spacing.sm,
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
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
    marginBottom: Spacing.xs,
  },
});
