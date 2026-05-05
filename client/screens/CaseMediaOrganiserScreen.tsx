/**
 * CaseMediaOrganiserScreen — Two-Layer Photo Assignment (Phase H, Layer B).
 *
 * Protocol slot grid + untagged strip with tap-to-assign and auto-organise.
 * Allows surgeons to re-organise photos against protocol slots after assignment.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@/components/FeatherIcon";
import { EncryptedImage } from "@/components/EncryptedImage";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { OperativeMediaItem } from "@/types/case";
import { MEDIA_TAG_REGISTRY } from "@/types/media";
import type { MediaTag } from "@/types/media";
import type { CaptureStep, CapturePhase } from "@/data/mediaCaptureProtocols";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";
import { autoAssign } from "@/lib/inboxAssignment";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type PhaseFilter = "all" | CapturePhase;

export default function CaseMediaOrganiserScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "CaseMediaOrganiser">>();

  const { callbackId, protocolSteps, procedureDate } = route.params;
  const { executeGenericCallback } = useMediaCallback();

  // Working copy of media — mutated locally, returned on Done
  const [mediaItems, setMediaItems] = useState<OperativeMediaItem[]>(
    () => route.params.media,
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(
    null,
  );
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");

  // Filter protocol steps by phase
  const filteredSteps = useMemo(() => {
    if (phaseFilter === "all") return protocolSteps;
    return protocolSteps.filter((s) => s.phase === phaseFilter);
  }, [protocolSteps, phaseFilter]);

  // Build slot → media mapping
  const slotMapping = useMemo(() => {
    const map = new Map<number, OperativeMediaItem>();
    for (const item of mediaItems) {
      if (item.tag && item.tag !== "other") {
        const idx = protocolSteps.findIndex((s) => s.tag === item.tag);
        if (idx >= 0 && !map.has(idx)) {
          map.set(idx, item);
        }
      }
    }
    return map;
  }, [mediaItems, protocolSteps]);

  // Untagged media (tag is missing or "other")
  const untaggedMedia = useMemo(
    () => mediaItems.filter((m) => !m.tag || m.tag === "other"),
    [mediaItems],
  );

  // Progress counter
  const filledCount = slotMapping.size;
  const totalSteps = protocolSteps.length;

  // Tap empty slot → select it
  const handleSlotPress = useCallback(
    (stepIndex: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const filled = slotMapping.get(stepIndex);
      if (filled) {
        // Tap filled slot → return photo to untagged
        setMediaItems((prev) =>
          prev.map((m) =>
            m.id === filled.id
              ? {
                  ...m,
                  tag: "other" as MediaTag,
                }
              : m,
          ),
        );
        setSelectedSlotIndex(null);
      } else {
        // Select slot for assignment
        setSelectedSlotIndex(
          selectedSlotIndex === stepIndex ? null : stepIndex,
        );
      }
    },
    [slotMapping, selectedSlotIndex],
  );

  const assignToSlot = useCallback(
    (item: OperativeMediaItem, slotIndex: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const step = protocolSteps[slotIndex];
      if (!step) return;

      setMediaItems((prev) =>
        prev.map((m) =>
          m.id === item.id
            ? {
                ...m,
                tag: step.tag,
              }
            : m,
        ),
      );
      setSelectedSlotIndex(null);
    },
    [protocolSteps],
  );

  // Tap untagged photo → fill selected slot
  const handleUntaggedPress = useCallback(
    (item: OperativeMediaItem) => {
      if (selectedSlotIndex == null) {
        // No slot selected — select the first empty slot
        const firstEmpty = filteredSteps.findIndex((_, i) => {
          const globalIdx = protocolSteps.indexOf(filteredSteps[i]!);
          return !slotMapping.has(globalIdx);
        });
        if (firstEmpty >= 0) {
          const globalIdx = protocolSteps.indexOf(filteredSteps[firstEmpty]!);
          assignToSlot(item, globalIdx);
        }
        return;
      }

      assignToSlot(item, selectedSlotIndex);
    },
    [
      assignToSlot,
      selectedSlotIndex,
      filteredSteps,
      protocolSteps,
      slotMapping,
    ],
  );

  // Auto-organise
  const handleAutoOrganise = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = autoAssign(mediaItems, protocolSteps, procedureDate);
    setMediaItems(result);
    setSelectedSlotIndex(null);
  }, [mediaItems, protocolSteps, procedureDate]);

  // Done — return updated media
  const handleDone = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    executeGenericCallback(callbackId, mediaItems);
    navigation.goBack();
  }, [callbackId, mediaItems, navigation, executeGenericCallback]);

  // Phase filter tabs
  const phases: { key: PhaseFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "preop", label: "Pre-op" },
    { key: "intraop", label: "Intra-op" },
    { key: "postop", label: "Post-op" },
  ];

  const renderSlotCard = useCallback(
    (step: CaptureStep, globalIndex: number) => {
      const filled = slotMapping.get(globalIndex);
      const isSelected = selectedSlotIndex === globalIndex;
      const tagMeta = MEDIA_TAG_REGISTRY[step.tag];

      return (
        <Pressable
          key={`slot-${globalIndex}`}
          onPress={() => handleSlotPress(globalIndex)}
          style={[
            styles.slotCard,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: isSelected
                ? theme.link
                : filled
                  ? theme.success + "60"
                  : theme.border,
              borderWidth: isSelected ? 2 : 1,
            },
            Shadows.card,
          ]}
        >
          {filled ? (
            <EncryptedImage
              uri={filled.localUri}
              style={styles.slotImage}
              resizeMode="cover"
              thumbnail
            />
          ) : (
            <View
              style={[
                styles.slotEmpty,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <Feather
                name={isSelected ? "crosshair" : "plus"}
                size={24}
                color={isSelected ? theme.link : theme.textTertiary}
              />
            </View>
          )}
          <View style={styles.slotLabel}>
            <ThemedText
              style={[styles.slotLabelText, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {tagMeta?.label ?? step.label}
            </ThemedText>
            {step.required && (
              <View
                style={[styles.requiredDot, { backgroundColor: theme.warning }]}
              />
            )}
          </View>
        </Pressable>
      );
    },
    [slotMapping, selectedSlotIndex, theme, handleSlotPress],
  );

  const renderUntaggedItem = useCallback(
    ({ item }: { item: OperativeMediaItem }) => (
      <Pressable
        onPress={() => handleUntaggedPress(item)}
        style={[
          styles.untaggedItem,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: selectedSlotIndex != null ? theme.link : theme.border,
            borderWidth: selectedSlotIndex != null ? 2 : 1,
          },
        ]}
      >
        <EncryptedImage
          uri={item.localUri}
          style={styles.untaggedImage}
          resizeMode="cover"
          thumbnail
        />
      </Pressable>
    ),
    [theme, selectedSlotIndex, handleUntaggedPress],
  );

  return (
    <View
      testID="screen-caseMediaOrganiser"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="x" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            Organise Photos
          </ThemedText>
          <ThemedText
            style={[styles.progressText, { color: theme.textSecondary }]}
          >
            {filledCount}/{totalSteps} filled
          </ThemedText>
        </View>
        <Pressable
          onPress={handleDone}
          style={[styles.doneButton, { backgroundColor: theme.link }]}
        >
          <ThemedText style={[styles.doneText, { color: theme.buttonText }]}>
            Done
          </ThemedText>
        </Pressable>
      </View>

      {/* Phase filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.phaseTabs}
      >
        {phases.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPhaseFilter(p.key);
            }}
            style={[
              styles.phaseTab,
              {
                backgroundColor:
                  phaseFilter === p.key
                    ? theme.link + "20"
                    : theme.backgroundDefault,
                borderColor: phaseFilter === p.key ? theme.link : theme.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.phaseTabText,
                {
                  color:
                    phaseFilter === p.key ? theme.link : theme.textSecondary,
                },
              ]}
            >
              {p.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Protocol slot grid */}
      <ScrollView
        style={styles.slotGrid}
        contentContainerStyle={styles.slotGridContent}
      >
        <View style={styles.slotGridRow}>
          {filteredSteps.map((step) => {
            const globalIdx = protocolSteps.indexOf(step);
            return renderSlotCard(step, globalIdx);
          })}
        </View>
      </ScrollView>

      {/* Untagged strip */}
      {untaggedMedia.length > 0 && (
        <View
          style={[styles.untaggedSection, { borderTopColor: theme.border }]}
        >
          <View style={styles.untaggedHeader}>
            <ThemedText
              style={[styles.untaggedLabel, { color: theme.textSecondary }]}
            >
              Untagged ({untaggedMedia.length})
            </ThemedText>
            <Pressable
              onPress={handleAutoOrganise}
              style={[
                styles.autoButton,
                { backgroundColor: theme.link + "15", borderColor: theme.link },
              ]}
            >
              <Feather name="zap" size={14} color={theme.link} />
              <ThemedText
                style={[styles.autoButtonText, { color: theme.link }]}
              >
                Auto-organise
              </ThemedText>
            </Pressable>
          </View>
          <FlatList
            data={untaggedMedia}
            renderItem={renderUntaggedItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.untaggedList}
          />
          {selectedSlotIndex != null && (
            <ThemedText
              style={[styles.hintText, { color: theme.textTertiary }]}
            >
              Tap a photo to assign it to the selected slot
            </ThemedText>
          )}
        </View>
      )}

      {/* Auto-organise button when no untagged but slots empty */}
      {untaggedMedia.length === 0 && filledCount < totalSteps && (
        <View
          style={[styles.untaggedSection, { borderTopColor: theme.border }]}
        >
          <ThemedText
            style={[styles.allTaggedText, { color: theme.textSecondary }]}
          >
            All photos are tagged. Tap a filled slot to remove its assignment.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const SLOT_GAP = Spacing.sm;
const SLOT_WIDTH = 160;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  progressText: {
    fontSize: 13,
  },
  doneButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  doneText: {
    fontSize: 15,
    fontWeight: "600",
  },
  phaseTabs: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  phaseTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  phaseTabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  slotGrid: {
    flex: 1,
  },
  slotGridContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  slotGridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SLOT_GAP,
  },
  slotCard: {
    width: SLOT_WIDTH,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  slotImage: {
    width: SLOT_WIDTH,
    height: SLOT_WIDTH * 0.75,
  },
  slotEmpty: {
    width: SLOT_WIDTH,
    height: SLOT_WIDTH * 0.75,
    justifyContent: "center",
    alignItems: "center",
  },
  slotLabel: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  slotLabelText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  requiredDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  untaggedSection: {
    borderTopWidth: 1,
    paddingVertical: Spacing.sm,
  },
  untaggedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  untaggedLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  autoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  autoButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  untaggedList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  untaggedItem: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  untaggedImage: {
    width: "100%",
    height: "100%",
  },
  hintText: {
    fontSize: 12,
    textAlign: "center",
    paddingTop: Spacing.xs,
  },
  allTaggedText: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
