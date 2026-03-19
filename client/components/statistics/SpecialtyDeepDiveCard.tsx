import React, { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface SpecialtyDeepDiveCardProps {
  label: string;
  caseCount: number;
  color: string;
  heroMetric?: { label: string; value: string };
  minCasesForDetail?: number;
  children: React.ReactNode;
  testID?: string;
}

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const SpecialtyDeepDiveCard = React.memo(function SpecialtyDeepDiveCard({
  label,
  caseCount,
  color,
  heroMetric,
  minCasesForDetail = 5,
  children,
  testID,
}: SpecialtyDeepDiveCardProps) {
  const { theme, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const chevronRotation = useSharedValue(0);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !expanded;
    setExpanded(next);
    chevronRotation.value = withTiming(next ? 90 : 0, { duration: 200 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const hasSufficientData = caseCount >= minCasesForDetail;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
        !isDark && Shadows.card,
      ]}
      testID={testID}
    >
      <Pressable
        onPress={hasSufficientData ? toggleExpand : undefined}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${caseCount} cases`}
        accessibilityState={{ expanded }}
      >
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.headerText}>
          <View style={styles.headerRow}>
            <ThemedText style={[styles.name, { color: theme.text }]}>
              {label}
            </ThemedText>
            <ThemedText style={[styles.count, { color: theme.textSecondary }]}>
              {caseCount} case{caseCount !== 1 ? "s" : ""}
            </ThemedText>
            {hasSufficientData && (
              <Animated.View style={chevronStyle}>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={theme.textTertiary}
                />
              </Animated.View>
            )}
          </View>
          {heroMetric && (
            <ThemedText
              style={[styles.hero, { color: theme.textTertiary }]}
              numberOfLines={1}
            >
              {heroMetric.label}: {heroMetric.value}
            </ThemedText>
          )}
          {!hasSufficientData && (
            <ThemedText style={[styles.hero, { color: theme.textTertiary }]}>
              Log more {label.toLowerCase()} cases for detailed metrics
            </ThemedText>
          )}
        </View>
      </Pressable>

      {expanded && hasSufficientData && (
        <View style={[styles.body, { borderTopColor: theme.border }]}>
          {children}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerText: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  count: {
    fontSize: 13,
  },
  hero: {
    fontSize: 13,
    marginTop: 2,
  },
  body: {
    borderTopWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
});
