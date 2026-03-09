import React, { useMemo } from "react";
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useStatistics } from "@/hooks/useStatistics";
import { StatCard } from "@/components/statistics/StatCard";
import { BarChart } from "@/components/statistics/BarChart";
import { HorizontalBarChart } from "@/components/statistics/HorizontalBarChart";
import { MilestoneTimeline } from "@/components/statistics/MilestoneTimeline";
import { SpecialtyDeepDiveCard } from "@/components/statistics/SpecialtyDeepDiveCard";
import { EmptyStatistics } from "@/components/statistics/EmptyStatistics";
import { Specialty } from "@/types/case";
import {
  formatPercentage,
  formatEntryTime,
  type FreeFlapStatistics,
  type HandSurgeryStatistics,
  type BreastStatistics,
  type BaseStatistics,
} from "@/lib/statistics";
import type {
  SkinCancerInsights,
  BurnsInsights,
  HandCaseTypeInsights,
} from "@/lib/statisticsHelpers";

const EMPTY_THRESHOLD = 20;

// ─── Section Header ──────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <ThemedText style={[styles.sectionHeader, { color: theme.text }]}>
      {title}
    </ThemedText>
  );
}

// ─── Specialty Deep Dive Content ─────────────────────────────────────────

function FreeFlapContent({ stats }: { stats: FreeFlapStatistics }) {
  const { theme } = useTheme();
  return (
    <>
      <View style={styles.metricRow}>
        <StatCard
          label="Survival"
          value={formatPercentage(stats.flapSurvivalRate)}
          size="small"
        />
        <StatCard
          label="Re-exploration"
          value={formatPercentage(stats.reExplorationRate)}
          size="small"
        />
      </View>
      <View style={styles.metricRow}>
        <StatCard
          label="Salvage"
          value={formatPercentage(stats.salvageRate)}
          size="small"
        />
        <StatCard
          label="Avg Ischaemia"
          value={
            stats.averageIschemiaTimeMinutes != null
              ? `${stats.averageIschemiaTimeMinutes}m`
              : "\u2014"
          }
          size="small"
        />
      </View>
      {stats.casesByFlapType.length > 0 && (
        <>
          <ThemedText
            style={[styles.subHeader, { color: theme.textSecondary }]}
          >
            Flap Types
          </ThemedText>
          <HorizontalBarChart
            data={stats.casesByFlapType.map((f) => ({
              label: f.flapType,
              value: f.count,
            }))}
            maxBars={5}
          />
        </>
      )}
    </>
  );
}

function HandContent({
  stats,
  caseTypeInsights,
}: {
  stats: HandSurgeryStatistics;
  caseTypeInsights: HandCaseTypeInsights | null;
}) {
  return (
    <>
      {caseTypeInsights && (
        <View style={styles.metricRow}>
          <StatCard
            label="Trauma"
            value={caseTypeInsights.traumaCount}
            size="small"
          />
          <StatCard
            label="Acute"
            value={caseTypeInsights.acuteCount}
            size="small"
          />
          <StatCard
            label="Elective"
            value={caseTypeInsights.electiveCount}
            size="small"
          />
        </View>
      )}
      {stats.casesByProcedureType.length > 0 && (
        <HorizontalBarChart
          data={stats.casesByProcedureType.slice(0, 5).map((p) => ({
            label: p.procedureType,
            value: p.count,
          }))}
          maxBars={5}
        />
      )}
      <View style={styles.metricRow}>
        <StatCard
          label="Nerve Repairs"
          value={stats.nerveRepairCount}
          size="small"
        />
        <StatCard
          label="Tendon Repairs"
          value={stats.tendonRepairCount}
          size="small"
        />
      </View>
    </>
  );
}

function BreastContent({ stats }: { stats: BreastStatistics }) {
  return (
    <>
      <View style={styles.metricRow}>
        <StatCard
          label="Reconstructions"
          value={stats.reconstructionCount}
          size="small"
        />
        <StatCard
          label="Complication Rate"
          value={formatPercentage(stats.complicationRate)}
          size="small"
        />
      </View>
      {stats.casesByProcedureType.length > 0 && (
        <HorizontalBarChart
          data={stats.casesByProcedureType.slice(0, 5).map((p) => ({
            label: p.procedureType,
            value: p.count,
          }))}
          maxBars={5}
        />
      )}
    </>
  );
}

function SkinCancerContent({ insights }: { insights: SkinCancerInsights }) {
  return (
    <>
      {insights.pathologyCounts.length > 0 && (
        <HorizontalBarChart
          data={insights.pathologyCounts.map((p) => ({
            label: p.category,
            value: p.count,
          }))}
          maxBars={7}
        />
      )}
      <View style={styles.metricRow}>
        <StatCard
          label="Histology Complete"
          value={formatPercentage(insights.histologyCompletionRate)}
          subtitle={`${insights.lesionsWithHistology} of ${insights.totalLesions} lesions`}
          size="small"
        />
      </View>
    </>
  );
}

function BurnsContent({ insights }: { insights: BurnsInsights }) {
  return (
    <>
      <View style={styles.metricRow}>
        <StatCard label="Acute" value={insights.acuteCount} size="small" />
        <StatCard
          label="Reconstruction"
          value={insights.reconstructionCount}
          size="small"
        />
      </View>
      <View style={styles.metricRow}>
        <StatCard
          label="Grafting Rate"
          value={formatPercentage(insights.graftingRate)}
          size="small"
        />
      </View>
    </>
  );
}

function GenericSpecialtyContent({ stats }: { stats: BaseStatistics }) {
  return (
    <View style={styles.metricRow}>
      <StatCard
        label="Complication Rate"
        value={formatPercentage(stats.complicationRate)}
        size="small"
      />
      <StatCard
        label="Avg Duration"
        value={
          stats.averageDurationMinutes != null
            ? `${stats.averageDurationMinutes}m`
            : "\u2014"
        }
        size="small"
      />
    </View>
  );
}

// ─── Role colour mapping ─────────────────────────────────────────────────

const ROLE_COLOR_MAP: Record<
  string,
  (theme: ReturnType<typeof useTheme>["theme"]) => string
> = {
  PS: (t) => t.rolePrimary,
  PP: (t) => t.rolePrimary,
  SS: (t) => t.roleSupervising,
  SNS: (t) => t.roleSupervising,
  AS: (t) => t.roleAssistant,
  ONS: (t) => t.roleTrainee,
  A: (t) => t.roleTrainee,
};

// ─── Main Screen ─────────────────────────────────────────────────────────

export default function StatisticsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const {
    isLoading,
    isEmpty,
    totalCases,
    careerOverview,
    monthlyVolume,
    freeFlapStats,
    specialtyStats,
    operationalInsights,
    milestones,
    entryTimeStats,
    skinCancerInsights,
    burnsInsights,
    handCaseTypeInsights,
  } = useStatistics();

  // Bar chart data for monthly volume
  const monthlyBarData = useMemo(
    () => monthlyVolume.map((m) => ({ label: m.label, value: m.count })),
    [monthlyVolume],
  );

  // Specialty distribution bar data
  const specialtyBarData = useMemo(() => {
    if (!careerOverview) return [];
    return careerOverview.specialtyDistribution.map((s) => ({
      label: s.label,
      value: s.count,
      color: theme.specialty[s.specialty as keyof typeof theme.specialty],
    }));
  }, [careerOverview, theme]);

  // Facility data
  const facilityBarData = useMemo(() => {
    if (!operationalInsights) return [];
    return operationalInsights.facilityBreakdown.map((f) => ({
      label: f.name,
      value: f.count,
    }));
  }, [operationalInsights]);

  // Role data
  const roleBarData = useMemo(() => {
    if (!operationalInsights) return [];
    return operationalInsights.roleBreakdown.map((r) => ({
      label: r.label,
      value: r.count,
      color: ROLE_COLOR_MAP[r.role]?.(theme) ?? theme.accent,
    }));
  }, [operationalInsights, theme]);

  // Current month count
  const currentMonthCount =
    monthlyVolume.length > 0
      ? monthlyVolume[monthlyVolume.length - 1]!.count
      : 0;

  // Render specialty deep-dive content
  const renderSpecialtyContent = (
    specialty: Specialty,
    stats: (typeof specialtyStats)[Specialty],
  ): React.ReactNode => {
    if (!stats) return null;

    if (specialty === "skin_cancer" && skinCancerInsights) {
      return <SkinCancerContent insights={skinCancerInsights} />;
    }
    if (specialty === "burns" && burnsInsights) {
      return <BurnsContent insights={burnsInsights} />;
    }
    if ("nerveRepairCount" in stats) {
      return (
        <HandContent
          stats={stats as HandSurgeryStatistics}
          caseTypeInsights={handCaseTypeInsights}
        />
      );
    }
    if ("reconstructionCount" in stats) {
      return <BreastContent stats={stats as BreastStatistics} />;
    }

    return <GenericSpecialtyContent stats={stats} />;
  };

  // Hero metric for specialty card collapsed view
  const getHeroMetric = (
    specialty: Specialty,
    stats: (typeof specialtyStats)[Specialty],
  ): { label: string; value: string } | undefined => {
    if (!stats) return undefined;

    if (specialty === "skin_cancer" && skinCancerInsights) {
      return {
        label: "Histology complete",
        value: formatPercentage(skinCancerInsights.histologyCompletionRate),
      };
    }
    if (specialty === "burns" && burnsInsights) {
      return {
        label: "Grafting rate",
        value: formatPercentage(burnsInsights.graftingRate),
      };
    }
    if ("nerveRepairCount" in stats) {
      const hand = stats as HandSurgeryStatistics;
      const topProc = hand.casesByProcedureType[0];
      return topProc
        ? { label: "Most common", value: topProc.procedureType }
        : undefined;
    }
    if ("reconstructionCount" in stats) {
      return {
        label: "Reconstructions",
        value: String((stats as BreastStatistics).reconstructionCount),
      };
    }

    return {
      label: "Complication rate",
      value: formatPercentage(stats.complicationRate),
    };
  };

  if (isLoading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (isEmpty || totalCases < EMPTY_THRESHOLD) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingBottom: insets.bottom + tabBarHeight,
        }}
      >
        <EmptyStatistics totalCases={totalCases} threshold={EMPTY_THRESHOLD} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + tabBarHeight + Spacing.lg },
      ]}
    >
      {/* ═══ Tier 1: Overview ═══ */}

      {/* Career hero stats */}
      {careerOverview && (
        <View style={styles.heroRow}>
          <StatCard
            label="Total Cases"
            value={careerOverview.totalCases}
            size="large"
          />
          <StatCard
            label="Months"
            value={careerOverview.monthsActive}
            size="small"
          />
          <StatCard
            label="Specialties"
            value={careerOverview.specialtiesUsed.length}
            size="small"
          />
        </View>
      )}

      {/* Practice Profile */}
      {specialtyBarData.length > 0 && (
        <>
          <SectionHeader title="Practice Profile" />
          <HorizontalBarChart data={specialtyBarData} />
        </>
      )}

      {/* Monthly Activity */}
      {monthlyBarData.length > 0 && (
        <>
          <SectionHeader title="Monthly Activity" />
          <BarChart data={monthlyBarData} highlightLast />
          <ThemedText
            style={[styles.monthNote, { color: theme.textSecondary }]}
          >
            This month: {currentMonthCount} case
            {currentMonthCount !== 1 ? "s" : ""}
          </ThemedText>
        </>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <>
          <SectionHeader title="Milestones" />
          <MilestoneTimeline milestones={milestones} />
        </>
      )}

      {/* ═══ Tier 2: Specialty Deep Dives ═══ */}

      {careerOverview && careerOverview.specialtyDistribution.length > 0 && (
        <>
          <SectionHeader title="Specialty Breakdown" />
          {freeFlapStats && (
            <View style={styles.cardGap}>
              <SpecialtyDeepDiveCard
                label="Free Flap"
                caseCount={freeFlapStats.totalCases}
                color={theme.accent}
                heroMetric={{
                  label: "Flap survival",
                  value: formatPercentage(freeFlapStats.flapSurvivalRate),
                }}
              >
                <FreeFlapContent stats={freeFlapStats} />
              </SpecialtyDeepDiveCard>
            </View>
          )}
          {careerOverview.specialtyDistribution.map(
            ({ specialty, label, count }) => {
              const color =
                theme.specialty[specialty as keyof typeof theme.specialty] ??
                theme.accent;
              const stats = specialtyStats[specialty];
              const heroMetric = getHeroMetric(specialty, stats);

              return (
                <View key={specialty} style={styles.cardGap}>
                  <SpecialtyDeepDiveCard
                    label={label}
                    caseCount={count}
                    color={color}
                    heroMetric={heroMetric}
                  >
                    {renderSpecialtyContent(specialty, stats)}
                  </SpecialtyDeepDiveCard>
                </View>
              );
            },
          )}
        </>
      )}

      {/* ═══ Tier 3: Operational Insights ═══ */}

      {/* Where You Operate */}
      {facilityBarData.length > 0 && (
        <>
          <SectionHeader title="Where You Operate" />
          <HorizontalBarChart data={facilityBarData} maxBars={5} />
        </>
      )}

      {/* Your Role */}
      {roleBarData.length > 0 && (
        <>
          <SectionHeader title="Your Role" />
          <HorizontalBarChart data={roleBarData} maxBars={7} />
        </>
      )}

      {/* Logging Efficiency */}
      {entryTimeStats && entryTimeStats.averageEntryTimeSeconds != null && (
        <>
          <SectionHeader title="Logging Efficiency" />
          <View style={styles.metricRow}>
            <StatCard
              label="Avg. Entry Time"
              value={formatEntryTime(entryTimeStats.averageEntryTimeSeconds)}
              size="small"
            />
            <StatCard
              label="Median Entry Time"
              value={formatEntryTime(entryTimeStats.medianEntryTimeSeconds)}
              size="small"
            />
          </View>
          {operationalInsights && (
            <ThemedText
              style={[styles.footnote, { color: theme.textTertiary }]}
            >
              Based on {operationalInsights.timedEntryCount} timed{" "}
              {operationalInsights.timedEntryCount === 1 ? "entry" : "entries"}
            </ThemedText>
          )}
        </>
      )}

      {/* Your Top 10 */}
      {operationalInsights && operationalInsights.topDxProcPairs.length > 0 && (
        <>
          <SectionHeader title="Your Top 10" />
          <View style={styles.topList}>
            {operationalInsights.topDxProcPairs.map((pair, i) => (
              <View key={`${pair.procedureName}-${i}`} style={styles.topRow}>
                <ThemedText style={[styles.topRank, { color: theme.accent }]}>
                  {i + 1}.
                </ThemedText>
                <View style={styles.topContent}>
                  <ThemedText
                    style={[styles.topName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {pair.procedureName}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[styles.topCount, { color: theme.textSecondary }]}
                >
                  {pair.count}
                </ThemedText>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Data Completeness */}
      {operationalInsights && (
        <>
          <SectionHeader title="Data Completeness" />
          <View style={styles.metricRow}>
            <StatCard
              label="Cases with complete data"
              value={`${Math.round(operationalInsights.completionRate)}%`}
              subtitle={`${Math.round((operationalInsights.completionRate / 100) * totalCases)} of ${totalCases} cases`}
              size="small"
            />
          </View>
          <ThemedText style={[styles.footnote, { color: theme.textTertiary }]}>
            Complete = patient ID, date, facility, diagnosis, and procedure
            recorded.
          </ThemedText>
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.xs },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  metricRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  subHeader: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  monthNote: {
    fontSize: 13,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  footnote: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  cardGap: {
    marginBottom: Spacing.sm,
  },
  topList: {
    gap: Spacing.xs,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  topRank: {
    fontSize: 14,
    fontWeight: "700",
    width: 28,
  },
  topContent: {
    flex: 1,
  },
  topName: {
    fontSize: 14,
  },
  topCount: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    width: 36,
    textAlign: "right",
  },
});
