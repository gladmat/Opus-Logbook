import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  AccessibilityInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { OpusMark } from "@/components/brand";
import { palette, Colors } from "@/constants/theme";
import { copy } from "@/constants/onboardingCopy";

interface Props {
  onComplete: () => void;
}

const dark = Colors.dark;
const easeOut = Easing.out(Easing.ease);

export function WelcomeScreen({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = React.useState(false);

  // Check Reduce Motion preference
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  // ── Animation shared values ──────────────────────────────────────────────────

  const glowOpacity = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const wordmarkY = useSharedValue(reduceMotion ? 0 : 8);
  const subtitleOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const subtitleY = useSharedValue(reduceMotion ? 0 : 4);
  const taglineOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const taglineY = useSharedValue(reduceMotion ? 0 : 6);
  const ctaOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const ctaY = useSharedValue(reduceMotion ? 0 : 12);
  const signInOpacity = useSharedValue(reduceMotion ? 1 : 0);

  React.useEffect(() => {
    // If Reduce Motion is enabled, show everything immediately
    if (reduceMotion) {
      glowOpacity.value = 0;
      wordmarkOpacity.value = 1;
      wordmarkY.value = 0;
      subtitleOpacity.value = 1;
      subtitleY.value = 0;
      taglineOpacity.value = 1;
      taglineY.value = 0;
      ctaOpacity.value = 1;
      ctaY.value = 0;
      signInOpacity.value = 1;
      return;
    }

    // 0.8s — Amber glow: single pulse 0→0.15→0
    glowOpacity.value = withDelay(
      800,
      withSequence(
        withTiming(0.15, { duration: 300, easing: easeOut }),
        withTiming(0, { duration: 300, easing: easeOut }),
      ),
    );

    // 1.1s — "opus" wordmark: fade + slide up
    wordmarkOpacity.value = withDelay(
      1100,
      withTiming(1, { duration: 500, easing: easeOut }),
    );
    wordmarkY.value = withDelay(
      1100,
      withTiming(0, { duration: 500, easing: easeOut }),
    );

    // 1.35s — "SURGICAL CASE LOGBOOK" subtitle: fade + slide up
    subtitleOpacity.value = withDelay(
      1350,
      withTiming(1, { duration: 300, easing: easeOut }),
    );
    subtitleY.value = withDelay(
      1350,
      withTiming(0, { duration: 300, easing: easeOut }),
    );

    // 1.5s — Tagline: fade + slide up
    taglineOpacity.value = withDelay(
      1500,
      withTiming(1, { duration: 400, easing: easeOut }),
    );
    taglineY.value = withDelay(
      1500,
      withTiming(0, { duration: 400, easing: easeOut }),
    );

    // 2.0s — CTA button: fade + spring up
    ctaOpacity.value = withDelay(2000, withTiming(1, { duration: 500 }));
    ctaY.value = withDelay(2000, withSpring(0, { damping: 15 }));

    // 2.2s — Sign in link: fade
    signInOpacity.value = withDelay(
      2200,
      withTiming(1, { duration: 300, easing: easeOut }),
    );
  }, [reduceMotion]);

  // ── Animated styles ──────────────────────────────────────────────────────────

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }));

  const signInStyle = useAnimatedStyle(() => ({
    opacity: signInOpacity.value,
  }));

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 32 }]}>
      {/* Amber radial glow — single pulse, fades out */}
      <Animated.View
        style={[styles.glow, glowStyle]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      {/* Logo area — optical centre */}
      <View
        style={styles.logoArea}
        accessible
        accessibilityLabel="Opus logo"
        accessibilityRole="image"
      >
        <OpusMark size={80} animate={!reduceMotion} />

        <Animated.View style={wordmarkStyle}>
          <Text style={styles.appName}>{copy.welcome.appName}</Text>
        </Animated.View>

        <Animated.View style={subtitleStyle}>
          <Text style={styles.subtitle}>{copy.welcome.subtitle}</Text>
        </Animated.View>

        <Animated.View style={taglineStyle}>
          <Text style={styles.tagline}>{copy.welcome.tagline}</Text>
        </Animated.View>
      </View>

      {/* CTAs — pinned to bottom */}
      <View style={styles.ctaArea}>
        <Animated.View style={ctaStyle}>
          <Pressable
            style={styles.primaryBtn}
            onPress={onComplete}
            accessibilityLabel="Get Started"
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>{copy.welcome.cta}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={signInStyle}>
          <Pressable
            style={styles.secondaryBtn}
            onPress={onComplete}
            accessibilityLabel="Already have an account? Sign in"
            accessibilityRole="link"
          >
            <Text style={styles.secondaryBtnText}>
              {copy.welcome.signIn}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.charcoal[950],
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "space-between",
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: palette.amber[600],
    top: "38%",
    alignSelf: "center",
  },
  logoArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "-5%", // Optical centre — slightly above mathematical centre
  },
  appName: {
    fontWeight: "700",
    fontSize: 36,
    color: palette.amber[600],
    letterSpacing: 4,
    lineHeight: 36 * 1.1,
    marginTop: 20,
    textAlign: "center",
  },
  subtitle: {
    fontWeight: "500",
    fontSize: 9,
    color: "#AEAEB2",
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 2,
  },
  tagline: {
    fontSize: 17,
    fontWeight: "400",
    color: dark.textSecondary,
    marginTop: 12,
    textAlign: "center",
  },
  ctaArea: {
    width: "100%",
    gap: 16,
  },
  primaryBtn: {
    backgroundColor: palette.amber[600],
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: dark.buttonText,
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
  secondaryBtnText: {
    color: dark.textTertiary,
    fontSize: 15,
  },
});
