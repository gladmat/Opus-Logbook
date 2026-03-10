/**
 * ReExcisionPromptCard
 * ═══════════════════════════════════════════════════════════
 * Amber action card rendered below the margin status chips
 * when histology shows incomplete or close margins.
 *
 * Advises the surgeon that re-excision is likely needed and
 * offers guidance on creating a follow-up case.
 */

import React from "react";
import { View, Pressable, Alert, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ReExcisionPromptCardProps {
  onCreateFollowUp?: () => void;
}

export function ReExcisionPromptCard({
  onCreateFollowUp,
}: ReExcisionPromptCardProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onCreateFollowUp) {
      onCreateFollowUp();
      return;
    }
    Alert.alert(
      "Re-excision follow-up",
      "Create a duplicate follow-up case to carry the prior histology forward and plan the next excision.",
      [{ text: "OK" }],
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.warning + "1A",
          borderColor: theme.warning + "4D",
        },
      ]}
    >
      <View style={styles.header}>
        <Feather name="alert-triangle" size={16} color={theme.warning} />
        <ThemedText style={[styles.title, { color: theme.warning }]}>
          Incomplete margins
        </ThemedText>
      </View>

      <ThemedText style={[styles.body, { color: theme.text }]}>
        Re-excision likely needed. Duplicate this case from the case detail
        screen to pre-fill a follow-up.
      </ThemedText>

      <Pressable
        onPress={handlePress}
        style={[styles.button, { backgroundColor: theme.warning }]}
        accessibilityRole="button"
        accessibilityLabel="Pre-fill re-excision case"
      >
        <ThemedText style={[styles.buttonText, { color: theme.buttonText }]}>
          Create follow-up case
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
