import { useState, useCallback, useMemo } from "react";
import { InteractionManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { isConsultantLevel } from "@/lib/roleDefaults";
import {
  getAllRevealedPairs,
  getAllEpaTargets,
  getAllEpaExposures,
  type RevealedPairWithContext,
} from "@/lib/assessmentStorage";
import { getSharedOutbox } from "@/lib/sharingApi";
import {
  filterPendingEpaTargets,
  countPendingEpaTargets,
} from "@/lib/pendingEpa";
import {
  computeLearningCurves,
  computeTeachingAggregate,
  computeCalibrationScore,
  computeTrainingOverview,
  computeEntrustmentDistribution,
  computeAutonomyGap,
  fullPairsOnly,
  type ProcedureLearningCurve,
  type TeachingAggregate,
  type CalibrationScore,
  type TrainingOverviewStats,
  type AutonomyGapStats,
} from "@/lib/assessmentAnalytics";

export interface UseTrainingStatisticsReturn {
  isLoading: boolean;
  isEmpty: boolean;
  isConsultant: boolean;
  /** Derived EPA targets not yet revealed — drives the pending-assessments entry link. */
  pendingCount: number;
  /** Cases the viewer logged where they ASSISTED under a tagged senior
   *  (exposure records with participant "self") — logged, not assessed. */
  exposureCaseCount: number;
  learningCurves: ProcedureLearningCurve[];
  teachingAggregate: TeachingAggregate | null;
  calibrationScore: CalibrationScore | null;
  /** Trainee-facing granted-autonomy gap (instrument v2 pairs). */
  autonomyGap: AutonomyGapStats | null;
  trainingOverview: TrainingOverviewStats | null;
  entrustmentDistribution: { level: number; count: number }[];
  /** Full (non-partial) pairs — what every analytic above is computed from. */
  allPairs: RevealedPairWithContext[];
}

export function useTrainingStatistics(): UseTrainingStatisticsReturn {
  const { profile } = useAuth();
  const [pairs, setPairs] = useState<RevealedPairWithContext[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [exposureCaseCount, setExposureCaseCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const isConsultant = isConsultantLevel(profile?.careerStage);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(async () => {
        setIsLoading(true);
        try {
          const [data, pendingTargets, outbox, exposures] = await Promise.all([
            getAllRevealedPairs(),
            getAllEpaTargets().catch(() => []),
            // Offline → empty outbox → nothing drains this round.
            getSharedOutbox().catch(
              () => [] as Awaited<ReturnType<typeof getSharedOutbox>>,
            ),
            getAllEpaExposures().catch(() => []),
          ]);
          // Phase C: partial (72h) reveals are excluded from every analytic.
          setPairs(fullPairsOnly(data));
          setPendingCount(
            countPendingEpaTargets(
              filterPendingEpaTargets({
                targetsByCase: pendingTargets,
                outbox,
                revealedSharedCaseIds: new Set(data.map((p) => p.sharedCaseId)),
              }),
            ),
          );
          setExposureCaseCount(
            exposures.filter((e) =>
              e.exposures.some((x) => x.participantContactId === "self"),
            ).length,
          );
        } catch (error) {
          console.error("Error loading assessment pairs:", error);
        } finally {
          setIsLoading(false);
        }
      });
      return () => task.cancel();
    }, []),
  );

  const isEmpty = pairs.length === 0;

  const learningCurves = useMemo(
    () => (isEmpty ? [] : computeLearningCurves(pairs)),
    [pairs, isEmpty],
  );

  const teachingAggregate = useMemo<TeachingAggregate | null>(
    () => (isEmpty ? null : computeTeachingAggregate(pairs)),
    [pairs, isEmpty],
  );

  const calibrationScore = useMemo<CalibrationScore | null>(
    () => (isEmpty ? null : computeCalibrationScore(pairs)),
    [pairs, isEmpty],
  );

  const autonomyGap = useMemo<AutonomyGapStats | null>(
    () => (isEmpty ? null : computeAutonomyGap(pairs, "trainee")),
    [pairs, isEmpty],
  );

  const trainingOverview = useMemo<TrainingOverviewStats | null>(
    () => (isEmpty ? null : computeTrainingOverview(pairs)),
    [pairs, isEmpty],
  );

  const entrustmentDistribution = useMemo(
    () => (isEmpty ? [] : computeEntrustmentDistribution(pairs)),
    [pairs, isEmpty],
  );

  return {
    isLoading,
    isEmpty,
    isConsultant,
    pendingCount,
    exposureCaseCount,
    learningCurves,
    teachingAggregate,
    calibrationScore,
    autonomyGap,
    trainingOverview,
    entrustmentDistribution,
    allPairs: pairs,
  };
}
