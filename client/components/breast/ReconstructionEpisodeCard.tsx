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
import { FormField, SelectField, DatePickerField } from "@/components/FormField";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { normalizeDateOnlyValue, toIsoDateValue } from "@/lib/dateValues";
import {
  EPISODE_TYPE_LABELS,
  PENDING_ACTION_LABELS,
} from "@/types/episode";
import type { EpisodeType, PendingAction } from "@/types/episode";
import type { BreastEpisodeOverrides } from "@/lib/breastEpisodeHelpers";
import { BREAST_PENDING_ACTIONS } from "@/lib/breastEpisodeHelpers";

interface Props {
  /** Existing linked episode ID, if any */
  linkedEpisodeId?: string;
  /** Existing episode title, if linked */
  linkedEpisodeTitle?: string;
  /** Context-derived prompt label */
  promptTitle: string;
  /** Auto-suggested episode title */
  suggestedTitle: string;
  /** Auto-suggested episode type */
  suggestedEpisodeType: EpisodeType;
  /** Procedure date for onset default */
  suggestedOnsetDate: string;
  /** Called with overrides when user creates */
  onCreateEpisode: (overrides: BreastEpisodeOverrides) => void;
  /** Called when user unlinks */
  onUnlinkEpisode: () => void;
}

// Build pending action options with breast-relevant ones first
function buildPendingActionOptions(): { value: string; label: string }[] {
  const breastSet = new Set<string>(BREAST_PENDING_ACTIONS);
  const breastOptions = BREAST_PENDING_ACTIONS.map((key) => ({
    value: key,
    label: PENDING_ACTION_LABELS[key] ?? key,
  }));
  const genericOptions = Object.entries(PENDING_ACTION_LABELS)
    .filter(([key]) => !breastSet.has(key))
    .map(([value, label]) => ({ value, label }));
  return [{ value: "", label: "None" }, ...breastOptions, ...genericOptions];
}

const PENDING_ACTION_OPTIONS = buildPendingActionOptions();

export const ReconstructionEpisodeCard = React.memo(
  function ReconstructionEpisodeCard({
    linkedEpisodeId,
    linkedEpisodeTitle,
    promptTitle,
    suggestedTitle,
    suggestedEpisodeType,
    suggestedOnsetDate,
    onCreateEpisode,
    onUnlinkEpisode,
  }: Props) {
    const { theme } = useTheme();

    const [expanded, setExpanded] = useState(false);
    const [title, setTitle] = useState(suggestedTitle);
    const [episodeType, setEpisodeType] =
      useState<EpisodeType>(suggestedEpisodeType);
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
        setEpisodeType(suggestedEpisodeType);
      }
    }, [suggestedTitle, suggestedEpisodeType, expanded]);

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

    const handleCreate = useCallback(() => {
      if (!title.trim()) return;
      setSaving(true);
      onCreateEpisode({
        title: title.trim(),
        episodeType,
        onsetDate,
        pendingAction: pendingAction || undefined,
      });
      // Parent handles async save — reset after a short delay
      setTimeout(() => setSaving(false), 500);
    }, [title, episodeType, onsetDate, pendingAction, onCreateEpisode]);

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
            {linkedEpisodeTitle ?? "Reconstruction Episode"}
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
                placeholder="e.g. L breast staged reconstruction"
              />

              <SelectField
                label="Episode Type"
                value={episodeType}
                options={Object.entries(EPISODE_TYPE_LABELS).map(
                  ([value, label]) => ({ value, label }),
                )}
                onSelect={(v: string) => setEpisodeType(v as EpisodeType)}
              />

              <DatePickerField
                label="Onset Date"
                value={onsetDate}
                onChange={setOnsetDate}
              />

              <SelectField
                label="Pending Action (optional)"
                value={pendingAction}
                options={PENDING_ACTION_OPTIONS}
                onSelect={(v: string) =>
                  setPendingAction(v as PendingAction | "")
                }
              />

              <Button
                onPress={handleCreate}
                disabled={saving || !title.trim()}
              >
                {saving ? "Creating..." : "Create Episode"}
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
