import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  MEDIA_TAG_GROUP_LABELS,
  getTagsForGroup,
  getRelevantGroups,
  getPreferredMediaTagGroup,
} from "@/types/media";
import type { MediaTag, MediaTagGroup } from "@/types/media";

// ═══════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════

interface MediaTagPickerProps {
  selectedTag?: MediaTag;
  onSelectTag: (tag: MediaTag) => void;
  relevantGroups?: MediaTagGroup[];
  specialty?: string;
  procedureTags?: string[];
  hasSkinCancerAssessment?: boolean;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

function MediaTagPickerInner({
  selectedTag,
  onSelectTag,
  relevantGroups: explicitGroups,
  specialty,
  procedureTags,
  hasSkinCancerAssessment,
}: MediaTagPickerProps) {
  const { theme } = useTheme();

  const groups = useMemo(
    () =>
      explicitGroups ??
      getRelevantGroups(specialty, procedureTags, hasSkinCancerAssessment),
    [explicitGroups, specialty, procedureTags, hasSkinCancerAssessment],
  );

  const preferredGroup = useMemo(
    () => getPreferredMediaTagGroup(selectedTag, groups),
    [selectedTag, groups],
  );

  const [activeGroup, setActiveGroup] = useState<MediaTagGroup>(preferredGroup);

  useEffect(() => {
    setActiveGroup(preferredGroup);
  }, [preferredGroup]);

  const tagsForGroup = useMemo(
    () => getTagsForGroup(activeGroup),
    [activeGroup],
  );

  const handleGroupPress = useCallback((group: MediaTagGroup) => {
    Haptics.selectionAsync();
    setActiveGroup(group);
  }, []);

  const handleTagPress = useCallback(
    (tag: MediaTag) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectTag(tag);
    },
    [onSelectTag],
  );

  return (
    <View>
      {/* ── Group tabs (horizontal scroll) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        style={styles.tabsScroll}
      >
        {groups.map((group) => {
          const isActive = group === activeGroup;
          return (
            <Pressable
              key={group}
              testID={`caseForm.media.chip-tagGroup-${group}`}
              onPress={() => handleGroupPress(group)}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive
                    ? theme.link
                    : theme.backgroundTertiary,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  {
                    color: isActive ? theme.buttonText : theme.text,
                  },
                ]}
              >
                {MEDIA_TAG_GROUP_LABELS[group]}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Tag chips (wrap layout) ── */}
      <View style={styles.chipsContainer}>
        {tagsForGroup.map((meta) => {
          const isSelected = meta.tag === selectedTag;
          return (
            <Pressable
              key={meta.tag}
              testID={`caseForm.media.chip-tag-${meta.tag}`}
              onPress={() => handleTagPress(meta.tag)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.link
                    : theme.backgroundTertiary,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? theme.buttonText : theme.text,
                  },
                ]}
                numberOfLines={1}
              >
                {meta.label}
              </ThemedText>
              {meta.captureHint ? (
                <ThemedText
                  style={[
                    styles.chipHint,
                    {
                      color: isSelected
                        ? theme.buttonText + "B3" // 70% alpha
                        : theme.textTertiary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {meta.captureHint}
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  tabsScroll: {
    marginBottom: Spacing.md,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    maxWidth: "48%",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  chipHint: {
    fontSize: 11,
    marginTop: 2,
  },
});

export const MediaTagPicker = React.memo(MediaTagPickerInner);
