import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { SPECIALTY_LABELS, Specialty } from "@/types/case";
import type { CaseSummary } from "@/types/caseSummary";
import { SkeletonCard } from "@/components/LoadingState";
import { DashboardCaseCard } from "@/components/dashboard/CaseCard";
import { InfoButton } from "@/components/dashboard/InfoButton";
import {
  HISTOLOGY_FILTER_ID,
  SHARED_FILTER_ID,
} from "@/lib/dashboardSelectors";
import { isSharedCaseSummary } from "@/lib/sharedCaseSummary";
import { capRecentCases, resolveRecentCasesSeeAll } from "@/lib/recentCases";

interface RecentCaseRowProps {
  item: CaseSummary;
  showDivider: boolean;
  onCasePress: (c: CaseSummary) => void;
  onAddEvent?: (c: CaseSummary) => void;
  onAddHistology?: (c: CaseSummary) => void;
}

/**
 * One row. Builds the per-item closures HERE so the memoised card only
 * re-renders when its own item or the shared handlers change — inline
 * arrows at the list level re-rendered every card on every parent render.
 */
const RecentCaseRow = React.memo(function RecentCaseRow({
  item,
  showDivider,
  onCasePress,
  onAddEvent,
  onAddHistology,
}: RecentCaseRowProps) {
  const { theme } = useTheme();
  const shared = isSharedCaseSummary(item);
  const handlePress = React.useCallback(
    () => onCasePress(item),
    [onCasePress, item],
  );
  // Owner-only quick actions: a colleague's shared case can't take events
  // or histology from the viewer.
  const handleAddEvent = React.useMemo(
    () => (onAddEvent && !shared ? () => onAddEvent(item) : undefined),
    [onAddEvent, shared, item],
  );
  const handleAddHistology = React.useMemo(
    () => (onAddHistology && !shared ? () => onAddHistology(item) : undefined),
    [onAddHistology, shared, item],
  );
  return (
    <View>
      <DashboardCaseCard
        caseData={item}
        onPress={handlePress}
        onAddEvent={handleAddEvent}
        onAddHistology={handleAddHistology}
      />
      {showDivider ? (
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
      ) : null}
    </View>
  );
});

interface RecentCasesListProps {
  cases: CaseSummary[];
  selectedSpecialty: string | null;
  totalCount: number;
  onCasePress: (c: CaseSummary) => void;
  loading: boolean;
  onSeeAll?: () => void;
  /** Show the See All link regardless of counts (e.g. the shared filter,
   *  whose full list lives on its own screen). */
  forceSeeAll?: boolean;
  onAddEvent?: (c: CaseSummary) => void;
  onAddHistology?: (c: CaseSummary) => void;
}

function RecentCasesListInner({
  cases,
  selectedSpecialty,
  totalCount,
  onCasePress,
  loading,
  onSeeAll,
  forceSeeAll = false,
  onAddEvent,
  onAddHistology,
}: RecentCasesListProps) {
  const { theme } = useTheme();
  const visibleCases = React.useMemo(() => capRecentCases(cases), [cases]);
  const showSeeAll = resolveRecentCasesSeeAll({
    total: totalCount,
    shown: visibleCases.length,
    forceSeeAll,
  });

  const headerText =
    selectedSpecialty === SHARED_FILTER_ID
      ? "Shared with me"
      : selectedSpecialty
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
              content="Your most recent surgical cases and cases colleagues shared with you, sorted by procedure date. Use the filter above to narrow the list."
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
            content="Your most recent surgical cases and cases colleagues shared with you, sorted by procedure date. Use the filter above to narrow the list."
          />
        </View>
        {showSeeAll && onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            testID="dashboard.recentCases.btn-seeAll"
          >
            <ThemedText style={[styles.seeAllText, { color: theme.link }]}>
              {forceSeeAll ? "See All" : `See All (${totalCount})`}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {visibleCases.map((item, index) => (
        <RecentCaseRow
          key={item.id}
          item={item}
          showDivider={index < visibleCases.length - 1}
          onCasePress={onCasePress}
          onAddEvent={onAddEvent}
          onAddHistology={onAddHistology}
        />
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
