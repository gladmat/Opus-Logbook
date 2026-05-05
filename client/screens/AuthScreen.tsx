import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import { Feather } from "@/components/FeatherIcon";
import { OpusLogo } from "@/components/brand";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";

type Mode = "login" | "signup";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { theme: colors } = useTheme();
  const { login, signup, appleLogin } = useAuth();
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
  }, []);

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }

      await appleLogin(
        credential.identityToken,
        credential.fullName
          ? {
              givenName: credential.fullName.givenName ?? undefined,
              familyName: credential.fullName.familyName ?? undefined,
            }
          : null,
        credential.email,
      );
    } catch (error: any) {
      // Don't show error if user cancelled
      if (error.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert(
          "Apple Sign In Failed",
          error.message || "Something went wrong",
        );
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isRequestingReset, setIsRequestingReset] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Required", "Please enter your email");
      return;
    }
    if (!password) {
      Alert.alert("Required", "Please enter your password");
      return;
    }
    if (mode === "signup") {
      if (password.length < 8) {
        Alert.alert("Weak Password", "Password must be at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert("Mismatch", "Passwords do not match");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await signup(email.trim(), password);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setPassword("");
    setConfirmPassword("");
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: resetEmail.trim() }),
        },
      );

      const responseText = await response.text();
      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(
          "Password reset response was not JSON:",
          responseText.substring(0, 200),
        );
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
        [{ text: "OK", onPress: () => setShowForgotPasswordModal(false) }],
      );
      setResetEmail("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to request password reset");
    } finally {
      setIsRequestingReset(false);
    }
  };

  return (
    <KeyboardAvoidingView
      testID="screen-auth"
      style={[styles.container, { backgroundColor: colors.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["4xl"],
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <View style={styles.header}>
          <OpusLogo size="lg" showSubtitle color="#E5A00D" />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {mode === "login"
              ? "Sign in to your account"
              : "Create your account"}
          </Text>
        </View>

        {appleAuthAvailable && (
          <View style={styles.appleSection}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              }
              cornerRadius={BorderRadius.sm}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
            {isAppleLoading && (
              <ActivityIndicator
                style={styles.appleSpinner}
                color={colors.textSecondary}
                size="small"
              />
            )}
            <View style={styles.divider}>
              <View
                style={[styles.dividerLine, { backgroundColor: colors.border }]}
              />
              <Text
                style={[styles.dividerText, { color: colors.textTertiary }]}
              >
                or
              </Text>
              <View
                style={[styles.dividerLine, { backgroundColor: colors.border }]}
              />
            </View>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Email
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@hospital.org"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="onboarding.auth.input-email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Password
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder={
                  mode === "signup" ? "Min 8 characters" : "Your password"
                }
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                testID="onboarding.auth.input-password"
              />
              <Pressable
                style={[
                  styles.showPasswordButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => setShowPassword(!showPassword)}
                testID="onboarding.auth.btn-showPassword"
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          {mode === "signup" && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Confirm Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                testID="onboarding.auth.input-confirmPassword"
              />
            </View>
          )}

          {mode === "login" && (
            <Pressable
              onPress={() => {
                setResetEmail(email);
                setShowForgotPasswordModal(true);
              }}
              style={styles.forgotPasswordLink}
              testID="onboarding.auth.btn-forgotPassword"
            >
              <Text style={[styles.forgotPasswordText, { color: colors.link }]}>
                Forgot password?
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: colors.link, opacity: isLoading ? 0.7 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
            testID="onboarding.auth.btn-submit"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
          </Text>
          <Pressable
            onPress={toggleMode}
            testID="onboarding.auth.btn-toggleMode"
          >
            <Text style={[styles.footerLink, { color: colors.link }]}>
              {mode === "login" ? "Sign Up" : "Sign In"}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={showForgotPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotPasswordModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowForgotPasswordModal(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundDefault },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Reset Password
              </Text>
              <Pressable
                onPress={() => setShowForgotPasswordModal(false)}
                testID="onboarding.auth.btn-closeResetModal"
              >
                <Feather name="x" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text
              style={[styles.modalDescription, { color: colors.textSecondary }]}
            >
              {
                "Enter your email address and we'll send you instructions to reset your password."
              }
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={resetEmail}
                onChangeText={setResetEmail}
                placeholder="you@hospital.org"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="onboarding.auth.input-resetEmail"
              />
            </View>

            <Pressable
              style={[
                styles.submitButton,
                {
                  backgroundColor: colors.link,
                  opacity: isRequestingReset ? 0.7 : 1,
                },
              ]}
              onPress={handleForgotPassword}
              disabled={isRequestingReset}
              testID="onboarding.auth.btn-requestReset"
            >
              {isRequestingReset ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Send Reset Instructions
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  appleSection: {
    marginBottom: Spacing.lg,
  },
  appleButton: {
    width: "100%" as any,
    height: Spacing.buttonHeight,
  },
  appleSpinner: {
    marginTop: Spacing.sm,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...Typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing["3xl"],
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  passwordContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  passwordInput: {
    flex: 1,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  showPasswordButton: {
    width: Spacing.inputHeight,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  submitButtonText: {
    ...Typography.bodySemibold,
    color: "#FFF",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing["3xl"],
  },
  footerText: {
    ...Typography.body,
  },
  footerLink: {
    ...Typography.bodySemibold,
  },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginTop: -Spacing.sm,
  },
  forgotPasswordText: {
    ...Typography.caption,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.modal,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.h1,
  },
  modalDescription: {
    ...Typography.body,
    marginBottom: Spacing.lg,
  },
});
