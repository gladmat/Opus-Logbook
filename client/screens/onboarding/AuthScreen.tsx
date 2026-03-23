import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import { OpusMark } from "@/components/brand";
import { useAuth } from "@/contexts/AuthContext";
import { palette, Colors } from "@/constants/theme";
import { copy } from "@/constants/onboardingCopy";
import { getApiUrl } from "@/lib/query-client";

const dark = Colors.dark;
const HEADER_TOP_OFFSET = 72;

interface Props {
  onContinueWithEmail: () => void;
  onSignIn: () => void;
}

export function OnboardingAuthScreen({ onContinueWithEmail, onSignIn }: Props) {
  const insets = useSafeAreaInsets();
  const { appleLogin } = useAuth();
  const c = copy.auth;

  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
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

  const openTerms = () => {
    Linking.openURL(`${getApiUrl()}/terms`);
  };

  const openPrivacy = () => {
    Linking.openURL(`${getApiUrl()}/privacy`);
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 20 }]}>
      <View
        style={[
          styles.contentArea,
          { paddingTop: Math.max(insets.top, 44) + HEADER_TOP_OFFSET },
        ]}
      >
        <OpusMark size={32} />
        <Text style={styles.headline}>{c.headline}</Text>
        <Text style={styles.subhead}>{c.subhead}</Text>

        <View style={styles.buttonsArea}>
          {appleAuthAvailable && (
            <>
              <View style={styles.appleButtonContainer}>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  }
                  cornerRadius={14}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
                {isAppleLoading && (
                  <View style={styles.appleLoadingOverlay}>
                    <ActivityIndicator color="#000" size="small" />
                  </View>
                )}
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          <Pressable style={styles.primaryButton} onPress={onContinueWithEmail}>
            <Text style={styles.primaryButtonText}>{c.emailCta}</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={onSignIn}>
            <Text style={styles.secondaryButtonText}>{c.signInCta}</Text>
          </Pressable>
        </View>
      </View>

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
    alignItems: "center",
    gap: 16,
  },
  appleButtonContainer: {
    width: "100%",
    position: "relative",
  },
  appleButton: {
    width: "100%" as any,
    height: 56,
  },
  appleLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 14,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#38383A",
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#636366",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  primaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    backgroundColor: palette.amber[600],
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: dark.buttonText,
  },
  secondaryButton: {
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
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
