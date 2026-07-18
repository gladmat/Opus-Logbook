import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AppState,
  BackHandler,
  InteractionManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { OpusLogo } from "@/components/brand";
import { PinPad, type PinPadHandle } from "@/components/PinPad";
import { useTheme } from "@/hooks/useTheme";
import { useAppLock } from "@/contexts/AppLockContext";
import { useBiometricCapability } from "@/hooks/useBiometricCapability";
import { useLockoutCountdown } from "@/hooks/useLockoutCountdown";
import { isBiometricPreferenceEnabled } from "@/lib/appLockStorage";
import { Spacing, Typography } from "@/constants/theme";

const PIN_LENGTH = 6;

export default function LockScreen() {
  const insets = useSafeAreaInsets();
  const { theme: colors } = useTheme();
  const { unlockWithBiometrics, unlockWithPin } = useAppLock();
  const biometric = useBiometricCapability();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [biometricPreferred, setBiometricPreferred] = useState(false);
  const padRef = useRef<PinPadHandle>(null);
  const autoPromptedRef = useRef(false);
  const promptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persisted lockout is enforced by appLockStorage; this surfaces it the
  // moment the lock screen mounts (survives app kills) and keeps the keypad
  // disabled while it runs down.
  const { lockoutSeconds, lockoutMessage, startLockout } =
    useLockoutCountdown(true);

  useEffect(() => {
    let mounted = true;
    isBiometricPreferenceEnabled()
      .then((pref) => {
        if (mounted) setBiometricPreferred(pref);
      })
      .catch(() => {
        if (mounted) setBiometricPreferred(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const showBiometricButton = biometricPreferred && biometric.available;
  const biometricHint =
    biometricPreferred && biometric.expoGoFaceIdBlocked
      ? "Face ID can't be tested in Expo Go. Use your PIN here; TestFlight should prompt Face ID."
      : null;

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

  // Functional update: rapid key presses can land within one JS frame, and
  // `pin + digit` from a captured closure would drop all but the last one.
  const handlePinEntry = useCallback(
    (digit: string) => {
      if (isProcessing || lockoutSeconds > 0) return;
      setError("");
      setPin((prev) => (prev.length >= PIN_LENGTH ? prev : prev + digit));
    },
    [isProcessing, lockoutSeconds],
  );

  // Submit as an effect on the 6th digit so it runs exactly once per
  // completed buffer regardless of input speed.
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || isProcessing) return;

    const verify = async () => {
      setIsProcessing(true);
      const outcome = await unlockWithPin(pin);

      if (outcome.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        padRef.current?.shake();

        if (outcome.lockoutSecondsRemaining > 0) {
          startLockout(outcome.lockoutSecondsRemaining);
        } else {
          setError("Incorrect PIN");
          setTimeout(() => setError(""), 2000);
        }
        setPin("");
      }
      setIsProcessing(false);
    };
    void verify();
  }, [pin, isProcessing, unlockWithPin, startLockout]);

  const handleBackspace = useCallback(() => {
    if (!isProcessing) {
      setPin((prev) => prev.slice(0, -1));
    }
  }, [isProcessing]);

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

      <View style={styles.padArea}>
        <PinPad
          ref={padRef}
          value={pin}
          onDigit={handlePinEntry}
          onBackspace={handleBackspace}
          disabled={isProcessing || lockoutSeconds > 0}
          error={lockoutMessage ?? (error || null)}
          hint={biometricHint}
          biometricKey={
            showBiometricButton
              ? {
                  icon: biometric.icon,
                  onPress: handleBiometricUnlock,
                  accessibilityLabel: `Unlock with ${biometric.label}`,
                }
              : null
          }
          testIDPrefix="lock"
        />
      </View>

      {showBiometricButton && (
        <Pressable
          onPress={handleBiometricUnlock}
          style={styles.biometricLabel}
          accessibilityRole="button"
          accessibilityLabel={`Use ${biometric.label}`}
          testID="lock.btn-biometric"
        >
          <Text style={[Typography.small, { color: colors.link }]}>
            Use {biometric.label}
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
  padArea: {
    marginTop: Spacing["3xl"],
  },
  biometricLabel: {
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
});
