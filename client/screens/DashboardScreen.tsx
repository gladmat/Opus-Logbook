import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  Pressable,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  Alert,
  InteractionManager,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import {
  Case,
  Specialty,
  SPECIALTY_LABELS,
  ROLE_LABELS,
} from "@/types/case";
import { getCasePrimaryTitle } from "@/lib/caseDiagnosisSummary";
import { INFECTION_SYNDROME_LABELS } from "@/types/infection";
import {
  getCases,
  getCasesPendingFollowUp,
  getLatestCaseForEpisode,
  markNoComplications,
  updateCase,
} from "@/lib/storage";
import { CaseCard } from "@/components/CaseCard";
import { SkeletonCard } from "@/components/LoadingState";
import { ActiveEpisodesSection } from "@/components/ActiveEpisodesSection";
import { useActiveEpisodes } from "@/hooks/useActiveEpisodes";
import type { TreatmentEpisode, EpisodePrefillData } from "@/types/episode";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useAuth } from "@/contexts/AuthContext";
import { getVisibleSpecialties } from "@/lib/personalization";
import {
  StatisticsFilters,
  TimePeriod,
  TIME_PERIOD_LABELS,
  ROLE_FILTER_LABELS,
  filterCases,
  calculateStatistics,
  calculateInfectionStatistics,
  calculateTopDiagnosisProcedurePairs,
  calculateSuggestionAcceptanceStats,
  calculateEntryTimeStats,
  formatEntryTime,
  getUniqueFacilities,
  formatDuration,
  formatPercentage,
  formatMonthLabel,
  BaseStatistics,
  FreeFlapStatistics,
  HandSurgeryStatistics,
} from "@/lib/statistics";

const TIME_PERIODS: TimePeriod[] = [
  "this_year",
  "last_6_months",
  "last_12_months",
  "all_time",
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function getCaseSpecialties(caseData: Case): Specialty[] {
  return Array.from(
    new Set([
      caseData.specialty,
      ...caseData.diagnosisGroups.map((group) => group.specialty),
    ]),
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  trend?: "up" | "down" | "neutral";
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}: StatCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}
    >
      <View
        style={[styles.statIconContainer, { backgroundColor: color + "20" }]}
      >
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <ThemedText style={[styles.statValue, { color: theme.text }]}>
          {value}
        </ThemedText>
        <ThemedText style={[styles.statTitle, { color: theme.textSecondary }]}>
          {title}
        </ThemedText>
        {subtitle ? (
          <View style={styles.statSubtitleRow}>
            {trend && trend !== "neutral" ? (
              <Feather
                name={trend === "up" ? "trending-up" : "trending-down"}
                size={12}
                color={trend === "up" ? theme.success : theme.error}
              />
            ) : null}
            <ThemedText
              style={[styles.statSubtitle, { color: theme.textTertiary }]}
            >
              {subtitle}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function FilterChip({ label, selected, onPress }: FilterChipProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? theme.link : theme.backgroundDefault,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.filterText,
          { color: selected ? theme.buttonText : theme.text },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

interface DropdownSelectProps {
  label: string;
  value: string;
  onPress: () => void;
}

function DropdownSelect({ label, value, onPress }: DropdownSelectProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.dropdownSelect,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
      ]}
    >
      <View>
        <ThemedText
          style={[styles.dropdownLabel, { color: theme.textSecondary }]}
        >
          {label}
        </ThemedText>
        <ThemedText style={styles.dropdownValue} numberOfLines={1}>
          {value}
        </ThemedText>
      </View>
      <Feather name="chevron-down" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [cases, setCases] = useState<Case[]>([]);
  const [pendingFollowUps, setPendingFollowUps] = useState<Case[]>([]);
  const [showFollowUps, setShowFollowUps] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { episodes: activeEpisodes, refresh: refreshEpisodes } =
    useActiveEpisodes();
  const visibleSpecialties = useMemo(
    () => getVisibleSpecialties(profile),
    [profile],
  );
  const specialtyFilters = useMemo(
    () => ["all", ...visibleSpecialties] as (Specialty | "all")[],
    [visibleSpecialties],
  );

  const [filters, setFilters] = useState<StatisticsFilters>({
    specialty: "all",
    timePeriod: "this_year",
    facility: "all",
    role: "all",
  });

  const [showFacilityPicker, setShowFacilityPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const loadCases = async () => {
    try {
      const data = await getCases();
      setCases(data);
      setPendingFollowUps(getCasesPendingFollowUp(data));
    } catch (error) {
      console.error("Error loading cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNoComplications = async (caseId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markNoComplications(caseId);
    setPendingFollowUps((prev) => prev.filter((c) => c.id !== caseId));
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              complicationsReviewed: true,
              complicationsReviewedAt: new Date().toISOString(),
              hasComplications: false,
            }
          : c,
      ),
    );
  };

  const handleAddComplication = useCallback(
    (caseData: Case) => {
      navigation.navigate("CaseDetail", {
        caseId: caseData.id,
        showComplicationForm: true,
      });
    },
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      // Wait for navigation/animations to complete before decrypting cases
      // so the UI stays responsive during transitions
      const task = InteractionManager.runAfterInteractions(() => {
        loadCases();
      });
      return () => task.cancel();
    }, []),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCases(), refreshEpisodes()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (
      filters.specialty !== "all" &&
      !visibleSpecialties.includes(filters.specialty)
    ) {
      setFilters((prev) => ({ ...prev, specialty: "all" }));
    }
  }, [filters.specialty, visibleSpecialties]);

  const personalizedCases = useMemo(
    () =>
      cases.filter((caseData) =>
        getCaseSpecialties(caseData).some((specialty) =>
          visibleSpecialties.includes(specialty),
        ),
      ),
    [cases, visibleSpecialties],
  );

  const visiblePendingFollowUps = useMemo(
    () =>
      pendingFollowUps.filter((caseData) =>
        getCaseSpecialties(caseData).some((specialty) =>
          visibleSpecialties.includes(specialty),
        ),
      ),
    [pendingFollowUps, visibleSpecialties],
  );

  const visibleEpisodes = useMemo(
    () =>
      activeEpisodes.filter(({ episode }) =>
        visibleSpecialties.includes(episode.specialty),
      ),
    [activeEpisodes, visibleSpecialties],
  );

  const filteredCases = useMemo(
    () => filterCases(personalizedCases, filters),
    [personalizedCases, filters],
  );
  const statistics = useMemo(
    () => calculateStatistics(filteredCases, filters.specialty),
    [filteredCases, filters.specialty],
  );
  const infectionStats = useMemo(
    () => calculateInfectionStatistics(filteredCases),
    [filteredCases],
  );
  const recentCases = useMemo(() => filteredCases.slice(0, 5), [filteredCases]);
  const facilities = useMemo(
    () => getUniqueFacilities(personalizedCases),
    [personalizedCases],
  );
  const topPairs = useMemo(
    () => calculateTopDiagnosisProcedurePairs(filteredCases, 5),
    [filteredCases],
  );
  const suggestionStats = useMemo(
    () => calculateSuggestionAcceptanceStats(filteredCases),
    [filteredCases],
  );
  const entryTimeStats = useMemo(
    () => calculateEntryTimeStats(filteredCases),
    [filteredCases],
  );

  const activeCases = useMemo(() => {
    return personalizedCases
      .filter((c) => c.infectionOverlay && !c.dischargeDate)
      .sort(
        (a, b) =>
          new Date(b.procedureDate).getTime() -
          new Date(a.procedureDate).getTime(),
      );
  }, [personalizedCases]);

  const currentInpatients = useMemo(() => {
    return personalizedCases
      .filter((c) => !c.dischargeDate)
      .sort(
        (a, b) =>
          new Date(b.procedureDate).getTime() -
          new Date(a.procedureDate).getTime(),
      );
  }, [personalizedCases]);

  const [showInpatients, setShowInpatients] = useState(true);
  const [showActiveCases, setShowActiveCases] = useState(true);

  // Discharge modal state
  const [dischargeModalVisible, setDischargeModalVisible] = useState(false);
  const [dischargeCase, setDischargeCase] = useState<Case | null>(null);
  const [dischargeDate, setDischargeDate] = useState(new Date());
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [showDischargeDatePicker, setShowDischargeDatePicker] = useState(false);

  const handleOpenDischargeModal = (caseItem: Case) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDischargeCase(caseItem);
    setDischargeDate(new Date());
    setDischargeNotes("");
    setDischargeModalVisible(true);
  };

  const handleConfirmDischarge = async () => {
    if (!dischargeCase) return;

    try {
      await updateCase(dischargeCase.id, {
        dischargeDate: dischargeDate.toISOString().split("T")[0],
        infectionOverlay: dischargeCase.infectionOverlay
          ? {
              ...dischargeCase.infectionOverlay,
              dischargeNotes: dischargeNotes || undefined,
              resolvedDate: dischargeDate.toISOString().split("T")[0],
            }
          : undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update local state
      setCases((prev) =>
        prev.map((c) =>
          c.id === dischargeCase.id
            ? {
                ...c,
                dischargeDate: dischargeDate.toISOString().split("T")[0],
                infectionOverlay: c.infectionOverlay
                  ? {
                      ...c.infectionOverlay,
                      dischargeNotes: dischargeNotes || undefined,
                      resolvedDate: dischargeDate.toISOString().split("T")[0],
                    }
                  : undefined,
              }
            : c,
        ),
      );

      setDischargeModalVisible(false);
      setDischargeCase(null);
    } catch (error) {
      console.error("Error discharging case:", error);
      Alert.alert("Error", "Failed to discharge case. Please try again.");
    }
  };

  const handleDischargeDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowDischargeDatePicker(false);
    if (selectedDate) {
      setDischargeDate(selectedDate);
    }
  };

  const handleCasePress = useCallback(
    (caseData: Case) => {
      navigation.navigate("CaseDetail", { caseId: caseData.id });
    },
    [navigation],
  );

  const handleNavigateEpisode = useCallback(
    (episodeId: string) => {
      navigation.navigate("EpisodeDetail", { episodeId });
    },
    [navigation],
  );

  const handleLogCase = useCallback(
    async (episode: TreatmentEpisode) => {
      const lastCase = await getLatestCaseForEpisode(episode.id);
      const linkedCases = visibleEpisodes.find(
        (e) => e.episode.id === episode.id,
      )?.cases;
      const seq = (linkedCases?.length ?? 0) + 1;

      const prefill: EpisodePrefillData = {
        patientIdentifier: episode.patientIdentifier,
        facility: lastCase?.facility,
        specialty: episode.specialty,
        diagnosisGroups: lastCase?.diagnosisGroups,
        encounterClass: lastCase?.encounterClass,
        reconstructionTiming: lastCase?.reconstructionTiming,
        priorRadiotherapy: lastCase?.priorRadiotherapy,
        priorChemotherapy: lastCase?.priorChemotherapy,
        episodeSequence: seq,
      };

      navigation.navigate("CaseForm", {
        specialty: episode.specialty,
        episodeId: episode.id,
        episodePrefill: prefill,
      });
    },
    [navigation, visibleEpisodes],
  );

  const handleViewAllEpisodes = useCallback(() => {
    navigation.navigate("EpisodeList");
  }, [navigation]);

  const handleSpecialtyPress = (specialty: Specialty | "all") => {
    Haptics.selectionAsync();
    setFilters((prev) => ({ ...prev, specialty }));
  };

  const handleTimePeriodPress = (timePeriod: TimePeriod) => {
    Haptics.selectionAsync();
    setFilters((prev) => ({ ...prev, timePeriod }));
  };

  const isFreeFlapStats = (
    stats: BaseStatistics,
  ): stats is FreeFlapStatistics => {
    return "flapSurvivalRate" in stats;
  };

  const isHandSurgeryStats = (
    stats: BaseStatistics,
  ): stats is HandSurgeryStatistics => {
    return "nerveRepairCount" in stats;
  };

  const renderCaseItem = useCallback(
    ({ item, index }: { item: Case; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <CaseCard caseData={item} onPress={() => handleCasePress(item)} />
        {index < recentCases.length - 1 ? (
          <View style={styles.separator} />
        ) : null}
      </Animated.View>
    ),
    [recentCases.length, handleCasePress],
  );

  const keyExtractor = useCallback((item: Case) => item.id, []);

  const listHeader = useMemo(
    () => (
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
          style={styles.filterScroll}
        >
          {specialtyFilters.map((specialty) => (
            <FilterChip
              key={specialty}
              label={specialty === "all" ? "All" : SPECIALTY_LABELS[specialty]}
              selected={filters.specialty === specialty}
              onPress={() => handleSpecialtyPress(specialty)}
            />
          ))}
        </ScrollView>

        <View style={styles.secondaryFilters}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timePeriodContainer}
          >
            {TIME_PERIODS.map((period) => (
              <Pressable
                key={period}
                onPress={() => handleTimePeriodPress(period)}
                style={[
                  styles.timePeriodChip,
                  {
                    backgroundColor:
                      filters.timePeriod === period
                        ? theme.link + "20"
                        : "transparent",
                    borderColor:
                      filters.timePeriod === period ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.timePeriodText,
                    {
                      color:
                        filters.timePeriod === period
                          ? theme.link
                          : theme.textSecondary,
                    },
                  ]}
                >
                  {TIME_PERIOD_LABELS[period]}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.dropdownRow}>
          <View style={styles.dropdownWrapper}>
            <DropdownSelect
              label="Facility"
              value={
                filters.facility === "all" ? "All Facilities" : filters.facility
              }
              onPress={() => setShowFacilityPicker(true)}
            />
          </View>
          <View style={styles.dropdownWrapper}>
            <DropdownSelect
              label="Role"
              value={ROLE_FILTER_LABELS[filters.role]}
              onPress={() => setShowRolePicker(true)}
            />
          </View>
        </View>

        <ActiveEpisodesSection
          episodes={visibleEpisodes}
          onNavigateEpisode={handleNavigateEpisode}
          onLogCase={handleLogCase}
          onViewAll={handleViewAllEpisodes}
        />

        {activeCases.length > 0 ? (
          <View style={styles.followUpSection}>
            <Pressable
              onPress={() => setShowActiveCases(!showActiveCases)}
              style={styles.followUpHeader}
            >
              <View style={styles.followUpTitleRow}>
                <Feather name="activity" size={18} color={theme.error} />
                <ThemedText
                  style={[styles.followUpTitle, { color: theme.error }]}
                >
                  Infection Cases ({activeCases.length})
                </ThemedText>
              </View>
              <Feather
                name={showActiveCases ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>

            {showActiveCases ? (
              <>
                {activeCases.slice(0, 5).map((caseItem) => (
                  <View
                    key={caseItem.id}
                    style={[
                      styles.followUpCard,
                      { backgroundColor: theme.backgroundDefault },
                    ]}
                  >
                    <Pressable
                      style={styles.activeCaseContent}
                      onPress={() => handleCasePress(caseItem)}
                    >
                      <View style={styles.followUpCaseInfo}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: Spacing.xs,
                            flex: 1,
                          }}
                        >
                          <View
                            style={[
                              styles.activeBadge,
                              { backgroundColor: theme.error },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.activeBadgeText,
                                { color: "#fff" },
                              ]}
                            >
                              {caseItem.infectionOverlay?.episodes?.length || 1}{" "}
                              ep
                            </ThemedText>
                          </View>
                          <ThemedText
                            style={styles.followUpCaseType}
                            numberOfLines={1}
                          >
                            {caseItem.infectionOverlay?.syndromePrimary
                              ? INFECTION_SYNDROME_LABELS[
                                  caseItem.infectionOverlay.syndromePrimary
                                ]
                              : caseItem.procedureType}
                          </ThemedText>
                        </View>
                        <ThemedText
                          style={[
                            styles.followUpCaseDate,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {caseItem.patientIdentifier} -{" "}
                          {new Date(
                            caseItem.procedureDate,
                          ).toLocaleDateString()}
                        </ThemedText>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={18}
                        color={theme.textTertiary}
                      />
                    </Pressable>
                    <Pressable
                      style={[
                        styles.dischargeButton,
                        { backgroundColor: theme.success },
                      ]}
                      onPress={() => handleOpenDischargeModal(caseItem)}
                      testID={`discharge-button-${caseItem.id}`}
                    >
                      <Feather name="check-circle" size={14} color="#fff" />
                      <ThemedText style={styles.dischargeButtonText}>
                        Discharge
                      </ThemedText>
                    </Pressable>
                  </View>
                ))}

                {activeCases.length > 5 ? (
                  <ThemedText
                    style={[
                      styles.moreFollowUps,
                      { color: theme.textSecondary },
                    ]}
                  >
                    +{activeCases.length - 5} more infection cases
                  </ThemedText>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        {currentInpatients.length > 0 ? (
          <View style={styles.followUpSection}>
            <Pressable
              onPress={() => setShowInpatients(!showInpatients)}
              style={styles.followUpHeader}
            >
              <View style={styles.followUpTitleRow}>
                <Feather name="home" size={18} color={theme.warning} />
                <ThemedText
                  style={[styles.followUpTitle, { color: theme.warning }]}
                >
                  Current Inpatients ({currentInpatients.length})
                </ThemedText>
              </View>
              <Feather
                name={showInpatients ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>

            {showInpatients ? (
              <>
                {currentInpatients.slice(0, 5).map((caseItem) => {
                  const opDate = new Date(caseItem.procedureDate);
                  const today = new Date();
                  opDate.setHours(0, 0, 0, 0);
                  today.setHours(0, 0, 0, 0);
                  const postOpDays = Math.max(
                    0,
                    Math.round(
                      (today.getTime() - opDate.getTime()) /
                        (1000 * 60 * 60 * 24),
                    ),
                  );
                  const dayBg =
                    postOpDays <= 3
                      ? "#E8F5E9"
                      : postOpDays <= 7
                        ? "#FFF8E1"
                        : "#FFEBEE";
                  const dayColor =
                    postOpDays <= 3
                      ? "#2E7D32"
                      : postOpDays <= 7
                        ? "#F57F17"
                        : "#C62828";
                  return (
                    <Pressable
                      key={caseItem.id}
                      style={[
                        styles.followUpCard,
                        { backgroundColor: theme.backgroundDefault },
                      ]}
                      onPress={() => handleCasePress(caseItem)}
                    >
                      <View style={styles.activeCaseContent}>
                        <View style={styles.followUpCaseInfo}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: Spacing.xs,
                              flex: 1,
                            }}
                          >
                            <View
                              style={[
                                styles.activeBadge,
                                { backgroundColor: dayBg },
                              ]}
                            >
                              <ThemedText
                                style={[
                                  styles.activeBadgeText,
                                  { color: dayColor },
                                ]}
                              >
                                Day {postOpDays}
                              </ThemedText>
                            </View>
                            <ThemedText
                              style={styles.followUpCaseType}
                              numberOfLines={1}
                            >
                              {getCasePrimaryTitle(caseItem) ||
                                caseItem.procedureType}
                            </ThemedText>
                          </View>
                          <ThemedText
                            style={[
                              styles.followUpCaseDate,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {caseItem.patientIdentifier} -{" "}
                            {caseItem.facility || "No facility"}
                          </ThemedText>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: Spacing.sm,
                          }}
                        >
                          <Pressable
                            style={[
                              styles.dischargeButton,
                              { borderColor: theme.success },
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleOpenDischargeModal(caseItem);
                            }}
                            testID={`discharge-inpatient-${caseItem.id}`}
                          >
                            <Feather
                              name="check-circle"
                              size={13}
                              color={theme.success}
                            />
                            <ThemedText
                              style={[
                                styles.dischargeButtonText,
                                { color: theme.success },
                              ]}
                            >
                              Discharge
                            </ThemedText>
                          </Pressable>
                          <Feather
                            name="chevron-right"
                            size={18}
                            color={theme.textTertiary}
                          />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}

                {currentInpatients.length > 5 ? (
                  <ThemedText
                    style={[
                      styles.moreFollowUps,
                      { color: theme.textSecondary },
                    ]}
                  >
                    +{currentInpatients.length - 5} more inpatients
                  </ThemedText>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        {visiblePendingFollowUps.length > 0 && showFollowUps ? (
          <View style={styles.followUpSection}>
            <Pressable
              onPress={() => setShowFollowUps(false)}
              style={styles.followUpHeader}
            >
              <View style={styles.followUpTitleRow}>
                <Feather name="clock" size={18} color={theme.warning} />
                <ThemedText
                  style={[styles.followUpTitle, { color: theme.warning }]}
                >
                  Follow-ups Due ({visiblePendingFollowUps.length})
                </ThemedText>
              </View>
              <Feather
                name="chevron-up"
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>

            {visiblePendingFollowUps.slice(0, 3).map((caseItem) => (
              <View
                key={caseItem.id}
                style={[
                  styles.followUpCard,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <Pressable
                  style={styles.followUpCardContent}
                  onPress={() => handleCasePress(caseItem)}
                >
                  <View style={styles.followUpCaseInfo}>
                    <ThemedText
                      style={styles.followUpCaseType}
                      numberOfLines={1}
                    >
                      {caseItem.procedureType}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.followUpCaseDate,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {new Date(caseItem.procedureDate).toLocaleDateString()}
                    </ThemedText>
                  </View>
                </Pressable>

                <View style={styles.followUpActions}>
                  <Pressable
                    onPress={() => handleAddComplication(caseItem)}
                    style={[
                      styles.followUpButton,
                      styles.addComplicationBtn,
                      { borderColor: theme.warning },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.followUpButtonText,
                        { color: theme.warning },
                      ]}
                    >
                      Add
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => handleMarkNoComplications(caseItem.id)}
                    style={[
                      styles.followUpButton,
                      styles.noneBtn,
                      { backgroundColor: theme.success },
                    ]}
                  >
                    <Feather name="check" size={14} color={theme.buttonText} />
                    <ThemedText
                      style={[
                        styles.followUpButtonText,
                        { color: theme.buttonText },
                      ]}
                    >
                      None
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ))}

            {visiblePendingFollowUps.length > 3 ? (
              <ThemedText
                style={[styles.moreFollowUps, { color: theme.textSecondary }]}
              >
                +{visiblePendingFollowUps.length - 3} more cases pending review
              </ThemedText>
            ) : null}
          </View>
        ) : visiblePendingFollowUps.length > 0 ? (
          <Pressable
            onPress={() => setShowFollowUps(true)}
            style={[
              styles.collapsedFollowUp,
              { backgroundColor: theme.warning + "15" },
            ]}
          >
            <Feather name="clock" size={16} color={theme.warning} />
            <ThemedText
              style={[styles.collapsedFollowUpText, { color: theme.warning }]}
            >
              {visiblePendingFollowUps.length} follow-up
              {visiblePendingFollowUps.length !== 1 ? "s" : ""} due
            </ThemedText>
            <Feather name="chevron-down" size={18} color={theme.warning} />
          </Pressable>
        ) : null}

        <View style={styles.statsSection}>
          <ThemedText style={styles.sectionTitle}>Statistics</ThemedText>

          <View style={styles.statsGrid}>
            <StatCard
              title="Total Cases"
              value={statistics.totalCases.toString()}
              icon="folder"
              color={theme.link}
            />
            <StatCard
              title="Avg Duration"
              value={formatDuration(statistics.averageDurationMinutes)}
              subtitle={
                filters.role !== "all" ? ROLE_LABELS[filters.role] : undefined
              }
              icon="clock"
              color={theme.info}
            />
            <StatCard
              title="Complication Rate"
              value={formatPercentage(statistics.complicationRate)}
              icon="alert-circle"
              color={
                statistics.complicationRate > 10 ? theme.error : theme.success
              }
            />
            <StatCard
              title="Follow-up Rate"
              value={formatPercentage(statistics.followUpCompletionRate)}
              icon="check-circle"
              color={
                statistics.followUpCompletionRate >= 90
                  ? theme.success
                  : theme.warning
              }
            />
          </View>

          {isFreeFlapStats(statistics) ? (
            <View style={styles.specialtyStats}>
              <ThemedText
                style={[
                  styles.specialtyStatsTitle,
                  { color: theme.textSecondary },
                ]}
              >
                Free Flap Specific
              </ThemedText>
              <View style={styles.statsGrid}>
                <StatCard
                  title="Flap Survival"
                  value={formatPercentage(statistics.flapSurvivalRate)}
                  icon="heart"
                  color={
                    statistics.flapSurvivalRate >= 95
                      ? theme.success
                      : theme.warning
                  }
                />
                <StatCard
                  title="Avg Ischemia"
                  value={
                    statistics.averageIschemiaTimeMinutes
                      ? `${statistics.averageIschemiaTimeMinutes}m`
                      : "—"
                  }
                  icon="thermometer"
                  color={theme.info}
                />
                <StatCard
                  title="Take-back Rate"
                  value={formatPercentage(statistics.takeBackRate)}
                  icon="refresh-cw"
                  color={
                    statistics.takeBackRate > 5 ? theme.warning : theme.success
                  }
                />
              </View>

              {statistics.casesByFlapType.length > 0 ? (
                <View
                  style={[
                    styles.breakdownCard,
                    { backgroundColor: theme.backgroundDefault },
                  ]}
                >
                  <ThemedText style={styles.breakdownTitle}>
                    Cases by Flap Type
                  </ThemedText>
                  {statistics.casesByFlapType.slice(0, 5).map((item) => (
                    <View key={item.flapType} style={styles.breakdownRow}>
                      <ThemedText
                        style={styles.breakdownLabel}
                        numberOfLines={1}
                      >
                        {item.flapType}
                      </ThemedText>
                      <View style={styles.breakdownBarContainer}>
                        <View
                          style={[
                            styles.breakdownBar,
                            {
                              backgroundColor: theme.link,
                              width: `${(item.count / statistics.totalCases) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <ThemedText
                        style={[
                          styles.breakdownCount,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {item.count}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {isHandSurgeryStats(statistics) ? (
            <View style={styles.specialtyStats}>
              <ThemedText
                style={[
                  styles.specialtyStatsTitle,
                  { color: theme.textSecondary },
                ]}
              >
                Hand Surgery Specific
              </ThemedText>
              <View style={styles.statsGrid}>
                <StatCard
                  title="Nerve Repairs"
                  value={(
                    statistics as HandSurgeryStatistics
                  ).nerveRepairCount.toString()}
                  icon="activity"
                  color={theme.info}
                />
                <StatCard
                  title="Tendon Repairs"
                  value={(
                    statistics as HandSurgeryStatistics
                  ).tendonRepairCount.toString()}
                  icon="link"
                  color={theme.link}
                />
              </View>
            </View>
          ) : null}

          {statistics.casesByMonth.length > 0 ? (
            <View
              style={[
                styles.chartCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <ThemedText style={styles.chartTitle}>Cases Over Time</ThemedText>
              <View style={styles.barChart}>
                {statistics.casesByMonth.slice(-6).map((item) => {
                  const maxCount = Math.max(
                    ...statistics.casesByMonth.map((m) => m.count),
                  );
                  const heightPercent =
                    maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <View key={item.month} style={styles.barContainer}>
                      <View style={styles.barWrapper}>
                        <View
                          style={[
                            styles.bar,
                            {
                              backgroundColor: theme.link,
                              height: `${heightPercent}%`,
                            },
                          ]}
                        />
                      </View>
                      <ThemedText
                        style={[styles.barLabel, { color: theme.textTertiary }]}
                      >
                        {formatMonthLabel(item.month)}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.barValue,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {item.count}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {topPairs.length > 0 ? (
          <View
            style={[
              styles.analyticsCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.analyticsCardHeader}>
              <Feather name="bar-chart-2" size={16} color={theme.link} />
              <ThemedText style={styles.analyticsCardTitle}>
                Top Dx-Procedure Pairs
              </ThemedText>
            </View>
            {topPairs.map((pair, idx) => {
              const maxCount = topPairs[0]?.count ?? 0;
              const barWidth = maxCount > 0 ? (pair.count / maxCount) * 100 : 0;
              return (
                <View
                  key={`${pair.diagnosisName}-${pair.procedureName}-${idx}`}
                  style={styles.pairRow}
                >
                  <View style={styles.pairLabels}>
                    <ThemedText style={styles.pairDiagnosis} numberOfLines={1}>
                      {pair.diagnosisName}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.pairProcedure,
                        { color: theme.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {pair.procedureName}
                    </ThemedText>
                  </View>
                  <View style={styles.pairBarContainer}>
                    <View
                      style={[
                        styles.pairBar,
                        { backgroundColor: theme.link, width: `${barWidth}%` },
                      ]}
                    />
                  </View>
                  <ThemedText
                    style={[
                      styles.pairCount,
                      { color: theme.textSecondary, fontFamily: "monospace" },
                    ]}
                  >
                    {pair.count}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.analyticsRow}>
          {entryTimeStats.averageEntryTimeSeconds !== null ? (
            <View
              style={[
                styles.analyticsSmallCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <View
                style={[
                  styles.analyticsSmallIcon,
                  { backgroundColor: theme.info + "20" },
                ]}
              >
                <Feather name="edit-3" size={16} color={theme.info} />
              </View>
              <ThemedText
                style={[
                  styles.analyticsSmallValue,
                  { fontFamily: "monospace" },
                ]}
              >
                {formatEntryTime(entryTimeStats.averageEntryTimeSeconds)}
              </ThemedText>
              <ThemedText
                style={[
                  styles.analyticsSmallLabel,
                  { color: theme.textSecondary },
                ]}
              >
                Avg Entry Time
              </ThemedText>
              <ThemedText
                style={[
                  styles.analyticsSmallSub,
                  { color: theme.textTertiary },
                ]}
              >
                median {formatEntryTime(entryTimeStats.medianEntryTimeSeconds)}
              </ThemedText>
            </View>
          ) : null}

          {suggestionStats.totalSuggestedGroups > 0 ? (
            <View
              style={[
                styles.analyticsSmallCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <View
                style={[
                  styles.analyticsSmallIcon,
                  { backgroundColor: theme.success + "20" },
                ]}
              >
                <Feather name="check-square" size={16} color={theme.success} />
              </View>
              <ThemedText
                style={[
                  styles.analyticsSmallValue,
                  { fontFamily: "monospace" },
                ]}
              >
                {formatPercentage(suggestionStats.acceptanceRate)}
              </ThemedText>
              <ThemedText
                style={[
                  styles.analyticsSmallLabel,
                  { color: theme.textSecondary },
                ]}
              >
                Suggestion Accept
              </ThemedText>
              <ThemedText
                style={[
                  styles.analyticsSmallSub,
                  { color: theme.textTertiary },
                ]}
              >
                {suggestionStats.totalAcceptedProcedures}/
                {suggestionStats.totalSuggestedProcedures} procs
              </ThemedText>
            </View>
          ) : null}
        </View>

        {infectionStats.totalInfectionCases > 0 ? (
          <View
            style={[
              styles.infectionStatsCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.infectionStatsHeader}>
              <Feather name="activity" size={18} color={theme.error} />
              <ThemedText style={styles.infectionStatsTitle}>
                Infection Cases
              </ThemedText>
            </View>

            <View style={styles.infectionStatsGrid}>
              <View
                style={[
                  styles.infectionStatItem,
                  { borderColor: theme.border },
                ]}
              >
                <ThemedText
                  style={[styles.infectionStatValue, { color: theme.error }]}
                >
                  {infectionStats.activeInfectionCases}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.infectionStatLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Active
                </ThemedText>
              </View>
              <View
                style={[
                  styles.infectionStatItem,
                  { borderColor: theme.border },
                ]}
              >
                <ThemedText
                  style={[styles.infectionStatValue, { color: theme.success }]}
                >
                  {infectionStats.resolvedInfectionCases}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.infectionStatLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Resolved
                </ThemedText>
              </View>
              <View
                style={[
                  styles.infectionStatItem,
                  { borderColor: theme.border },
                ]}
              >
                <ThemedText style={styles.infectionStatValue}>
                  {infectionStats.totalEpisodes}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.infectionStatLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Episodes
                </ThemedText>
              </View>
              <View
                style={[
                  styles.infectionStatItem,
                  { borderColor: theme.border },
                ]}
              >
                <ThemedText style={styles.infectionStatValue}>
                  {infectionStats.averageEpisodesPerCase}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.infectionStatLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Avg/Case
                </ThemedText>
              </View>
            </View>

            {infectionStats.casesBySyndrome.length > 0 ? (
              <View style={styles.infectionBreakdown}>
                <ThemedText
                  style={[
                    styles.infectionBreakdownTitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  By Syndrome
                </ThemedText>
                {infectionStats.casesBySyndrome.slice(0, 4).map((item) => (
                  <View
                    key={item.syndrome}
                    style={styles.infectionBreakdownRow}
                  >
                    <ThemedText
                      style={styles.infectionBreakdownLabel}
                      numberOfLines={1}
                    >
                      {item.syndrome}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.infectionBreakdownCount,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {item.count}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}

            {infectionStats.casesBySeverity.length > 0 ? (
              <View style={styles.infectionBreakdown}>
                <ThemedText
                  style={[
                    styles.infectionBreakdownTitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  By Severity
                </ThemedText>
                {infectionStats.casesBySeverity.map((item) => (
                  <View
                    key={item.severity}
                    style={styles.infectionBreakdownRow}
                  >
                    <ThemedText style={styles.infectionBreakdownLabel}>
                      {item.severity}
                    </ThemedText>
                    <View style={styles.infectionSeverityBar}>
                      <View
                        style={[
                          styles.infectionSeverityFill,
                          {
                            backgroundColor:
                              item.severity === "Shock/ICU"
                                ? theme.error
                                : item.severity === "Systemic/Sepsis"
                                  ? theme.warning
                                  : theme.success,
                            width: `${Math.min((item.count / infectionStats.totalInfectionCases) * 100, 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText
                      style={[
                        styles.infectionBreakdownCount,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {item.count}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}

            {infectionStats.amputationCount > 0 ||
            infectionStats.mortalityCount > 0 ? (
              <View style={styles.infectionOutcomes}>
                {infectionStats.amputationCount > 0 ? (
                  <View
                    style={[
                      styles.infectionOutcomeItem,
                      { backgroundColor: theme.warning + "20" },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.infectionOutcomeValue,
                        { color: theme.warning },
                      ]}
                    >
                      {infectionStats.amputationCount}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.infectionOutcomeLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Amputations
                    </ThemedText>
                  </View>
                ) : null}
                {infectionStats.mortalityCount > 0 ? (
                  <View
                    style={[
                      styles.infectionOutcomeItem,
                      { backgroundColor: theme.error + "20" },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.infectionOutcomeValue,
                        { color: theme.error },
                      ]}
                    >
                      {infectionStats.mortalityCount}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.infectionOutcomeLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Deaths
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Recent Cases</ThemedText>
            {filteredCases.length > 5 ? (
              <Pressable
                onPress={() => navigation.getParent()?.navigate("Cases")}
              >
                <ThemedText style={[styles.seeAllLink, { color: theme.link }]}>
                  See All ({filteredCases.length})
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    ),
    [
      theme,
      filters,
      statistics,
      infectionStats,
      topPairs,
      entryTimeStats,
      suggestionStats,
      activeCases,
      currentInpatients,
      visiblePendingFollowUps,
      filteredCases,
      showActiveCases,
      showInpatients,
      showFollowUps,
      specialtyFilters,
      visibleEpisodes,
      navigation,
      handleAddComplication,
      handleCasePress,
      handleLogCase,
      handleNavigateEpisode,
      handleViewAllEpisodes,
    ],
  );

  const listEmpty = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.skeletonContainer}>
          <SkeletonCard height={130} />
          <SkeletonCard height={130} />
        </View>
      );
    }
    return (
      <ThemedView
        style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <Feather name="inbox" size={32} color={theme.textTertiary} />
        <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
          No cases match your filters
        </ThemedText>
      </ThemedView>
    );
  }, [loading, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={loading ? [] : recentCases}
        renderItem={renderCaseItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl + 80,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.link}
            progressViewOffset={0}
          />
        }
        maxToRenderPerBatch={10}
        windowSize={10}
        accessibilityRole="list"
      />

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate("AddCase");
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.link,
            bottom: tabBarHeight + Spacing.lg,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={28} color={theme.buttonText} />
      </Pressable>

      <Modal
        visible={showFacilityPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFacilityPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFacilityPicker(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText style={styles.modalTitle}>Select Facility</ThemedText>
            <ScrollView style={styles.modalScroll}>
              <Pressable
                style={[
                  styles.modalOption,
                  filters.facility === "all" && {
                    backgroundColor: theme.link + "20",
                  },
                ]}
                onPress={() => {
                  setFilters((prev) => ({ ...prev, facility: "all" }));
                  setShowFacilityPicker(false);
                }}
              >
                <ThemedText
                  style={[
                    styles.modalOptionText,
                    filters.facility === "all" && {
                      color: theme.link,
                      fontWeight: "600",
                    },
                  ]}
                >
                  All Facilities
                </ThemedText>
              </Pressable>
              {facilities.map((facility) => (
                <Pressable
                  key={facility}
                  style={[
                    styles.modalOption,
                    filters.facility === facility && {
                      backgroundColor: theme.link + "20",
                    },
                  ]}
                  onPress={() => {
                    setFilters((prev) => ({ ...prev, facility }));
                    setShowFacilityPicker(false);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.modalOptionText,
                      filters.facility === facility && {
                        color: theme.link,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {facility}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showRolePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRolePicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowRolePicker(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText style={styles.modalTitle}>Select Role</ThemedText>
            <ScrollView style={styles.modalScroll}>
              {(
                ["all", "PS", "PP", "AS", "ONS", "SS", "SNS", "A"] as const
              ).map((role) => (
                <Pressable
                  key={role}
                  style={[
                    styles.modalOption,
                    filters.role === role && {
                      backgroundColor: theme.link + "20",
                    },
                  ]}
                  onPress={() => {
                    setFilters((prev) => ({ ...prev, role }));
                    setShowRolePicker(false);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.modalOptionText,
                      filters.role === role && {
                        color: theme.link,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {ROLE_FILTER_LABELS[role]}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={dischargeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDischargeModalVisible(false)}
      >
        <View style={styles.dischargeModalOverlay}>
          <View
            style={[
              styles.dischargeModalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.dischargeModalHeader}>
              <ThemedText style={styles.dischargeModalTitle}>
                Discharge Patient
              </ThemedText>
              <Pressable onPress={() => setDischargeModalVisible(false)}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            {dischargeCase ? (
              <View style={styles.dischargeModalBody}>
                <View
                  style={[
                    styles.dischargePatientInfo,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText style={styles.dischargePatientId}>
                    {dischargeCase.patientIdentifier}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.dischargeSyndrome,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {dischargeCase.infectionOverlay?.syndromePrimary
                      ? INFECTION_SYNDROME_LABELS[
                          dischargeCase.infectionOverlay.syndromePrimary
                        ]
                      : dischargeCase.procedureType}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.dischargeEpisodes,
                      { color: theme.textTertiary },
                    ]}
                  >
                    {dischargeCase.infectionOverlay?.episodes?.length || 1}{" "}
                    episode(s) documented
                  </ThemedText>
                </View>

                <View style={styles.dischargeField}>
                  <ThemedText style={styles.dischargeFieldLabel}>
                    Discharge Date
                  </ThemedText>
                  <Pressable
                    onPress={() => setShowDischargeDatePicker(true)}
                    style={[
                      styles.dischargeDateButton,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <ThemedText>
                      {dischargeDate.toLocaleDateString()}
                    </ThemedText>
                    <Feather
                      name="calendar"
                      size={18}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                </View>

                {showDischargeDatePicker ? (
                  <DateTimePicker
                    value={dischargeDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDischargeDateChange}
                    maximumDate={new Date()}
                  />
                ) : null}

                <View style={styles.dischargeField}>
                  <ThemedText style={styles.dischargeFieldLabel}>
                    Discharge Notes (Optional)
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.dischargeNotesInput,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    placeholder="e.g., Infection resolved, wound healed"
                    placeholderTextColor={theme.textTertiary}
                    value={dischargeNotes}
                    onChangeText={setDischargeNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.dischargeActions}>
                  <Pressable
                    style={[
                      styles.dischargeCancelButton,
                      { borderColor: theme.border },
                    ]}
                    onPress={() => setDischargeModalVisible(false)}
                  >
                    <ThemedText>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.dischargeConfirmButton,
                      { backgroundColor: theme.success },
                    ]}
                    onPress={handleConfirmDischarge}
                    testID="confirm-discharge-button"
                  >
                    <Feather name="check" size={18} color="#fff" />
                    <ThemedText style={styles.dischargeConfirmText}>
                      Confirm Discharge
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  filterScroll: {
    marginBottom: Spacing.md,
    marginHorizontal: -Spacing.lg,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  secondaryFilters: {
    marginBottom: Spacing.md,
  },
  timePeriodContainer: {
    gap: Spacing.sm,
  },
  timePeriodChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  timePeriodText: {
    fontSize: 12,
    fontWeight: "500",
  },
  dropdownRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dropdownWrapper: {
    flex: 1,
  },
  dropdownSelect: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  dropdownLabel: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  skeletonContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statsSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 10,
  },
  specialtyStats: {
    marginTop: Spacing.lg,
  },
  specialtyStatsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  breakdownCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    ...Shadows.card,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  breakdownLabel: {
    width: 100,
    fontSize: 13,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 4,
    overflow: "hidden",
  },
  breakdownBar: {
    height: "100%",
    borderRadius: 4,
  },
  breakdownCount: {
    width: 30,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  chartCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    ...Shadows.card,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  barChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
  },
  barWrapper: {
    width: 24,
    height: 80,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: Spacing.xs,
  },
  barValue: {
    fontSize: 11,
    fontWeight: "600",
  },
  recentSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: "500",
  },
  separator: {
    height: Spacing.md,
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.sm,
    ...Shadows.card,
  },
  emptyText: {
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.floating,
  },
  followUpSection: {
    marginBottom: Spacing.lg,
  },
  followUpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  followUpTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  followUpTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  followUpCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  followUpCardContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  followUpCaseInfo: {
    flex: 1,
    gap: 2,
    marginRight: Spacing.sm,
  },
  followUpCaseType: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  followUpCaseDate: {
    fontSize: 13,
  },
  followUpActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  followUpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  addComplicationBtn: {
    borderWidth: 1,
  },
  noneBtn: {
    minWidth: 70,
    justifyContent: "center",
  },
  followUpButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  moreFollowUps: {
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    minWidth: 52,
    alignItems: "center",
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  collapsedFollowUp: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  collapsedFollowUpText: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxHeight: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.floating,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  modalOptionText: {
    fontSize: 15,
  },
  activeCaseContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dischargeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
  },
  dischargeButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dischargeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dischargeModalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: 40,
    ...Shadows.floating,
  },
  dischargeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  dischargeModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  dischargeModalBody: {
    gap: Spacing.md,
  },
  dischargePatientInfo: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  dischargePatientId: {
    fontSize: 18,
    fontWeight: "600",
  },
  dischargeSyndrome: {
    fontSize: 14,
    marginTop: 2,
  },
  dischargeEpisodes: {
    fontSize: 12,
    marginTop: 4,
  },
  dischargeField: {
    gap: Spacing.xs,
  },
  dischargeFieldLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  dischargeDateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  dischargeNotesInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 80,
  },
  dischargeActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  dischargeCancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  dischargeConfirmButton: {
    flex: 2,
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  dischargeConfirmText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  analyticsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  analyticsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  analyticsCardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  pairLabels: {
    width: 120,
  },
  pairDiagnosis: {
    fontSize: 12,
    fontWeight: "500",
  },
  pairProcedure: {
    fontSize: 11,
  },
  pairBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 4,
    overflow: "hidden",
  },
  pairBar: {
    height: "100%",
    borderRadius: 4,
  },
  pairCount: {
    width: 28,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  analyticsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  analyticsSmallCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: 4,
    ...Shadows.card,
  },
  analyticsSmallIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  analyticsSmallValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  analyticsSmallLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  analyticsSmallSub: {
    fontSize: 10,
  },
  infectionStatsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  infectionStatsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  infectionStatsTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  infectionStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infectionStatItem: {
    flex: 1,
    minWidth: "45%",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  infectionStatValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  infectionStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  infectionBreakdown: {
    marginTop: Spacing.sm,
  },
  infectionBreakdownTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  infectionBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: Spacing.sm,
  },
  infectionBreakdownLabel: {
    flex: 1,
    fontSize: 13,
  },
  infectionBreakdownCount: {
    fontSize: 13,
    fontWeight: "600",
    minWidth: 24,
    textAlign: "right",
  },
  infectionSeverityBar: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  infectionSeverityFill: {
    height: "100%",
    borderRadius: 3,
  },
  infectionOutcomes: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  infectionOutcomeItem: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  infectionOutcomeValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  infectionOutcomeLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
