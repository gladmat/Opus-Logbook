import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

type MetricType = "thisMonth" | "thisWeek" | "completion";

interface PulseMetricCardProps {
  type: MetricType;
  label: string;
  value: number;
  delta?: number;
  dailyDots?: boolean[];
  todayIndex?: number;
  percentage?: number;
}

function PulseMetricCardInner({
  type,
  label,
  value,
  delta,
  dailyDots,
  todayIndex,
  percentage,
}: PulseMetricCardProps) {
  const { theme } = useTheme();
  const deltaText =
    delta == null
      ? null
      : delta > 0
        ? `+${delta}`
        : delta < 0
          ? `${delta}`
          : "0";
  const deltaColor =
    delta == null
      ? theme.textTertiary
      : delta > 0
        ? theme.success
        : delta < 0
          ? theme.destructiveMuted
          : theme.textTertiary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.border,
        },
      ]}
    >
      <ThemedText style={[styles.label, { color: theme.textTertiary }]}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.value, { color: theme.text }]}>
        {type === "completion" ? `${value}%` : value}
      </ThemedText>

      {type === "thisMonth" ? (
        <ThemedText style={[styles.deltaText, { color: deltaColor }]}>
          {deltaText}
        </ThemedText>
      ) : null}

      {type === "thisWeek" && dailyDots ? (
        <View style={styles.dotsRow}>
          {dailyDots.map((filled, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: filled ? theme.accent : theme.border,
                },
                i === todayIndex && {
                  borderWidth: 1,
                  borderColor: theme.textSecondary,
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      {type === "completion" && percentage != null ? (
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.accent },
              { width: `${percentage}%` as unknown as number },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

export const PulseMetricCard = React.memo(PulseMetricCardInner);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  deltaText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    marginTop: 4,
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
  },
});
