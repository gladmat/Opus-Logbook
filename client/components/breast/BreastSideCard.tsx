/**
 * BreastSideCard — Per-side card for breast assessment.
 *
 * Shows clinical context chips, reconstructive timing (when applicable),
 * and placeholder slots for Phase 3+ module cards
 * (ImplantDetails, BreastFlapDetails, Lipofilling, ChestMasculinisation).
 */

import React, { useCallback, useState } from "react";
import { View, Pressable, LayoutAnimation, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type {
  BreastLaterality,
  BreastSideAssessment,
  BreastClinicalContext,
  BreastReconTiming,
  LipofillingData,
} from "@/types/breast";
import { BREAST_CLINICAL_CONTEXT_LABELS } from "@/types/breast";
import type { BreastModuleFlags } from "@/lib/breastConfig";
import { getBreastSideVisibility } from "@/lib/breastConfig";
import { ImplantDetailsCard } from "./ImplantDetailsCard";
import { BreastFlapCard } from "./BreastFlapCard";
import { GenderAffirmingContextCard } from "./GenderAffirmingContextCard";
import { ChestMasculinisationCard } from "./ChestMasculinisationCard";
import { NippleDetailsCard } from "./NippleDetailsCard";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Controls which sections render:
 * - "full": Everything (backward compat, default)
 * - "context_only": Header + clinical context + timing/gender-affirming context
 * - "modules_only": Module cards only (implant, flap, chest masc, nipple)
 */
type RenderMode = "full" | "context_only" | "modules_only";

interface Props {
  side: BreastLaterality;
  value: BreastSideAssessment;
  onChange: (data: BreastSideAssessment) => void;
  moduleFlags: BreastModuleFlags;
  lipofilling?: LipofillingData;
  showCopyButton?: boolean;
  onCopy?: () => void;
  /** Whether the diagnosis suggests transmasculine context (for binding history) */
  isTransmasculine?: boolean;
  /** Breast surgical preferences for auto-fill */
  breastPreferences?: import("@/types/surgicalPreferences").BreastPreferences;
  /** Controls which sections render */
  renderMode?: RenderMode;
  /** When true, suppresses inline BreastFlapCard for free flap cases (handled by hub row FreeFlapSheet) */
  suppressFreeFlap?: boolean;
  /** Test identifier for automation */
  testID?: string;
}

const CONTEXT_OPTIONS: {
  key: BreastClinicalContext;
  icon: React.ComponentProps<typeof Feather>["name"];
}[] = [
  { key: "reconstructive", icon: "shield" },
  { key: "aesthetic", icon: "star" },
  { key: "gender_affirming", icon: "heart" },
];

const TIMING_OPTIONS: BreastReconTiming[] = [
  "immediate",
  "delayed_immediate",
  "delayed",
];

// Short labels for timing chips (full labels are too wide)
const TIMING_SHORT_LABELS: Record<BreastReconTiming, string> = {
  immediate: "Immediate",
  delayed_immediate: "Delayed-Immediate",
  delayed: "Delayed",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const BreastSideCard = React.memo(function BreastSideCard({
  side,
  value,
  onChange,
  moduleFlags,
  lipofilling,
  showCopyButton,
  onCopy,
  isTransmasculine,
  breastPreferences,
  renderMode = "full",
  suppressFreeFlap,
  testID,
}: Props) {
  const { theme, isDark } = useTheme();
  const [showTimingInfo, setShowTimingInfo] = useState(false);

  const sideLabel = side === "left" ? "Left Breast" : "Right Breast";

  // ── Context ─────────────────────────────────────────────────────────────

  const handleContextChange = useCallback(
    (ctx: BreastClinicalContext) => {
      if (ctx === value.clinicalContext) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      const next: BreastSideAssessment = {
        ...value,
        clinicalContext: ctx,
      };

      // Clear timing when switching away from reconstructive
      if (ctx !== "reconstructive") {
        delete next.reconstructionTiming;
        delete next.priorRadiotherapy;
        delete next.priorChemotherapy;
        delete next.priorReconstructionType;
        delete next.mdtDiscussed;
      }

      // Clear gender-affirming context when switching away
      if (ctx !== "gender_affirming") {
        delete next.genderAffirmingContext;
      }

      onChange(next);
    },
    [value, onChange],
  );

  // ── Timing ──────────────────────────────────────────────────────────────

  const handleTimingChange = useCallback(
    (timing: BreastReconTiming) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      onChange({
        ...value,
        reconstructionTiming:
          timing === value.reconstructionTiming ? undefined : timing,
      });
    },
    [value, onChange],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  const visibility = getBreastSideVisibility(value, moduleFlags);

  const showContext = renderMode !== "modules_only";
  const showModules = renderMode !== "context_only";

  return (
    <View
      testID={testID ?? `caseForm.breast.side-${side}`}
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.border,
          ...(isDark ? {} : Shadows.card),
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <ThemedText type="h4">{sideLabel}</ThemedText>
        </View>
        {showContext && showCopyButton && onCopy && (
          <Pressable
            testID="caseForm.breast.btn-copyToOtherSide"
            onPress={onCopy}
            style={styles.copyButton}
          >
            <Feather name="copy" size={14} color={theme.link} />
            <ThemedText
              type="small"
              style={{ color: theme.link, marginLeft: 4 }}
            >
              Copy to other side
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* ── Context section ──────────────────────────────────────────── */}

      {showContext && (
        <>
          {/* Clinical context chips */}
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}
          >
            Clinical Context
          </ThemedText>
          <View style={styles.chipRow}>
            {CONTEXT_OPTIONS.map(({ key, icon }) => {
              const selected = value.clinicalContext === key;
              return (
                <Pressable
                  key={key}
                  testID={`caseForm.breast.${side}.chip-context-${key}`}
                  onPress={() => handleContextChange(key)}
                  style={[
                    styles.contextChip,
                    {
                      backgroundColor: selected
                        ? theme.link
                        : theme.backgroundSecondary,
                      borderColor: selected ? theme.link : theme.border,
                    },
                  ]}
                >
                  <Feather
                    name={icon}
                    size={14}
                    color={selected ? theme.buttonText : theme.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <ThemedText
                    type="small"
                    style={{
                      color: selected ? theme.buttonText : theme.text,
                      fontWeight: selected ? "600" : "400",
                    }}
                  >
                    {BREAST_CLINICAL_CONTEXT_LABELS[key]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Gender-affirming context — shown for gender_affirming */}
          {visibility.showGenderAffirmingContext && (
            <GenderAffirmingContextCard
              value={value.genderAffirmingContext ?? {}}
              onChange={(genderAffirmingContext) =>
                onChange({ ...value, genderAffirmingContext })
              }
              isTransmasculine={isTransmasculine}
            />
          )}

          {/* Reconstructive timing — shown only for reconstructive context */}
          {visibility.showReconstructiveFields && (
            <View style={styles.timingSection}>
              <View style={styles.timingLabelRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Reconstruction Timing
                </ThemedText>
                <Pressable
                  onPress={() => setShowTimingInfo((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="info" size={16} color={theme.textTertiary} />
                </Pressable>
              </View>
              {showTimingInfo && (
                <View
                  style={[
                    styles.timingInfoBox,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderRadius: BorderRadius.sm,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: theme.textSecondary,
                      fontSize: 13,
                      lineHeight: 18,
                    }}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        fontWeight: "600",
                        color: theme.textSecondary,
                        fontSize: 13,
                      }}
                    >
                      Immediate
                    </ThemedText>
                    {
                      " \u2014 Reconstruction at the same operation as the mastectomy\n\n"
                    }
                    <ThemedText
                      type="small"
                      style={{
                        fontWeight: "600",
                        color: theme.textSecondary,
                        fontSize: 13,
                      }}
                    >
                      Delayed-Immediate
                    </ThemedText>
                    {
                      " \u2014 Expander or spacer placed at mastectomy; definitive reconstruction at a later operation\n\n"
                    }
                    <ThemedText
                      type="small"
                      style={{
                        fontWeight: "600",
                        color: theme.textSecondary,
                        fontSize: 13,
                      }}
                    >
                      Delayed
                    </ThemedText>
                    {
                      " \u2014 Reconstruction as a separate operation, weeks to years after mastectomy"
                    }
                  </ThemedText>
                </View>
              )}
              <View style={styles.timingChipRow}>
                {TIMING_OPTIONS.map((timing) => {
                  const selected = value.reconstructionTiming === timing;
                  return (
                    <Pressable
                      key={timing}
                      testID={`caseForm.breast.${side}.chip-timing-${timing}`}
                      onPress={() => handleTimingChange(timing)}
                      style={[
                        styles.timingChip,
                        {
                          backgroundColor: selected
                            ? theme.link
                            : theme.backgroundSecondary,
                          borderColor: selected ? theme.link : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                        style={{
                          color: selected ? theme.buttonText : theme.text,
                          fontWeight: selected ? "600" : "400",
                          textAlign: "center",
                        }}
                      >
                        {TIMING_SHORT_LABELS[timing]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}

      {/* ── Specialty module cards ────────────────────────────────────── */}

      {showModules && (
        <>
          {visibility.showImplantDetails && (
            <ImplantDetailsCard
              value={value.implantDetails ?? {}}
              onChange={(implantDetails) =>
                onChange({ ...value, implantDetails })
              }
              breastPreferences={breastPreferences}
            />
          )}

          {visibility.showBreastFlapDetails && !suppressFreeFlap && (
            <BreastFlapCard
              value={value.flapDetails ?? {}}
              onChange={(flapDetails) => onChange({ ...value, flapDetails })}
            />
          )}

          {visibility.showPedicledFlapDetails && (
            <BreastFlapCard
              mode="pedicled"
              value={value.flapDetails ?? {}}
              onChange={(flapDetails) => onChange({ ...value, flapDetails })}
            />
          )}

          {visibility.showChestMasculinisation && (
            <ChestMasculinisationCard
              value={value.chestMasculinisation ?? {}}
              onChange={(chestMasculinisation) =>
                onChange({ ...value, chestMasculinisation })
              }
            />
          )}

          {visibility.showNippleDetails && (
            <NippleDetailsCard
              value={value.nippleDetails ?? {}}
              onChange={(nippleDetails) =>
                onChange({ ...value, nippleDetails })
              }
            />
          )}
        </>
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  timingSection: {
    marginTop: Spacing.xs,
  },
  timingLabelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginBottom: Spacing.xs,
  },
  timingInfoBox: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  timingChipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  timingChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexShrink: 1,
  },
});
