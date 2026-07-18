import React, { useState } from "react";
import {
  Alert,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import FeatherIcon from "@/components/FeatherIcon";
import { palette, Colors } from "@/constants/theme";
import { copy } from "@/constants/onboardingCopy";
import { colors as onboardingColors } from "@/theme/tokens";

const dark = Colors.dark;
const SIDE_PADDING = 24;

// ── Trust Point Row ─────────────────────────────────────────────────────────

interface TrustPoint {
  icon: string;
  title: string;
  detail: string;
}

function TrustPointRow({
  point,
  index,
  reduceMotion,
}: {
  point: TrustPoint;
  index: number;
  reduceMotion: boolean;
}) {
  return (
    <Animated.View
      entering={
        reduceMotion
          ? undefined
          : FadeInDown.delay(150 + index * 100).duration(400)
      }
      style={styles.trustRow}
      accessible
      accessibilityLabel={`${point.title}. ${point.detail}`}
      accessibilityRole="text"
    >
      <View
        style={styles.iconContainer}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <FeatherIcon
          name={point.icon}
          size={22}
          color={onboardingColors.text.secondary}
        />
      </View>
      <View style={styles.trustContent}>
        <Text style={styles.trustTitle}>{point.title}</Text>
        <Text style={styles.trustDetail}>{point.detail}</Text>
      </View>
    </Animated.View>
  );
}

// ── Privacy Screen ──────────────────────────────────────────────────────────

interface Props {
  onComplete: () => void | Promise<void>;
  onBack?: () => void;
}

export function PrivacyScreen({ onComplete, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const c = copy.privacy;

  const handleContinue = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onComplete();
    } catch (error: any) {
      Alert.alert(
        "Unable to save progress",
        error?.message || "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      testID="screen-onboardingPrivacy"
      style={[styles.root, { paddingBottom: insets.bottom + 20 }]}
    >
      <StepHeader currentStep={4} onBack={onBack} />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Headline */}
        <Animated.Text
          entering={reduceMotion ? undefined : FadeInUp.duration(400)}
          style={styles.headline}
        >
          {c.headline}
        </Animated.Text>

        {/* Trust points */}
        <View style={styles.trustList}>
          {c.trustPoints.map((point, index) => (
            <TrustPointRow
              key={point.icon}
              point={point}
              index={index}
              reduceMotion={reduceMotion}
            />
          ))}
        </View>

        {/* Final line — italic */}
        <Animated.Text
          entering={
            reduceMotion ? undefined : FadeInDown.delay(600).duration(400)
          }
          style={styles.finalLine}
        >
          {c.finalLine}
        </Animated.Text>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomArea}>
        <Pressable
          style={styles.ctaButton}
          onPress={handleContinue}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={c.cta}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          testID="onboarding.privacy.btn-continue"
        >
          <Text style={styles.ctaText}>
            {isSubmitting ? "Saving..." : c.cta}
          </Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 24,
  },
  headline: {
    fontSize: 28,
    fontWeight: "600",
    color: dark.text,
  },
  trustList: {
    marginTop: 32,
    gap: 24,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: onboardingColors.icon.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  trustContent: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 17,
    fontWeight: "500",
    color: dark.text,
    lineHeight: 24,
  },
  trustDetail: {
    fontSize: 14,
    fontWeight: "400",
    color: onboardingColors.text.secondary,
    lineHeight: 20,
    marginTop: 2,
  },
  finalLine: {
    fontSize: 15,
    fontWeight: "400",
    fontStyle: "italic",
    color: onboardingColors.text.tertiary,
    lineHeight: 22,
    marginTop: 40,
    textAlign: "center",
    paddingHorizontal: 8,
  },
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
  ctaText: {
    fontSize: 17,
    fontWeight: "600",
    color: dark.buttonText,
  },
});
