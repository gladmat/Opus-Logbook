import React, { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import {
  formatMilestoneDate,
  type MilestoneEvent,
} from "@/lib/statisticsHelpers";

interface MilestoneTimelineProps {
  milestones: MilestoneEvent[];
  maxVisible?: number;
}

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const MilestoneTimeline = React.memo(function MilestoneTimeline({
  milestones,
  maxVisible = 5,
}: MilestoneTimelineProps) {
  const { theme } = useTheme();
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? milestones : milestones.slice(-maxVisible);
  const hasMore = milestones.length > maxVisible && !showAll;

  return (
    <View style={styles.container}>
      {visible.map((m, i) => (
        <View key={`${m.label}-${m.date}`} style={styles.row}>
          {/* Timeline line + dot */}
          <View style={styles.timeline}>
            {i > 0 && (
              <View
                style={[styles.lineTop, { backgroundColor: theme.border }]}
              />
            )}
            <View style={[styles.dot, { backgroundColor: theme.accent }]} />
            {i < visible.length - 1 && (
              <View
                style={[styles.lineBottom, { backgroundColor: theme.border }]}
              />
            )}
          </View>

          {/* Content */}
          <View style={styles.content}>
            <ThemedText style={[styles.label, { color: theme.text }]}>
              {m.label}
            </ThemedText>
            <ThemedText style={[styles.date, { color: theme.textTertiary }]}>
              {formatMilestoneDate(m.date)}
            </ThemedText>
          </View>
        </View>
      ))}

      {hasMore && (
        <Pressable
          onPress={() => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setShowAll(true);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ThemedText style={[styles.seeAll, { color: theme.accent }]}>
            See all {milestones.length} milestones
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingLeft: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    minHeight: 44,
  },
  timeline: {
    width: 20,
    alignItems: "center",
  },
  lineTop: {
    width: 2,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lineBottom: {
    width: 2,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingLeft: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  date: {
    fontSize: 12,
    marginTop: 1,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: Spacing.sm,
    paddingLeft: 20 + Spacing.sm,
  },
});
