import React, { useState, useRef, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface CollapsibleFormSectionProps {
  title: string;
  subtitle?: string;
  filledCount: number;
  totalCount: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const CollapsibleFormSection = React.memo(
  function CollapsibleFormSection({
    title,
    subtitle,
    filledCount,
    totalCount,
    children,
    defaultExpanded = true,
  }: CollapsibleFormSectionProps) {
    const { theme } = useTheme();
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [isMeasured, setIsMeasured] = useState(defaultExpanded);
    const expandedRef = useRef(defaultExpanded);
    const contentHeightRef = useRef(0);
    const animatedHeight = useSharedValue(defaultExpanded ? -1 : 0);

    const toggle = useCallback(() => {
      const nextExpanded = !expandedRef.current;
      expandedRef.current = nextExpanded;
      setExpanded(nextExpanded);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (isMeasured) {
        animatedHeight.value = withTiming(
          nextExpanded ? contentHeightRef.current : 0,
          { duration: 250 },
        );
      }
    }, [animatedHeight, isMeasured]);

    const contentStyle = useAnimatedStyle(() => {
      if (animatedHeight.value === -1) {
        return { overflow: "hidden" as const };
      }
      return {
        height: animatedHeight.value,
        overflow: "hidden" as const,
      };
    });

    const handleLayout = useCallback(
      (e: { nativeEvent: { layout: { height: number } } }) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) {
          contentHeightRef.current = h;
          if (!isMeasured) {
            animatedHeight.value = expandedRef.current ? h : 0;
            setIsMeasured(true);
          } else if (expandedRef.current) {
            animatedHeight.value = h;
          }
        }
      },
      [animatedHeight, isMeasured],
    );

    const badgeColor = filledCount > 0 ? theme.link : theme.textTertiary;

    return (
      <View style={styles.wrapper}>
        <Pressable
          onPress={toggle}
          style={styles.header}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${filledCount} of ${totalCount} filled`}
          accessibilityState={{ expanded }}
          accessibilityHint={
            expanded ? "Double tap to collapse" : "Double tap to expand"
          }
        >
          <View style={styles.headerLeft}>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText
                style={[styles.subtitle, { color: theme.textTertiary }]}
              >
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
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
                {filledCount}/{totalCount}
              </ThemedText>
            </View>
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.textSecondary}
            />
          </View>
        </Pressable>

        {!isMeasured && !expanded ? (
          <View pointerEvents="none" style={styles.hiddenMeasurementContainer}>
            <View onLayout={handleLayout}>{children}</View>
          </View>
        ) : null}

        <Animated.View style={contentStyle}>
          {isMeasured || expanded ? (
            <View onLayout={handleLayout}>{children}</View>
          ) : null}
        </Animated.View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  hiddenMeasurementContainer: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
  },
});
