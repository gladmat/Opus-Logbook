import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getEpisodeWithCases, updateEpisode } from "@/lib/episodeStorage";
import { getLatestCaseForEpisode } from "@/lib/storage";
import { getCasePrimaryTitle } from "@/lib/caseDiagnosisSummary";
import type { Case } from "@/types/case";
import type {
  TreatmentEpisode,
  EpisodeStatus,
  EpisodePrefillData,
} from "@/types/episode";
import {
  EPISODE_STATUS_LABELS,
  EPISODE_STATUS_TRANSITIONS,
  EPISODE_TYPE_LABELS,
  PENDING_ACTION_LABELS,
  ENCOUNTER_CLASS_LABELS,
} from "@/types/episode";

type RouteParams = RouteProp<RootStackParamList, "EpisodeDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_COLORS: Record<string, string> = {
  active: "success",
  on_hold: "warning",
  planned: "info",
  completed: "textTertiary",
  cancelled: "textTertiary",
};

export default function EpisodeDetailScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();

  const [episode, setEpisode] = useState<TreatmentEpisode | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const result = await getEpisodeWithCases(route.params.episodeId);
      if (result) {
        setEpisode(result.episode);
        setCases(result.cases);
      }
    } catch (error) {
      console.error("Error loading episode:", error);
    } finally {
      setLoading(false);
    }
  }, [route.params.episodeId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleStatusTransition = useCallback(
    (newStatus: EpisodeStatus) => {
      if (!episode) return;

      const statusLabel = EPISODE_STATUS_LABELS[newStatus];
      Alert.alert(
        `Change to ${statusLabel}?`,
        `This will change the episode status to "${statusLabel}".`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: statusLabel,
            onPress: async () => {
              const updates: Partial<TreatmentEpisode> = { status: newStatus };
              if (newStatus === "completed") {
                updates.resolvedDate = new Date().toISOString();
              }
              await updateEpisode(episode.id, updates);
              loadData();
            },
          },
        ],
      );
    },
    [episode, loadData],
  );

  const handleLogCase = useCallback(async () => {
    if (!episode) return;
    const lastCase = await getLatestCaseForEpisode(episode.id);
    const seq = cases.length + 1;

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
  }, [episode, cases.length, navigation]);

  const handleCasePress = useCallback(
    (caseData: Case) => {
      navigation.navigate("CaseDetail", { caseId: caseData.id });
    },
    [navigation],
  );

  if (loading || !episode) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot, flex: 1 },
        ]}
      />
    );
  }

  const statusColor = (theme as any)[
    STATUS_COLORS[episode.status] ?? "textTertiary"
  ] as string;
  const availableTransitions = EPISODE_STATUS_TRANSITIONS[episode.status] ?? [];

  // Time span
  const firstCaseDate = cases[0]?.procedureDate;
  const lastCaseDate = cases[cases.length - 1]?.procedureDate;
  const daySpan =
    firstCaseDate && lastCaseDate
      ? Math.ceil(
          (new Date(lastCaseDate).getTime() -
            new Date(firstCaseDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

  return (
    <View
      testID="screen-episodeDetail"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* ── Header Card ──────────────────────────────────────────── */}
        <View
          style={[
            styles.headerCard,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={styles.headerTop}>
            <ThemedText style={[styles.episodeTitle, { color: theme.text }]}>
              {episode.title}
            </ThemedText>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor + "20" },
              ]}
              testID="episodeDetail.badge-status"
            >
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {EPISODE_STATUS_LABELS[episode.status]}
              </ThemedText>
            </View>
          </View>

          <View style={styles.metaRow}>
            <SpecialtyBadge specialty={episode.specialty} size="small" />
            <ThemedText
              style={[styles.metaLabel, { color: theme.textSecondary }]}
            >
              {EPISODE_TYPE_LABELS[episode.type]}
            </ThemedText>
          </View>

          {episode.patientIdentifier ? (
            <ThemedText
              style={[styles.patientId, { color: theme.textSecondary }]}
            >
              Patient: {episode.patientIdentifier}
            </ThemedText>
          ) : null}

          <View style={styles.detailRow}>
            <Feather name="calendar" size={14} color={theme.textTertiary} />
            <ThemedText
              style={[styles.detailText, { color: theme.textSecondary }]}
            >
              Onset:{" "}
              {new Date(episode.onsetDate).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </ThemedText>
          </View>

          {(() => {
            const actions = episode.pendingActions?.length
              ? episode.pendingActions
              : episode.pendingAction
                ? [episode.pendingAction]
                : [];
            return actions.length > 0 ? (
              <View style={styles.pendingRow}>
                {actions.map((action) => (
                  <View
                    key={action}
                    style={[
                      styles.pendingPill,
                      { backgroundColor: theme.warning + "15" },
                    ]}
                  >
                    <Feather name="clock" size={13} color={theme.warning} />
                    <ThemedText
                      style={[styles.pendingText, { color: theme.warning }]}
                    >
                      {PENDING_ACTION_LABELS[action]}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null;
          })()}
        </View>

        {/* ── Summary Stats ────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText style={[styles.statValue, { color: theme.link }]}>
              {cases.length}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              Cases
            </ThemedText>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText style={[styles.statValue, { color: theme.link }]}>
              {cases.reduce(
                (sum, c) =>
                  sum +
                  c.diagnosisGroups.reduce(
                    (gs, g) => gs + g.procedures.length,
                    0,
                  ),
                0,
              )}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              Procedures
            </ThemedText>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText style={[styles.statValue, { color: theme.link }]}>
              {daySpan}d
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              Span
            </ThemedText>
          </View>
        </View>

        {/* ── Status Transitions ───────────────────────────────────── */}
        {availableTransitions.length > 0 ? (
          <View style={styles.transitionsSection}>
            <ThemedText
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              Change Status
            </ThemedText>
            <View style={styles.transitionButtons}>
              {availableTransitions.map((status) => {
                const color = (theme as any)[
                  STATUS_COLORS[status] ?? "textTertiary"
                ] as string;
                return (
                  <Pressable
                    key={status}
                    onPress={() => handleStatusTransition(status)}
                    style={[
                      styles.transitionButton,
                      {
                        backgroundColor: color + "15",
                        borderColor: color + "40",
                      },
                    ]}
                    testID={`episodeDetail.btn-changeStatus-${status}`}
                  >
                    <ThemedText
                      style={[styles.transitionButtonText, { color }]}
                    >
                      {EPISODE_STATUS_LABELS[status]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── Case Timeline ────────────────────────────────────────── */}
        <View style={styles.timelineSection}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            Case Timeline
          </ThemedText>

          {cases.length === 0 ? (
            <ThemedText
              style={[styles.emptyText, { color: theme.textTertiary }]}
            >
              No cases linked yet
            </ThemedText>
          ) : (
            cases.map((caseItem, idx) => {
              const diagName = getCasePrimaryTitle(caseItem);
              const procCount = caseItem.diagnosisGroups.reduce(
                (s, g) => s + g.procedures.length,
                0,
              );
              const encounterLabel = caseItem.encounterClass
                ? ENCOUNTER_CLASS_LABELS[
                    caseItem.encounterClass as keyof typeof ENCOUNTER_CLASS_LABELS
                  ]
                : null;

              return (
                <Pressable
                  key={caseItem.id}
                  onPress={() => handleCasePress(caseItem)}
                  style={[
                    styles.timelineItem,
                    { backgroundColor: theme.backgroundDefault },
                  ]}
                  testID={`episodeDetail.case-${idx}`}
                >
                  {/* Sequence circle */}
                  <View
                    style={[
                      styles.sequenceCircle,
                      { backgroundColor: theme.link },
                    ]}
                  >
                    <ThemedText
                      style={[styles.sequenceText, { color: theme.buttonText }]}
                    >
                      #{caseItem.episodeSequence ?? idx + 1}
                    </ThemedText>
                  </View>

                  <View style={styles.timelineContent}>
                    <ThemedText
                      style={[styles.timelineDate, { color: theme.text }]}
                    >
                      {new Date(caseItem.procedureDate).toLocaleDateString(
                        undefined,
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </ThemedText>
                    {diagName ? (
                      <ThemedText
                        style={[
                          styles.timelineDiag,
                          { color: theme.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {diagName}
                      </ThemedText>
                    ) : null}
                    <ThemedText
                      style={[
                        styles.timelineProcs,
                        { color: theme.textTertiary },
                      ]}
                    >
                      {procCount} procedure{procCount !== 1 ? "s" : ""}
                      {encounterLabel ? ` \u00B7 ${encounterLabel}` : ""}
                    </ThemedText>
                  </View>

                  <Feather
                    name="chevron-right"
                    size={18}
                    color={theme.textTertiary}
                  />
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Fixed Log Case Button ──────────────────────────────────── */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}
      >
        <Pressable
          onPress={handleLogCase}
          style={[styles.logCaseButton, { backgroundColor: theme.link }]}
          testID="episodeDetail.btn-logCase"
        >
          <Feather name="plus" size={20} color={theme.buttonText} />
          <ThemedText
            style={[styles.logCaseButtonText, { color: theme.buttonText }]}
          >
            Log Case
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  headerCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  episodeTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  metaLabel: {
    fontSize: 13,
  },
  patientId: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: 13,
  },
  pendingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  transitionsSection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  transitionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  transitionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  transitionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  timelineSection: {
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    ...Shadows.card,
  },
  sequenceCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sequenceText: {
    fontSize: 13,
    fontWeight: "700",
  },
  timelineContent: {
    flex: 1,
    gap: 2,
  },
  timelineDate: {
    fontSize: 14,
    fontWeight: "600",
  },
  timelineDiag: {
    fontSize: 13,
  },
  timelineProcs: {
    fontSize: 12,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  logCaseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  logCaseButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
