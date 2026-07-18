import React, { useState, useEffect, useCallback, useRef } from "react";
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
import Reanimated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { StepHeader } from "@/components/onboarding/StepHeader";
import FeatherIcon from "@/components/FeatherIcon";
import { PinPad, type PinPadHandle } from "@/components/PinPad";
import {
  savePin,
  setAppLockEnabled,
  setBiometricPreference,
  isPinSet,
  isBiometricPreferenceEnabled,
} from "@/lib/appLockStorage";
import {
  useBiometricCapability,
  verifyBiometricsBeforeEnable,
} from "@/hooks/useBiometricCapability";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { useAppLock } from "@/contexts/AppLockContext";
import { useAuth } from "@/contexts/AuthContext";
import { palette, Colors, Spacing, BorderRadius } from "@/constants/theme";
import { colors as onboardingColors } from "@/theme/tokens";
import { copy } from "@/constants/onboardingCopy";

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
  const reduceMotion = useReduceMotion();
  const { refreshLockState } = useAppLock();
  const { updateProfile } = useAuth();
  const c = copy.security;

  // null while resolving whether a PIN already exists (force-quit at the
  // done step, or replaying onboarding with app lock already configured).
  const [step, setStep] = useState<PinStep | null>(null);
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [pinError, setPinError] = useState("");
  const padRef = useRef<PinPadHandle>(null);

  const biometric = useBiometricCapability();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricNote, setBiometricNote] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const resolveInitialStep = async () => {
      try {
        const [pinExists, bioPref] = await Promise.all([
          isPinSet(),
          isBiometricPreferenceEnabled(),
        ]);
        if (!mounted) return;
        if (pinExists) {
          setBiometricEnabled(bioPref);
          setStep("done");
        } else {
          setStep("enter_new");
        }
      } catch {
        if (mounted) setStep("enter_new");
      }
    };
    void resolveInitialStep();
    return () => {
      mounted = false;
    };
  }, []);

  const handleConfirmedPin = useCallback(
    async (confirmedPin: string) => {
      await savePin(confirmedPin);
      await setAppLockEnabled(true);
      await refreshLockState();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPin("");
      setStep("done");
    },
    [refreshLockState],
  );

  // Functional update: rapid key presses can land within one JS frame, and
  // `pin + digit` from a captured closure would drop all but the last one.
  const handlePinDigit = useCallback((digit: string) => {
    setPinError("");
    setPin((prev) => (prev.length >= PIN_LENGTH ? prev : prev + digit));
  }, []);

  // Submit as an effect on the 6th digit so it runs exactly once per
  // completed buffer regardless of input speed.
  const pinSubmitInFlightRef = useRef(false);
  useEffect(() => {
    if (
      pin.length !== PIN_LENGTH ||
      step === null ||
      step === "done" ||
      pinSubmitInFlightRef.current
    ) {
      return;
    }
    pinSubmitInFlightRef.current = true;

    const submit = async () => {
      if (step === "enter_new") {
        setFirstPin(pin);
        setPin("");
        setStep("confirm_new");
      } else if (step === "confirm_new") {
        if (pin === firstPin) {
          await handleConfirmedPin(pin);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          padRef.current?.shake();
          setPinError(c.mismatch);
          setPin("");
          setFirstPin("");
          setTimeout(() => {
            setPinError("");
            setStep("enter_new");
          }, 1500);
        }
      }
    };
    void submit().finally(() => {
      pinSubmitInFlightRef.current = false;
    });
  }, [pin, step, firstPin, handleConfirmedPin, c.mismatch]);

  const handlePinBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleToggleBiometric = useCallback(
    async (value: boolean) => {
      if (biometricBusy) return;

      if (!value) {
        await setBiometricPreference(false);
        setBiometricEnabled(false);
        setBiometricNote(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      // Prove the biometric actually works before persisting the preference,
      // so the first lock screen isn't the first time it's exercised.
      setBiometricBusy(true);
      try {
        const verified = await verifyBiometricsBeforeEnable(biometric.label);
        if (verified) {
          await setBiometricPreference(true);
          setBiometricEnabled(true);
          setBiometricNote(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setBiometricNote(c.biometricVerifyFailed);
        }
      } finally {
        setBiometricBusy(false);
      }
    },
    [biometric.label, biometricBusy, c.biometricVerifyFailed],
  );

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

  // ── Resolving initial state ────────────────────────────────────────────────

  if (step === null) {
    return (
      <View testID="screen-onboardingSecurityLoading" style={styles.root} />
    );
  }

  // ── PIN entry flow ─────────────────────────────────────────────────────────

  if (step === "enter_new" || step === "confirm_new") {
    return (
      <View
        testID="screen-onboardingSecurity"
        style={[styles.root, { paddingBottom: insets.bottom + 20 }]}
      >
        <StepHeader
          currentStep={5}
          onBack={step === "enter_new" ? onBack : undefined}
        />

        <View style={styles.pinContent}>
          {step === "enter_new" ? (
            <>
              <Text style={styles.headline}>{c.headline}</Text>
              <Text style={styles.subhead}>{c.subhead}</Text>
            </>
          ) : null}

          <Text style={styles.pinPrompt}>
            {step === "enter_new" ? c.enterPrompt : c.confirmPrompt}
          </Text>

          <View style={styles.padArea}>
            <PinPad
              ref={padRef}
              value={pin}
              onDigit={handlePinDigit}
              onBackspace={handlePinBackspace}
              error={pinError || null}
              variant="onboarding"
              testIDPrefix="onboarding.security"
            />
          </View>
        </View>
      </View>
    );
  }

  // ── Done state: biometric toggle + CTA ─────────────────────────────────────

  return (
    <View
      testID="screen-onboardingSecurityDone"
      style={[styles.root, { paddingBottom: insets.bottom + 20 }]}
    >
      <StepHeader currentStep={5} />

      <View style={styles.doneContent}>
        <Reanimated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(400)}
        >
          <View style={styles.successIcon}>
            <FeatherIcon
              name="check-circle"
              size={48}
              color={palette.amber[600]}
            />
          </View>

          <Text style={styles.headline}>{c.doneHeadline}</Text>
          <Text style={styles.doneSubhead}>{c.doneSubhead}</Text>
        </Reanimated.View>

        {/* Biometric toggle */}
        {biometric.available ? (
          <Reanimated.View
            entering={
              reduceMotion ? undefined : FadeInDown.delay(150).duration(400)
            }
          >
            <View style={styles.biometricRow}>
              <View style={styles.biometricInfo}>
                <FeatherIcon
                  name={biometric.icon}
                  size={22}
                  color={onboardingColors.text.secondary}
                />
                <Text style={styles.biometricLabel}>
                  Enable {biometric.label}
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                disabled={biometricBusy}
                trackColor={{
                  false: onboardingColors.border.default,
                  true: palette.amber[600],
                }}
                thumbColor={palette.white}
                accessibilityRole="switch"
                accessibilityLabel={`Enable ${biometric.label}`}
                accessibilityState={{
                  checked: biometricEnabled,
                  busy: biometricBusy,
                }}
                testID="onboarding.security.toggle-biometric"
              />
            </View>
            {biometricNote ? (
              <Text style={styles.biometricNoteInline}>{biometricNote}</Text>
            ) : null}
          </Reanimated.View>
        ) : biometric.expoGoFaceIdBlocked ? (
          <Reanimated.View
            entering={
              reduceMotion ? undefined : FadeInDown.delay(150).duration(400)
            }
            style={styles.biometricNote}
          >
            <FeatherIcon
              name="info"
              size={16}
              color={onboardingColors.text.secondary}
            />
            <Text style={styles.biometricNoteText}>{c.expoGoNote}</Text>
          </Reanimated.View>
        ) : null}
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomArea}>
        <Pressable
          style={[styles.ctaButton, isSubmitting && styles.ctaDisabled]}
          onPress={handleComplete}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={c.cta}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          testID="onboarding.security.btn-complete"
        >
          {isSubmitting ? (
            <ActivityIndicator color={dark.buttonText} />
          ) : (
            <Text style={styles.ctaText}>{c.cta}</Text>
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
    color: onboardingColors.text.secondary,
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
  padArea: {
    marginTop: Spacing["2xl"],
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
    color: onboardingColors.text.secondary,
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
    backgroundColor: onboardingColors.background.elevated,
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
    color: onboardingColors.text.secondary,
    lineHeight: 18,
  },
  biometricNoteInline: {
    fontSize: 13,
    color: onboardingColors.text.secondary,
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 4,
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
