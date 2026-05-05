import React, { useEffect, useRef } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
  highlightLast?: boolean;
  animateOnMount?: boolean;
  /**
   * Accessibility label describing what the chart represents (e.g.
   * "Cases per month, last 12 months"). The label is composed with the
   * underlying data into a screen-reader-friendly summary at render
   * time, so callers should focus on the chart's *intent* rather than
   * the data.
   */
  accessibilityLabelPrefix?: string;
}

function AnimatedBar({
  x,
  barWidth,
  plotHeight,
  value,
  maxValue,
  color,
  animate,
  paddingTop,
}: {
  x: number;
  barWidth: number;
  plotHeight: number;
  value: number;
  maxValue: number;
  color: string;
  animate: boolean;
  paddingTop: number;
}) {
  const progress = useSharedValue(animate ? 0 : 1);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (animate && !hasAnimated.current) {
      hasAnimated.current = true;
      progress.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [animate, progress]);

  const targetHeight = maxValue > 0 ? (value / maxValue) * plotHeight : 0;

  const animatedProps = useAnimatedProps(() => {
    const h = targetHeight * progress.value;
    return {
      y: paddingTop + plotHeight - h,
      height: h,
    };
  });

  if (value === 0) return null;

  return (
    <AnimatedRect
      x={x}
      width={barWidth}
      rx={BorderRadius.xs}
      ry={BorderRadius.xs}
      fill={color}
      animatedProps={animatedProps}
    />
  );
}

export const BarChart = React.memo(function BarChart({
  data,
  height = 180,
  barColor,
  highlightLast = false,
  animateOnMount = true,
  accessibilityLabelPrefix = "Bar chart",
}: BarChartProps) {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const chartWidth = screenWidth - Spacing.lg * 2;
  const paddingTop = 20;
  const paddingBottom = 36;
  const plotHeight = height - paddingTop - paddingBottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const gap = 4;
  const barWidth = Math.max(
    (chartWidth - gap * (data.length + 1)) / data.length,
    4,
  );

  const defaultColor = barColor ?? theme.accent;

  // For >6 bars, show short label only (first 3 chars e.g. "Jan")
  // For <=6 bars, show full label
  const useShortLabels = data.length > 6;

  // Compose a screen-reader summary from the data so VoiceOver users get
  // a useful description instead of "image" or silence on a pure-SVG
  // chart. Format: "<prefix>: Jan 4, Feb 7, Mar 12, …"
  const accessibilityLabel = `${accessibilityLabelPrefix}: ${data
    .map((d) => `${d.label} ${d.value}`)
    .join(", ")}`;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={chartWidth} height={height}>
        {/* Baseline */}
        <Line
          x1={0}
          y1={paddingTop + plotHeight}
          x2={chartWidth}
          y2={paddingTop + plotHeight}
          stroke={theme.border}
          strokeWidth={1}
        />

        {data.map((item, i) => {
          const x = gap + i * (barWidth + gap);
          const isLast = highlightLast && i === data.length - 1;
          const color = isLast ? defaultColor : defaultColor + "80";
          const displayLabel = useShortLabels
            ? item.label.slice(0, 3)
            : item.label;

          return (
            <React.Fragment key={item.label}>
              <AnimatedBar
                x={x}
                barWidth={barWidth}
                plotHeight={plotHeight}
                value={item.value}
                maxValue={maxValue}
                color={color}
                animate={animateOnMount}
                paddingTop={paddingTop}
              />
              {/* Value label on top */}
              {item.value > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={
                    paddingTop +
                    plotHeight -
                    (maxValue > 0 ? (item.value / maxValue) * plotHeight : 0) -
                    4
                  }
                  fontSize={11}
                  fill={theme.textSecondary}
                  textAnchor="middle"
                >
                  {item.value}
                </SvgText>
              )}
              {/* X-axis label */}
              <SvgText
                x={x + barWidth / 2}
                y={height - 4}
                fontSize={10}
                fill={theme.textTertiary}
                textAnchor="middle"
              >
                {displayLabel}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
});
