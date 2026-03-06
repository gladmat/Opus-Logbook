import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as AppleAuthentication from "expo-apple-authentication";
import { OpusMark } from "@/components/brand";
import { palette, Colors } from "@/constants/theme";
import { copy } from "@/constants/onboardingCopy";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const dark = Colors.dark;

type NavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Onboarding auth screen — Apple Sign In as hero action,
 * email/password as secondary. Clean, zero-field design.
 */
export function OnboardingAuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const [appleAvailable, setAppleAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check Apple Sign In availability
  React.useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const handleAppleSignIn = async () => {
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // CRITICAL: Apple returns name/email on FIRST sign-in only.
      // Send identityToken to server immediately.
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/auth/apple`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          fullName: credential.fullName,
          email: credential.email,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "Apple Sign In failed. Please try again.",
        );
      }

      // On success the server returns a JWT — AuthContext will pick it up
      // via refreshUser or the response handler
      // For now, store token and refresh
      const data = await res.json();
      const { setAuthToken } = await import("@/lib/auth");
      await setAuthToken(data.token);

      // Trigger auth context refresh
      // The navigator will automatically advance when isAuthenticated becomes true
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") {
        // User cancelled — do nothing
        return;
      }
      setError(e.message || "Apple Sign In failed. Please try again.");
    }
  };

  const handleEmailSignup = () => {
    navigation.navigate("EmailSignup");
  };

  const openTerms = () => {
    const baseUrl = getApiUrl();
    Linking.openURL(`${baseUrl}/terms`);
  };

  const openPrivacy = () => {
    const baseUrl = getApiUrl();
    Linking.openURL(`${baseUrl}/privacy`);
  };

  const c = copy.auth;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 20 }]}>
      {/* Error banner */}
      {error && (
        <View style={[styles.errorBanner, { top: insets.top + 12 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Content — vertically centred */}
      <View style={[styles.contentArea, { paddingTop: insets.top + 60 }]}>
        {/* OpusMark — 32pt, static */}
        <OpusMark size={32} animate={false} />

        {/* Headline */}
        <Text style={styles.headline}>{c.headline}</Text>

        {/* Subhead */}
        <Text style={styles.subhead}>{c.subhead}</Text>

        {/* Auth buttons */}
        <View style={styles.buttonsArea}>
          {/* Apple Sign In — native button on iOS, hidden on web/Android */}
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={14}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          {/* Platform placeholder when Apple Sign In not available */}
          {appleAvailable === false && Platform.OS !== "ios" && (
            <View style={styles.appleUnavailable}>
              <Text style={styles.appleUnavailableText}>
                Apple Sign In available on iOS only
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>{c.dividerLabel}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Continue with email — outlined button */}
          <Pressable style={styles.emailButton} onPress={handleEmailSignup}>
            <Text style={styles.emailButtonText}>{c.emailCta}</Text>
          </Pressable>
        </View>
      </View>

      {/* Legal text — bottom-pinned */}
      <Text style={styles.legalText}>
        {"By continuing you agree to our "}
        <Text style={styles.legalLink} onPress={openTerms}>
          {c.termsLabel}
        </Text>
        {" and "}
        <Text style={styles.legalLink} onPress={openPrivacy}>
          {c.privacyLabel}
        </Text>
        {"."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.charcoal[950],
    paddingHorizontal: 24,
  },
  errorBanner: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 10,
    backgroundColor: palette.charcoal[900],
    borderWidth: 1,
    borderColor: palette.amber[600],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 14,
    color: dark.text,
    textAlign: "center",
  },
  contentArea: {
    flex: 1,
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
  buttonsArea: {
    width: "100%",
    marginTop: 40,
    gap: 0,
  },
  appleButton: {
    height: 56,
    width: "100%",
  },
  appleUnavailable: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },
  appleUnavailableText: {
    fontSize: 14,
    color: "#636366",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#38383A",
  },
  dividerLabel: {
    fontSize: 13,
    color: "#636366",
    marginHorizontal: 16,
  },
  emailButton: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#38383A",
    alignItems: "center",
    justifyContent: "center",
  },
  emailButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: palette.amber[600],
  },
  legalText: {
    fontSize: 13,
    color: "#636366",
    textAlign: "center",
    lineHeight: 18,
  },
  legalLink: {
    textDecorationLine: "underline",
    color: "#636366",
  },
});
