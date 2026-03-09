import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface HorizontalBarChartProps {
  data: { label: string; value: number; color?: string }[];
  rowHeight?: number;
  showValues?: boolean;
  maxBars?: number;
}

export const HorizontalBarChart = React.memo(function HorizontalBarChart({
  data,
  rowHeight = 32,
  showValues = true,
  maxBars = 8,
}: HorizontalBarChartProps) {
  const { theme } = useTheme();

  const visibleData = data.slice(0, maxBars);
  const maxValue = Math.max(...visibleData.map((d) => d.value), 1);
  const remaining = data.length - maxBars;

  return (
    <View style={styles.container}>
      {visibleData.map((item) => {
        const widthPct = (item.value / maxValue) * 100;
        const barColor = item.color ?? theme.accent;

        return (
          <View key={item.label} style={[styles.row, { height: rowHeight }]}>
            <ThemedText
              style={[styles.label, { color: theme.textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.label}
            </ThemedText>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${Math.max(widthPct, 2)}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
            {showValues && (
              <ThemedText style={[styles.value, { color: theme.textSecondary }]}>
                {item.value}
              </ThemedText>
            )}
          </View>
        );
      })}
      {remaining > 0 && (
        <ThemedText style={[styles.overflow, { color: theme.textTertiary }]}>
          +{remaining} other{remaining > 1 ? "s" : ""}
        </ThemedText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  label: {
    width: 120,
    fontSize: 13,
  },
  barContainer: {
    flex: 1,
    height: 14,
    justifyContent: "center",
  },
  bar: {
    height: 14,
    borderRadius: BorderRadius.xs,
  },
  value: {
    width: 36,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  overflow: {
    fontSize: 12,
    marginTop: Spacing.xs,
    paddingLeft: 120 + Spacing.sm,
  },
});
