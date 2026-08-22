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
  BID_ITEM_KEYS,
  BID_ITEM_TITLES,
  type EntrustmentLevel,
  type TeachingQualityLevel,
} from "@/types/sharing";
import {
  SUPERVISOR_AGGREGATE_MIN_ASSESSMENTS,
  SUPERVISOR_AGGREGATE_MIN_UNIQUE_CASES,
  type ProcedureLearningCurve,
  type TeachingAggregate,
  type CalibrationScore,
  type TrainingOverviewStats,
  type AutonomyGapStats,
} from "@/lib/assessmentAnalytics";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface TrainingContentProps {
  isConsultant: boolean;
  learningCurves: ProcedureLearningCurve[];
  teachingAggregate: TeachingAggregate | null;
  calibrationScore: CalibrationScore | null;
  /** Trainee-facing granted-autonomy gap (instrument v2 pairs). */
  autonomyGap?: AutonomyGapStats | null;
  trainingOverview: TrainingOverviewStats | null;
  entrustmentDistribution: { level: number; count: number }[];
  isEmpty: boolean;
  /** Derived-but-unrevealed EPA targets — keeps the pending list reachable before the first reveal. */
  pendingCount?: number;
  /** Cases where the viewer assisted under a senior (exposure logged, no entrustment). */
  exposureCaseCount?: number;
}

const AUTONOMY_DIRECTION_LABELS: Record<AutonomyGapStats["direction"], string> =
  {
    matched: "Well matched",
    held_back: "Often given less than you could handle",
    over_extended: "Often stretched beyond comfort",
  };

const AUTONOMY_DIRECTION_HINTS: Record<AutonomyGapStats["direction"], string> =
  {
    matched: "You're usually given the autonomy you can handle",
    held_back: "You're often held back — worth raising with supervisors",
    over_extended: "You're sometimes stretched beyond your comfort",
  };

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
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

function EmptyTraining({
  pendingCount = 0,
  exposureCaseCount = 0,
}: {
  pendingCount?: number;
  exposureCaseCount?: number;
}) {
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
      {exposureCaseCount > 0 ? (
        <ThemedText
          style={[styles.emptySubtitle, { color: theme.textTertiary }]}
          testID="statistics.training.exposure-empty"
        >
          You&apos;ve assisted on {exposureCaseCount}{" "}
          {exposureCaseCount === 1 ? "case" : "cases"} (exposure logged).
          Entrustment assessments are generated when you operate as Primary
          Surgeon.
        </ThemedText>
      ) : null}
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
  autonomyGap,
  trainingOverview,
  exposureCaseCount,
}: {
  learningCurves: ProcedureLearningCurve[];
  calibrationScore: CalibrationScore | null;
  autonomyGap: AutonomyGapStats | null;
  trainingOverview: TrainingOverviewStats | null;
  exposureCaseCount: number;
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
      {exposureCaseCount > 0 ? (
        <View style={styles.metricRow}>
          <StatCard
            label="Assisted (exposure)"
            value={exposureCaseCount}
            subtitle="Logged, not assessed"
            size="small"
          />
        </View>
      ) : null}

      {/* Granted-autonomy match (instrument v2) */}
      {autonomyGap && (
        <>
          <SectionHeader title="Autonomy Match" />
          <View
            testID="statistics.training.autonomy"
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
                      autonomyGap.direction === "matched"
                        ? theme.success
                        : theme.warning,
                  },
                ]}
              >
                {autonomyGap.meanSignedGap > 0 ? "+" : ""}
                {autonomyGap.meanSignedGap.toFixed(1)}
              </ThemedText>
              <View style={styles.calibrationMeta}>
                <ThemedText
                  style={[styles.calibrationLabel, { color: theme.text }]}
                >
                  {AUTONOMY_DIRECTION_LABELS[autonomyGap.direction]}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.calibrationHint,
                    { color: theme.textSecondary },
                  ]}
                >
                  {AUTONOMY_DIRECTION_HINTS[autonomyGap.direction]}
                </ThemedText>
              </View>
            </View>
            <ThemedText
              style={[
                styles.calibrationFootnote,
                { color: theme.textTertiary },
              ]}
            >
              Held back in {formatRate(autonomyGap.heldBackRate)} · Well matched
              in {formatRate(autonomyGap.matchedRate)} · Over-extended in{" "}
              {formatRate(autonomyGap.overExtendedRate)} · 0 = granted autonomy
              matched what you could handle
            </ThemedText>
          </View>
        </>
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

          {teachingAggregate.legacyScaleCount > 0 &&
          teachingAggregate.legacyScaleCount <
            teachingAggregate.totalAssessments ? (
            <ThemedText
              style={[styles.teachingSubtitle, { color: theme.textTertiary }]}
            >
              {teachingAggregate.legacyScaleCount} rated on the pre-2.23 scale
            </ThemedText>
          ) : null}

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

          {/* BID teaching behaviours — share rated "Yes, clearly" */}
          {teachingAggregate.behaviours ? (
            <View style={styles.trendChart} testID="statistics.training.bid">
              <ThemedText
                style={[
                  styles.teachingSubtitle,
                  { color: theme.textSecondary },
                ]}
              >
                Teaching behaviours — rated &quot;Yes, clearly&quot; (
                {teachingAggregate.behaviours.total} assessments)
              </ThemedText>
              <HorizontalBarChart
                data={BID_ITEM_KEYS.map((key) => ({
                  label: BID_ITEM_TITLES[key],
                  value: Math.round(
                    teachingAggregate.behaviours!.items[key].clearRate * 100,
                  ),
                }))}
                maxBars={3}
              />
            </View>
          ) : null}

          {/* Granted autonomy as trainees experienced it */}
          {teachingAggregate.autonomy ? (
            <ThemedText
              style={[styles.teachingSubtitle, { color: theme.textSecondary }]}
              testID="statistics.training.autonomy-granted"
            >
              Autonomy you granted: held back{" "}
              {formatRate(teachingAggregate.autonomy.heldBackRate)} · well
              matched {formatRate(teachingAggregate.autonomy.matchedRate)} ·
              over-extended{" "}
              {formatRate(teachingAggregate.autonomy.overExtendedRate)}
            </ThemedText>
          ) : null}
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
            {totalAssessmentCount < SUPERVISOR_AGGREGATE_MIN_ASSESSMENTS
              ? `Need ${SUPERVISOR_AGGREGATE_MIN_ASSESSMENTS - totalAssessmentCount} more assessment${SUPERVISOR_AGGREGATE_MIN_ASSESSMENTS - totalAssessmentCount === 1 ? "" : "s"} to see your teaching score`
              : uniqueTraineeCount < SUPERVISOR_AGGREGATE_MIN_UNIQUE_CASES
                ? `Need assessments from ${SUPERVISOR_AGGREGATE_MIN_UNIQUE_CASES - uniqueTraineeCount} more trainee${SUPERVISOR_AGGREGATE_MIN_UNIQUE_CASES - uniqueTraineeCount === 1 ? "" : "s"} to see your teaching score`
                : "Not enough data yet"}
          </ThemedText>
          <ThemedText
            style={[styles.thresholdFootnote, { color: theme.textTertiary }]}
          >
            Requires at least {SUPERVISOR_AGGREGATE_MIN_ASSESSMENTS} assessments
            from {SUPERVISOR_AGGREGATE_MIN_UNIQUE_CASES} different trainees
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
  autonomyGap = null,
  exposureCaseCount = 0,
}: TrainingContentProps) {
  if (isEmpty) {
    return (
      <EmptyTraining
        pendingCount={pendingCount}
        exposureCaseCount={exposureCaseCount}
      />
    );
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
          autonomyGap={autonomyGap}
          trainingOverview={trainingOverview}
          exposureCaseCount={exposureCaseCount}
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
