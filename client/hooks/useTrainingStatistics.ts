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
  splitPairsByViewerRole,
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
  /** Any full pair where the viewer was the SUPERVISOR — drives the teaching view. */
  hasSupervisorPairs: boolean;
  /** Any full pair where the viewer was the TRAINEE — drives the learner view. */
  hasTraineePairs: boolean;
  /** Pre-2.25.0 pairs whose side could not be recovered; shown in neither view. */
  unattributedCount: number;
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

  // Split ONCE by which side the viewer was on. Trainee-facing analytics
  // read `asTrainee`, supervisor-facing ones read `asSupervisor`. A store
  // that is ENTIRELY role-less (every record predates 2.25.0 and none could
  // be backfilled) falls back to the pre-2.25.0 behaviour — the profile's
  // career stage decides which side the whole set belongs to — so nobody
  // loses their history overnight.
  const split = useMemo(() => {
    const s = splitPairsByViewerRole(pairs);
    if (
      s.asTrainee.length === 0 &&
      s.asSupervisor.length === 0 &&
      s.unattributed.length > 0
    ) {
      return isConsultant
        ? { asTrainee: [], asSupervisor: s.unattributed, unattributed: [] }
        : { asTrainee: s.unattributed, asSupervisor: [], unattributed: [] };
    }
    return s;
  }, [pairs, isConsultant]);
  const traineePairs = split.asTrainee;
  const supervisorPairs = split.asSupervisor;

  const learningCurves = useMemo(
    () => (traineePairs.length ? computeLearningCurves(traineePairs) : []),
    [traineePairs],
  );

  const teachingAggregate = useMemo<TeachingAggregate | null>(
    () =>
      supervisorPairs.length ? computeTeachingAggregate(supervisorPairs) : null,
    [supervisorPairs],
  );

  const calibrationScore = useMemo<CalibrationScore | null>(
    () => (traineePairs.length ? computeCalibrationScore(traineePairs) : null),
    [traineePairs],
  );

  const autonomyGap = useMemo<AutonomyGapStats | null>(
    () =>
      traineePairs.length ? computeAutonomyGap(traineePairs, "trainee") : null,
    [traineePairs],
  );

  const trainingOverview = useMemo<TrainingOverviewStats | null>(
    () => (traineePairs.length ? computeTrainingOverview(traineePairs) : null),
    [traineePairs],
  );

  const entrustmentDistribution = useMemo(
    () =>
      supervisorPairs.length
        ? computeEntrustmentDistribution(supervisorPairs)
        : [],
    [supervisorPairs],
  );

  return {
    isLoading,
    isEmpty,
    isConsultant,
    hasSupervisorPairs: supervisorPairs.length > 0,
    hasTraineePairs: traineePairs.length > 0,
    unattributedCount: split.unattributed.length,
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
