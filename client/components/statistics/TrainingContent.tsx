import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { StatCard } from "./StatCard";
import { BarChart } from "./BarChart";
import { HorizontalBarChart } from "./HorizontalBarChart";
import { SpecialtyDeepDiveCard } from "./SpecialtyDeepDiveCard";
import { DotPlotChart } from "./DotPlotChart";
import {
  ENTRUSTMENT_LABELS,
  TEACHING_QUALITY_LABELS,
  type EntrustmentLevel,
  type TeachingQualityLevel,
} from "@/types/sharing";
import type {
  ProcedureLearningCurve,
  TeachingAggregate,
  CalibrationScore,
  TrainingOverviewStats,
} from "@/lib/assessmentAnalytics";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface TrainingContentProps {
  isConsultant: boolean;
  learningCurves: ProcedureLearningCurve[];
  teachingAggregate: TeachingAggregate | null;
  calibrationScore: CalibrationScore | null;
  trainingOverview: TrainingOverviewStats | null;
  entrustmentDistribution: { level: number; count: number }[];
  isEmpty: boolean;
  /** Derived-but-unrevealed EPA targets — keeps the pending list reachable before the first reveal. */
  pendingCount?: number;
}

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function nearestEntrustmentLabel(avg: number): string {
  const rounded = Math.round(Math.max(1, Math.min(5, avg))) as EntrustmentLevel;
  return ENTRUSTMENT_LABELS[rounded];
}

function nearestTeachingLabel(avg: number): string {
  const rounded = Math.round(
    Math.max(1, Math.min(5, avg)),
  ) as TeachingQualityLevel;
  return TEACHING_QUALITY_LABELS[rounded];
}

const CALIBRATION_LABELS: Record<CalibrationScore["interpretation"], string> = {
  excellent: "Excellent calibration",
  good: "Good calibration",
  needs_attention: "Needs attention",
};

const DIRECTION_LABELS: Record<CalibrationScore["direction"], string> = {
  balanced: "Well balanced",
  under_estimates: "You tend to under-estimate yourself",
  over_estimates: "You tend to over-estimate yourself",
};

// ── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <ThemedText style={[styles.sectionHeader, { color: theme.text }]}>
      {title}
    </ThemedText>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyTraining({ pendingCount = 0 }: { pendingCount?: number }) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  return (
    <View style={styles.emptyContainer}>
      <Feather name="award" size={48} color={theme.textTertiary} />
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        No assessments yet
      </ThemedText>
      <ThemedText
        style={[styles.emptySubtitle, { color: theme.textSecondary }]}
      >
        When you complete EPA assessments on shared cases, your training
        analytics will appear here.
      </ThemedText>
      {pendingCount > 0 ? (
        <Pressable
          onPress={() => navigation.navigate("AssessmentHistory")}
          style={styles.seeAllLink}
          accessibilityRole="button"
          accessibilityLabel={`View ${pendingCount} pending assessments`}
          testID="statistics.training.btn-pendingAssessments"
        >
          <ThemedText style={[styles.seeAllText, { color: theme.link }]}>
            {pendingCount === 1
              ? "View 1 pending assessment"
              : `View ${pendingCount} pending assessments`}
          </ThemedText>
          <Feather name="chevron-right" size={16} color={theme.link} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Trainee View ─────────────────────────────────────────────────────────────

function TraineeView({
  learningCurves,
  calibrationScore,
  trainingOverview,
}: {
  learningCurves: ProcedureLearningCurve[];
  calibrationScore: CalibrationScore | null;
  trainingOverview: TrainingOverviewStats | null;
}) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();

  return (
    <>
      {/* Overview cards */}
      {trainingOverview && (
        <View style={styles.metricRow}>
          <StatCard
            label="Assessed Cases"
            value={trainingOverview.totalAssessments}
            size="small"
          />
          <StatCard
            label="Procedures"
            value={trainingOverview.proceduresAssessed}
            size="small"
          />
          <StatCard
            label="Avg Rating"
            value={trainingOverview.averageSupervisorRating.toFixed(1)}
            subtitle={nearestEntrustmentLabel(
              trainingOverview.averageSupervisorRating,
            )}
            size="small"
          />
        </View>
      )}

      {/* Calibration score */}
      {calibrationScore && (
        <>
          <SectionHeader title="Calibration" />
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.calibrationRow}>
              <ThemedText
                style={[
                  styles.calibrationValue,
                  {
                    color:
                      calibrationScore.interpretation === "excellent"
                        ? theme.success
                        : calibrationScore.interpretation === "good"
                          ? theme.warning
                          : theme.error,
                  },
                ]}
              >
                {calibrationScore.overallMeanGap.toFixed(1)}
              </ThemedText>
              <View style={styles.calibrationMeta}>
                <ThemedText
                  style={[styles.calibrationLabel, { color: theme.text }]}
                >
                  {CALIBRATION_LABELS[calibrationScore.interpretation]}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.calibrationHint,
                    { color: theme.textSecondary },
                  ]}
                >
                  {DIRECTION_LABELS[calibrationScore.direction]}
                </ThemedText>
              </View>
            </View>
            <ThemedText
              style={[
                styles.calibrationFootnote,
                { color: theme.textTertiary },
              ]}
            >
              0 = perfect match between supervisor and self-assessment
            </ThemedText>

            {calibrationScore.monthlyTrend.length > 1 && (
              <View style={styles.trendChart}>
                <BarChart
                  data={calibrationScore.monthlyTrend.map((t) => ({
                    label: t.month.slice(5), // "MM"
                    value: Math.round(t.meanGap * 10) / 10,
                  }))}
                  height={120}
                  barColor={theme.info}
                />
              </View>
            )}
          </View>
        </>
      )}

      {/* Learning curves */}
      {learningCurves.length > 0 && (
        <>
          <SectionHeader title="Learning Curves" />
          {learningCurves
            .filter((c) => c.points.length >= 2)
            .map((curve) => (
              <View key={curve.procedureCode} style={styles.cardGap}>
                <SpecialtyDeepDiveCard
                  label={curve.procedureDisplayName}
                  caseCount={curve.totalCases}
                  color={theme.info}
                  heroMetric={{
                    label: "Latest",
                    value: `Level ${curve.latestRating}`,
                  }}
                  minCasesForDetail={2}
                  testID={`statistics.training.curve-${curve.procedureCode}`}
                >
                  <DotPlotChart points={curve.points} />
                </SpecialtyDeepDiveCard>
              </View>
            ))}
        </>
      )}

      {/* See all assessments link */}
      <Pressable
        onPress={() => navigation.navigate("AssessmentHistory")}
        style={styles.seeAllLink}
        accessibilityRole="button"
      >
        <ThemedText style={[styles.seeAllText, { color: theme.link }]}>
          See all assessments
        </ThemedText>
        <Feather name="chevron-right" size={16} color={theme.link} />
      </Pressable>
    </>
  );
}

// ── Supervisor View ──────────────────────────────────────────────────────────

function SupervisorView({
  teachingAggregate,
  entrustmentDistribution,
  learningCurves,
}: {
  teachingAggregate: TeachingAggregate | null;
  entrustmentDistribution: { level: number; count: number }[];
  learningCurves: ProcedureLearningCurve[];
}) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();

  const totalAssessmentCount = entrustmentDistribution.reduce(
    (s, d) => s + d.count,
    0,
  );
  const uniqueTraineeCount = teachingAggregate?.uniqueTrainees ?? 0;

  return (
    <>
      {/* Teaching quality */}
      <SectionHeader title="Teaching Quality" />
      {teachingAggregate ? (
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.teachingRow}>
            <ThemedText style={[styles.teachingScore, { color: theme.accent }]}>
              {teachingAggregate.overallAverage.toFixed(1)}
            </ThemedText>
            <ThemedText
              style={[styles.teachingOutOf, { color: theme.textTertiary }]}
            >
              {" "}
              / 5
            </ThemedText>
          </View>
          <ThemedText
            style={[styles.teachingLabel, { color: theme.textSecondary }]}
          >
            {nearestTeachingLabel(teachingAggregate.overallAverage)}
          </ThemedText>
          <ThemedText
            style={[styles.teachingSubtitle, { color: theme.textTertiary }]}
          >
            Based on {teachingAggregate.totalAssessments} assessments from{" "}
            {teachingAggregate.uniqueTrainees} trainees
          </ThemedText>

          {teachingAggregate.trend.length > 1 && (
            <View style={styles.trendChart}>
              <BarChart
                data={teachingAggregate.trend.map((t) => ({
                  label: t.month.slice(5),
                  value: Math.round(t.averageRating * 10) / 10,
                }))}
                height={120}
                barColor={theme.accent}
              />
            </View>
          )}
        </View>
      ) : (
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
        >
          <ThemedText
            style={[styles.thresholdText, { color: theme.textSecondary }]}
          >
            {totalAssessmentCount < 5
              ? `Need ${5 - totalAssessmentCount} more assessment${5 - totalAssessmentCount === 1 ? "" : "s"} to see your teaching score`
              : uniqueTraineeCount < 3
                ? `Need assessments from ${3 - uniqueTraineeCount} more trainee${3 - uniqueTraineeCount === 1 ? "" : "s"} to see your teaching score`
                : "Not enough data yet"}
          </ThemedText>
          <ThemedText
            style={[styles.thresholdFootnote, { color: theme.textTertiary }]}
          >
            Requires at least 5 assessments from 3 different trainees
          </ThemedText>
        </View>
      )}

      {/* Entrustment distribution */}
      {totalAssessmentCount > 0 && (
        <>
          <SectionHeader title="Entrustment Ratings Given" />
          <HorizontalBarChart
            data={entrustmentDistribution.map((d) => ({
              label: `Level ${d.level}`,
              value: d.count,
            }))}
            maxBars={5}
          />
        </>
      )}

      {/* Own learning curves (supervisor is also a learner) */}
      {learningCurves.length > 0 && (
        <>
          <SectionHeader title="Your Learning Curves" />
          {learningCurves
            .filter((c) => c.points.length >= 2)
            .map((curve) => (
              <View key={curve.procedureCode} style={styles.cardGap}>
                <SpecialtyDeepDiveCard
                  label={curve.procedureDisplayName}
                  caseCount={curve.totalCases}
                  color={theme.info}
                  heroMetric={{
                    label: "Latest",
                    value: `Level ${curve.latestRating}`,
                  }}
                  minCasesForDetail={2}
                  testID={`statistics.training.curve-${curve.procedureCode}`}
                >
                  <DotPlotChart points={curve.points} />
                </SpecialtyDeepDiveCard>
              </View>
            ))}
        </>
      )}

      {/* See all assessments link */}
      <Pressable
        onPress={() => navigation.navigate("AssessmentHistory")}
        style={styles.seeAllLink}
        accessibilityRole="button"
      >
        <ThemedText style={[styles.seeAllText, { color: theme.link }]}>
          See all assessments
        </ThemedText>
        <Feather name="chevron-right" size={16} color={theme.link} />
      </Pressable>
    </>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export const TrainingContent = React.memo(function TrainingContent({
  isConsultant,
  learningCurves,
  teachingAggregate,
  calibrationScore,
  trainingOverview,
  entrustmentDistribution,
  isEmpty,
  pendingCount = 0,
}: TrainingContentProps) {
  if (isEmpty) {
    return <EmptyTraining pendingCount={pendingCount} />;
  }

  return (
    <View style={styles.content}>
      {isConsultant ? (
        <SupervisorView
          teachingAggregate={teachingAggregate}
          entrustmentDistribution={entrustmentDistribution}
          learningCurves={learningCurves}
        />
      ) : (
        <TraineeView
          learningCurves={learningCurves}
          calibrationScore={calibrationScore}
          trainingOverview={trainingOverview}
        />
      )}
    </View>
  );
});

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.xs,
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
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadows.card,
  },
  cardGap: {
    marginBottom: Spacing.sm,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // Calibration
  calibrationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  calibrationValue: {
    fontSize: 36,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  calibrationMeta: {
    flex: 1,
    gap: 2,
  },
  calibrationLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  calibrationHint: {
    fontSize: 13,
  },
  calibrationFootnote: {
    fontSize: 12,
    marginTop: Spacing.sm,
  },

  // Teaching quality
  teachingRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  teachingScore: {
    fontSize: 42,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  teachingOutOf: {
    fontSize: 18,
    fontWeight: "400",
  },
  teachingLabel: {
    fontSize: 15,
    marginTop: 2,
  },
  teachingSubtitle: {
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  thresholdText: {
    fontSize: 15,
    textAlign: "center",
  },
  thresholdFootnote: {
    fontSize: 12,
    textAlign: "center",
    marginTop: Spacing.xs,
  },

  trendChart: {
    marginTop: Spacing.md,
  },

  // See all link
  seeAllLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
