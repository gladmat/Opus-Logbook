import { useState, useCallback, useMemo } from "react";
import { InteractionManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Case, Specialty, getCaseSpecialties } from "@/types/case";
import { getCases } from "@/lib/storage";
import {
  calculateBaseStatistics,
  calculateFreeFlapStatistics,
  calculateStatistics,
  calculateEntryTimeStats,
  type BaseStatistics,
  type FreeFlapStatistics,
  type SpecialtyStatistics,
  type EntryTimeStats,
} from "@/lib/statistics";
import {
  computeCareerOverview,
  computeMonthlyVolume,
  computeOperationalInsights,
  computeMilestones,
  computeSkinCancerInsights,
  computeBurnsInsights,
  computeHandCaseTypeInsights,
  type CareerOverview,
  type MonthlyVolume,
  type OperationalInsights,
  type MilestoneEvent,
  type SkinCancerInsights,
  type BurnsInsights,
  type HandCaseTypeInsights,
} from "@/lib/statisticsHelpers";

export interface UseStatisticsReturn {
  isLoading: boolean;
  isEmpty: boolean;
  totalCases: number;
  careerOverview: CareerOverview | null;
  monthlyVolume: MonthlyVolume[];
  baseStats: BaseStatistics | null;
  freeFlapStats: FreeFlapStatistics | null;
  specialtyStats: Record<Specialty, SpecialtyStatistics | null>;
  operationalInsights: OperationalInsights | null;
  milestones: MilestoneEvent[];
  entryTimeStats: EntryTimeStats | null;
  skinCancerInsights: SkinCancerInsights | null;
  burnsInsights: BurnsInsights | null;
  handCaseTypeInsights: HandCaseTypeInsights | null;
}

export function useStatistics(): UseStatisticsReturn {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          const data = await getCases();
          setCases(data);
        } catch (error) {
          console.error("Error loading cases for statistics:", error);
        } finally {
          setIsLoading(false);
        }
      });
      return () => task.cancel();
    }, []),
  );

  const isEmpty = cases.length === 0;
  const totalCases = cases.length;

  const careerOverview = useMemo<CareerOverview | null>(
    () => (isEmpty ? null : computeCareerOverview(cases)),
    [cases, isEmpty],
  );

  const monthlyVolume = useMemo<MonthlyVolume[]>(
    () => (isEmpty ? [] : computeMonthlyVolume(cases)),
    [cases, isEmpty],
  );

  const baseStats = useMemo<BaseStatistics | null>(
    () => (isEmpty ? null : calculateBaseStatistics(cases)),
    [cases, isEmpty],
  );

  const freeFlapStats = useMemo<FreeFlapStatistics | null>(() => {
    if (isEmpty) return null;
    const stats = calculateFreeFlapStatistics(cases);
    return stats.totalCases > 0 ? stats : null;
  }, [cases, isEmpty]);

  const specialtyStats = useMemo<
    Record<Specialty, SpecialtyStatistics | null>
  >(() => {
    if (isEmpty || !careerOverview) {
      return {} as Record<Specialty, SpecialtyStatistics | null>;
    }
    const result = {} as Record<Specialty, SpecialtyStatistics | null>;
    for (const s of careerOverview.specialtiesUsed) {
      const specCases = cases.filter((c) => getCaseSpecialties(c).includes(s));
      result[s] =
        specCases.length > 0 ? calculateStatistics(specCases, s) : null;
    }
    return result;
  }, [cases, isEmpty, careerOverview]);

  const operationalInsights = useMemo<OperationalInsights | null>(
    () =>
      isEmpty
        ? null
        : computeOperationalInsights(cases, baseStats ?? undefined),
    [cases, isEmpty, baseStats],
  );

  const milestones = useMemo<MilestoneEvent[]>(
    () => (isEmpty ? [] : computeMilestones(cases)),
    [cases, isEmpty],
  );

  const entryTimeStats = useMemo<EntryTimeStats | null>(
    () => (isEmpty ? null : calculateEntryTimeStats(cases)),
    [cases, isEmpty],
  );

  const skinCancerInsights = useMemo<SkinCancerInsights | null>(() => {
    if (isEmpty || !careerOverview) return null;
    if (!careerOverview.specialtiesUsed.includes("skin_cancer" as Specialty))
      return null;
    const scCases = cases.filter((c) =>
      getCaseSpecialties(c).includes("skin_cancer" as Specialty),
    );
    return scCases.length > 0 ? computeSkinCancerInsights(scCases) : null;
  }, [cases, isEmpty, careerOverview]);

  const burnsInsights = useMemo<BurnsInsights | null>(() => {
    if (isEmpty || !careerOverview) return null;
    if (!careerOverview.specialtiesUsed.includes("burns" as Specialty))
      return null;
    const burnsCases = cases.filter((c) =>
      getCaseSpecialties(c).includes("burns" as Specialty),
    );
    return burnsCases.length > 0 ? computeBurnsInsights(burnsCases) : null;
  }, [cases, isEmpty, careerOverview]);

  const handCaseTypeInsights = useMemo<HandCaseTypeInsights | null>(() => {
    if (isEmpty || !careerOverview) return null;
    if (!careerOverview.specialtiesUsed.includes("hand_wrist" as Specialty))
      return null;
    const handCases = cases.filter((c) =>
      getCaseSpecialties(c).includes("hand_wrist" as Specialty),
    );
    return handCases.length > 0 ? computeHandCaseTypeInsights(handCases) : null;
  }, [cases, isEmpty, careerOverview]);

  return {
    isLoading,
    isEmpty,
    totalCases,
    careerOverview,
    monthlyVolume,
    baseStats,
    freeFlapStats,
    specialtyStats,
    operationalInsights,
    milestones,
    entryTimeStats,
    skinCancerInsights,
    burnsInsights,
    handCaseTypeInsights,
  };
}
