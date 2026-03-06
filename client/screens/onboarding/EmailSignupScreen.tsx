import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "@/contexts/AuthContext";
import { palette, Colors } from "@/constants/theme";
import { copy } from "@/constants/onboardingCopy";

const dark = Colors.dark;
const MIN_PASSWORD_LENGTH = 8;
const easeOut = Easing.out(Easing.ease);

/**
 * Email/password signup screen — pushed from OnboardingAuthScreen.
 * Password strength shown as a progress bar. Button disabled until valid.
 */
export function EmailSignupScreen() {
  const insets = useSafeAreaInsets();
  const { signup, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const progressWidth = useSharedValue(0);

  // Validate fields
  const emailValid = email.includes("@") && email.includes(".");
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = emailValid && passwordValid && !isLoading;

  // Update progress bar when password changes
  React.useEffect(() => {
    const progress = Math.min(password.length / MIN_PASSWORD_LENGTH, 1);
    progressWidth.value = withTiming(progress, {
      duration: 200,
      easing: easeOut,
    });
  }, [password]);

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
      if (showSignIn) {
        await login(email.trim().toLowerCase(), password);
      } else {
        await signup(email.trim().toLowerCase(), password);
      }
      // Success — AuthContext sets isAuthenticated = true,
      // navigator automatically advances to next phase
    } catch (e: any) {
      const msg = e.message || "";

      // Handle "already registered" specifically
      if (
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("exists") ||
        msg.toLowerCase().includes("registered")
      ) {
        setError(copy.emailSignup.alreadyRegistered);
        setShowSignIn(true);
      } else if (
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("connect") ||
        msg.toLowerCase().includes("fetch")
      ) {
        setError(copy.emailSignup.networkError);
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInInstead = async () => {
    setError(null);
    setShowSignIn(true);
    // If fields are valid, try login immediately
    if (canSubmit) {
      setIsLoading(true);
      try {
        await login(email.trim().toLowerCase(), password);
      } catch (e: any) {
        setError(e.message || "Sign in failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
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
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Error / already-registered banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            {showSignIn && !error.includes("Sign in") && (
              <Pressable onPress={handleSignInInstead}>
                <Text style={styles.signInLink}>
                  {c.signInInstead}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {/* Email field */}
          <View
            style={[
              styles.inputContainer,
              emailFocused && styles.inputFocused,
            ]}
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

          {/* Password field */}
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
              textContentType={showSignIn ? "password" : "newPassword"}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {/* Password strength progress bar */}
          {!showSignIn && (
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, progressStyle, progressColor]}
              />
            </View>
          )}
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Submit button */}
        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {isLoading ? (
            <ActivityIndicator color={palette.charcoal[950]} />
          ) : (
            <Text style={styles.submitText}>
              {showSignIn ? "Sign In" : c.cta}
            </Text>
          )}
        </Pressable>
      </View>
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
  errorBanner: {
    backgroundColor: palette.charcoal[900],
    borderWidth: 1,
    borderColor: palette.amber[600],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: dark.text,
    textAlign: "center",
  },
  signInLink: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.amber[600],
    textDecorationLine: "underline",
  },
  form: {
    gap: 12,
    marginTop: 8,
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
});
