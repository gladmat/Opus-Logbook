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
import { DischargeDatePickerField } from "@/components/DischargeDatePickerField";
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
import type { CaseSummary } from "@/types/caseSummary";
import { INFECTION_SYNDROME_LABELS } from "@/types/infection";
import {
  getCase,
  getCaseSummaries,
  updateCase,
  saveTimelineEvent,
} from "@/lib/storage";
import { toIsoDateValue, toUtcNoonIsoTimestamp } from "@/lib/dateValues";
import { MediaCapture } from "@/components/MediaCapture";
import { useActiveEpisodes } from "@/hooks/useActiveEpisodes";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useAuth } from "@/contexts/AuthContext";
import { getVisibleSpecialties } from "@/lib/personalization";
import { SpecialtyFilterBar } from "@/components/dashboard/SpecialtyFilterBar";
import { getFirstHistologyTarget } from "@/lib/skinCancerConfig";
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
import {
  getSharedInboxIndex,
  updateSharedInboxIndex,
} from "@/lib/sharingStorage";
import { getSharedInbox } from "@/lib/sharingApi";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(
    null,
  );
  const [sharedInboxCount, setSharedInboxCount] = useState(0);
  const [sharedPendingCount, setSharedPendingCount] = useState(0);
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
  const [dischargeDate, setDischargeDate] = useState(
    toIsoDateValue(new Date()),
  );
  const [dischargePhotos, setDischargePhotos] = useState<MediaAttachment[]>([]);

  const loadCases = useCallback(async () => {
    try {
      const data = await getCaseSummaries();
      setCases(data);
    } catch (error) {
      console.error("Error loading cases:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSharedInboxCounts = useCallback(async () => {
    try {
      const index = await getSharedInboxIndex();
      setSharedInboxCount(index.length);
      setSharedPendingCount(
        index.filter((e) => e.verificationStatus === "pending").length,
      );
    } catch {
      // Non-critical — local index may not exist yet
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        loadCases();
        loadSharedInboxCounts();
      });
      return () => task.cancel();
    }, [loadCases, loadSharedInboxCounts]),
  );

  const refreshSharedInbox = useCallback(async () => {
    try {
      const data = await getSharedInbox();
      await updateSharedInboxIndex(data);
      setSharedInboxCount(data.length);
      setSharedPendingCount(
        data.filter((e) => e.verificationStatus === "pending").length,
      );
    } catch {
      // Network unavailable — keep local counts
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCases(), refreshEpisodes(), refreshSharedInbox()]);
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
    () =>
      buildDashboardSummary(
        personalizedCases,
        (caseData) => caseData.needsHistology,
      ),
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
      (caseData) => caseData.needsHistology,
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

  const handleOpenDischargeModal = useCallback((caseItem: Case) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDischargeCase(caseItem);
    setDischargeDate(toIsoDateValue(new Date()));
    setDischargePhotos([]);
    setDischargeModalVisible(true);
  }, []);

  const handleConfirmDischarge = async () => {
    if (!dischargeCase) return;

    const dateStr = dischargeDate;

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
          createdAt:
            toUtcNoonIsoTimestamp(dischargeDate) ?? new Date().toISOString(),
          clinicalContext: "discharge",
          mediaAttachments: dischargePhotos,
        };
        await saveTimelineEvent(event);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Promise.all([loadCases(), refreshEpisodes()]);

      setDischargeModalVisible(false);
      setDischargeCase(null);
    } catch (error) {
      console.error("Error discharging case:", error);
      Alert.alert("Error", "Failed to discharge case. Please try again.");
    }
  };

  const handleCasePress = useCallback(
    (caseData: CaseSummary) => {
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

  const handleGuidedCapture = useCallback(() => {
    navigation.navigate("GuidedCapture");
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
    async (caseId: string) => {
      const caseItem = await getCase(caseId);
      if (caseItem) {
        handleOpenDischargeModal(caseItem);
      }
    },
    [handleOpenDischargeModal],
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

  const handleViewEpisode = useCallback(
    (episodeId: string) => {
      navigation.navigate("EpisodeDetail", { episodeId });
    },
    [navigation],
  );

  const handleViewAllAttention = useCallback(() => {
    navigation.navigate("NeedsAttentionList", {
      selectedSpecialty: selectedDashboardSpecialty,
    });
  }, [navigation, selectedDashboardSpecialty]);

  const handleAddEvent = useCallback(
    async (caseId: string) => {
      const caseData = await getCase(caseId);
      if (!caseData) return;

      navigation.navigate("AddTimelineEvent", {
        caseId: caseData.id,
        mediaContext: buildMediaContextFromCase(caseData),
      });
    },
    [navigation],
  );

  const handleAddEventFromCase = useCallback(
    (caseData: CaseSummary) => {
      void handleAddEvent(caseData.id);
    },
    [handleAddEvent],
  );

  const handleAddHistology = useCallback(
    async (caseId: string) => {
      const caseData = await getCase(caseId);
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
    [navigation],
  );

  const handleAddHistologyFromCase = useCallback(
    (caseData: CaseSummary) => {
      void handleAddHistology(caseData.id);
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
    <View
      testID="screen-dashboard"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <ScrollView
        testID="dashboard.scroll"
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
          onViewEpisode={handleViewEpisode}
        />

        {/* Zone 2 — Practice Pulse */}
        <PracticePulseRow
          pulseData={pulseData}
          totalCaseCount={personalizedCases.length}
        />

        {/* Zone 2.5 — Shared Cases */}
        {sharedInboxCount > 0 ? (
          <Pressable
            testID="dashboard.btn-sharedCases"
            onPress={() => navigation.navigate("SharedInbox")}
            style={({ pressed }) => [
              styles.sharedCasesCard,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor:
                  sharedPendingCount > 0 ? theme.accent : theme.border,
                opacity: pressed ? 0.7 : 1,
              },
              Shadows.card,
            ]}
          >
            <View style={styles.sharedCasesRow}>
              <View
                style={[
                  styles.sharedCasesIcon,
                  { backgroundColor: theme.accent + "20" },
                ]}
              >
                <Feather name="users" size={18} color={theme.accent} />
              </View>
              <View style={styles.sharedCasesText}>
                <ThemedText
                  style={[styles.sharedCasesTitle, { color: theme.text }]}
                >
                  {sharedInboxCount} shared case
                  {sharedInboxCount !== 1 ? "s" : ""}
                </ThemedText>
                {sharedPendingCount > 0 ? (
                  <ThemedText
                    style={[
                      styles.sharedCasesSubtitle,
                      { color: theme.accent },
                    ]}
                  >
                    {sharedPendingCount} pending verification
                  </ThemedText>
                ) : null}
              </View>
              <Feather
                name="chevron-right"
                size={18}
                color={theme.textTertiary}
              />
            </View>
          </Pressable>
        ) : null}

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
        onQuickCapture={handleQuickCapture}
        onGuidedCapture={handleGuidedCapture}
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
                  <DischargeDatePickerField
                    value={dischargeDate}
                    onChange={setDischargeDate}
                  />
                </View>

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
                    defaultMediaDate={dischargeDate}
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
                    testID="dashboard.discharge.btn-confirm"
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
  sharedCasesCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  sharedCasesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sharedCasesIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  sharedCasesText: {
    flex: 1,
  },
  sharedCasesTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  sharedCasesSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 1,
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
