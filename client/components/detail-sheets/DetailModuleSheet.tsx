/**
 * Standardised modal sheet wrapper for hub-and-spoke detail modules.
 * Follows the FractureClassificationWizard pattern: full-screen pageSheet with Save/Cancel header.
 */

import React from "react";
import { View, StyleSheet, Pressable, Modal } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface DetailModuleSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onSave: () => void;
  onCancel: () => void;
  saveDisabled?: boolean;
  children: React.ReactNode;
  testID?: string;
}

export function DetailModuleSheet({
  visible,
  title,
  subtitle,
  onSave,
  onCancel,
  saveDisabled,
  children,
  testID,
}: DetailModuleSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View
        testID={testID}
        style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.border,
              paddingTop: insets.top || Spacing.md,
            },
          ]}
        >
          <Pressable
            style={[
              styles.closeButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
            onPress={onCancel}
            hitSlop={8}
          >
            <Feather name="x" size={20} color={theme.text} />
          </Pressable>

          <View style={styles.titleContainer}>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText
                style={[styles.subtitle, { color: theme.textSecondary }]}
              >
                {subtitle}
              </ThemedText>
            ) : null}
          </View>

          <Pressable
            style={[
              styles.saveButton,
              {
                backgroundColor: saveDisabled ? theme.textTertiary : theme.link,
              },
            ]}
            onPress={onSave}
            disabled={saveDisabled}
            hitSlop={8}
          >
            <ThemedText
              style={[styles.saveButtonText, { color: theme.buttonText }]}
            >
              Save
            </ThemedText>
          </Pressable>
        </View>

        {/* Body */}
        <KeyboardAwareScrollViewCompat
          style={styles.body}
          contentContainerStyle={[
            styles.bodyContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
        >
          {children}
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: Spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  saveButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
});
