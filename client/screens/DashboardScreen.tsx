import React, { useState, useCallback, useMemo, useRef } from "react";
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
import { MAX_CASE_MEDIA_ITEMS } from "@/constants/media";
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
  buildSharedAttentionItems,
  SHARED_FILTER_ID,
} from "@/lib/dashboardSelectors";
import { buildMediaContextFromCase } from "@/lib/mediaContext";
import {
  clearSharedOutboxCache,
  getSharedOutboxCached,
} from "@/lib/sharingApi";
import { perfMark } from "@/lib/perfTrace";
import { devError } from "@/lib/devLog";
import { getSharedCaseSummaries, syncSharedCases } from "@/lib/sharedCaseSync";
import {
  isSharedCaseSummary,
  type SharedCaseSummary,
  sharedSummariesSignature,
} from "@/lib/sharedCaseSummary";
import {
  type SharedCaseEpaState,
  resolveSharedEpaStates,
} from "@/lib/sharedCaseBadges";
import { getAllEpaTargets, getAllRevealedPairs } from "@/lib/assessmentStorage";
import {
  filterPendingEpaTargets,
  countPendingEpaTargets,
} from "@/lib/pendingEpa";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { profile, user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(
    null,
  );
  // Cases colleagues shared WITH the viewer (2.25.0) — merged into the
  // Recent Cases list, with their own filter chip and attention items.
  const [sharedCases, setSharedCases] = useState<SharedCaseSummary[]>([]);
  const [sharedEpaStates, setSharedEpaStates] = useState<
    Map<string, SharedCaseEpaState>
  >(() => new Map());
  const [pendingEpaCount, setPendingEpaCount] = useState(0);
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
      devError("Error loading cases:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const viewerUserId = user?.id;
  // Signature of the shared summaries currently applied — a sync that
  // changes nothing skips the re-apply (no re-render, no badge resolution).
  const appliedSharedSignatureRef = useRef<string | null>(null);
  const applySharedSummaries = useCallback(
    async (summaries: SharedCaseSummary[]) => {
      appliedSharedSignatureRef.current = sharedSummariesSignature(summaries);
      setSharedCases(summaries);
      setSharedEpaStates(await resolveSharedEpaStates(summaries, viewerUserId));
    },
    [viewerUserId],
  );

  // Offline read on every focus: inbox index + decrypted caches.
  const loadSharedCases = useCallback(async () => {
    try {
      await applySharedSummaries(await getSharedCaseSummaries());
    } catch {
      // Non-critical — local index may not exist yet
    }
  }, [applySharedSummaries]);

  // Online reconcile: new / updated shares get decrypted and their photo
  // thumbnails imported; revoked ones drop out.
  const syncShared = useCallback(async () => {
    try {
      const result = await syncSharedCases();
      const unchanged =
        result.hydrated === 0 &&
        result.removed === 0 &&
        sharedSummariesSignature(result.summaries) ===
          appliedSharedSignatureRef.current;
      if (!unchanged) await applySharedSummaries(result.summaries);
    } catch {
      // Network unavailable — the cached list stays
    }
  }, [applySharedSummaries]);

  const loadPendingEpaCount = useCallback(async () => {
    try {
      const [targetsByCase, revealed, outbox] = await Promise.all([
        getAllEpaTargets().catch(() => []),
        getAllRevealedPairs().catch(() => []),
        // Offline → empty outbox → revealed targets don't drain this
        // round; the next online focus reconciles (same as History).
        getSharedOutboxCached().catch(
          () => [] as Awaited<ReturnType<typeof getSharedOutboxCached>>,
        ),
      ]);
      setPendingEpaCount(
        countPendingEpaTargets(
          filterPendingEpaTargets({
            targetsByCase,
            outbox,
            revealedSharedCaseIds: new Set(revealed.map((p) => p.sharedCaseId)),
          }),
        ),
      );
    } catch {
      // Non-critical — row simply stays hidden
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        const endSpan = perfMark("focus.Dashboard");
        void Promise.all([
          loadCases(),
          loadSharedCases(),
          loadPendingEpaCount(),
        ]).finally(endSpan);
        void syncShared();
      });
      return () => task.cancel();
    }, [loadCases, loadSharedCases, loadPendingEpaCount, syncShared]),
  );

  // Recent Cases is capped (RECENT_CASES_LIMIT) — the full list lives in
  // search (own cases) or the shared inbox (Shared filter).
  const handleSeeAllCases = useCallback(() => {
    if (selectedSpecialty === SHARED_FILTER_ID) {
      navigation.navigate("SharedInbox");
    } else {
      navigation.navigate("CaseSearch");
    }
  }, [navigation, selectedSpecialty]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Explicit refresh bypasses the outbox TTL cache.
    clearSharedOutboxCache();
    await Promise.all([
      loadCases(),
      refreshEpisodes(),
      syncShared(),
      loadPendingEpaCount(),
    ]);
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

  // Own cases + shared cases form ONE list for the filter bar and Recent
  // Cases. Shared cases skip the visible-specialty personalisation (the
  // viewer was on the team) but still respect the specialty chip.
  const mergedCases = useMemo<CaseSummary[]>(
    () => [...personalizedCases, ...sharedCases],
    [personalizedCases, sharedCases],
  );

  const dashboardSummary = useMemo(
    () =>
      buildDashboardSummary(mergedCases, (caseData) => caseData.needsHistology),
    [mergedCases],
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
      mergedCases,
      selectedSpecialty,
      (caseData) => caseData.needsHistology,
    );
  }, [mergedCases, selectedSpecialty]);

  // Practice Pulse counts the viewer's OWN operating, never colleagues'.
  const filteredOwnCases = useMemo(
    () =>
      selectedSpecialty === SHARED_FILTER_ID
        ? personalizedCases
        : filterDashboardCases(
            personalizedCases,
            selectedSpecialty,
            (caseData) => caseData.needsHistology,
          ),
    [personalizedCases, selectedSpecialty],
  );

  const selectedDashboardSpecialty = useMemo(
    () =>
      selectedSpecialty &&
      selectedSpecialty !== HISTOLOGY_FILTER_ID &&
      selectedSpecialty !== SHARED_FILTER_ID
        ? (selectedSpecialty as Specialty)
        : null,
    [selectedSpecialty],
  );
  const pulseData = usePracticePulse(filteredOwnCases);
  // Inpatient / infection / episode cards come from OWN cases only — a
  // colleague's admission is not the viewer's to discharge.
  const caseAttentionItems = useAttentionItems(
    personalizedCases,
    visibleEpisodes,
    selectedSpecialty,
  );
  const sharedAttentionItems = useMemo(
    () =>
      buildSharedAttentionItems(
        sharedCases,
        sharedEpaStates,
        selectedSpecialty,
      ),
    [sharedCases, sharedEpaStates, selectedSpecialty],
  );

  // Inbox moved to header icon — attention carousel is clinical-only
  const attentionItems = useMemo(
    () => [...caseAttentionItems, ...sharedAttentionItems],
    [caseAttentionItems, sharedAttentionItems],
  );

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
      if (isSharedCaseSummary(caseData)) {
        navigation.navigate("SharedCaseDetail", {
          sharedCaseId: caseData.shared.sharedCaseId,
        });
        return;
      }
      navigation.navigate("CaseDetail", { caseId: caseData.id });
    },
    [navigation],
  );

  const handleAddCase = useCallback(() => {
    if (
      selectedSpecialty &&
      selectedSpecialty !== HISTOLOGY_FILTER_ID &&
      selectedSpecialty !== SHARED_FILTER_ID
    ) {
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
      } else if (
        (item.type === "shared_verification" || item.type === "epa_due") &&
        item.sharedCaseId
      ) {
        navigation.navigate("SharedCaseDetail", {
          sharedCaseId: item.sharedCaseId,
        });
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
          sharedCount={sharedCases.length}
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

        {/* Zone 2.6 — Pending EPA assessments. Same presence/absence rule
            as the verification row: exists only while an assessment
            actually awaits action. */}
        {pendingEpaCount > 0 ? (
          <Pressable
            testID="dashboard.btn-pendingAssessments"
            onPress={() => navigation.navigate("AssessmentHistory")}
            style={({ pressed }) => [
              styles.sharedCasesCard,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.accent,
                opacity: pressed ? 0.7 : 1,
              },
              Shadows.card,
            ]}
          >
            <View style={styles.sharedCasesRow}>
              <View
                style={[
                  styles.sharedCasesIcon,
                  { backgroundColor: theme.accentSurface },
                ]}
              >
                <Feather name="award" size={18} color={theme.accent} />
              </View>
              <View style={styles.sharedCasesText}>
                <ThemedText
                  style={[styles.sharedCasesTitle, { color: theme.text }]}
                >
                  {pendingEpaCount} EPA assessment
                  {pendingEpaCount !== 1 ? "s" : ""} pending
                </ThemedText>
              </View>
              <Feather
                name="chevron-right"
                size={18}
                color={theme.textTertiary}
              />
            </View>
          </Pressable>
        ) : null}

        {/* Zone 3 — Recent Cases (own + shared with me). Shared cases
            surface here with a "Shared by …" line and a Verify chip while
            verification is pending — presence IS the notification. */}
        {!loading && filteredCases.length === 0 && mergedCases.length === 0 ? (
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
            forceSeeAll={selectedSpecialty === SHARED_FILTER_ID}
            onSeeAll={handleSeeAllCases}
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
        <View
          style={[
            styles.dischargeModalOverlay,
            { backgroundColor: theme.scrim },
          ]}
        >
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
                    maxAttachments={MAX_CASE_MEDIA_ITEMS}
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
  dischargeModalOverlay: {
    flex: 1,
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
