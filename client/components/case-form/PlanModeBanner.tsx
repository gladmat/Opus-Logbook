import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import * as Haptics from "expo-haptics";

interface PlanModeBannerProps {
  onTogglePlanMode: () => void;
}

/**
 * Persistent banner shown across the top of the case form when plan mode
 * is active. The previous plan-mode toggle was a 13pt chip tucked into
 * PatientInfoSection's header — easy to miss, easy to forget, and plan
 * mode has consequential save semantics ("won't be logged as performed").
 *
 * This banner sits above the section nav bar so it's visible regardless
 * of which section the surgeon is scrolling through. Tapping switches
 * back to a real case-log.
 */
export function PlanModeBanner({ onTogglePlanMode }: PlanModeBannerProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onTogglePlanMode();
      }}
      accessibilityRole="button"
      accessibilityLabel="Planning mode active. Tap to switch to logging a performed case."
      style={[
        styles.banner,
        {
          backgroundColor: theme.warningSurface,
          borderColor: theme.warning,
        },
      ]}
      testID="caseForm.planModeBanner"
    >
      <Feather name="calendar" size={16} color={theme.warning} />
      <View style={styles.textCol}>
        <ThemedText style={[styles.title, { color: theme.warning }]}>
          Planning mode
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          This case won&apos;t be logged as performed. Tap to switch.
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={16} color={theme.warning} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    minHeight: 48,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
});
