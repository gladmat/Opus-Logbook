import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { Case, SPECIALTY_LABELS, Specialty } from "@/types/case";
import { SkeletonCard } from "@/components/LoadingState";
import { DashboardCaseCard } from "@/components/dashboard/CaseCard";
import { InfoButton } from "@/components/dashboard/InfoButton";
import { HISTOLOGY_FILTER_ID } from "@/lib/dashboardSelectors";

interface RecentCasesListProps {
  cases: Case[];
  selectedSpecialty: string | null;
  totalCount: number;
  onCasePress: (c: Case) => void;
  loading: boolean;
  onSeeAll?: () => void;
  onAddEvent?: (c: Case) => void;
  onAddHistology?: (c: Case) => void;
}

function RecentCasesListInner({
  cases,
  selectedSpecialty,
  totalCount,
  onCasePress,
  loading,
  onSeeAll,
  onAddEvent,
  onAddHistology,
}: RecentCasesListProps) {
  const { theme } = useTheme();

  const headerText = selectedSpecialty
    ? `${
        selectedSpecialty === HISTOLOGY_FILTER_ID
          ? "Histology"
          : (SPECIALTY_LABELS[selectedSpecialty as Specialty] ??
            selectedSpecialty)
      } Cases`
    : "Recent Cases";

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <ThemedText
              style={[styles.headerText, { color: theme.textSecondary }]}
            >
              {headerText}
            </ThemedText>
            <InfoButton
              title="Recent Cases"
              content="Your most recent surgical cases, sorted by procedure date. Use the specialty filter above to narrow the list."
            />
          </View>
        </View>
        <View style={styles.skeletonContainer}>
          <SkeletonCard height={110} />
          <SkeletonCard height={110} />
        </View>
      </View>
    );
  }

  if (cases.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <ThemedText
            style={[styles.headerText, { color: theme.textSecondary }]}
          >
            {headerText}
          </ThemedText>
          <InfoButton
            title="Recent Cases"
            content="Your most recent surgical cases, sorted by procedure date. Use the specialty filter above to narrow the list."
          />
        </View>
        {totalCount > cases.length && onSeeAll ? (
          <Pressable onPress={onSeeAll}>
            <ThemedText style={[styles.seeAllText, { color: theme.link }]}>
              See All ({totalCount})
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {cases.map((item, index) => (
        <View key={item.id}>
          <DashboardCaseCard
            caseData={item}
            onPress={() => onCasePress(item)}
            onAddEvent={onAddEvent ? () => onAddEvent(item) : undefined}
            onAddHistology={
              onAddHistology ? () => onAddHistology(item) : undefined
            }
          />
          {index < cases.length - 1 ? (
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

export const RecentCasesList = React.memo(RecentCasesListInner);

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "500",
  },
  skeletonContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  divider: {
    height: 1,
    marginLeft: 80,
    marginRight: Spacing.lg,
  },
});
