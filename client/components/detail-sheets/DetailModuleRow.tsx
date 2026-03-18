/**
 * Hub row component for the hub-and-spoke form architecture.
 * Displays module title, one-line summary, and completion status.
 * Tapping opens the associated modal sheet.
 */

import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface DetailModuleRowProps {
  title: string;
  /** One-line summary of entered data, or null when not completed */
  summary: string | null;
  isComplete: boolean;
  onPress: () => void;
  /** Feather icon name */
  icon?: string;
  testID?: string;
}

export function DetailModuleRow({
  title,
  summary,
  isComplete,
  onPress,
  icon = "file-text",
  testID,
}: DetailModuleRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      testID={testID}
      style={[
        styles.row,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: isComplete ? theme.link + "40" : theme.border,
        },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isComplete
              ? theme.link + "15"
              : theme.backgroundSecondary,
          },
        ]}
      >
        <Feather
          name={icon as any}
          size={16}
          color={isComplete ? theme.link : theme.textTertiary}
        />
      </View>

      <View style={styles.textContainer}>
        <ThemedText style={[styles.title, { color: theme.text }]}>
          {title}
        </ThemedText>
        <ThemedText
          style={[
            styles.summary,
            {
              color: isComplete ? theme.textSecondary : theme.textTertiary,
            },
          ]}
          numberOfLines={1}
        >
          {summary || "Not completed"}
        </ThemedText>
      </View>

      <Feather
        name={isComplete ? "check-circle" : "chevron-right"}
        size={18}
        color={isComplete ? theme.success : theme.textTertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    minHeight: 48,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
  },
  summary: {
    fontSize: 13,
    marginTop: 2,
  },
});
