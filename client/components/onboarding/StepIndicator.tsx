import React from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import { palette } from "@/constants/theme";

const TOTAL_STEPS = 4;
const SIDE_PADDING = 48; // 24pt each side
const GAP = 6;
const TOTAL_GAPS = (TOTAL_STEPS - 1) * GAP;

interface StepIndicatorProps {
  /** Current step (1-based). Segments up to this value are active. */
  currentStep: number;
}

/**
 * Reusable 4-segment step indicator for personalisation screens 6–9.
 * Active segments are amber; inactive are charcoal.
 */
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { width: screenWidth } = useWindowDimensions();
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
        <View
          key={i}
          style={[
            styles.segment,
            { width: segmentWidth },
            i < currentStep ? styles.active : styles.inactive,
          ]}
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
  active: {
    backgroundColor: palette.amber[600],
  },
  inactive: {
    backgroundColor: "#2C2C2E",
  },
});
