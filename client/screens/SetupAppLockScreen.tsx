import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { PinPad, type PinPadHandle } from "@/components/PinPad";
import { useTheme } from "@/hooks/useTheme";
import { useAppLock } from "@/contexts/AppLockContext";
import {
  useBiometricCapability,
  verifyBiometricsBeforeEnable,
} from "@/hooks/useBiometricCapability";
import { useLockoutCountdown } from "@/hooks/useLockoutCountdown";
import {
  savePin,
  verifyPin,
  isPinSet,
  isBiometricPreferenceEnabled,
  setBiometricPreference,
  getAutoLockTimeout,
  setAutoLockTimeout,
  setAppLockEnabled,
  clearAllAppLockData,
} from "@/lib/appLockStorage";
import {
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
  palette,
} from "@/constants/theme";

const PIN_LENGTH = 6;

const AUTO_LOCK_OPTIONS = [
  { label: "Immediately", value: 0 },
  { label: "After 1 minute", value: 60 },
  { label: "After 5 minutes", value: 300 },
  { label: "After 15 minutes", value: 900 },
];

type SetupStep = "idle" | "enter_new" | "confirm_new" | "enter_current";

export default function SetupAppLockScreen() {
  const { theme: colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { refreshLockState } = useAppLock();
  const biometric = useBiometricCapability();

  const [hasPinSet, setHasPinSet] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [autoLockSeconds, setAutoLockSeconds] = useState(0);

  // PIN setup state
  const [setupStep, setSetupStep] = useState<SetupStep>("idle");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinAction, setPinAction] = useState<
    "setup" | "change" | "disable" | null
  >(null);
  const padRef = useRef<PinPadHandle>(null);

  // Lockout only guards verifyPin, so it is active only while the current
  // PIN is being checked. Seeding from storage on activation surfaces a
  // lockout that survived a process kill.
  const { lockoutSeconds, lockoutMessage, startLockout } = useLockoutCountdown(
    setupStep === "enter_current",
  );

  useEffect(() => {
    const loadState = async () => {
      const [pinExists, bioPref, currentTimeout] = await Promise.all([
        isPinSet(),
        isBiometricPreferenceEnabled(),
        getAutoLockTimeout(),
      ]);
      setHasPinSet(pinExists);
      setBiometricEnabled(bioPref);
      setAutoLockSeconds(currentTimeout);
    };
    loadState();
  }, []);

  const biometricBlockedReason = biometric.expoGoFaceIdBlocked
    ? "Face ID can't be tested in Expo Go. Use a development build or TestFlight to verify it."
    : null;

  const resetPinFlow = useCallback(() => {
    setSetupStep("idle");
    setPin("");
    setFirstPin("");
    setPinError("");
    setPinAction(null);
  }, []);

  // Functional update: rapid key presses can land within one JS frame, and
  // `pin + digit` from a captured closure would drop all but the last one.
  const handlePinDigit = useCallback(
    (digit: string) => {
      if (lockoutSeconds > 0) return;
      setPinError("");
      setPin((prev) => (prev.length >= PIN_LENGTH ? prev : prev + digit));
    },
    [lockoutSeconds],
  );

  const handleCompletedPin = useCallback(
    async (enteredPin: string) => {
      if (setupStep === "enter_current") {
        // Verifying current PIN before change or disable
        const outcome = await verifyPin(enteredPin);
        if (outcome.ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (pinAction === "disable") {
            await clearAllAppLockData();
            setHasPinSet(false);
            setBiometricEnabled(false);
            await refreshLockState();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("App Lock Disabled", "Your app lock has been removed.");
            resetPinFlow();
          } else if (pinAction === "change") {
            setPin("");
            setSetupStep("enter_new");
          }
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          padRef.current?.shake();
          if (outcome.lockoutSecondsRemaining > 0) {
            startLockout(outcome.lockoutSecondsRemaining);
          } else {
            setPinError("Incorrect PIN");
            setTimeout(() => setPinError(""), 3000);
          }
          setPin("");
        }
      } else if (setupStep === "enter_new") {
        setFirstPin(enteredPin);
        setPin("");
        setSetupStep("confirm_new");
      } else if (setupStep === "confirm_new") {
        if (enteredPin === firstPin) {
          await savePin(enteredPin);
          await setAppLockEnabled(true);
          setHasPinSet(true);
          await refreshLockState();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("PIN Set", "Your app lock PIN has been saved.");
          resetPinFlow();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          padRef.current?.shake();
          setPinError("PINs don't match. Try again.");
          setPin("");
          setFirstPin("");
          setTimeout(() => {
            setPinError("");
            setSetupStep("enter_new");
          }, 1500);
        }
      }
    },
    [
      setupStep,
      pinAction,
      firstPin,
      resetPinFlow,
      refreshLockState,
      startLockout,
    ],
  );

  // Submit as an effect on the 6th digit so it runs exactly once per
  // completed buffer regardless of input speed.
  const pinSubmitInFlightRef = useRef(false);
  useEffect(() => {
    if (
      pin.length !== PIN_LENGTH ||
      setupStep === "idle" ||
      pinSubmitInFlightRef.current
    ) {
      return;
    }
    pinSubmitInFlightRef.current = true;
    void handleCompletedPin(pin).finally(() => {
      pinSubmitInFlightRef.current = false;
    });
  }, [pin, setupStep, handleCompletedPin]);

  const handlePinBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleToggleBiometric = useCallback(
    async (value: boolean) => {
      if (biometricBusy) return;

      if (!value) {
        await setBiometricPreference(false);
        setBiometricEnabled(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      if (!biometric.available) return;

      // Prove the biometric works before persisting the preference.
      setBiometricBusy(true);
      try {
        const verified = await verifyBiometricsBeforeEnable(biometric.label);
        if (verified) {
          await setBiometricPreference(true);
          setBiometricEnabled(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            `Couldn't verify ${biometric.label}`,
            `${biometric.label} wasn't enabled. Try again when you're ready.`,
          );
        }
      } finally {
        setBiometricBusy(false);
      }
    },
    [biometric.available, biometric.label, biometricBusy],
  );

  const handleSetTimeout = useCallback(async (seconds: number) => {
    await setAutoLockTimeout(seconds);
    setAutoLockSeconds(seconds);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const startSetupPin = () => {
    setPinAction("setup");
    setSetupStep("enter_new");
    setPin("");
    setFirstPin("");
    setPinError("");
  };

  const startChangePin = () => {
    setPinAction("change");
    setSetupStep("enter_current");
    setPin("");
    setPinError("");
  };

  const startDisableAppLock = () => {
    setPinAction("disable");
    setSetupStep("enter_current");
    setPin("");
    setPinError("");
  };

  const getPinPrompt = (): string => {
    switch (setupStep) {
      case "enter_current":
        return "Enter your current PIN";
      case "enter_new":
        return "Enter a new 6-digit PIN";
      case "confirm_new":
        return "Confirm your PIN";
      default:
        return "";
    }
  };

  // PIN entry UI shown inline when a PIN flow is active
  if (setupStep !== "idle") {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.backgroundRoot,
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={styles.pinFlowHeader}>
          <Pressable
            onPress={resetPinFlow}
            style={styles.cancelButton}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            testID="setupAppLock.btn-cancelPinFlow"
          >
            <ThemedText style={{ color: colors.link }}>Cancel</ThemedText>
          </Pressable>
        </View>

        <View style={styles.pinFlowContent}>
          <Text
            style={[Typography.h2, { color: colors.text, textAlign: "center" }]}
          >
            {getPinPrompt()}
          </Text>

          <View style={styles.padArea}>
            <PinPad
              ref={padRef}
              value={pin}
              onDigit={handlePinDigit}
              onBackspace={handlePinBackspace}
              disabled={lockoutSeconds > 0}
              error={lockoutMessage ?? (pinError || null)}
              testIDPrefix="setupAppLock"
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      testID="screen-setupAppLock"
      style={[
        styles.scrollContainer,
        { backgroundColor: colors.backgroundRoot },
      ]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Spacing.lg,
          paddingBottom: insets.bottom + Spacing["3xl"],
        },
      ]}
    >
      {/* PIN Section */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionTitle, { color: colors.textSecondary }]}
        >
          PIN
        </ThemedText>
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.backgroundDefault },
          ]}
        >
          {!hasPinSet ? (
            <Pressable
              onPress={startSetupPin}
              style={({ pressed }) => [
                styles.settingsRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.accentSurface },
                ]}
              >
                <Feather name="lock" size={20} color={colors.link} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.rowLabel}>Set Up PIN</ThemedText>
                <ThemedText
                  style={[styles.rowSubtitle, { color: colors.textSecondary }]}
                >
                  Create a 6-digit PIN to lock the app
                </ThemedText>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={startChangePin}
              style={({ pressed }) => [
                styles.settingsRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.accentSurface },
                ]}
              >
                <Feather name="lock" size={20} color={colors.link} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.rowLabel}>Change PIN</ThemedText>
                <ThemedText
                  style={[styles.rowSubtitle, { color: colors.textSecondary }]}
                >
                  Update your 6-digit PIN
                </ThemedText>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Biometrics Section — only visible when PIN is set and hardware available */}
      {hasPinSet && (biometric.available || biometricBlockedReason) && (
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: colors.textSecondary }]}
          >
            BIOMETRICS
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.backgroundDefault },
            ]}
          >
            <View style={styles.settingsRow}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.accentSurface },
                ]}
              >
                <Feather name={biometric.icon} size={20} color={colors.link} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.rowLabel}>
                  {biometric.label}
                </ThemedText>
                <ThemedText
                  style={[styles.rowSubtitle, { color: colors.textSecondary }]}
                >
                  {biometricBlockedReason ||
                    `Use ${biometric.label} to unlock the app`}
                </ThemedText>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                disabled={
                  biometricBusy || (!biometric.available && !biometricEnabled)
                }
                trackColor={{
                  false: colors.backgroundTertiary,
                  true: colors.link,
                }}
                thumbColor={palette.white}
                accessibilityLabel={`Use ${biometric.label} to unlock`}
                testID="setupAppLock.toggle-biometric"
              />
            </View>
          </View>
        </View>
      )}

      {/* Auto-Lock Timeout — only visible when PIN is set */}
      {hasPinSet && (
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: colors.textSecondary }]}
          >
            AUTO-LOCK
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.backgroundDefault },
            ]}
          >
            {AUTO_LOCK_OPTIONS.map((option, index) => (
              <React.Fragment key={option.value}>
                {index > 0 && (
                  <View
                    style={[styles.divider, { backgroundColor: colors.border }]}
                  />
                )}
                <Pressable
                  onPress={() => handleSetTimeout(option.value)}
                  style={({ pressed }) => [
                    styles.settingsRow,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{
                    selected: autoLockSeconds === option.value,
                  }}
                >
                  <ThemedText style={styles.rowLabel}>
                    {option.label}
                  </ThemedText>
                  {autoLockSeconds === option.value && (
                    <Feather name="check" size={20} color={colors.link} />
                  )}
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Disable App Lock — only visible when PIN is set */}
      {hasPinSet && (
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: colors.textSecondary }]}
          >
            DANGER ZONE
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.backgroundDefault },
            ]}
          >
            <Pressable
              onPress={startDisableAppLock}
              style={({ pressed }) => [
                styles.settingsRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.errorSurface },
                ]}
              >
                <Feather name="unlock" size={20} color={colors.error} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={[styles.rowLabel, { color: colors.error }]}>
                  Disable App Lock
                </ThemedText>
                <ThemedText
                  style={[styles.rowSubtitle, { color: colors.textSecondary }]}
                >
                  Requires your current PIN
                </ThemedText>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  pinFlowHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  cancelButton: {
    padding: Spacing.sm,
  },
  pinFlowContent: {
    flex: 1,
    alignItems: "center",
    paddingTop: Spacing["3xl"],
  },
  padArea: {
    marginTop: Spacing["3xl"],
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  sectionCard: {
    borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
});
