/**
 * SLNBSection
 * ═══════════
 * Sentinel lymph node biopsy documentation with 3-step
 * progressive disclosure: Offered → Performed → Details.
 * Collapsible card with Reanimated animation.
 */

import React, { useState, useRef, useCallback } from "react";
import { View, Pressable, TextInput, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { SLNBDetails, SLNBSite, SLNBResult } from "@/types/skinCancer";

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const SITE_OPTIONS: { value: SLNBSite; label: string }[] = [
  { value: "axilla", label: "Axilla" },
  { value: "groin", label: "Groin" },
  { value: "cervical", label: "Cervical" },
  { value: "popliteal", label: "Popliteal" },
  { value: "epitrochlear", label: "Epitrochlear" },
  { value: "other", label: "Other" },
];

const RESULT_OPTIONS: { value: SLNBResult; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "negative", label: "Negative" },
  { value: "positive_itc", label: "ITC" },
  { value: "positive_micro", label: "Micrometastasis" },
  { value: "positive_macro", label: "Macrometastasis" },
];

function createDefaultSLNB(): SLNBDetails {
  return {
    offered: false,
    performed: false,
    sites: [],
    result: "pending",
  };
}

function getStatusBadge(
  slnb: SLNBDetails | undefined,
  autoVisible: boolean,
): { label: string; colorKey: "info" | "success" | "warning" | "tertiary" } {
  if (slnb?.result && slnb.result !== "pending") {
    return { label: "Complete", colorKey: "success" };
  }
  if (slnb?.performed && slnb.result === "pending") {
    return { label: "Pending", colorKey: "warning" };
  }
  if (autoVisible) {
    return { label: "Recommended", colorKey: "info" };
  }
  return { label: "Not started", colorKey: "tertiary" };
}

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface SLNBSectionProps {
  slnb: SLNBDetails | undefined;
  onSLNBChange: (slnb: SLNBDetails) => void;
  autoVisible: boolean;
  canConsider: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export const SLNBSection = React.memo(function SLNBSection({
  slnb,
  onSLNBChange,
  autoVisible,
  canConsider,
}: SLNBSectionProps) {
  const { theme } = useTheme();

  // UI state
  const [expanded, setExpanded] = useState(autoVisible);
  const expandedRef = useRef(autoVisible);

  // Collapse animation
  const contentHeightRef = useRef(0);
  const measuredRef = useRef(false);
  const animatedHeight = useSharedValue(autoVisible ? -1 : 0);

  const toggle = useCallback(() => {
    const next = !expandedRef.current;
    expandedRef.current = next;
    setExpanded(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (measuredRef.current) {
      animatedHeight.value = withTiming(next ? contentHeightRef.current : 0, {
        duration: 250,
      });
    }
  }, [animatedHeight]);

  const contentStyle = useAnimatedStyle(() => {
    if (animatedHeight.value === -1) {
      return { overflow: "hidden" as const };
    }
    return { height: animatedHeight.value, overflow: "hidden" as const };
  });

  const onContentLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) {
        contentHeightRef.current = h;
        if (!measuredRef.current) {
          measuredRef.current = true;
          if (!expandedRef.current) {
            animatedHeight.value = 0;
          }
        }
      }
    },
    [animatedHeight],
  );

  // Ensure SLNB object exists before mutations
  const ensureSlnb = useCallback((): SLNBDetails => {
    return slnb ?? createDefaultSLNB();
  }, [slnb]);

  const handleOfferedChange = useCallback(
    (offered: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const base = ensureSlnb();
      onSLNBChange({
        ...base,
        offered,
        // If un-offering, reset downstream
        ...(offered
          ? {}
          : {
              performed: false,
              sites: [],
              result: "pending",
              declinedReason: undefined,
            }),
      });
    },
    [ensureSlnb, onSLNBChange],
  );

  const handlePerformedChange = useCallback(
    (performed: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const base = ensureSlnb();
      onSLNBChange({
        ...base,
        performed,
        // If un-performing, reset details
        ...(performed ? {} : { sites: [], result: "pending" }),
      });
    },
    [ensureSlnb, onSLNBChange],
  );

  const handleSiteToggle = useCallback(
    (site: SLNBSite) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const base = ensureSlnb();
      const current = base.sites;
      const next = current.includes(site)
        ? current.filter((s) => s !== site)
        : [...current, site];
      onSLNBChange({ ...base, sites: next });
    },
    [ensureSlnb, onSLNBChange],
  );

  const handleResultChange = useCallback(
    (result: SLNBResult) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const base = ensureSlnb();
      onSLNBChange({ ...base, result });
    },
    [ensureSlnb, onSLNBChange],
  );

  // Status badge
  const badge = getStatusBadge(slnb, autoVisible || canConsider);
  const badgeColor =
    badge.colorKey === "info"
      ? theme.info
      : badge.colorKey === "success"
        ? theme.success
        : badge.colorKey === "warning"
          ? theme.warning
          : theme.textTertiary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Header */}
      <Pressable style={styles.header} onPress={toggle}>
        <ThemedText style={[styles.headerLabel, { color: theme.text }]}>
          Sentinel lymph node biopsy
        </ThemedText>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: badgeColor + "15",
                borderColor: badgeColor + "30",
              },
            ]}
          >
            <ThemedText style={[styles.badgeText, { color: badgeColor }]}>
              {badge.label}
            </ThemedText>
          </View>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.textSecondary}
          />
        </View>
      </Pressable>

      {/* Collapsible content */}
      <Animated.View style={contentStyle}>
        <View onLayout={onContentLayout} style={styles.content}>
          {/* Step 1: Offered? */}
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              SLNB OFFERED
            </ThemedText>
            <View style={styles.chipRow}>
              {([true, false] as const).map((val) => {
                const isSelected = slnb?.offered === val;
                const label = val ? "Yes" : "No";
                return (
                  <Pressable
                    key={label}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? theme.link
                          : theme.backgroundTertiary,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => handleOfferedChange(val)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: isSelected ? theme.buttonText : theme.text },
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Reason not offered */}
            {slnb?.offered === false ? (
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundElevated,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={slnb.declinedReason ?? ""}
                onChangeText={(text) =>
                  onSLNBChange({ ...slnb, declinedReason: text || undefined })
                }
                placeholder="Reason not offered"
                placeholderTextColor={theme.textTertiary}
                returnKeyType="done"
              />
            ) : null}
          </View>

          {/* Step 2: Performed? (visible when offered=true) */}
          {slnb?.offered ? (
            <View style={styles.section}>
              <ThemedText
                style={[styles.sectionLabel, { color: theme.textSecondary }]}
              >
                PERFORMED
              </ThemedText>
              <View style={styles.chipRow}>
                {([true, false] as const).map((val) => {
                  const isSelected = slnb.performed === val;
                  const label = val ? "Yes" : "No";
                  return (
                    <Pressable
                      key={label}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? theme.link
                            : theme.backgroundTertiary,
                          borderColor: isSelected ? theme.link : theme.border,
                        },
                      ]}
                      onPress={() => handlePerformedChange(val)}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: isSelected ? theme.buttonText : theme.text },
                        ]}
                      >
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Reason not performed */}
              {slnb.performed === false ? (
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.backgroundElevated,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  value={slnb.declinedReason ?? ""}
                  onChangeText={(text) =>
                    onSLNBChange({ ...slnb, declinedReason: text || undefined })
                  }
                  placeholder="e.g. Patient declined"
                  placeholderTextColor={theme.textTertiary}
                  returnKeyType="done"
                />
              ) : null}
            </View>
          ) : null}

          {/* Step 3: Details (visible when performed=true) */}
          {slnb?.offered && slnb.performed ? (
            <>
              {/* Drainage basin — multi-select */}
              <View style={styles.section}>
                <ThemedText
                  style={[styles.sectionLabel, { color: theme.textSecondary }]}
                >
                  DRAINAGE BASIN
                </ThemedText>
                <View style={styles.chipRow}>
                  {SITE_OPTIONS.map((opt) => {
                    const isSelected = slnb.sites.includes(opt.value);
                    return (
                      <Pressable
                        key={opt.value}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? theme.link
                              : theme.backgroundTertiary,
                            borderColor: isSelected ? theme.link : theme.border,
                          },
                        ]}
                        onPress={() => handleSiteToggle(opt.value)}
                      >
                        <ThemedText
                          style={[
                            styles.chipText,
                            {
                              color: isSelected ? theme.buttonText : theme.text,
                            },
                          ]}
                        >
                          {opt.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Nodes retrieved */}
              <View style={styles.section}>
                <ThemedText
                  style={[styles.sectionLabel, { color: theme.textSecondary }]}
                >
                  NODES RETRIEVED
                </ThemedText>
                <TextInput
                  style={[
                    styles.numericInput,
                    {
                      backgroundColor: theme.backgroundElevated,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  value={
                    slnb.nodesRetrieved !== undefined
                      ? String(slnb.nodesRetrieved)
                      : ""
                  }
                  onChangeText={(text) => {
                    const num = parseInt(text, 10);
                    onSLNBChange({
                      ...slnb,
                      nodesRetrieved: isNaN(num) ? undefined : num,
                    });
                  }}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </View>

              {/* Result */}
              <View style={styles.section}>
                <ThemedText
                  style={[styles.sectionLabel, { color: theme.textSecondary }]}
                >
                  RESULT
                </ThemedText>
                <View style={styles.chipRow}>
                  {RESULT_OPTIONS.map((opt) => {
                    const isSelected = slnb.result === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? theme.link
                              : theme.backgroundTertiary,
                            borderColor: isSelected ? theme.link : theme.border,
                          },
                        ]}
                        onPress={() => handleResultChange(opt.value)}
                      >
                        <ThemedText
                          style={[
                            styles.chipText,
                            {
                              color: isSelected ? theme.buttonText : theme.text,
                            },
                          ]}
                        >
                          {opt.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  headerLabel: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    marginTop: 4,
  },
  numericInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    textAlign: "center",
  },
});
