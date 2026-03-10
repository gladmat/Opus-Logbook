import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface EmptyStatisticsProps {
  totalCases: number;
  threshold?: number;
}

export const EmptyStatistics = React.memo(function EmptyStatistics({
  totalCases,
  threshold = 20,
}: EmptyStatisticsProps) {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const progress = Math.min(totalCases / threshold, 1);

  return (
    <View style={styles.container}>
      <Feather name="bar-chart-2" size={48} color={theme.textTertiary} />
      <ThemedText style={[styles.title, { color: theme.text }]}>
        Your practice profile builds as you log cases.
      </ThemedText>
      <ThemedText style={[styles.progress, { color: theme.textSecondary }]}>
        {totalCases} of {threshold} cases logged
      </ThemedText>

      {/* Progress bar */}
      <View
        style={[styles.track, { backgroundColor: theme.backgroundSecondary }]}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: theme.accent,
              width: `${progress * 100}%`,
            },
          ]}
        />
      </View>

      <Pressable
        onPress={() => navigation.navigate("AddCase")}
        style={[styles.button, { backgroundColor: theme.accent }]}
        accessibilityRole="button"
        accessibilityLabel="Log a case"
      >
        <ThemedText style={[styles.buttonText, { color: theme.buttonText }]}>
          Log a Case
        </ThemedText>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginTop: Spacing.md,
  },
  progress: {
    fontSize: 14,
  },
  track: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
