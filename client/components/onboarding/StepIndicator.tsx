import React, { useEffect } from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { palette } from "@/constants/theme";

const TOTAL_STEPS = 5;
const SIDE_PADDING = 48; // 24pt each side
const GAP = 6;
const TOTAL_GAPS = (TOTAL_STEPS - 1) * GAP;

interface StepIndicatorProps {
  /** Current step (1-based). Segments up to this value are active. */
  currentStep: number;
}

function Segment({
  width,
  active,
  isNewest,
  reduceMotion,
}: {
  width: number;
  active: boolean;
  /** The segment that just became active — the only one that animates. */
  isNewest: boolean;
  reduceMotion: boolean;
}) {
  const animate = active && isNewest && !reduceMotion;
  const progress = useSharedValue(animate ? 0 : active ? 1 : 0);

  useEffect(() => {
    if (animate) {
      progress.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [animate, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [palette.charcoal[800], palette.amber[600]],
    ),
  }));

  return <Animated.View style={[styles.segment, { width }, animatedStyle]} />;
}

/**
 * Reusable 5-segment step indicator for onboarding screens.
 * Active segments are amber; inactive are charcoal. Each screen mounts a
 * fresh indicator, so the newly-active segment plays a short fill-in on
 * mount (skipped under Reduce Motion).
 */
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const segmentWidth = (screenWidth - SIDE_PADDING - TOTAL_GAPS) / TOTAL_STEPS;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`Step ${currentStep} of ${TOTAL_STEPS}`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 1,
        max: TOTAL_STEPS,
        now: currentStep,
      }}
    >
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <Segment
          key={i}
          width={segmentWidth}
          active={i < currentStep}
          isNewest={i === currentStep - 1}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: GAP,
  },
  segment: {
    height: 3,
    borderRadius: 2,
  },
});
