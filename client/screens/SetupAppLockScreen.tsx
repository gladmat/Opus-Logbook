import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Animated,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAppLock } from "@/contexts/AppLockContext";
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
} from "@/constants/theme";

const PIN_LENGTH = 4;

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
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const { refreshLockState, isAppLockConfigured } = useAppLock();

  const [hasPinSet, setHasPinSet] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const [timeout, setTimeout_] = useState(0);

  // PIN setup state
  const [setupStep, setSetupStep] = useState<SetupStep>("idle");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinAction, setPinAction] = useState<
    "setup" | "change" | "disable" | null
  >(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadState = async () => {
      const [pinExists, bioPref, currentTimeout] = await Promise.all([
        isPinSet(),
        isBiometricPreferenceEnabled(),
        getAutoLockTimeout(),
      ]);
      setHasPinSet(pinExists);
      setBiometricEnabled(bioPref);
      setTimeout_(currentTimeout);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);

      if (hasHardware && isEnrolled) {
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
      }
    };
    loadState();
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

  const resetPinFlow = useCallback(() => {
    setSetupStep("idle");
    setPin("");
    setFirstPin("");
    setPinError("");
    setPinAction(null);
  }, []);

  const handlePinDigit = useCallback(
    async (digit: string) => {
      const newPin = pin + digit;
      setPin(newPin);
      setPinError("");

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (newPin.length < PIN_LENGTH) return;

      if (setupStep === "enter_current") {
        // Verifying current PIN before change or disable
        const valid = await verifyPin(newPin);
        if (valid) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (pinAction === "disable") {
            await clearAllAppLockData();
            setHasPinSet(false);
            setBiometricEnabled(false);
            await refreshLockState();
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            Alert.alert("App Lock Disabled", "Your app lock has been removed.");
            resetPinFlow();
          } else if (pinAction === "change") {
            setPin("");
            setSetupStep("enter_new");
          }
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          triggerShake();
          setPinError("Incorrect PIN");
          setPin("");
          setTimeout(() => setPinError(""), 2000);
        }
      } else if (setupStep === "enter_new") {
        setFirstPin(newPin);
        setPin("");
        setSetupStep("confirm_new");
      } else if (setupStep === "confirm_new") {
        if (newPin === firstPin) {
          await savePin(newPin);
          await setAppLockEnabled(true);
          setHasPinSet(true);
          await refreshLockState();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("PIN Set", "Your app lock PIN has been saved.");
          resetPinFlow();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          triggerShake();
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
      pin,
      setupStep,
      pinAction,
      firstPin,
      triggerShake,
      resetPinFlow,
      refreshLockState,
    ],
  );

  const handlePinBackspace = useCallback(() => {
    if (pin.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPin((prev) => prev.slice(0, -1));
    }
  }, [pin]);

  const handleToggleBiometric = useCallback(
    async (value: boolean) => {
      await setBiometricPreference(value);
      setBiometricEnabled(value);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [],
  );

  const handleSetTimeout = useCallback(
    async (seconds: number) => {
      await setAutoLockTimeout(seconds);
      setTimeout_(seconds);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [],
  );

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
        return "Enter a new 4-digit PIN";
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
          >
            <ThemedText style={{ color: colors.link }}>Cancel</ThemedText>
          </Pressable>
        </View>

        <View style={styles.pinFlowContent}>
          <Text
            style={[
              Typography.h2,
              { color: colors.text, textAlign: "center" },
            ]}
          >
            {getPinPrompt()}
          </Text>

          <Animated.View
            style={[
              styles.dotsRow,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i < pin.length ? colors.link : "transparent",
                    borderColor:
                      i < pin.length ? colors.link : colors.border,
                  },
                ]}
              />
            ))}
          </Animated.View>

          <View style={styles.errorContainer}>
            {pinError ? (
              <Text
                style={[
                  Typography.small,
                  { color: colors.error, textAlign: "center" },
                ]}
              >
                {pinError}
              </Text>
            ) : null}
          </View>

          <View style={styles.keypad}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <Pressable
                key={d}
                onPress={() => handlePinDigit(d)}
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor: pressed
                      ? colors.backgroundTertiary
                      : "transparent",
                  },
                ]}
              >
                <Text style={[styles.keyText, { color: colors.text }]}>
                  {d}
                </Text>
              </Pressable>
            ))}
            <View style={styles.key} />
            <Pressable
              onPress={() => handlePinDigit("0")}
              style={({ pressed }) => [
                styles.key,
                {
                  backgroundColor: pressed
                    ? colors.backgroundTertiary
                    : "transparent",
                },
              ]}
            >
              <Text style={[styles.keyText, { color: colors.text }]}>0</Text>
            </Pressable>
            <Pressable
              onPress={handlePinBackspace}
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
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollContainer, { backgroundColor: colors.backgroundRoot }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing["3xl"] },
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
                  { backgroundColor: colors.link + "15" },
                ]}
              >
                <Feather name="lock" size={20} color={colors.link} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.rowLabel}>Set Up PIN</ThemedText>
                <ThemedText
                  style={[styles.rowSubtitle, { color: colors.textSecondary }]}
                >
                  Create a 4-digit PIN to lock the app
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
                  { backgroundColor: colors.link + "15" },
                ]}
              >
                <Feather name="lock" size={20} color={colors.link} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.rowLabel}>Change PIN</ThemedText>
                <ThemedText
                  style={[styles.rowSubtitle, { color: colors.textSecondary }]}
                >
                  Update your 4-digit PIN
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
      {hasPinSet && biometricAvailable && (
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
                  { backgroundColor: colors.link + "15" },
                ]}
              >
                <Feather
                  name={biometricLabel === "Face ID" ? "smile" : "smartphone"}
                  size={20}
                  color={colors.link}
                />
              </View>
              <View style={styles.rowContent}>
                <ThemedText style={styles.rowLabel}>{biometricLabel}</ThemedText>
                <ThemedText
                  style={[styles.rowSubtitle, { color: colors.textSecondary }]}
                >
                  Use {biometricLabel} to unlock the app
                </ThemedText>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{
                  false: colors.backgroundTertiary,
                  true: colors.link,
                }}
                thumbColor="#FFFFFF"
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
                    style={[
                      styles.divider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
                <Pressable
                  onPress={() => handleSetTimeout(option.value)}
                  style={({ pressed }) => [
                    styles.settingsRow,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <ThemedText style={styles.rowLabel}>
                    {option.label}
                  </ThemedText>
                  {timeout === option.value && (
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
                  { backgroundColor: colors.error + "15" },
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
    height: 24,
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
