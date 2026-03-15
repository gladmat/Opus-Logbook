/**
 * ReconstructionEpisodeCard — Unified breast episode creation with inline expansion.
 *
 * Replaces both the old one-tap breast prompt and the generic InlineEpisodeCreator
 * for breast cases. Tap to expand → edit auto-suggested fields → create.
 * Does NOT do episode CRUD itself — signals intent to parent via callbacks.
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Pressable, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { normalizeDateOnlyValue, toIsoDateValue } from "@/lib/dateValues";
import type { PendingAction } from "@/types/episode";
import type { BreastEpisodeOverrides } from "@/lib/breastEpisodeHelpers";

interface Props {
  /** Existing linked episode ID, if any */
  linkedEpisodeId?: string;
  /** Existing episode title, if linked */
  linkedEpisodeTitle?: string;
  /** Context-derived prompt label */
  promptTitle: string;
  /** Auto-suggested episode title */
  suggestedTitle: string;
  /** Procedure date for onset default */
  suggestedOnsetDate: string;
  /** Called with overrides when user creates */
  onCreateEpisode: (overrides: BreastEpisodeOverrides) => void;
  /** Called when user unlinks */
  onUnlinkEpisode: () => void;
}

/** Breast-specific "what's next" options shown as tappable chips */
const BREAST_NEXT_STEPS: { value: PendingAction; label: string; icon: string }[] = [
  { value: "awaiting_reconstruction", label: "Awaiting recon", icon: "clock" },
  { value: "expansion_in_progress", label: "Expansion", icon: "trending-up" },
  { value: "awaiting_expander_exchange", label: "Awaiting exchange", icon: "refresh-cw" },
  { value: "awaiting_fat_grafting", label: "Fat grafting", icon: "droplet" },
  { value: "awaiting_nipple_recon", label: "Nipple recon", icon: "target" },
  { value: "awaiting_symmetrisation", label: "Symmetrisation", icon: "columns" },
  { value: "awaiting_tattoo", label: "Tattoo", icon: "edit-3" },
];

export const ReconstructionEpisodeCard = React.memo(
  function ReconstructionEpisodeCard({
    linkedEpisodeId,
    linkedEpisodeTitle,
    promptTitle,
    suggestedTitle,
    suggestedOnsetDate,
    onCreateEpisode,
    onUnlinkEpisode,
  }: Props) {
    const { theme } = useTheme();

    const [expanded, setExpanded] = useState(false);
    const [title, setTitle] = useState(suggestedTitle);
    const [onsetDate, setOnsetDate] = useState(
      () =>
        normalizeDateOnlyValue(suggestedOnsetDate) ??
        toIsoDateValue(new Date()),
    );
    const [pendingAction, setPendingAction] = useState<PendingAction | "">("");
    const [saving, setSaving] = useState(false);

    const [heightAnim] = useState(new Animated.Value(0));

    // Sync suggestions when they change (e.g., diagnosis or laterality changes)
    useEffect(() => {
      if (!expanded) {
        setTitle(suggestedTitle);
      }
    }, [suggestedTitle, expanded]);

    useEffect(() => {
      if (!expanded) {
        const normalized = normalizeDateOnlyValue(suggestedOnsetDate);
        if (normalized) setOnsetDate(normalized);
      }
    }, [suggestedOnsetDate, expanded]);

    // Animate expansion
    useEffect(() => {
      Animated.spring(heightAnim, {
        toValue: expanded ? 1 : 0,
        useNativeDriver: false,
        tension: 60,
        friction: 12,
      }).start();
    }, [expanded, heightAnim]);

    const handleToggle = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpanded((prev) => !prev);
    }, []);

    const handleCreate = useCallback(async () => {
      if (!title.trim()) return;
      setSaving(true);
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onCreateEpisode({
          title: title.trim(),
          episodeType: "staged_reconstruction",
          onsetDate,
          pendingAction: pendingAction || undefined,
        });
      } finally {
        setSaving(false);
      }
    }, [title, onsetDate, pendingAction, onCreateEpisode]);

    // ── Linked state ────────────────────────────────────────────────────────

    if (linkedEpisodeId) {
      return (
        <View
          style={[
            styles.linkedBanner,
            {
              backgroundColor: `${theme.link}15`,
              borderColor: `${theme.link}40`,
            },
          ]}
        >
          <Feather name="link" size={14} color={theme.link} />
          <ThemedText
            type="small"
            style={[styles.linkedText, { color: theme.link }]}
            numberOfLines={1}
          >
            {linkedEpisodeTitle ?? "Reconstruction Pathway"}
          </ThemedText>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onUnlinkEpisode();
            }}
            hitSlop={8}
          >
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, fontSize: 12 }}
            >
              Unlink
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    // ── Prompt + expansion form ─────────────────────────────────────────────

    const formHeight = heightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 380],
    });

    const formOpacity = heightAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
    });

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: expanded ? theme.link + "60" : theme.border,
          },
        ]}
      >
        <Pressable onPress={handleToggle} style={styles.promptRow}>
          <Feather
            name="link"
            size={14}
            color={expanded ? theme.link : theme.textSecondary}
          />
          <View style={styles.promptContent}>
            <ThemedText
              type="small"
              style={{
                color: expanded ? theme.link : theme.text,
                fontWeight: "600",
              }}
            >
              {promptTitle}
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, fontSize: 12 }}
            >
              Track stages across multiple operations
            </ThemedText>
          </View>
          <Feather
            name={expanded ? "chevron-up" : "plus-circle"}
            size={18}
            color={theme.link}
          />
        </Pressable>

        <Animated.View
          style={[
            styles.formContainer,
            { maxHeight: formHeight, opacity: formOpacity },
          ]}
        >
          {expanded ? (
            <View style={styles.formContent}>
              <FormField
                label="Episode Title"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. L Breast reconstruction"
              />

              <View style={styles.nextStepSection}>
                <ThemedText
                  type="small"
                  style={{
                    color: theme.textSecondary,
                    fontWeight: "600",
                    marginBottom: 6,
                  }}
                >
                  What's next?
                </ThemedText>
                <View style={styles.chipGrid}>
                  {BREAST_NEXT_STEPS.map((step) => {
                    const isSelected = pendingAction === step.value;
                    return (
                      <Pressable
                        key={step.value}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setPendingAction(isSelected ? "" : step.value);
                        }}
                        style={[
                          styles.nextStepChip,
                          {
                            backgroundColor: isSelected
                              ? theme.link + "18"
                              : theme.backgroundElevated,
                            borderColor: isSelected
                              ? theme.link
                              : theme.border,
                          },
                        ]}
                      >
                        <Feather
                          name={step.icon as any}
                          size={13}
                          color={
                            isSelected ? theme.link : theme.textSecondary
                          }
                        />
                        <ThemedText
                          type="small"
                          style={{
                            color: isSelected ? theme.link : theme.text,
                            fontWeight: isSelected ? "600" : "400",
                            fontSize: 13,
                          }}
                        >
                          {step.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button
                onPress={handleCreate}
                disabled={saving || !title.trim()}
              >
                {saving ? "Creating..." : "Create Pathway"}
              </Button>
            </View>
          ) : null}
        </Animated.View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
    overflow: "hidden",
  },
  promptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  promptContent: {
    flex: 1,
    gap: 2,
  },
  formContainer: {
    overflow: "hidden",
  },
  formContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  nextStepSection: {
    gap: 0,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  nextStepChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  linkedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  linkedText: {
    flex: 1,
    fontWeight: "600",
  },
});
