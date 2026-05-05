import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { OpusMark } from "@/components/brand";
import { useAuth } from "@/contexts/AuthContext";
import { palette, Colors } from "@/constants/theme";
import { copy } from "@/constants/onboardingCopy";
import { getApiUrl } from "@/lib/query-client";

const dark = Colors.dark;
const MIN_PASSWORD_LENGTH = 8;
const easeOut = Easing.out(Easing.ease);
const HEADER_TOP_OFFSET = 32;

export interface EmailSignupScreenProps {
  initialMode?: "signup" | "signin";
}

export function EmailSignupScreen({
  initialMode = "signup",
}: EmailSignupScreenProps) {
  const insets = useSafeAreaInsets();
  const { signup, login } = useAuth();

  const [mode, setMode] = useState<"signup" | "signin">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isRequestingReset, setIsRequestingReset] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const progressWidth = useSharedValue(0);

  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const isSignup = mode === "signup";
  const emailValid = email.includes("@") && email.includes(".");
  const passwordValid = isSignup
    ? password.length >= MIN_PASSWORD_LENGTH
    : password.length > 0;
  const canSubmit = emailValid && passwordValid && !isLoading;

  React.useEffect(() => {
    const progress = Math.min(password.length / MIN_PASSWORD_LENGTH, 1);
    progressWidth.value = withTiming(progress, {
      duration: 200,
      easing: easeOut,
    });
  }, [password, progressWidth]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const progressColor = useAnimatedStyle(() => ({
    backgroundColor:
      progressWidth.value >= 1 ? "rgb(46, 160, 67)" : "rgb(229, 160, 13)",
  }));

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setError(null);
    setIsLoading(true);

    try {
      if (isSignup) {
        await signup(email.trim().toLowerCase(), password);
      } else {
        await login(email.trim().toLowerCase(), password);
      }
    } catch (e: any) {
      const message = String(e?.message || "");
      const normalizedMessage = message.toLowerCase();

      if (
        isSignup &&
        (normalizedMessage.includes("already") ||
          normalizedMessage.includes("exists") ||
          normalizedMessage.includes("registered"))
      ) {
        setMode("signin");
        setError(copy.emailSignup.alreadyRegistered);
      } else if (
        normalizedMessage.includes("network") ||
        normalizedMessage.includes("connect") ||
        normalizedMessage.includes("fetch")
      ) {
        setError(copy.emailSignup.networkError);
      } else {
        setError(message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert("Required", "Please enter your email address");
      return;
    }

    setIsRequestingReset(true);
    try {
      const response = await fetch(
        `${getApiUrl()}/api/auth/request-password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: resetEmail.trim() }),
        },
      );

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          "Server returned an unexpected response. Please try again.",
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to request password reset");
      }

      Alert.alert(
        "Check Your Email",
        "If an account exists with that email, you will receive password reset instructions shortly.",
        [{ text: "OK", onPress: () => setShowForgotPassword(false) }],
      );
      setResetEmail("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to request password reset");
    } finally {
      setIsRequestingReset(false);
    }
  };

  const toggleMode = () => {
    setError(null);
    setMode((prevMode) => (prevMode === "signup" ? "signin" : "signup"));
  };

  const c = copy.emailSignup;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 44) + HEADER_TOP_OFFSET,
            paddingBottom: insets.bottom + 32,
          },
        ]}
      >
        <View style={styles.header}>
          <OpusMark size={32} />
          <Text style={styles.headline}>
            {isSignup ? c.signupHeadline : c.signinHeadline}
          </Text>
          <Text style={styles.subhead}>{c.subhead}</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View
            style={[styles.inputContainer, emailFocused && styles.inputFocused]}
          >
            <TextInput
              style={styles.input}
              placeholder={c.emailPlaceholder}
              placeholderTextColor="#636366"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              passwordFocused && styles.inputFocused,
            ]}
          >
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder={c.passwordPlaceholder}
              placeholderTextColor="#636366"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry
              textContentType={isSignup ? "newPassword" : "password"}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {isSignup ? (
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, progressStyle, progressColor]}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setResetEmail(email);
                setShowForgotPassword(true);
              }}
              style={styles.forgotPasswordLink}
              testID="onboarding.emailSignup.btn-forgotPassword"
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.spacer} />

        <View style={styles.bottomArea}>
          <Pressable
            style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color={palette.charcoal[950]} />
            ) : (
              <Text style={styles.submitText}>
                {isSignup ? c.cta : "Sign In"}
              </Text>
            )}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isSignup ? c.haveAccountAlready : c.noAccountYet}
            </Text>
            <Pressable onPress={toggleMode}>
              <Text style={styles.switchLink}>
                {isSignup ? c.signInNow : c.createAccountInstead}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
      <Modal
        visible={showForgotPassword}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowForgotPassword(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Pressable
                onPress={() => setShowForgotPassword(false)}
                hitSlop={12}
              >
                <Feather name="x" size={24} color="#AEAEB2" />
              </Pressable>
            </View>
            <Text style={styles.modalDescription}>
              Enter your email address and we&apos;ll send you instructions to
              reset your password.
            </Text>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={styles.input}
                value={resetEmail}
                onChangeText={setResetEmail}
                placeholder="you@hospital.org"
                placeholderTextColor="#636366"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="onboarding.emailSignup.input-resetEmail"
              />
            </View>

            <Pressable
              style={[
                styles.submitButton,
                isRequestingReset && styles.submitDisabled,
              ]}
              onPress={handleForgotPassword}
              disabled={isRequestingReset}
            >
              {isRequestingReset ? (
                <ActivityIndicator color={palette.charcoal[950]} />
              ) : (
                <Text style={styles.submitText}>Send Reset Link</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.charcoal[950],
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
  },
  headline: {
    fontSize: 28,
    fontWeight: "600",
    color: dark.text,
    textAlign: "center",
    marginTop: 24,
  },
  subhead: {
    fontSize: 15,
    fontWeight: "400",
    color: "#AEAEB2",
    textAlign: "center",
    marginTop: 8,
  },
  errorBanner: {
    backgroundColor: palette.charcoal[900],
    borderWidth: 1,
    borderColor: palette.amber[600],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 24,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: dark.text,
    textAlign: "center",
  },
  form: {
    gap: 12,
    marginTop: 32,
  },
  inputContainer: {
    height: 56,
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38383A",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: palette.amber[600],
  },
  input: {
    fontSize: 17,
    color: dark.text,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "#38383A",
    borderRadius: 1.5,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: {
    height: 3,
    borderRadius: 1.5,
  },
  spacer: {
    flex: 1,
  },
  bottomArea: {
    gap: 16,
  },
  submitButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: palette.amber[600],
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 17,
    fontWeight: "600",
    color: dark.buttonText,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  switchText: {
    fontSize: 14,
    color: "#AEAEB2",
  },
  switchLink: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.amber[600],
  },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: palette.amber[600],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: palette.charcoal[900],
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: dark.text,
  },
  modalDescription: {
    fontSize: 15,
    color: "#AEAEB2",
    lineHeight: 22,
  },
  modalInputContainer: {
    height: 56,
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38383A",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
});
