import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  AppState,
  BackHandler,
  InteractionManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { OpusLogo } from "@/components/brand";
import { useTheme } from "@/hooks/useTheme";
import { useAppLock } from "@/contexts/AppLockContext";
import { isBiometricPreferenceEnabled } from "@/lib/appLockStorage";
import { isFaceIdUnsupportedInCurrentRuntime } from "@/lib/biometrics";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

const PIN_LENGTH = 6;
const MAX_ATTEMPTS = 5;

export default function LockScreen() {
  const insets = useSafeAreaInsets();
  const { theme: colors } = useTheme();
  const { unlockWithBiometrics, unlockWithPin } = useAppLock();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBiometricButton, setShowBiometricButton] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("Biometrics");
  const [biometricHint, setBiometricHint] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const autoPromptedRef = useRef(false);
  const promptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBiometricUnlock = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const success = await unlockWithBiometrics();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsProcessing(false);
  }, [isProcessing, unlockWithBiometrics]);

  const runBiometricAutoPrompt = useCallback(() => {
    if (
      autoPromptedRef.current ||
      isProcessing ||
      !showBiometricButton ||
      AppState.currentState !== "active"
    ) {
      return;
    }

    autoPromptedRef.current = true;
    InteractionManager.runAfterInteractions(() => {
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
      }
      promptTimeoutRef.current = setTimeout(() => {
        promptTimeoutRef.current = null;
        void handleBiometricUnlock();
      }, 180);
    });
  }, [handleBiometricUnlock, isProcessing, showBiometricButton]);

  useEffect(() => {
    const checkBiometrics = async () => {
      const bioPref = await isBiometricPreferenceEnabled();
      if (!bioPref) return;

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        setShowBiometricButton(true);
        setBiometricHint(null);

        const types =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (
          types.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
          )
        ) {
          setBiometricType("Face ID");
        } else if (
          types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ) {
          setBiometricType("Touch ID");
        }

        if (isFaceIdUnsupportedInCurrentRuntime(types)) {
          setShowBiometricButton(false);
          setBiometricHint(
            "Face ID can't be tested in Expo Go. Use your PIN here; TestFlight should prompt Face ID.",
          );
          return;
        }
      }
    };
    checkBiometrics();
  }, []);

  useEffect(() => {
    runBiometricAutoPrompt();
  }, [runBiometricAutoPrompt]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        autoPromptedRef.current = false;
        if (promptTimeoutRef.current) {
          clearTimeout(promptTimeoutRef.current);
          promptTimeoutRef.current = null;
        }
        return;
      }

      if (nextState === "active") {
        runBiometricAutoPrompt();
      }
    });

    return () => {
      subscription.remove();
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = null;
      }
    };
  }, [runBiometricAutoPrompt]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );

    return () => subscription.remove();
  }, []);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  const handlePinEntry = useCallback(
    async (digit: string) => {
      if (isProcessing || attempts >= MAX_ATTEMPTS) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newPin = pin + digit;
      setPin(newPin);
      setError("");

      if (newPin.length === PIN_LENGTH) {
        setIsProcessing(true);
        const success = await unlockWithPin(newPin);

        if (success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          triggerShake();
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);

          if (newAttempts >= MAX_ATTEMPTS) {
            setError("Too many attempts. Please restart the app.");
          } else {
            setError("Incorrect PIN");
            setTimeout(() => setError(""), 2000);
          }
          setPin("");
        }
        setIsProcessing(false);
      }
    },
    [pin, isProcessing, attempts, unlockWithPin, triggerShake],
  );

  const handleBackspace = useCallback(() => {
    if (pin.length > 0 && !isProcessing) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPin((prev) => prev.slice(0, -1));
    }
  }, [pin, isProcessing]);

  const renderDots = () => (
    <Animated.View
      style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
    >
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i < pin.length ? colors.link : "transparent",
              borderColor: i < pin.length ? colors.link : colors.border,
            },
          ]}
        />
      ))}
    </Animated.View>
  );

  const renderKey = (label: string, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      disabled={attempts >= MAX_ATTEMPTS}
      style={({ pressed }) => [
        styles.key,
        {
          backgroundColor: pressed ? colors.backgroundTertiary : "transparent",
        },
      ]}
    >
      <Text style={[styles.keyText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View
      testID="screen-lock"
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundRoot,
          paddingTop: insets.top + Spacing["3xl"],
        },
      ]}
    >
      <View style={styles.logoContainer}>
        <OpusLogo size="lg" />
      </View>

      <Text
        style={[
          Typography.h2,
          {
            color: colors.text,
            textAlign: "center",
            marginTop: Spacing.xl,
          },
        ]}
      >
        Unlock Opus
      </Text>

      {renderDots()}

      <View style={styles.errorContainer}>
        {error ? (
          <Text
            style={[
              Typography.small,
              { color: colors.error, textAlign: "center" },
            ]}
          >
            {error}
          </Text>
        ) : biometricHint ? (
          <Text
            style={[
              Typography.small,
              styles.biometricHint,
              { color: colors.textSecondary },
            ]}
          >
            {biometricHint}
          </Text>
        ) : null}
      </View>

      <View style={styles.keypad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) =>
          renderKey(d, () => handlePinEntry(d)),
        )}
        <View style={styles.key}>
          {showBiometricButton ? (
            <Pressable onPress={handleBiometricUnlock} style={styles.iconKey}>
              <Feather
                name={biometricType === "Face ID" ? "smile" : "smartphone"}
                size={28}
                color={colors.link}
              />
            </Pressable>
          ) : null}
        </View>
        {renderKey("0", () => handlePinEntry("0"))}
        <Pressable
          onPress={handleBackspace}
          disabled={pin.length === 0}
          style={[styles.key, styles.iconKey]}
        >
          <Feather
            name="delete"
            size={24}
            color={pin.length > 0 ? colors.text : colors.textTertiary}
          />
        </Pressable>
      </View>

      {showBiometricButton && (
        <Pressable
          onPress={handleBiometricUnlock}
          style={styles.biometricLabel}
        >
          <Text style={[Typography.small, { color: colors.link }]}>
            Use {biometricType}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  logoContainer: {
    marginTop: Spacing["2xl"],
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing["3xl"],
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  errorContainer: {
    minHeight: 40,
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 280,
    marginTop: Spacing["2xl"],
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
  biometricLabel: {
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
  biometricHint: {
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: Spacing.xl,
  },
});
