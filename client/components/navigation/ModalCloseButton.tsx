import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface ModalCloseButtonProps {
  /** Text instead of the X glyph (e.g. "Cancel"). */
  label?: string;
  testID?: string;
}

/**
 * Header-left close affordance for modal-presented routes. A presented
 * sheet is the root of its own navigation controller, so iOS never draws a
 * back button on it — without this the only way out is swipe-down.
 */
export function ModalCloseButton({
  label,
  testID = "nav.btn-closeModal",
}: ModalCloseButtonProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => navigation.goBack()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label ?? "Close"}
      testID={testID}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {label ? (
        <ThemedText style={[styles.label, { color: theme.link }]}>
          {label}
        </ThemedText>
      ) : (
        <Feather name="x" size={22} color={theme.link} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: Spacing.touchTarget,
    minHeight: Spacing.touchTarget,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  pressed: { opacity: 0.7 },
  label: { fontSize: 17 },
});
