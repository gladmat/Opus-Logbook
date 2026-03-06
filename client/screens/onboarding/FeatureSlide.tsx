import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { palette, Colors } from "@/constants/theme";

const dark = Colors.dark;

interface FeatureSlideProps {
  headline: string;
  body: string;
  ctaLabel: string;
  visual: React.ReactNode;
  onCta: () => void;
  onSkip: () => void;
  width: number;
  height: number;
  topInset: number;
  bottomInset: number;
  slideIndex?: number;
  totalSlides?: number;
}

/**
 * Reusable layout template for a single onboarding feature slide.
 * Positions: Skip link (top-right), visual (upper), headline + body (middle),
 * CTA button (bottom-pinned).
 */
export function FeatureSlide({
  headline,
  body,
  ctaLabel,
  visual,
  onCta,
  onSkip,
  width,
  height,
  topInset,
  bottomInset,
  slideIndex = 0,
  totalSlides = 3,
}: FeatureSlideProps) {
  // Progress bar (2pt) sits at topInset; Skip is 16pt below it
  const skipTop = topInset + 2 + 16;
  // Visual starts 80pt below safe area top
  const contentTop = topInset + 80;
  // Visual takes ~35% of screen, leaving room for text + CTA
  const visualHeight = height * 0.35;

  return (
    <View style={[styles.slide, { width, height }]}>
      {/* Skip link — top-right */}
      <Pressable
        style={[styles.skipBtn, { top: skipTop }]}
        onPress={onSkip}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Skip feature tour"
        accessibilityRole="link"
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Content column */}
      <View
        style={[
          styles.content,
          { paddingTop: contentTop, paddingBottom: bottomInset + 32 },
        ]}
      >
        {/* Visual area */}
        <View
          style={[styles.visualContainer, { height: visualHeight }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {visual}
        </View>

        {/* Headline + body as single accessible element */}
        <Text
          style={styles.headline}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`Feature ${slideIndex + 1} of ${totalSlides}: ${headline}`}
        >
          {headline}
        </Text>

        {/* Body */}
        <Text style={styles.body}>{body}</Text>

        {/* Spacer pushes CTA to bottom */}
        <View style={styles.spacer} />

        {/* CTA button */}
        <Pressable style={styles.ctaBtn} onPress={onCta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    backgroundColor: palette.charcoal[950],
  },
  skipBtn: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  skipText: {
    fontSize: 15,
    color: dark.textTertiary,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  visualContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    fontSize: 28,
    fontWeight: "600",
    color: dark.text,
    textAlign: "center",
    marginTop: 32,
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    color: "#AEAEB2",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
    maxWidth: 300,
  },
  spacer: {
    flex: 1,
  },
  ctaBtn: {
    backgroundColor: palette.amber[600],
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  ctaText: {
    color: dark.buttonText,
    fontSize: 17,
    fontWeight: "600",
  },
});
