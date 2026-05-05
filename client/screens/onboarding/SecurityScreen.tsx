import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { StepHeader } from "@/components/onboarding/StepHeader";
import FeatherIcon, { Feather } from "@/components/FeatherIcon";
import {
  savePin,
  setAppLockEnabled,
  setBiometricPreference,
} from "@/lib/appLockStorage";
import { isFaceIdUnsupportedInCurrentRuntime } from "@/lib/biometrics";
import { useAppLock } from "@/contexts/AppLockContext";
import { useAuth } from "@/contexts/AuthContext";
import { palette, Colors, Spacing, BorderRadius } from "@/constants/theme";

const dark = Colors.dark;
const PIN_LENGTH = 6;
const SIDE_PADDING = 24;

type PinStep = "enter_new" | "confirm_new" | "done";

interface Props {
  onComplete: () => void;
  onBack?: () => void;
}

export function SecurityScreen({ onComplete, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { refreshLockState } = useAppLock();
  const { updateProfile } = useAuth();

  // PIN state
  const [step, setStep] = useState<PinStep>("enter_new");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [pinError, setPinError] = useState("");
  const shakeOffset = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBlockedReason, setBiometricBlockedReason] = useState<
    string | null
  >(null);

  // Completion state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detect biometric hardware on mount
  useEffect(() => {
    const detect = async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const available = hasHardware && isEnrolled;
      setBiometricAvailable(available);

      if (available) {
        const types =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (
          types.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
          )
        ) {
          setBiometricLabel("Face ID");
        } else if (
          types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ) {
          setBiometricLabel("Touch ID");
        }

        if (isFaceIdUnsupportedInCurrentRuntime(types)) {
          setBiometricAvailable(false);
          setBiometricBlockedReason(
            "Face ID can't be tested in Expo Go. Use a development build or TestFlight to verify it.",
          );
        }
      }
    };
    detect();
  }, []);

  const triggerShake = useCallback(() => {
    shakeOffset.value = withSequence(
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeOffset]);

  const handlePinDigit = useCallback(
    async (digit: string) => {
      const newPin = pin + digit;
      setPin(newPin);
      setPinError("");

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (newPin.length < PIN_LENGTH) return;

      if (step === "enter_new") {
        setFirstPin(newPin);
        setPin("");
        setStep("confirm_new");
      } else if (step === "confirm_new") {
        if (newPin === firstPin) {
          await savePin(newPin);
          await setAppLockEnabled(true);
          await refreshLockState();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setStep("done");
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          triggerShake();
          setPinError("PINs don't match. Try again.");
          setPin("");
          setFirstPin("");
          setTimeout(() => {
            setPinError("");
            setStep("enter_new");
          }, 1500);
        }
      }
    },
    [pin, step, firstPin, triggerShake, refreshLockState],
  );

  const handlePinBackspace = useCallback(() => {
    if (pin.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPin((prev) => prev.slice(0, -1));
    }
  }, [pin]);

  const handleToggleBiometric = useCallback(async (value: boolean) => {
    await setBiometricPreference(value);
    setBiometricEnabled(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({ onboardingComplete: true });
      onComplete();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to complete setup. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const prompt =
    step === "enter_new"
      ? "Enter a 6-digit PIN"
      : step === "confirm_new"
        ? "Confirm your PIN"
        : "";

  // ── PIN entry flow ─────────────────────────────────────────────────────────

  if (step === "enter_new" || step === "confirm_new") {
    return (
      <View style={[styles.root, { paddingBottom: insets.bottom + 20 }]}>
        <StepHeader
          currentStep={5}
          onBack={step === "enter_new" ? onBack : undefined}
        />

        <View style={styles.pinContent}>
          {step === "enter_new" ? (
            <>
              <Text style={styles.headline}>Secure your logbook</Text>
              <Text style={styles.subhead}>
                Set a PIN to protect your cases and clinical photos.
              </Text>
            </>
          ) : null}

          <Text style={styles.pinPrompt}>{prompt}</Text>

          <Reanimated.View style={[styles.dotsRow, shakeStyle]}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i < pin.length ? palette.amber[600] : "transparent",
                    borderColor:
                      i < pin.length ? palette.amber[600] : "#38383A",
                  },
                ]}
              />
            ))}
          </Reanimated.View>

          <View style={styles.errorContainer}>
            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
          </View>

          <View style={styles.keypad}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <Pressable
                key={d}
                onPress={() => handlePinDigit(d)}
                style={({ pressed }) => [
                  styles.key,
                  pressed && styles.keyPressed,
                ]}
              >
                <Text style={styles.keyText}>{d}</Text>
              </Pressable>
            ))}
            <View style={styles.key} />
            <Pressable
              onPress={() => handlePinDigit("0")}
              style={({ pressed }) => [
                styles.key,
                pressed && styles.keyPressed,
              ]}
            >
              <Text style={styles.keyText}>0</Text>
            </Pressable>
            <Pressable
              onPress={handlePinBackspace}
              disabled={pin.length === 0}
              style={[styles.key, styles.iconKey]}
            >
              <Feather
                name="delete"
                size={24}
                color={pin.length > 0 ? dark.text : dark.textTertiary}
              />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Done state: biometric toggle + CTA ─────────────────────────────────────

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 20 }]}>
      <StepHeader currentStep={5} />

      <View style={styles.doneContent}>
        <Reanimated.View entering={FadeInDown.duration(400)}>
          <View style={styles.successIcon}>
            <FeatherIcon
              name="check-circle"
              size={48}
              color={palette.amber[600]}
            />
          </View>

          <Text style={styles.headline}>PIN set</Text>
          <Text style={styles.doneSubhead}>
            Your logbook is now protected. You can also enable biometric unlock
            for quick access.
          </Text>
        </Reanimated.View>

        {/* Biometric toggle */}
        {biometricAvailable ? (
          <Reanimated.View
            entering={FadeInDown.delay(150).duration(400)}
            style={styles.biometricRow}
          >
            <View style={styles.biometricInfo}>
              <FeatherIcon
                name={biometricLabel === "Face ID" ? "smile" : "smartphone"}
                size={22}
                color="#AEAEB2"
              />
              <Text style={styles.biometricLabel}>Enable {biometricLabel}</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: "#38383A", true: palette.amber[600] }}
              thumbColor="#FFFFFF"
            />
          </Reanimated.View>
        ) : biometricBlockedReason ? (
          <Reanimated.View
            entering={FadeInDown.delay(150).duration(400)}
            style={styles.biometricNote}
          >
            <FeatherIcon name="info" size={16} color="#AEAEB2" />
            <Text style={styles.biometricNoteText}>
              {biometricBlockedReason}
            </Text>
          </Reanimated.View>
        ) : null}
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomArea}>
        <Pressable
          style={[styles.ctaButton, isSubmitting && styles.ctaDisabled]}
          onPress={handleComplete}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={dark.buttonText} />
          ) : (
            <Text style={styles.ctaText}>Start logging</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.charcoal[950],
  },

  // ── PIN entry ──────────────────────────────────────────────────────────────
  pinContent: {
    flex: 1,
    alignItems: "center",
    paddingTop: Spacing.lg,
    paddingHorizontal: SIDE_PADDING,
  },
  headline: {
    fontSize: 28,
    fontWeight: "600",
    color: dark.text,
    textAlign: "center",
  },
  subhead: {
    fontSize: 15,
    fontWeight: "400",
    color: "#AEAEB2",
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  pinPrompt: {
    fontSize: 18,
    fontWeight: "600",
    color: dark.text,
    textAlign: "center",
    marginTop: Spacing["2xl"],
  },
  dotsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing["2xl"],
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  errorContainer: {
    height: 24,
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: dark.error,
    textAlign: "center",
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
  keyPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  keyText: {
    fontSize: 28,
    fontWeight: "300",
    color: dark.text,
  },
  iconKey: {
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Done state ─────────────────────────────────────────────────────────────
  doneContent: {
    flex: 1,
    paddingHorizontal: SIDE_PADDING,
    paddingTop: Spacing["3xl"],
  },
  successIcon: {
    alignItems: "center",
    marginBottom: 16,
  },
  doneSubhead: {
    fontSize: 15,
    fontWeight: "400",
    color: "#AEAEB2",
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
  },
  biometricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 32,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#1C1C1E",
    borderRadius: BorderRadius.md,
  },
  biometricInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  biometricLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: dark.text,
  },
  biometricNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 8,
  },
  biometricNoteText: {
    flex: 1,
    fontSize: 13,
    color: "#AEAEB2",
    lineHeight: 18,
  },

  // ── Bottom CTA ─────────────────────────────────────────────────────────────
  bottomArea: {
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 16,
    alignItems: "center",
  },
  ctaButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: palette.amber[600],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "600",
    color: dark.buttonText,
  },
});
