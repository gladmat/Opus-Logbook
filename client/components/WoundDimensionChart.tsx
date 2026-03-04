import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, {
  Line,
  Circle,
  Text as SvgText,
  G,
  Polyline,
  Rect,
} from "react-native-svg";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import type { TimelineEvent } from "@/types/case";

interface WoundDimensionChartProps {
  events: TimelineEvent[];
}

interface DataPoint {
  date: Date;
  area: number;
  label: string;
}

function formatDate(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${day} ${month}`;
}

export function WoundDimensionChart({ events }: WoundDimensionChartProps) {
  const { theme, isDark } = useTheme();

  const dataPoints: DataPoint[] = events
    .filter(
      (e) =>
        e.eventType === "wound_assessment" &&
        e.woundAssessmentData &&
        typeof e.woundAssessmentData.areaCm2 === "number" &&
        e.woundAssessmentData.areaCm2 > 0,
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .map((e) => ({
      date: new Date(e.createdAt),
      area: e.woundAssessmentData!.areaCm2!,
      label: formatDate(new Date(e.createdAt)),
    }));

  if (dataPoints.length < 2) {
    return null;
  }

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - Spacing.lg * 2 - Spacing.xl * 2;
  const chartHeight = 160;
  const paddingLeft = 48;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 32;

  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const areas = dataPoints.map((d) => d.area);
  const minArea = 0;
  const maxArea = Math.max(...areas) * 1.15;

  const getX = (index: number) =>
    paddingLeft + (index / (dataPoints.length - 1)) * plotWidth;

  const getY = (area: number) =>
    paddingTop +
    plotHeight -
    ((area - minArea) / (maxArea - minArea)) * plotHeight;

  const yTicks = 4;
  const yTickValues: number[] = [];
  for (let i = 0; i <= yTicks; i++) {
    yTickValues.push(minArea + (i / yTicks) * (maxArea - minArea));
  }

  const lineColor = theme.info;
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const axisColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
  const textColor = theme.textSecondary;

  const polylinePoints = dataPoints
    .map((d, i) => `${getX(i)},${getY(d.area)}`)
    .join(" ");

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? theme.backgroundSecondary
            : theme.backgroundDefault,
        },
      ]}
    >
      <ThemedText type="h4" style={styles.title}>
        Wound Area Trend
      </ThemedText>
      <Svg width={chartWidth} height={chartHeight}>
        {yTickValues.map((val, i) => (
          <G key={`grid-${i}`}>
            <Line
              x1={paddingLeft}
              y1={getY(val)}
              x2={chartWidth - paddingRight}
              y2={getY(val)}
              stroke={gridColor}
              strokeWidth={1}
            />
            <SvgText
              x={paddingLeft - 6}
              y={getY(val) + 4}
              textAnchor="end"
              fill={textColor}
              fontSize={10}
            >
              {val.toFixed(1)}
            </SvgText>
          </G>
        ))}

        <Line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={paddingTop + plotHeight}
          stroke={axisColor}
          strokeWidth={1}
        />
        <Line
          x1={paddingLeft}
          y1={paddingTop + plotHeight}
          x2={chartWidth - paddingRight}
          y2={paddingTop + plotHeight}
          stroke={axisColor}
          strokeWidth={1}
        />

        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {dataPoints.map((d, i) => (
          <G key={`point-${i}`}>
            <Circle
              cx={getX(i)}
              cy={getY(d.area)}
              r={4}
              fill={lineColor}
              stroke={
                isDark ? theme.backgroundSecondary : theme.backgroundDefault
              }
              strokeWidth={2}
            />
            <SvgText
              x={getX(i)}
              y={paddingTop + plotHeight + 16}
              textAnchor="middle"
              fill={textColor}
              fontSize={9}
            >
              {d.label}
            </SvgText>
          </G>
        ))}

        <SvgText
          x={paddingLeft - 6}
          y={8}
          textAnchor="end"
          fill={textColor}
          fontSize={9}
        >
          cm²
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.md,
  },
});
