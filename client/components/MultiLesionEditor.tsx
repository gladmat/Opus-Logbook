/**
 * MultiLesionEditor
 * ═══════════════════════════════════════════════════════════════
 * Compact table UI for logging multiple skin lesion excisions within
 * a single surgical case (e.g., 4× BCC excision in one sitting).
 *
 * Each LesionInstance captures:
 *   - Anatomical site (quick-pick + free text)
 *   - Pathology type (BCC / SCC / Melanoma / Benign / Other)
 *   - Excision type (from procedure picklist, pre-populated from group)
 *   - Reconstruction (primary closure / local flap / SSG / secondary)
 *   - Size (L × W mm)
 *   - Margin (peripheral mm, optional)
 *   - Status (Clear / Involved / Pending)
 *
 * SNOMED CT: Each lesion generates a post-coordinated expression at export.
 * Training log: each lesion instance counts as one procedure independently.
 *
 * Architecture notes:
 *   - Controlled component: caller owns lesionInstances state
 *   - Each row is collapsible; summary line shown when collapsed
 *   - "Add" appends a new blank row; "Duplicate last" copies prior row
 *   - Swipe-to-delete row or tap trash icon in expanded view
 */

import React, { useState, useCallback } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  LesionInstance,
  LesionPathologyType,
  LesionReconstruction,
} from "@/types/case";

// ─── Common anatomical sites for quick-pick ────────────────────────────────

const COMMON_SITES: string[] = [
  "Scalp",
  "Forehead",
  "Temple",
  "Nose",
  "Cheek",
  "Ear",
  "Lip",
  "Chin / Jaw",
  "Neck",
  "Chest",
  "Back",
  "Shoulder",
  "Upper arm",
  "Forearm",
  "Hand",
  "Abdomen",
  "Flank",
  "Thigh",
  "Leg",
  "Foot",
];

// ─── Option configs ────────────────────────────────────────────────────────

const PATHOLOGY_OPTIONS: {
  value: LesionPathologyType;
  label: string;
  color: string;
}[] = [
  { value: "bcc", label: "BCC", color: "#2563EB" },
  { value: "scc", label: "SCC", color: "#E5A00D" },
  { value: "melanoma", label: "Mel", color: "#7C3AED" },
  { value: "benign", label: "Benign", color: "#059669" },
  { value: "other", label: "Other", color: "#6B7280" },
];

const RECON_OPTIONS: { value: LesionReconstruction; label: string }[] = [
  { value: "primary_closure", label: "Primary" },
  { value: "local_flap", label: "Local flap" },
  { value: "skin_graft", label: "SSG/FTG" },
  { value: "secondary_healing", label: "Secondary" },
  { value: "other", label: "Other" },
];

const MARGIN_STATUS_OPTIONS: {
  value: LesionInstance["marginStatus"];
  label: string;
}[] = [
  { value: "pending", label: "Pending" },
  { value: "clear", label: "Clear" },
  { value: "involved", label: "Involved" },
];

// ─── Props ────────────────────────────────────────────────────────────────

interface MultiLesionEditorProps {
  lesions: LesionInstance[];
  onChange: (lesions: LesionInstance[]) => void;
  /** Default pathology type to pre-populate from parent diagnosis group */
  defaultPathologyType?: LesionPathologyType;
}

// ─── Single lesion row ─────────────────────────────────────────────────────

interface LesionRowProps {
  lesion: LesionInstance;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updated: LesionInstance) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function LesionRow({
  lesion,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onDuplicate,
}: LesionRowProps) {
  const { theme } = useTheme();
  const [showSitePicker, setShowSitePicker] = useState(false);

  const pathologyOption = PATHOLOGY_OPTIONS.find(
    (p) => p.value === lesion.pathologyType,
  );

  // Summary line: "BCC · Forehead · Primary · Pending"
  const summaryParts = [
    pathologyOption?.label,
    lesion.site || "Site not set",
    lesion.reconstruction
      ? RECON_OPTIONS.find((r) => r.value === lesion.reconstruction)?.label
      : null,
    lesion.marginStatus
      ? MARGIN_STATUS_OPTIONS.find((m) => m.value === lesion.marginStatus)
          ?.label
      : null,
  ].filter(Boolean);

  return (
    <View
      style={[
        styles.lesionCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: isExpanded ? theme.link + "40" : theme.border,
          borderWidth: isExpanded ? 1.5 : 1,
        },
      ]}
    >
      {/* ── Header row: index + summary + expand/collapse ── */}
      <Pressable onPress={onToggleExpand} style={styles.lesionHeader}>
        <View
          style={[
            styles.lesionIndexBadge,
            { backgroundColor: pathologyOption?.color ?? theme.link },
          ]}
        >
          <ThemedText style={styles.lesionIndexText}>{index + 1}</ThemedText>
        </View>

        <View style={styles.lesionSummary}>
          {summaryParts.length > 0 ? (
            <ThemedText
              numberOfLines={1}
              style={[styles.lesionSummaryText, { color: theme.text }]}
            >
              {summaryParts.join(" · ")}
            </ThemedText>
          ) : (
            <ThemedText
              style={[styles.lesionSummaryText, { color: theme.textTertiary }]}
            >
              Tap to configure lesion {index + 1}
            </ThemedText>
          )}
          {lesion.lengthMm || lesion.widthMm ? (
            <ThemedText
              style={[styles.lesionSizeText, { color: theme.textSecondary }]}
            >
              {lesion.lengthMm ?? "?"}×{lesion.widthMm ?? "?"}mm
            </ThemedText>
          ) : null}
        </View>

        <Feather
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>

      {/* ── Expanded detail fields ── */}
      {isExpanded && (
        <View style={styles.lesionDetail}>
          {/* Pathology type chips */}
          <View style={styles.fieldBlock}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Pathology
            </ThemedText>
            <View style={styles.chipRow}>
              {PATHOLOGY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    onUpdate({ ...lesion, pathologyType: opt.value })
                  }
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        lesion.pathologyType === opt.value
                          ? opt.color + "20"
                          : theme.backgroundRoot,
                      borderColor:
                        lesion.pathologyType === opt.value
                          ? opt.color
                          : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color:
                          lesion.pathologyType === opt.value
                            ? opt.color
                            : theme.textSecondary,
                        fontWeight:
                          lesion.pathologyType === opt.value ? "600" : "400",
                      },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Anatomical site */}
          <View style={styles.fieldBlock}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Site
            </ThemedText>
            <TextInput
              value={lesion.site}
              onChangeText={(text) => onUpdate({ ...lesion, site: text })}
              placeholder="e.g. Right temple, Dorsal hand…"
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              autoCapitalize="words"
            />
            {/* Quick-pick site chips */}
            <Pressable
              onPress={() => setShowSitePicker(!showSitePicker)}
              style={styles.quickPickToggle}
            >
              <ThemedText
                style={[styles.quickPickToggleText, { color: theme.link }]}
              >
                {showSitePicker ? "Hide quick-pick" : "Quick-pick site ▾"}
              </ThemedText>
            </Pressable>
            {showSitePicker && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.siteScrollView}
              >
                <View style={styles.siteChipRow}>
                  {COMMON_SITES.map((site) => (
                    <Pressable
                      key={site}
                      onPress={() => {
                        onUpdate({ ...lesion, site });
                        setShowSitePicker(false);
                      }}
                      style={[
                        styles.siteChip,
                        {
                          backgroundColor:
                            lesion.site === site
                              ? theme.link + "15"
                              : theme.backgroundRoot,
                          borderColor:
                            lesion.site === site ? theme.link : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          {
                            color:
                              lesion.site === site
                                ? theme.link
                                : theme.textSecondary,
                          },
                        ]}
                      >
                        {site}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Reconstruction */}
          <View style={styles.fieldBlock}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Reconstruction
            </ThemedText>
            <View style={styles.chipRow}>
              {RECON_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    onUpdate({ ...lesion, reconstruction: opt.value })
                  }
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        lesion.reconstruction === opt.value
                          ? theme.link + "15"
                          : theme.backgroundRoot,
                      borderColor:
                        lesion.reconstruction === opt.value
                          ? theme.link
                          : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color:
                          lesion.reconstruction === opt.value
                            ? theme.link
                            : theme.textSecondary,
                        fontWeight:
                          lesion.reconstruction === opt.value ? "600" : "400",
                      },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Size row */}
          <View style={styles.fieldBlock}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Lesion size (mm)
            </ThemedText>
            <View style={styles.twoColRow}>
              <View style={styles.halfField}>
                <ThemedText
                  style={[styles.subLabel, { color: theme.textTertiary }]}
                >
                  Length
                </ThemedText>
                <View
                  style={[
                    styles.numInputContainer,
                    {
                      backgroundColor: theme.backgroundRoot,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <TextInput
                    value={lesion.lengthMm?.toString() ?? ""}
                    onChangeText={(t) =>
                      onUpdate({
                        ...lesion,
                        lengthMm: t ? parseFloat(t) : undefined,
                      })
                    }
                    placeholder="—"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="decimal-pad"
                    style={[styles.numInput, { color: theme.text }]}
                  />
                  <ThemedText
                    style={[styles.unit, { color: theme.textSecondary }]}
                  >
                    mm
                  </ThemedText>
                </View>
              </View>
              <View style={styles.halfField}>
                <ThemedText
                  style={[styles.subLabel, { color: theme.textTertiary }]}
                >
                  Width
                </ThemedText>
                <View
                  style={[
                    styles.numInputContainer,
                    {
                      backgroundColor: theme.backgroundRoot,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <TextInput
                    value={lesion.widthMm?.toString() ?? ""}
                    onChangeText={(t) =>
                      onUpdate({
                        ...lesion,
                        widthMm: t ? parseFloat(t) : undefined,
                      })
                    }
                    placeholder="—"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="decimal-pad"
                    style={[styles.numInput, { color: theme.text }]}
                  />
                  <ThemedText
                    style={[styles.unit, { color: theme.textSecondary }]}
                  >
                    mm
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Peripheral margin */}
          <View style={styles.fieldBlock}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Peripheral margin (mm)
            </ThemedText>
            <View
              style={[
                styles.numInputContainer,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                  maxWidth: 120,
                },
              ]}
            >
              <TextInput
                value={lesion.peripheralMarginMm?.toString() ?? ""}
                onChangeText={(t) =>
                  onUpdate({
                    ...lesion,
                    peripheralMarginMm: t ? parseFloat(t) : undefined,
                  })
                }
                placeholder="—"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                style={[styles.numInput, { color: theme.text }]}
              />
              <ThemedText style={[styles.unit, { color: theme.textSecondary }]}>
                mm
              </ThemedText>
            </View>
          </View>

          {/* Margin status */}
          <View style={styles.fieldBlock}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Margin status
            </ThemedText>
            <View style={styles.chipRow}>
              {MARGIN_STATUS_OPTIONS.map((opt) => {
                const isSelected = lesion.marginStatus === opt.value;
                const statusColor =
                  opt.value === "clear"
                    ? "#059669"
                    : opt.value === "involved"
                      ? "#DC2626"
                      : "#6B7280";
                return (
                  <Pressable
                    key={opt.value ?? "none"}
                    onPress={() =>
                      onUpdate({ ...lesion, marginStatus: opt.value })
                    }
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? statusColor + "15"
                          : theme.backgroundRoot,
                        borderColor: isSelected ? statusColor : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? statusColor : theme.textSecondary,
                          fontWeight: isSelected ? "600" : "400",
                        },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Row actions: duplicate + delete */}
          <View style={[styles.rowActions, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={onDuplicate}
              style={[styles.rowActionButton, { borderColor: theme.border }]}
            >
              <Feather name="copy" size={15} color={theme.link} />
              <ThemedText style={[styles.rowActionText, { color: theme.link }]}>
                Duplicate
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={onDelete}
              style={[styles.rowActionButton, { borderColor: theme.border }]}
            >
              <Feather name="trash-2" size={15} color={theme.error} />
              <ThemedText
                style={[styles.rowActionText, { color: theme.error }]}
              >
                Remove
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function MultiLesionEditor({
  lesions,
  onChange,
  defaultPathologyType,
}: MultiLesionEditorProps) {
  const { theme } = useTheme();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    // Auto-expand last row (new additions)
    new Set(lesions.length > 0 ? [lesions[lesions.length - 1]!.id] : []),
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleUpdate = useCallback(
    (id: string, updated: LesionInstance) => {
      onChange(lesions.map((l) => (l.id === id ? updated : l)));
    },
    [lesions, onChange],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (lesions.length <= 1) {
        Alert.alert(
          "Remove lesion?",
          "This is the only lesion. To switch back to single-lesion mode, turn off Multi-lesion at the top.",
          [{ text: "OK" }],
        );
        return;
      }
      Alert.alert("Remove lesion", "Remove this lesion entry?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onChange(lesions.filter((l) => l.id !== id)),
        },
      ]);
    },
    [lesions, onChange],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const source = lesions.find((l) => l.id === id);
      if (!source) return;
      const newId = uuidv4();
      const copy: LesionInstance = {
        ...source,
        id: newId,
        site: source.site, // keep site — surgeon will edit if different
        marginStatus: "pending", // reset margin status on duplicate
        histologyConfirmed: false,
      };
      const idx = lesions.findIndex((l) => l.id === id);
      const newList = [
        ...lesions.slice(0, idx + 1),
        copy,
        ...lesions.slice(idx + 1),
      ];
      onChange(newList);
      // Auto-expand the new copy
      setExpandedIds((prev) => new Set([...prev, newId]));
    },
    [lesions, onChange],
  );

  const handleAdd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const last = lesions[lesions.length - 1];
    const newId = uuidv4();
    const newLesion: LesionInstance = {
      id: newId,
      site: "",
      pathologyType: last?.pathologyType ?? defaultPathologyType ?? "bcc",
      reconstruction: last?.reconstruction ?? "primary_closure",
      marginStatus: "pending",
      histologyConfirmed: false,
    };
    onChange([...lesions, newLesion]);
    setExpandedIds((prev) => new Set([...prev, newId]));
  }, [lesions, onChange, defaultPathologyType]);

  // Summary stats
  const confirmedCount = lesions.filter(
    (l) => l.marginStatus === "clear",
  ).length;
  const pendingCount = lesions.filter(
    (l) => l.marginStatus === "pending",
  ).length;
  const involvedCount = lesions.filter(
    (l) => l.marginStatus === "involved",
  ).length;

  return (
    <View>
      {/* Header with stats */}
      <View
        style={[
          styles.statsBar,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.statItem}>
          <ThemedText style={[styles.statNumber, { color: theme.text }]}>
            {lesions.length}
          </ThemedText>
          <ThemedText
            style={[styles.statLabel, { color: theme.textSecondary }]}
          >
            lesions
          </ThemedText>
        </View>
        {confirmedCount > 0 && (
          <View style={styles.statItem}>
            <ThemedText style={[styles.statNumber, { color: "#059669" }]}>
              {confirmedCount}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              clear
            </ThemedText>
          </View>
        )}
        {involvedCount > 0 && (
          <View style={styles.statItem}>
            <ThemedText style={[styles.statNumber, { color: "#DC2626" }]}>
              {involvedCount}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              involved
            </ThemedText>
          </View>
        )}
        {pendingCount > 0 && (
          <View style={styles.statItem}>
            <ThemedText style={[styles.statNumber, { color: "#6B7280" }]}>
              {pendingCount}
            </ThemedText>
            <ThemedText
              style={[styles.statLabel, { color: theme.textSecondary }]}
            >
              pending
            </ThemedText>
          </View>
        )}
      </View>

      {/* Lesion rows */}
      {lesions.map((lesion, index) => (
        <LesionRow
          key={lesion.id}
          lesion={lesion}
          index={index}
          isExpanded={expandedIds.has(lesion.id)}
          onToggleExpand={() => toggleExpand(lesion.id)}
          onUpdate={(updated) => handleUpdate(lesion.id, updated)}
          onDelete={() => handleDelete(lesion.id)}
          onDuplicate={() => handleDuplicate(lesion.id)}
        />
      ))}

      {/* Add lesion button */}
      <Pressable
        onPress={handleAdd}
        style={[
          styles.addButton,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.link + "50",
          },
        ]}
      >
        <Feather name="plus" size={18} color={theme.link} />
        <ThemedText style={[styles.addButtonText, { color: theme.link }]}>
          Add lesion
        </ThemedText>
      </Pressable>

      {/* Training log note */}
      <ThemedText style={[styles.trainingNote, { color: theme.textTertiary }]}>
        Each lesion logs separately for training programme counts.
      </ThemedText>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  lesionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  lesionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  lesionIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lesionIndexText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  lesionSummary: {
    flex: 1,
    gap: 2,
  },
  lesionSummaryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  lesionSizeText: {
    fontSize: 12,
  },
  lesionDetail: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 0,
  },
  fieldBlock: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  subLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  siteScrollView: {
    marginTop: Spacing.xs,
  },
  siteChipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  siteChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    minHeight: 44,
  },
  quickPickToggle: {
    marginTop: Spacing.xs,
    alignSelf: "flex-start",
  },
  quickPickToggleText: {
    fontSize: 13,
  },
  twoColRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  numInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  numInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.md,
  },
  unit: {
    fontSize: 13,
    marginLeft: Spacing.xs,
  },
  rowActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  rowActionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: Spacing.xs,
    minHeight: 46,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  trainingNote: {
    fontSize: 12,
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
});
