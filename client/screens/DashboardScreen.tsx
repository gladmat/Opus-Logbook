import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  InteractionManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
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
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import {
  Case,
  Specialty,
  type TimelineEvent,
  type MediaAttachment,
} from "@/types/case";
import { INFECTION_SYNDROME_LABELS } from "@/types/infection";
import { getCases, updateCase, saveTimelineEvent } from "@/lib/storage";
import { toIsoDateValue } from "@/lib/dateValues";
import { MediaCapture } from "@/components/MediaCapture";
import { useActiveEpisodes } from "@/hooks/useActiveEpisodes";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useAuth } from "@/contexts/AuthContext";
import { getVisibleSpecialties } from "@/lib/personalization";
import { SpecialtyFilterBar } from "@/components/dashboard/SpecialtyFilterBar";
import {
  caseNeedsHistology,
  getFirstHistologyTarget,
} from "@/lib/skinCancerConfig";
import { AddCaseFAB } from "@/components/dashboard/AddCaseFAB";
import { RecentCasesList } from "@/components/dashboard/RecentCasesList";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { PracticePulseRow } from "@/components/dashboard/PracticePulseRow";
import { NeedsAttentionCarousel } from "@/components/dashboard/NeedsAttentionCarousel";
import { usePracticePulse } from "@/hooks/usePracticePulse";
import { useAttentionItems } from "@/hooks/useAttentionItems";
import type { AttentionItem } from "@/hooks/useAttentionItems";
import {
  HISTOLOGY_FILTER_ID,
  buildAttentionCaseFormParams,
  buildDashboardSummary,
  filterCasesByVisibleSpecialties,
  filterDashboardCases,
  filterOutPlannedCases,
} from "@/lib/dashboardSelectors";
import { buildMediaContextFromCase } from "@/lib/mediaContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(
    null,
  );
  const [isFilterSticky, setIsFilterSticky] = useState(false);

  const { episodes: activeEpisodes, refresh: refreshEpisodes } =
    useActiveEpisodes();
  const visibleSpecialties = useMemo(
    () => getVisibleSpecialties(profile),
    [profile],
  );

  // Discharge modal state
  const [dischargeModalVisible, setDischargeModalVisible] = useState(false);
  const [dischargeCase, setDischargeCase] = useState<Case | null>(null);
  const [dischargeDate, setDischargeDate] = useState(new Date());
  const [dischargePhotos, setDischargePhotos] = useState<MediaAttachment[]>([]);
  const [showDischargeDatePicker, setShowDischargeDatePicker] = useState(false);

  const loadCases = async () => {
    try {
      const data = await getCases();
      setCases(data);
    } catch (error) {
      console.error("Error loading cases:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
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

  // --- Derived data ---

  const personalizedCases = useMemo(
    () =>
      filterOutPlannedCases(
        filterCasesByVisibleSpecialties(cases, visibleSpecialties),
      ),
    [cases, visibleSpecialties],
  );

  const dashboardSummary = useMemo(
    () => buildDashboardSummary(personalizedCases, caseNeedsHistology),
    [personalizedCases],
  );

  const visibleEpisodes = useMemo(
    () =>
      activeEpisodes.filter(({ episode }) =>
        visibleSpecialties.includes(episode.specialty),
      ),
    [activeEpisodes, visibleSpecialties],
  );

  const filteredCases = useMemo(() => {
    return filterDashboardCases(
      personalizedCases,
      selectedSpecialty,
      caseNeedsHistology,
    );
  }, [personalizedCases, selectedSpecialty]);

  const selectedDashboardSpecialty = useMemo(
    () =>
      selectedSpecialty && selectedSpecialty !== HISTOLOGY_FILTER_ID
        ? (selectedSpecialty as Specialty)
        : null,
    [selectedSpecialty],
  );
  const pulseData = usePracticePulse(filteredCases);
  const caseAttentionItems = useAttentionItems(
    personalizedCases,
    visibleEpisodes,
    selectedSpecialty,
  );

  // Inbox moved to header icon — attention carousel is clinical-only
  const attentionItems = caseAttentionItems;

  // --- Handlers ---

  const handleOpenDischargeModal = (caseItem: Case) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDischargeCase(caseItem);
    setDischargeDate(new Date());
    setDischargePhotos([]);
    setDischargeModalVisible(true);
  };

  const handleConfirmDischarge = async () => {
    if (!dischargeCase) return;

    const dateStr = toIsoDateValue(dischargeDate);

    try {
      await updateCase(dischargeCase.id, {
        dischargeDate: dateStr,
        infectionOverlay: dischargeCase.infectionOverlay
          ? {
              ...dischargeCase.infectionOverlay,
              resolvedDate: dateStr,
            }
          : undefined,
      });

      // Save discharge photos as a timeline event
      if (dischargePhotos.length > 0) {
        const event: TimelineEvent = {
          id: `discharge-photo-${Date.now()}`,
          caseId: dischargeCase.id,
          eventType: "discharge_photo",
          note: "",
          createdAt: dischargeDate.toISOString(),
          clinicalContext: "discharge",
          mediaAttachments: dischargePhotos,
        };
        await saveTimelineEvent(event);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setCases((prev) =>
        prev.map((c) =>
          c.id === dischargeCase.id
            ? {
                ...c,
                dischargeDate: dateStr,
                infectionOverlay: c.infectionOverlay
                  ? {
                      ...c.infectionOverlay,
                      resolvedDate: dateStr,
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

  const handleAddCase = useCallback(() => {
    if (selectedSpecialty && selectedSpecialty !== HISTOLOGY_FILTER_ID) {
      navigation.navigate("CaseForm", {
        specialty: selectedSpecialty as Specialty,
      });
    } else {
      navigation.navigate("AddCase");
    }
  }, [navigation, selectedSpecialty]);

  const handlePlanCase = useCallback(() => {
    navigation.navigate("PlanCase");
  }, [navigation]);

  const handleQuickCapture = useCallback(() => {
    navigation.navigate("OpusCamera", {
      quickSnap: true,
      targetMode: "inbox",
    });
  }, [navigation]);

  const handleAttentionLogCase = useCallback(
    (item: AttentionItem) => {
      const params = buildAttentionCaseFormParams(
        item,
        visibleEpisodes,
        selectedDashboardSpecialty,
      );
      if (params) {
        navigation.navigate("CaseForm", params);
      }
    },
    [navigation, selectedDashboardSpecialty, visibleEpisodes],
  );

  const handleAttentionDischarge = useCallback(
    (caseId: string) => {
      const caseItem = personalizedCases.find((c) => c.id === caseId);
      if (caseItem) {
        handleOpenDischargeModal(caseItem);
      }
    },
    [personalizedCases],
  );

  const handleAttentionCardPress = useCallback(
    (item: AttentionItem) => {
      if (
        (item.type === "inpatient" || item.type === "infection") &&
        item.caseId
      ) {
        navigation.navigate("CaseDetail", { caseId: item.caseId });
      } else if (item.type === "episode" && item.episodeId) {
        navigation.navigate("EpisodeDetail", { episodeId: item.episodeId });
      }
    },
    [navigation],
  );

  const handleViewAllAttention = useCallback(() => {
    navigation.navigate("NeedsAttentionList", {
      selectedSpecialty: selectedDashboardSpecialty,
    });
  }, [navigation, selectedDashboardSpecialty]);

  const handleAddEvent = useCallback(
    (caseId: string) => {
      const caseData = personalizedCases.find((item) => item.id === caseId);
      if (!caseData) return;

      navigation.navigate("AddTimelineEvent", {
        caseId: caseData.id,
        mediaContext: buildMediaContextFromCase(caseData),
      });
    },
    [navigation, personalizedCases],
  );

  const handleAddEventFromCase = useCallback(
    (caseData: Case) => {
      navigation.navigate("AddTimelineEvent", {
        caseId: caseData.id,
        mediaContext: buildMediaContextFromCase(caseData),
      });
    },
    [navigation],
  );

  const handleAddHistology = useCallback(
    (caseId: string) => {
      const caseData = personalizedCases.find((c) => c.id === caseId);
      if (!caseData) return;
      const target = getFirstHistologyTarget(caseData);
      if (target) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("AddHistology", {
          caseId,
          diagnosisGroupIndex: target.groupIndex,
          lesionIndex: target.lesionIndex,
        });
      }
    },
    [navigation, personalizedCases],
  );

  const handleAddHistologyFromCase = useCallback(
    (caseData: Case) => {
      handleAddHistology(caseData.id);
    },
    [handleAddHistology],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      setIsFilterSticky(y > 0);
    },
    [],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        stickyHeaderIndices={[0]}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        contentContainerStyle={{
          paddingBottom: tabBarHeight + Spacing.xl + 80,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.link}
            progressViewOffset={0}
          />
        }
      >
        <SpecialtyFilterBar
          selectedSpecialty={selectedSpecialty}
          onSelectSpecialty={setSelectedSpecialty}
          caseCounts={dashboardSummary.caseCounts}
          totalCaseCount={dashboardSummary.totalCaseCount}
          isSticky={isFilterSticky}
          awaitingHistologyCount={dashboardSummary.awaitingHistologyCount}
        />

        {/* Zone 1 — Needs Attention */}
        <NeedsAttentionCarousel
          items={attentionItems}
          onLogCase={handleAttentionLogCase}
          onDischarge={handleAttentionDischarge}
          onCardPress={handleAttentionCardPress}
          onViewAll={handleViewAllAttention}
          onAddEvent={handleAddEvent}
          onAddHistology={handleAddHistology}
        />

        {/* Zone 2 — Practice Pulse */}
        <PracticePulseRow
          pulseData={pulseData}
          totalCaseCount={personalizedCases.length}
        />

        {/* Zone 3 — Recent Cases */}
        {!loading &&
        filteredCases.length === 0 &&
        personalizedCases.length === 0 ? (
          <DashboardEmptyState />
        ) : (
          <RecentCasesList
            cases={filteredCases}
            selectedSpecialty={selectedSpecialty}
            totalCount={filteredCases.length}
            onCasePress={handleCasePress}
            loading={loading}
            onAddEvent={handleAddEventFromCase}
            onAddHistology={handleAddHistologyFromCase}
          />
        )}
      </ScrollView>

      <AddCaseFAB
        onAddCase={handleAddCase}
        onPlanCase={handlePlanCase}
        onQuickCapture={handleQuickCapture}
      />

      {/* Discharge Modal */}
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
                    Discharge Photos (Optional)
                  </ThemedText>
                  <MediaCapture
                    attachments={dischargePhotos}
                    onAttachmentsChange={setDischargePhotos}
                    maxAttachments={15}
                    mediaType="photo"
                    eventType="discharge_photo"
                    defaultMediaDate={toIsoDateValue(dischargeDate)}
                    mediaContext={
                      dischargeCase
                        ? buildMediaContextFromCase(dischargeCase)
                        : undefined
                    }
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
                    <Feather name="check" size={18} color={theme.buttonText} />
                    <ThemedText
                      style={[
                        styles.dischargeConfirmText,
                        { color: theme.buttonText },
                      ]}
                    >
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
    fontSize: 15,
    fontWeight: "600",
  },
});
