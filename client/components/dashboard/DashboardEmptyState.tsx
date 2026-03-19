import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { OpusMark } from "@/components/brand/OpusMark";
import { useTheme } from "@/hooks/useTheme";

function DashboardEmptyStateInner() {
  const { theme } = useTheme();

  return (
    <View testID="dashboard.emptyState" style={styles.container}>
      <View style={{ opacity: 0.5 }}>
        <OpusMark size={64} color={theme.textTertiary} />
      </View>
      <ThemedText style={[styles.title, { color: theme.textSecondary }]}>
        Log your first case
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: theme.textTertiary }]}>
        Tap + to get started
      </ThemedText>
    </View>
  );
}

export const DashboardEmptyState = React.memo(DashboardEmptyStateInner);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
  },
});
