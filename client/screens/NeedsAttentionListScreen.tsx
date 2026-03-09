import React, { useState, useCallback, useMemo, useLayoutEffect } from "react";
import {
  View,
  SectionList,
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  useNavigation,
  useFocusEffect,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { MediaCapture } from "@/components/MediaCapture";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getCases, updateCase, saveTimelineEvent } from "@/lib/storage";
import { toIsoDateValue } from "@/lib/dateValues";
import { useActiveEpisodes } from "@/hooks/useActiveEpisodes";
import { useAttentionItems } from "@/hooks/useAttentionItems";
import { getFirstHistologyTarget } from "@/lib/skinCancerConfig";
import type { AttentionItem } from "@/hooks/useAttentionItems";
import type { Case, TimelineEvent, MediaAttachment } from "@/types/case";
import { SPECIALTY_LABELS } from "@/types/case";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { getVisibleSpecialties } from "@/lib/personalization";
import {
  buildAttentionCaseFormParams,
  filterCasesByVisibleSpecialties,
} from "@/lib/dashboardSelectors";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, "NeedsAttentionList">;

interface Section {
  title: string;
  data: AttentionItem[];
}

export default function NeedsAttentionListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const selectedSpecialty = route.params?.selectedSpecialty ?? null;

  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Discharge modal state
  const [dischargeModalVisible, setDischargeModalVisible] = useState(false);
  const [dischargeCase, setDischargeCase] = useState<Case | null>(null);
  const [dischargeDate, setDischargeDate] = useState(new Date());
  const [dischargePhotos, setDischargePhotos] = useState<MediaAttachment[]>([]);
  const [showDischargeDatePicker, setShowDischargeDatePicker] = useState(false);

  const { episodes: activeEpisodes, refresh: refreshEpisodes } =
    useActiveEpisodes();
  const visibleSpecialties = useMemo(
    () => getVisibleSpecialties(profile),
    [profile],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: selectedSpecialty
        ? `${SPECIALTY_LABELS[selectedSpecialty]} Attention`
        : "Needs Attention",
    });
  }, [navigation, selectedSpecialty]);

  const loadCases = useCallback(async () => {
    try {
      const data = await getCases();
      setCases(data);
    } catch (error) {
      console.error("Error loading cases:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCases();
      refreshEpisodes();
    }, [loadCases, refreshEpisodes]),
  );

  const personalizedCases = useMemo(
    () => filterCasesByVisibleSpecialties(cases, visibleSpecialties),
    [cases, visibleSpecialties],
  );
  const visibleEpisodes = useMemo(
    () =>
      activeEpisodes.filter(({ episode }) =>
        visibleSpecialties.includes(episode.specialty),
      ),
    [activeEpisodes, visibleSpecialties],
  );
  const attentionItems = useAttentionItems(
    personalizedCases,
    visibleEpisodes,
    selectedSpecialty,
  );

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return attentionItems;
    const q = search.toLowerCase();
    return attentionItems.filter(
      (item) =>
        item.patientIdentifier.toLowerCase().includes(q) ||
        item.diagnosisTitle.toLowerCase().includes(q),
    );
  }, [attentionItems, search]);

  // Group into sections
  const sections: Section[] = useMemo(() => {
    const result: Section[] = [];
    const inpatients = filtered.filter((i) => i.type === "inpatient");
    const infections = filtered.filter((i) => i.type === "infection");
    const episodes = filtered.filter((i) => i.type === "episode");

    if (inpatients.length > 0)
      result.push({ title: "Inpatients", data: inpatients });
    if (infections.length > 0)
      result.push({ title: "Active Infections", data: infections });
    if (episodes.length > 0)
      result.push({ title: "Active Episodes", data: episodes });

    return result;
  }, [filtered]);

  // --- Handlers ---

  const handleCardPress = useCallback(
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

  const handleLogCase = useCallback(
    (item: AttentionItem) => {
      const params = buildAttentionCaseFormParams(
        item,
        visibleEpisodes,
        selectedSpecialty,
      );
      if (params) {
        navigation.navigate("CaseForm", params);
      }
    },
    [navigation, selectedSpecialty, visibleEpisodes],
  );

  const handleDischarge = useCallback(
    (caseId: string) => {
      const caseItem = personalizedCases.find((c) => c.id === caseId);
      if (caseItem) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setDischargeCase(caseItem);
        setDischargeDate(new Date());
        setDischargePhotos([]);
        setDischargeModalVisible(true);
      }
    },
    [personalizedCases],
  );

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
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowDischargeDatePicker(false);
    if (selectedDate) {
      setDischargeDate(selectedDate);
    }
  };

  const handleAddEvent = useCallback(
    (caseId: string) => {
      navigation.navigate("AddTimelineEvent", { caseId });
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

  const getBadge = (item: AttentionItem) => {
    if (item.type === "infection") {
      return { bg: theme.error + "20", text: theme.error, label: "Infection" };
    }
    if (item.type === "inpatient") {
      return {
        bg: theme.accent + "20",
        text: theme.accent,
        label: "Inpatient",
      };
    }
    switch (item.episodeStatus) {
      case "active":
        return {
          bg: theme.success + "20",
          text: theme.success,
          label: "Active",
        };
      case "on_hold":
        return {
          bg: theme.warning + "20",
          text: theme.warning,
          label: "On Hold",
        };
      case "planned":
        return { bg: theme.info + "20", text: theme.info, label: "Planned" };
      default:
        return {
          bg: theme.success + "20",
          text: theme.success,
          label: "Active",
        };
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: AttentionItem }) => {
      const badge = getBadge(item);
      const actionCaseId = item.caseId || item.lastCaseId;
      const canLogCase =
        item.type === "inpatient" ||
        item.type === "episode" ||
        !!item.episodeId;
      const logCaseLabel =
        item.type === "episode" || item.episodeId ? "Next Episode" : "Log Case";

      return (
        <Pressable
          onPress={() => handleCardPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`${badge.label}, ${item.patientIdentifier}, ${item.diagnosisTitle}`}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <ThemedText style={[styles.badgeText, { color: badge.text }]}>
                {badge.label}
              </ThemedText>
            </View>
            {item.type === "inpatient" ? (
              <ThemedText style={[styles.podText, { color: theme.accent }]}>
                POD {item.postOpDay}
              </ThemedText>
            ) : item.type === "infection" && item.infectionSyndrome ? (
              <ThemedText
                style={[styles.metaText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {item.infectionSyndrome}
              </ThemedText>
            ) : item.daysSinceLastEncounter != null ? (
              <ThemedText
                style={[styles.metaText, { color: theme.textSecondary }]}
              >
                {item.daysSinceLastEncounter}d since last
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.cardBody}>
            <ThemedText style={styles.patientId}>
              {item.patientIdentifier}
            </ThemedText>
            <ThemedText
              style={[styles.diagnosis, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {item.diagnosisTitle}
            </ThemedText>
            {item.type === "episode" && item.pendingAction ? (
              <ThemedText
                style={[styles.pendingAction, { color: theme.accent }]}
              >
                {item.pendingAction}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.cardActions}>
            {item.canAddHistology && actionCaseId ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleAddHistology(actionCaseId);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Add histology for ${item.patientIdentifier}`}
              >
                <View style={styles.histologyButton}>
                  <Feather name="file-text" size={12} color={theme.accent} />
                  <ThemedText
                    style={[styles.histologyText, { color: theme.accent }]}
                  >
                    Histology
                  </ThemedText>
                </View>
              </Pressable>
            ) : null}
            {actionCaseId ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleAddEvent(actionCaseId);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Add event for ${item.patientIdentifier}`}
              >
                <ThemedText
                  style={[styles.eventText, { color: theme.textSecondary }]}
                >
                  + Event
                </ThemedText>
              </Pressable>
            ) : null}
            {item.type === "inpatient" && item.caseId ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleDischarge(item.caseId!);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Discharge ${item.patientIdentifier}`}
              >
                <ThemedText
                  style={[styles.dischargeText, { color: theme.accent }]}
                >
                  Discharge
                </ThemedText>
              </Pressable>
            ) : null}
            {canLogCase ? (
              <Pressable
                style={[
                  styles.logCaseButton,
                  { backgroundColor: theme.accent },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleLogCase(item);
                }}
              >
                <ThemedText
                  style={[styles.logCaseText, { color: theme.accentContrast }]}
                >
                  {logCaseLabel}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [
      theme,
      handleCardPress,
      handleLogCase,
      handleDischarge,
      handleAddEvent,
      handleAddHistology,
    ],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Search bar */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather name="search" size={18} color={theme.textTertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by patient or diagnosis..."
          placeholderTextColor={theme.textTertiary}
          style={[styles.searchInput, { color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <Feather
            name="x"
            size={18}
            color={theme.textTertiary}
            onPress={() => setSearch("")}
          />
        ) : null}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View
            style={[
              styles.sectionHeader,
              { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <ThemedText
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              {section.title}
            </ThemedText>
            <ThemedText
              style={[styles.sectionCount, { color: theme.textTertiary }]}
            >
              {section.data.length}
            </ThemedText>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="check-circle" size={32} color={theme.textTertiary} />
            <ThemedText
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              {loading
                ? "Loading..."
                : search
                  ? "No items match your search"
                  : "Nothing needs attention"}
            </ThemedText>
          </View>
        }
        stickySectionHeadersEnabled
      />

      {/* Discharge Modal */}
      <Modal
        visible={dischargeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDischargeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundElevated },
            ]}
          >
            <ThemedText style={styles.modalTitle}>
              Discharge {dischargeCase?.patientIdentifier}
            </ThemedText>

            <Pressable
              style={[styles.dateButton, { borderColor: theme.border }]}
              onPress={() => setShowDischargeDatePicker(true)}
            >
              <Feather name="calendar" size={16} color={theme.textSecondary} />
              <ThemedText
                style={[styles.dateText, { color: theme.textSecondary }]}
              >
                {dischargeDate.toLocaleDateString("en-NZ", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </ThemedText>
            </Pressable>

            {showDischargeDatePicker ? (
              <DateTimePicker
                value={dischargeDate}
                mode="date"
                display="spinner"
                onChange={handleDischargeDateChange}
                maximumDate={new Date()}
              />
            ) : null}

            <View style={styles.photoSection}>
              <ThemedText
                style={[styles.photoLabel, { color: theme.textSecondary }]}
              >
                Discharge photos (optional)
              </ThemedText>
              <MediaCapture
                attachments={dischargePhotos}
                onAttachmentsChange={setDischargePhotos}
                maxAttachments={15}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => {
                  setDischargeModalVisible(false);
                  setDischargeCase(null);
                }}
              >
                <ThemedText
                  style={[styles.cancelText, { color: theme.textSecondary }]}
                >
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmButton,
                  { backgroundColor: theme.accent },
                ]}
                onPress={handleConfirmDischarge}
              >
                <ThemedText
                  style={[styles.confirmText, { color: theme.accentContrast }]}
                >
                  Discharge
                </ThemedText>
              </Pressable>
            </View>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    height: 44,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    ...Platform.select({
      ios: { fontFamily: "System" },
      default: {},
    }),
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  podText: {
    fontSize: 18,
    fontWeight: "700",
  },
  metaText: {
    fontSize: 13,
    flexShrink: 1,
  },
  cardBody: {
    marginTop: 8,
  },
  patientId: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "SF Mono" : "monospace",
    fontWeight: "500",
  },
  diagnosis: {
    fontSize: 13,
    marginTop: 2,
  },
  pendingAction: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2,
  },
  cardActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  histologyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  histologyText: {
    fontSize: 12,
    fontWeight: "500",
  },
  eventText: {
    fontSize: 12,
    fontWeight: "500",
  },
  dischargeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  logCaseButton: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  logCaseText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 15,
  },
  // Discharge modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    borderRadius: 16,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  dateText: {
    fontSize: 15,
  },
  photoSection: {
    gap: Spacing.sm,
  },
  photoLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "500",
  },
  confirmButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
