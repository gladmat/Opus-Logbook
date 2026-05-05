import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { EncryptedImage } from "@/components/EncryptedImage";
import { MediaGalleryViewer } from "@/components/media";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { useMediaCallback } from "@/contexts/MediaCallbackContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { InboxItem } from "@/types/inbox";
import type { OperativeMediaItem, Case } from "@/types/case";
import type { CaseSummary } from "@/types/caseSummary";
import {
  getInboxItems,
  discardFromInbox,
  reserveInboxItems,
  finalizeInboxAssignment,
  consumePendingInboxSelection,
  releaseReservedInboxItems,
} from "@/lib/inboxStorage";
import {
  findCasesByPatientId,
  getCase,
  getCaseSummaries,
  saveCase,
} from "@/lib/storage";
import { getPrimaryDiagnosisName } from "@/types/case";
import {
  inferMediaTagForInboxItem,
  inboxItemToOperativeMediaSmart,
  extractPatientIdHint,
} from "@/lib/inboxAssignment";

// White-on-photo overlay — intentionally theme-independent
// (always white text with shadow on photo thumbnails / dark modal backdrops)
const OVERLAY_TEXT = "#FFFFFF";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type InboxScreenRouteProp = RouteProp<RootStackParamList, "Inbox">;
type InboxScreenNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "Inbox"
>;

interface DateGroup {
  label: string;
  items: InboxItem[];
}

interface PatientGroup {
  patientId: string;
  items: InboxItem[];
}

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = Spacing.md;
const GRID_GAP = 3;
const NUM_COLUMNS = 3;
const THUMB_SIZE =
  (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function groupByDate(items: InboxItem[]): DateGroup[] {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const groups = new Map<string, InboxItem[]>();
  const groupOrder: string[] = [];

  for (const item of items) {
    const d = new Date(item.capturedAt);
    const ds = d.toDateString();
    let label: string;
    if (ds === todayStr) label = "Today";
    else if (ds === yesterdayStr) label = "Yesterday";
    else
      label = d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

    if (!groups.has(label)) {
      groups.set(label, []);
      groupOrder.push(label);
    }
    groups.get(label)!.push(item);
  }

  return groupOrder.map((label) => ({ label, items: groups.get(label)! }));
}

function groupByPatient(items: InboxItem[]): PatientGroup[] {
  const groups = new Map<string, InboxItem[]>();
  const order: string[] = [];
  for (const item of items) {
    const pid = item.patientIdentifier!;
    if (!groups.has(pid)) {
      groups.set(pid, []);
      order.push(pid);
    }
    groups.get(pid)!.push(item);
  }
  return order.map((patientId) => ({
    patientId,
    items: groups.get(patientId)!,
  }));
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function InboxScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<InboxScreenNavProp>();
  const route = useRoute<InboxScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { executeGenericCallback } = useMediaCallback();

  const pickMode = route.params?.pickMode ?? false;
  const callbackId = route.params?.callbackId;
  const procedureDateParam = route.params?.procedureDate;
  const reservationKey =
    route.params?.reservationKey ??
    (callbackId ? `draft:${callbackId}` : undefined);

  const [items, setItems] = useState<InboxItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(pickMode);
  const [showPreview, setShowPreview] = useState<InboxItem | null>(null);
  const [showCasePicker, setShowCasePicker] = useState(false);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(
    new Set(),
  );

  // Refresh inbox on focus
  useFocusEffect(
    useCallback(() => {
      const nextItems = getInboxItems();
      setItems(nextItems);

      const pendingSelection = consumePendingInboxSelection().filter((id) =>
        nextItems.some((item) => item.id === id),
      );

      if (pendingSelection.length > 0) {
        setSelectMode(true);
        setSelectedIds(new Set(pendingSelection));
      } else if (pickMode) {
        setSelectMode(true);
      }
    }, [pickMode]),
  );

  const unassignedItems = useMemo(
    () => items.filter((item) => !item.patientIdentifier),
    [items],
  );
  const patientGroupList = useMemo(
    () => groupByPatient(items.filter((item) => !!item.patientIdentifier)),
    [items],
  );
  const unassignedDateGroups = useMemo(
    () => groupByDate(unassignedItems),
    [unassignedItems],
  );

  // ── Selection ────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    if (!pickMode) {
      setSelectMode(false);
      setSelectedIds(new Set());
    }
  }, [pickMode]);

  const enterSelectMode = useCallback((firstId?: string) => {
    setSelectMode(true);
    if (firstId) setSelectedIds(new Set([firstId]));
  }, []);

  // ── Camera / Gallery ─────────────────────────────────

  const handleTakePhoto = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("OpusCamera", {
      quickSnap: true,
      targetMode: "inbox",
    });
  }, [navigation]);

  const handlePickGallery = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("SmartImport", {
      targetMode: "inbox",
      pickMode,
      callbackId,
      procedureDate: procedureDateParam,
      reservationKey,
    });
  }, [callbackId, navigation, pickMode, procedureDateParam, reservationKey]);

  // ── Delete ───────────────────────────────────────────

  const handleDeleteSelected = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert(
      "Delete Photos",
      `Permanently delete ${count} photo${count > 1 ? "s" : ""}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await discardFromInbox([...selectedIds]);
            setItems(getInboxItems());
            setSelectedIds(new Set());
            if (!pickMode) setSelectMode(false);
          },
        },
      ],
    );
  }, [selectedIds, pickMode]);

  // ── Assign to case (standalone mode) ─────────────────

  const patientIdHint = useMemo(() => {
    if (selectedIds.size === 0) return undefined;
    const selected = items.filter((item) => selectedIds.has(item.id));
    return extractPatientIdHint(selected);
  }, [selectedIds, items]);

  // NHI auto-match: find cases that share patient ID with selected items
  const [nhiMatch, setNhiMatch] = useState<{
    patientId: string;
    topMatch: { caseData: Case; matchCount: number };
    matchCount: number;
  } | null>(null);

  useEffect(() => {
    if (pickMode || !selectMode || selectedIds.size === 0) {
      setNhiMatch(null);
      return;
    }
    const selected = items.filter((item) => selectedIds.has(item.id));
    const hint = extractPatientIdHint(selected);
    if (!hint) {
      setNhiMatch(null);
      return;
    }

    let cancelled = false;
    const matchCount = selected.filter(
      (item) => item.patientIdentifier?.trim() === hint,
    ).length;

    findCasesByPatientId(hint)
      .then((matches) => {
        if (cancelled || matches.length === 0) {
          setNhiMatch(null);
          return;
        }

        const sortedMatches = matches.sort(
          (a, b) =>
            new Date(b.procedureDate).getTime() -
            new Date(a.procedureDate).getTime(),
        );

        setNhiMatch({
          patientId: hint,
          topMatch: { caseData: sortedMatches[0]!, matchCount },
          matchCount,
        });
      })
      .catch(() => setNhiMatch(null));

    return () => {
      cancelled = true;
    };
  }, [pickMode, selectMode, selectedIds, items]);

  const handleAssignToCase = useCallback(() => {
    if (selectedIds.size === 0) return;
    setShowCasePicker(true);
  }, [selectedIds]);

  const handleCaseSelected = useCallback(
    async (caseData: Case) => {
      setShowCasePicker(false);
      try {
        const selectedItems = items.filter((item) => selectedIds.has(item.id));
        const caseProcDate = caseData.procedureDate;
        const newMedia: OperativeMediaItem[] = selectedItems.map((item) => {
          const tag = inferMediaTagForInboxItem(item, caseProcDate);
          const { sourceInboxId: _sourceInboxId, ...persistedMedia } =
            inboxItemToOperativeMediaSmart(item, tag);
          return persistedMedia;
        });

        const existingMedia = caseData.operativeMedia ?? [];
        const updatedCase: Case = {
          ...caseData,
          operativeMedia: [...existingMedia, ...newMedia],
          updatedAt: new Date().toISOString(),
        };
        await saveCase(updatedCase);

        finalizeInboxAssignment([...selectedIds], caseData.id);
        setItems(getInboxItems());
        setSelectedIds(new Set());
        setSelectMode(false);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Assigned",
          `${newMedia.length} photo${newMedia.length > 1 ? "s" : ""} added to case.`,
        );
      } catch (error) {
        console.warn("[InboxScreen] Assign to case failed:", error);
        Alert.alert("Error", "Failed to assign photos to case.");
      }
    },
    [items, selectedIds],
  );

  // ── Pick mode confirm ────────────────────────────────

  const handlePickConfirm = useCallback(() => {
    if (selectedIds.size === 0 || !callbackId || !reservationKey) return;
    const reservedItems = reserveInboxItems([...selectedIds], reservationKey);
    const newMedia: OperativeMediaItem[] = reservedItems.map((item) => {
      const tag = inferMediaTagForInboxItem(item, procedureDateParam);
      return inboxItemToOperativeMediaSmart(item, tag);
    });

    const executed = executeGenericCallback(callbackId, newMedia);
    if (!executed) {
      releaseReservedInboxItems([...selectedIds], reservationKey);
      setItems(getInboxItems());
      Alert.alert(
        "Could not attach",
        "The case form is no longer available. Photos stayed in the Inbox.",
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setItems(getInboxItems());
    navigation.goBack();
  }, [
    callbackId,
    executeGenericCallback,
    navigation,
    procedureDateParam,
    reservationKey,
    selectedIds,
  ]);

  // ── Tap / long-press handlers ────────────────────────

  const handleItemPress = useCallback(
    (item: InboxItem) => {
      if (selectMode) {
        toggleSelect(item.id);
      } else {
        setShowPreview(item);
      }
    },
    [selectMode, toggleSelect],
  );

  const handleItemLongPress = useCallback(
    (item: InboxItem) => {
      if (!selectMode) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        enterSelectMode(item.id);
      }
    },
    [selectMode, enterSelectMode],
  );

  const togglePatientGroup = useCallback((patientId: string) => {
    Haptics.selectionAsync();
    setExpandedPatients((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  }, []);

  // ── Thumbnail helper ──────────────────────────────────

  function renderThumbnailItem(item: InboxItem) {
    const isSelected = selectedIds.has(item.id);
    return (
      <Pressable
        key={item.id}
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleItemLongPress(item)}
        style={[
          styles.thumbWrapper,
          isSelected && {
            borderColor: theme.link,
            borderWidth: 2,
          },
        ]}
      >
        <EncryptedImage
          uri={item.localUri}
          style={styles.thumbImage}
          thumbnail
        />
        {selectMode ? (
          <View
            style={[
              styles.checkCircle,
              isSelected
                ? { backgroundColor: theme.link }
                : {
                    backgroundColor: theme.backgroundRoot + "80",
                    borderWidth: 1.5,
                    borderColor: theme.buttonText,
                  },
            ]}
          >
            {isSelected ? (
              <Feather name="check" size={12} color={theme.buttonText} />
            ) : null}
          </View>
        ) : (
          <ThemedText style={[styles.timeStamp, { color: OVERLAY_TEXT }]}>
            {formatTime(item.capturedAt)}
          </ThemedText>
        )}
      </Pressable>
    );
  }

  // ═══════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════

  const isEmpty = items.length === 0;

  return (
    <ThemedView testID="screen-inbox" style={styles.container}>
      {/* Header bar */}
      <View style={[styles.headerBar, { borderBottomColor: theme.border }]}>
        <ThemedText style={[styles.countText, { color: theme.textSecondary }]}>
          {items.length} photo{items.length !== 1 ? "s" : ""}
        </ThemedText>
        {!pickMode && items.length > 0 ? (
          <Pressable
            onPress={() => {
              if (selectMode) exitSelectMode();
              else enterSelectMode();
            }}
            hitSlop={8}
          >
            <ThemedText style={[styles.selectButton, { color: theme.link }]}>
              {selectMode ? "Cancel" : "Select"}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {/* NHI auto-match banner */}
      {nhiMatch ? (
        <Pressable
          onPress={() => handleCaseSelected(nhiMatch.topMatch.caseData)}
          style={[
            styles.nhiBanner,
            { backgroundColor: theme.link + "15", borderColor: theme.link },
          ]}
        >
          <View style={styles.nhiBannerContent}>
            <Feather name="user" size={16} color={theme.link} />
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.nhiBannerText, { color: theme.text }]}>
                {nhiMatch.matchCount} photo{nhiMatch.matchCount > 1 ? "s" : ""}{" "}
                match patient {nhiMatch.patientId}
              </ThemedText>
              <ThemedText
                style={[styles.nhiBannerSub, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                Assign to{" "}
                {getPrimaryDiagnosisName(nhiMatch.topMatch.caseData) || "case"}{" "}
                ({nhiMatch.topMatch.caseData.procedureDate ?? "no date"})
              </ThemedText>
            </View>
            <View
              style={[styles.nhiAssignButton, { backgroundColor: theme.link }]}
            >
              <ThemedText
                style={[styles.nhiAssignText, { color: theme.buttonText }]}
              >
                Assign
              </ThemedText>
            </View>
          </View>
        </Pressable>
      ) : null}

      {isEmpty ? (
        /* ── Empty state ── */
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={48} color={theme.textTertiary} />
          <ThemedText
            style={[styles.emptyTitle, { color: theme.textSecondary }]}
          >
            Photo Inbox is Empty
          </ThemedText>
          <ThemedText
            style={[styles.emptySubtitle, { color: theme.textTertiary }]}
          >
            Take photos during surgery or import from your gallery. Assign them
            to a case later.
          </ThemedText>
          <View style={styles.emptyButtons}>
            <Pressable
              onPress={handleTakePhoto}
              style={[styles.captureButton, { backgroundColor: theme.link }]}
            >
              <Feather name="camera" size={18} color={theme.buttonText} />
              <ThemedText
                style={[styles.captureButtonText, { color: theme.buttonText }]}
              >
                Opus Camera
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handlePickGallery}
              style={[
                styles.captureButton,
                { backgroundColor: theme.backgroundElevated },
              ]}
            >
              <Feather name="image" size={18} color={theme.text} />
              <ThemedText
                style={[styles.captureButtonText, { color: theme.text }]}
              >
                Camera Roll
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        /* ── Grid ── */
        <ScrollView
          contentContainerStyle={[
            styles.gridContainer,
            { paddingBottom: insets.bottom + 100 },
          ]}
        >
          {/* Unassigned section */}
          {unassignedDateGroups.length > 0 && patientGroupList.length > 0 ? (
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              Unassigned
            </ThemedText>
          ) : null}
          {unassignedDateGroups.map((group) => (
            <View key={group.label} style={styles.dateGroup}>
              <ThemedText
                style={[styles.dateLabel, { color: theme.textSecondary }]}
              >
                {group.label}
              </ThemedText>
              <View style={styles.gridRow}>
                {group.items.map((item) => renderThumbnailItem(item))}
              </View>
            </View>
          ))}

          {/* Patient-assigned section */}
          {patientGroupList.length > 0 ? (
            <>
              <ThemedText
                style={[styles.sectionLabel, { color: theme.textSecondary }]}
              >
                Assigned to Patient
              </ThemedText>
              {patientGroupList.map((pg) => {
                const isExpanded = expandedPatients.has(pg.patientId);
                return (
                  <View key={pg.patientId} style={styles.patientGroup}>
                    <Pressable
                      onPress={() => togglePatientGroup(pg.patientId)}
                      style={styles.patientGroupHeader}
                    >
                      <Feather
                        name={isExpanded ? "chevron-down" : "chevron-right"}
                        size={16}
                        color={theme.textSecondary}
                      />
                      <ThemedText
                        style={[
                          styles.patientGroupTitle,
                          { color: theme.text },
                        ]}
                      >
                        {pg.patientId}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.patientGroupCount,
                          { color: theme.textTertiary },
                        ]}
                      >
                        {pg.items.length} photo
                        {pg.items.length !== 1 ? "s" : ""}
                      </ThemedText>
                    </Pressable>
                    {isExpanded ? (
                      <View style={styles.gridRow}>
                        {pg.items.map((item) => renderThumbnailItem(item))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </>
          ) : null}
        </ScrollView>
      )}

      {/* Bottom toolbar */}
      {selectMode && items.length > 0 ? (
        <View
          style={[
            styles.toolbar,
            {
              backgroundColor: theme.backgroundElevated,
              paddingBottom: insets.bottom + Spacing.sm,
              borderTopColor: theme.border,
            },
          ]}
        >
          {pickMode ? (
            <Pressable
              onPress={handlePickConfirm}
              disabled={selectedIds.size === 0}
              style={[
                styles.toolbarPrimary,
                {
                  backgroundColor:
                    selectedIds.size > 0 ? theme.link : theme.textTertiary,
                },
              ]}
            >
              <Feather name="check" size={18} color={theme.buttonText} />
              <ThemedText
                style={[styles.toolbarButtonText, { color: theme.buttonText }]}
              >
                Use Selected ({selectedIds.size})
              </ThemedText>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={handleAssignToCase}
                disabled={selectedIds.size === 0}
                style={[
                  styles.toolbarPrimary,
                  {
                    backgroundColor:
                      selectedIds.size > 0 ? theme.link : theme.textTertiary,
                  },
                ]}
              >
                <Feather
                  name="folder-plus"
                  size={18}
                  color={theme.buttonText}
                />
                <ThemedText
                  style={[
                    styles.toolbarButtonText,
                    { color: theme.buttonText },
                  ]}
                >
                  Assign to Case ({selectedIds.size})
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                style={[
                  styles.toolbarDestructive,
                  {
                    backgroundColor:
                      selectedIds.size > 0
                        ? theme.error + "20"
                        : theme.textTertiary + "20",
                  },
                ]}
              >
                <Feather
                  name="trash-2"
                  size={18}
                  color={
                    selectedIds.size > 0 ? theme.error : theme.textTertiary
                  }
                />
              </Pressable>
            </>
          )}
        </View>
      ) : !isEmpty ? (
        <View
          style={[
            styles.captureBar,
            {
              backgroundColor: theme.backgroundElevated,
              paddingBottom: insets.bottom + Spacing.sm,
              borderTopColor: theme.border,
            },
          ]}
        >
          <Pressable
            onPress={handleTakePhoto}
            style={[styles.captureBarButton, { backgroundColor: theme.link }]}
          >
            <Feather name="camera" size={18} color={theme.buttonText} />
            <ThemedText
              style={[styles.captureBarText, { color: theme.buttonText }]}
            >
              Opus Camera
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handlePickGallery}
            style={[
              styles.captureBarButton,
              { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <Feather name="image" size={18} color={theme.text} />
            <ThemedText style={[styles.captureBarText, { color: theme.text }]}>
              Camera Roll
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {/* Full-screen preview with pinch-zoom + swipe between inbox items */}
      <MediaGalleryViewer
        visible={!!showPreview}
        items={items.map((it) => ({
          id: it.id,
          localUri: it.localUri,
          mimeType: it.mimeType,
          timestamp: it.capturedAt,
          createdAt: it.importedAt,
        }))}
        initialIndex={Math.max(
          0,
          items.findIndex((it) => it.id === showPreview?.id),
        )}
        onClose={() => setShowPreview(null)}
      />

      {/* Case picker modal */}
      <CasePickerModal
        visible={showCasePicker}
        onClose={() => setShowCasePicker(false)}
        onSelectCase={handleCaseSelected}
        initialSearch={patientIdHint}
      />
    </ThemedView>
  );
}

// ═══════════════════════════════════════════════════════════
// Case Picker Modal
// ═══════════════════════════════════════════════════════════

function CasePickerModal({
  visible,
  onClose,
  onSelectCase,
  initialSearch,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectCase: (c: Case) => void;
  initialSearch?: string;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [allCases, setAllCases] = useState<CaseSummary[]>([]);
  const [recentCases, setRecentCases] = useState<CaseSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCaseId, setLoadingCaseId] = useState<string | null>(null);
  const [totalCases, setTotalCases] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setSearch(initialSearch ?? "");
    setLoading(true);
    getCaseSummaries()
      .then((all) => {
        setTotalCases(all.length);
        const sorted = [...all].sort(
          (a, b) =>
            new Date(b.procedureDate ?? b.createdAt).getTime() -
            new Date(a.procedureDate ?? a.createdAt).getTime(),
        );
        setAllCases(sorted);
        setRecentCases(sorted.slice(0, 50));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [visible, initialSearch]);

  const filtered = useMemo(() => {
    if (!search.trim()) return recentCases;
    const q = search.toLowerCase();
    return allCases.filter((c) => c.searchableText.toLowerCase().includes(q));
  }, [allCases, recentCases, search]);

  const renderCase = useCallback(
    ({ item: c }: { item: CaseSummary }) => {
      const dx = c.diagnosisTitle ?? "No diagnosis";
      const specialties = c.specialties ?? [c.specialty];
      const specLabel =
        specialties.length > 0 ? specialties[0]!.replace(/_/g, " ") : undefined;
      const isSelecting = loadingCaseId === c.id;

      return (
        <Pressable
          disabled={isSelecting}
          onPress={async () => {
            setLoadingCaseId(c.id);
            try {
              const fullCase = await getCase(c.id);
              if (fullCase) {
                onSelectCase(fullCase);
              } else {
                Alert.alert("Case not found", "This case could not be opened.");
              }
            } finally {
              setLoadingCaseId(null);
            }
          }}
          style={[styles.caseRow, { borderBottomColor: theme.border }]}
        >
          <View style={styles.caseRowContent}>
            <ThemedText style={styles.caseDx} numberOfLines={1}>
              {dx}
            </ThemedText>
            <ThemedText
              style={[styles.caseMeta, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {c.procedureDate ?? "No date"}
              {specLabel ? ` · ${specLabel}` : ""}
              {c.patientIdentifier ? ` · ${c.patientIdentifier}` : ""}
            </ThemedText>
          </View>
          {isSelecting ? (
            <ActivityIndicator size="small" color={theme.link} />
          ) : (
            <Feather
              name="chevron-right"
              size={16}
              color={theme.textTertiary}
            />
          )}
        </Pressable>
      );
    },
    [loadingCaseId, onSelectCase, theme],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.pickerContainer}>
        <View
          style={[
            styles.pickerHeader,
            {
              paddingTop: insets.top > 0 ? insets.top : Spacing.lg,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <ThemedText style={styles.pickerTitle}>Assign to Case</ThemedText>
          <Pressable onPress={onClose} hitSlop={8}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="search" size={16} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search cases..."
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="none"
          />
        </View>

        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={theme.link} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.loadingCenter}>
            <ThemedText
              style={[styles.emptySubtitle, { color: theme.textTertiary }]}
            >
              {search ? "No matching cases" : "No cases yet"}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(c) => c.id}
            renderItem={renderCase}
            contentContainerStyle={{
              paddingBottom: insets.bottom + Spacing.lg,
            }}
            ListFooterComponent={
              totalCases > 50 && !search ? (
                <ThemedText
                  style={[styles.casePickerHint, { color: theme.textTertiary }]}
                >
                  Showing 50 most recent. Use search to find older cases.
                </ThemedText>
              ) : null
            }
          />
        )}
      </ThemedView>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header bar
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  countText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectButton: {
    fontSize: 15,
    fontWeight: "600",
  },

  // NHI banner
  nhiBanner: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  nhiBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  nhiBannerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  nhiBannerSub: {
    fontSize: 12,
  },
  nhiAssignButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  nhiAssignText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Import banner
  importBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  importText: {
    fontSize: 13,
    fontWeight: "500",
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  captureButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Grid
  gridContainer: {
    padding: GRID_PADDING,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  patientGroup: {
    marginBottom: Spacing.sm,
  },
  patientGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  patientGroupTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  patientGroupCount: {
    fontSize: 13,
  },
  dateGroup: {
    marginBottom: Spacing.md,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  thumbWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  checkCircle: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  timeStamp: {
    position: "absolute",
    bottom: 4,
    left: 4,
    fontSize: 10,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Bottom toolbar (select mode)
  toolbar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
  },
  toolbarPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  toolbarButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  toolbarDestructive: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },

  // Bottom capture bar (non-select mode)
  captureBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
  },
  captureBarButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  captureBarText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Case picker
  pickerContainer: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    margin: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  caseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  caseRowContent: {
    flex: 1,
    gap: 2,
  },
  caseDx: {
    fontSize: 15,
    fontWeight: "500",
  },
  caseMeta: {
    fontSize: 13,
  },
  casePickerHint: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});
