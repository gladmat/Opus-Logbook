import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { palette, Colors, Spacing, BorderRadius } from "@/constants/theme";
import { colors as onboardingColors } from "@/theme/tokens";

const DEFAULT_LENGTH = 6;
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export interface PinPadHandle {
  /** Play the wrong-PIN shake on the dots row. */
  shake: () => void;
}

export interface PinPadBiometricKey {
  icon: "smile" | "smartphone";
  onPress: () => void;
  accessibilityLabel: string;
}

interface PinPadColors {
  fill: string;
  dotBorder: string;
  keyText: string;
  keyTextDisabled: string;
  keyPressed: string;
  error: string;
  hint: string;
  biometric: string;
}

interface PinPadProps {
  /** Controlled PIN value — the parent owns submit-on-Nth-digit logic. */
  value: string;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  length?: number;
  /** Disables every key (lockout / verify in flight). */
  disabled?: boolean;
  /** Error line under the dots; takes precedence over `hint`. */
  error?: string | null;
  /** Secondary line under the dots (e.g. Expo Go Face ID note). */
  hint?: string | null;
  /** Renders a biometric key in the empty slot left of 0. */
  biometricKey?: PinPadBiometricKey | null;
  /**
   * "themed" follows the active light/dark theme (lock + settings surfaces);
   * "onboarding" pins the dark onboarding token set for pixel parity with
   * the rest of the onboarding flow.
   */
  variant?: "themed" | "onboarding";
  /** testIDs render as `${prefix}.key-1..9`, `.key-0`, `.key-backspace`, `.key-biometric`. */
  testIDPrefix: string;
}

function PinDot({
  filled,
  fillColor,
  borderColor,
  reduceMotion,
}: {
  filled: boolean;
  fillColor: string;
  borderColor: string;
  reduceMotion: boolean;
}) {
  const scale = useSharedValue(1);
  const wasFilled = useRef(filled);

  useEffect(() => {
    if (filled && !wasFilled.current && !reduceMotion) {
      scale.value = withSequence(
        withTiming(1.25, { duration: 90, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 90, easing: Easing.out(Easing.ease) }),
      );
    }
    wasFilled.current = filled;
  }, [filled, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Reanimated.View
      style={[
        styles.dot,
        animatedStyle,
        {
          backgroundColor: filled ? fillColor : "transparent",
          borderColor: filled ? fillColor : borderColor,
        },
      ]}
    />
  );
}

/**
 * Shared 6-digit PIN surface: dots row (with shake + fill pop), a fixed
 * error/hint slot, and the 12-key numeric keypad. Used by LockScreen,
 * SetupAppLockScreen, and the onboarding SecurityScreen.
 *
 * Digit/backspace haptics live here and fire only for accepted presses;
 * success/error notification haptics stay with the verify logic at call
 * sites.
 */
export const PinPad = forwardRef<PinPadHandle, PinPadProps>(function PinPad(
  {
    value,
    onDigit,
    onBackspace,
    length = DEFAULT_LENGTH,
    disabled = false,
    error,
    hint,
    biometricKey,
    variant = "themed",
    testIDPrefix,
  },
  ref,
) {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotion();

  const colors: PinPadColors = useMemo(() => {
    if (variant === "onboarding") {
      return {
        fill: palette.amber[600],
        dotBorder: onboardingColors.border.default,
        keyText: Colors.dark.text,
        keyTextDisabled: Colors.dark.textTertiary,
        keyPressed: onboardingColors.background.pressed,
        error: Colors.dark.error,
        hint: onboardingColors.text.secondary,
        biometric: palette.amber[600],
      };
    }
    return {
      fill: theme.link,
      dotBorder: theme.border,
      keyText: theme.text,
      keyTextDisabled: theme.textTertiary,
      keyPressed: theme.backgroundTertiary,
      error: theme.error,
      hint: theme.textSecondary,
      biometric: theme.link,
    };
  }, [variant, theme]);

  const shakeOffset = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  useImperativeHandle(
    ref,
    () => ({
      shake: () => {
        if (reduceMotion) return;
        shakeOffset.value = withSequence(
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        );
      },
    }),
    [reduceMotion, shakeOffset],
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (disabled || value.length >= length) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDigit(digit);
    },
    [disabled, value.length, length, onDigit],
  );

  const handleBackspace = useCallback(() => {
    if (disabled || value.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBackspace();
  }, [disabled, value.length, onBackspace]);

  const renderDigitKey = (digit: string) => (
    <Pressable
      key={digit}
      onPress={() => handleDigit(digit)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.key,
        { backgroundColor: pressed ? colors.keyPressed : "transparent" },
      ]}
      accessibilityRole="button"
      accessibilityLabel={digit}
      accessibilityState={{ disabled }}
      testID={`${testIDPrefix}.key-${digit}`}
    >
      <Text
        style={[
          styles.keyText,
          { color: disabled ? colors.keyTextDisabled : colors.keyText },
        ]}
      >
        {digit}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Reanimated.View style={[styles.dotsRow, shakeStyle]}>
        {Array.from({ length }).map((_, i) => (
          <PinDot
            key={i}
            filled={i < value.length}
            fillColor={colors.fill}
            borderColor={colors.dotBorder}
            reduceMotion={reduceMotion}
          />
        ))}
      </Reanimated.View>

      <View style={styles.messageSlot}>
        {error ? (
          <Text
            style={[styles.messageText, { color: colors.error }]}
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        ) : hint ? (
          <Text style={[styles.messageText, { color: colors.hint }]}>
            {hint}
          </Text>
        ) : null}
      </View>

      <View style={styles.keypad}>
        {DIGITS.map(renderDigitKey)}
        <View style={styles.key}>
          {biometricKey ? (
            <Pressable
              onPress={biometricKey.onPress}
              disabled={disabled}
              style={styles.iconKey}
              accessibilityRole="button"
              accessibilityLabel={biometricKey.accessibilityLabel}
              accessibilityState={{ disabled }}
              testID={`${testIDPrefix}.key-biometric`}
            >
              <Feather
                name={biometricKey.icon}
                size={28}
                color={colors.biometric}
              />
            </Pressable>
          ) : null}
        </View>
        {renderDigitKey("0")}
        <Pressable
          onPress={handleBackspace}
          disabled={disabled || value.length === 0}
          style={[styles.key, styles.iconKey]}
          accessibilityRole="button"
          accessibilityLabel="Backspace"
          accessibilityState={{ disabled: disabled || value.length === 0 }}
          testID={`${testIDPrefix}.key-backspace`}
        >
          <Feather
            name="delete"
            size={24}
            color={
              value.length > 0 && !disabled
                ? colors.keyText
                : colors.keyTextDisabled
            }
          />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  messageSlot: {
    minHeight: 40,
    justifyContent: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 280,
    marginTop: Spacing.lg,
    justifyContent: "center",
  },
  key: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius["2xl"],
    margin: 4,
  },
  keyText: {
    fontSize: 28,
    fontWeight: "300",
  },
  iconKey: {
    justifyContent: "center",
    alignItems: "center",
  },
});
