/**
 * JointImplantSection — Inline implant tracking for hand arthroplasty.
 * Auto-activates when a procedure with hasImplant: true is selected.
 * 3-layer progressive disclosure: auto-derived → implant/size/approach → technical details.
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Pressable,
  TextInput,
  Switch,
  LayoutAnimation,
  StyleSheet,
} from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import type {
  JointImplantDetails,
  ImplantFixation,
  ImplantBearing,
  RevisionReason,
} from "@/types/jointImplant";
import {
  APPROACH_LABELS,
  FIXATION_LABELS,
  BEARING_LABELS,
  REVISION_REASON_LABELS,
  INDICATION_LABELS,
  getApproachesForJoint,
} from "@/types/jointImplant";
import {
  IMPLANT_CATALOGUE,
  getImplantsForJoint,
  DIAGNOSIS_TO_INDICATION,
  PROCEDURE_TO_JOINT_TYPE,
  type ImplantCatalogueEntry,
} from "@/data/implantCatalogue";

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface JointImplantSectionProps {
  procedurePicklistId: string;
  diagnosisId?: string;
  value?: JointImplantDetails;
  onChange: (details: JointImplantDetails) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SMOOTH_LAYOUT = LayoutAnimation.Presets.easeInEaseOut;

const FIXATION_OPTIONS: ImplantFixation[] = [
  "cemented",
  "uncemented",
  "hybrid",
  "not_applicable",
];

const REVISION_REASONS: RevisionReason[] = [
  "loosening",
  "dislocation",
  "fracture_implant",
  "fracture_periprosthetic",
  "infection",
  "wear",
  "pain",
  "stiffness",
  "metallosis",
  "subsidence",
  "malalignment",
  "other",
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function JointImplantSection({
  procedurePicklistId,
  diagnosisId,
  value,
  onChange,
}: JointImplantSectionProps) {
  const { theme } = useTheme();
  const [showTechnical, setShowTechnical] = useState(false);

  // ── Derived state ─────────────────────────────────────────────────────
  const jointType = PROCEDURE_TO_JOINT_TYPE[procedurePicklistId];
  const indication = diagnosisId
    ? (DIAGNOSIS_TO_INDICATION[diagnosisId] ?? "other")
    : "other";

  // Initialize on mount or when joint type / indication changes
  useEffect(() => {
    if (!jointType) return;
    if (!value || value.jointType !== jointType) {
      onChange({
        jointType,
        indication,
        procedureType: value?.procedureType ?? "primary",
        implantSystemId: value?.implantSystemId ?? "",
      });
    } else if (value.indication !== indication) {
      onChange({ ...value, indication });
    }
  }, [jointType, indication]); // eslint-disable-line react-hooks/exhaustive-deps

  const implants = useMemo(
    () => (jointType ? getImplantsForJoint(jointType) : []),
    [jointType],
  );

  const selectedImplant = value?.implantSystemId
    ? IMPLANT_CATALOGUE[value.implantSystemId]
    : undefined;

  const approaches = useMemo(
    () => (jointType ? getApproachesForJoint(jointType) : []),
    [jointType],
  );

  // ── Helpers ───────────────────────────────────────────────────────────

  const update = useCallback(
    (patch: Partial<JointImplantDetails>) => {
      if (!value) return;
      onChange({ ...value, ...patch });
    },
    [value, onChange],
  );

  const selectImplant = useCallback(
    (entry: ImplantCatalogueEntry) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!value) return;

      // Clear size fields when switching implant
      const updated: JointImplantDetails = {
        ...value,
        implantSystemId: entry.id,
        implantSystemOther:
          entry.id === "other" ? value.implantSystemOther : undefined,
        fixation: entry.defaultFixation,
        bearingSurface: entry.defaultBearing,
        sizeUnified: undefined,
        cupSize: undefined,
        stemSize: undefined,
        neckVariant: undefined,
        linerType: undefined,
        grommetsUsed: undefined,
      };
      onChange(updated);
    },
    [value, onChange],
  );

  const toggleTechnical = useCallback(() => {
    LayoutAnimation.configureNext(SMOOTH_LAYOUT);
    setShowTechnical((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // ── Technical summary line ────────────────────────────────────────────
  const technicalSummary = useMemo(() => {
    if (!value || !selectedImplant) return null;
    const parts: string[] = [];
    if (value.fixation) parts.push(FIXATION_LABELS[value.fixation]);
    if (value.bearingSurface) parts.push(BEARING_LABELS[value.bearingSurface]);
    return parts.length > 0 ? parts.join(" \u00B7 ") : null;
  }, [value, selectedImplant]);

  // Show grommets toggle only for Swanson MCP sizes 3-9
  const showGrommets = useMemo(() => {
    if (value?.implantSystemId !== "mcp_swanson") return false;
    const size = value?.sizeUnified;
    if (!size) return false;
    const num = parseInt(size, 10);
    return !isNaN(num) && num >= 3 && num <= 9;
  }, [value?.implantSystemId, value?.sizeUnified]);

  if (!jointType || !value) return null;

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: theme.link + "15" }]}>
        <Feather name="tool" size={16} color={theme.link} />
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
          Implant Details
        </ThemedText>
        {/* Primary/Revision toggle */}
        <Pressable
          style={[
            styles.procedureTypeBadge,
            {
              backgroundColor:
                value.procedureType === "revision"
                  ? theme.warning + "20"
                  : theme.backgroundElevated,
              borderColor:
                value.procedureType === "revision"
                  ? theme.warning
                  : theme.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            LayoutAnimation.configureNext(SMOOTH_LAYOUT);
            update({
              procedureType:
                value.procedureType === "primary" ? "revision" : "primary",
            });
          }}
        >
          <ThemedText
            style={[
              styles.procedureTypeText,
              {
                color:
                  value.procedureType === "revision"
                    ? theme.warning
                    : theme.textSecondary,
              },
            ]}
          >
            {value.procedureType === "primary" ? "Primary" : "Revision"}
          </ThemedText>
          <Feather
            name="chevron-down"
            size={12}
            color={
              value.procedureType === "revision"
                ? theme.warning
                : theme.textSecondary
            }
          />
        </Pressable>
      </View>

      {/* ── Layer 1: Implant System ──────────────────────────────── */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Implant System
        </ThemedText>
        <View style={styles.implantList}>
          {implants.map((entry) => {
            const selected = value.implantSystemId === entry.id;
            const discontinued = entry.isDiscontinued;
            return (
              <Pressable
                key={entry.id}
                style={[
                  styles.implantRow,
                  {
                    backgroundColor: selected
                      ? theme.link + "15"
                      : "transparent",
                    borderColor: selected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => selectImplant(entry)}
              >
                <View style={styles.implantRowContent}>
                  {entry.availableInNZ && !discontinued ? (
                    <Feather
                      name="star"
                      size={12}
                      color={selected ? theme.link : theme.textTertiary}
                      style={{ marginRight: 4 }}
                    />
                  ) : null}
                  <ThemedText
                    style={[
                      styles.implantName,
                      {
                        color: discontinued
                          ? theme.textTertiary
                          : selected
                            ? theme.link
                            : theme.text,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {entry.displayName}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[
                    styles.implantCategory,
                    { color: theme.textTertiary },
                  ]}
                  numberOfLines={1}
                >
                  {entry.implantCategory.replace(/_/g, " ")}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* "Other" free text */}
        {value.implantSystemId === "other" ? (
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Implant name and manufacturer"
            placeholderTextColor={theme.textTertiary}
            value={value.implantSystemOther ?? ""}
            onChangeText={(text) => update({ implantSystemOther: text })}
          />
        ) : null}
      </View>

      {/* ── Layer 1: Size Pickers ────────────────────────────────── */}
      {selectedImplant && selectedImplant.id !== "other" ? (
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Size
          </ThemedText>
          {selectedImplant.sizes.type === "unified" &&
          selectedImplant.sizes.options.length > 0 ? (
            <View style={styles.chipRow}>
              {selectedImplant.sizes.options.map((size) => {
                const selected = value.sizeUnified === size;
                return (
                  <Pressable
                    key={size}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? theme.link + "15"
                          : "transparent",
                        borderColor: selected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({ sizeUnified: selected ? undefined : size });
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: selected ? theme.link : theme.text },
                      ]}
                    >
                      {size}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {selectedImplant.sizes.type === "components" ? (
            <View style={{ gap: Spacing.sm }}>
              {/* Cup size */}
              <View>
                <ThemedText
                  style={[styles.subLabel, { color: theme.textSecondary }]}
                >
                  Cup
                </ThemedText>
                <View style={styles.chipRow}>
                  {selectedImplant.sizes.cup.map((size) => {
                    const selected = value.cupSize === size;
                    return (
                      <Pressable
                        key={size}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected
                              ? theme.link + "15"
                              : "transparent",
                            borderColor: selected ? theme.link : theme.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          update({ cupSize: selected ? undefined : size });
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.chipText,
                            {
                              color: selected ? theme.link : theme.text,
                            },
                          ]}
                        >
                          {size}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Stem size */}
              <View>
                <ThemedText
                  style={[styles.subLabel, { color: theme.textSecondary }]}
                >
                  Stem
                </ThemedText>
                <View style={styles.chipRow}>
                  {selectedImplant.sizes.stem.map((size) => {
                    const selected = value.stemSize === size;
                    return (
                      <Pressable
                        key={size}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected
                              ? theme.link + "15"
                              : "transparent",
                            borderColor: selected ? theme.link : theme.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          update({ stemSize: selected ? undefined : size });
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.chipText,
                            {
                              color: selected ? theme.link : theme.text,
                            },
                          ]}
                        >
                          {size}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Neck variant (if available) */}
              {selectedImplant.sizes.neck ? (
                <View>
                  <ThemedText
                    style={[styles.subLabel, { color: theme.textSecondary }]}
                  >
                    Neck
                  </ThemedText>
                  <View style={styles.chipRow}>
                    {selectedImplant.sizes.neck.map((variant) => {
                      const selected = value.neckVariant === variant;
                      return (
                        <Pressable
                          key={variant}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected
                                ? theme.link + "15"
                                : "transparent",
                              borderColor: selected ? theme.link : theme.border,
                            },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            update({
                              neckVariant: selected ? undefined : variant,
                            });
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.chipText,
                              {
                                color: selected ? theme.link : theme.text,
                              },
                            ]}
                          >
                            {variant}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {selectedImplant.sizes.type === "matched" ? (
            <View style={styles.chipRow}>
              {selectedImplant.sizes.options.map((size) => {
                const selected = value.sizeUnified === size;
                return (
                  <Pressable
                    key={size}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? theme.link + "15"
                          : "transparent",
                        borderColor: selected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({ sizeUnified: selected ? undefined : size });
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: selected ? theme.link : theme.text },
                      ]}
                    >
                      {size}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── Layer 1: Approach ────────────────────────────────────── */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Approach
        </ThemedText>
        <View style={styles.chipRow}>
          {approaches.map((approach) => {
            const selected = value.approach === approach;
            return (
              <Pressable
                key={approach}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? theme.link + "15"
                      : "transparent",
                    borderColor: selected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    approach: selected ? undefined : approach,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: selected ? theme.link : theme.text },
                  ]}
                >
                  {APPROACH_LABELS[approach]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Indication badge ─────────────────────────────────────── */}
      <View style={[styles.indicationRow, { borderTopColor: theme.border }]}>
        <ThemedText
          style={[styles.indicationLabel, { color: theme.textSecondary }]}
        >
          Indication
        </ThemedText>
        <ThemedText style={[styles.indicationValue, { color: theme.text }]}>
          {INDICATION_LABELS[value.indication]}
        </ThemedText>
      </View>

      {/* ── Layer 2: Technical Details ───────────────────────────── */}
      <Pressable
        style={[styles.technicalHeader, { borderTopColor: theme.border }]}
        onPress={toggleTechnical}
      >
        <ThemedText
          style={[styles.technicalTitle, { color: theme.textSecondary }]}
        >
          Technical Details
        </ThemedText>
        {!showTechnical && technicalSummary ? (
          <ThemedText
            style={[styles.technicalSummary, { color: theme.textTertiary }]}
            numberOfLines={1}
          >
            {technicalSummary}
          </ThemedText>
        ) : null}
        <Feather
          name={showTechnical ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.textSecondary}
        />
      </Pressable>

      {showTechnical ? (
        <View style={styles.technicalContent}>
          {/* Fixation */}
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              Fixation
            </ThemedText>
            <View style={styles.chipRow}>
              {FIXATION_OPTIONS.map((fix) => {
                const selected = value.fixation === fix;
                return (
                  <Pressable
                    key={fix}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? theme.link + "15"
                          : "transparent",
                        borderColor: selected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({ fixation: selected ? undefined : fix });
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: selected ? theme.link : theme.text },
                      ]}
                    >
                      {FIXATION_LABELS[fix]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Bearing Surface */}
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              Bearing Surface
            </ThemedText>
            <View style={styles.chipRow}>
              {(Object.keys(BEARING_LABELS) as ImplantBearing[]).map(
                (bearing) => {
                  const selected = value.bearingSurface === bearing;
                  return (
                    <Pressable
                      key={bearing}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? theme.link + "15"
                            : "transparent",
                          borderColor: selected ? theme.link : theme.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        update({
                          bearingSurface: selected ? undefined : bearing,
                        });
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: selected ? theme.link : theme.text },
                        ]}
                      >
                        {BEARING_LABELS[bearing]}
                      </ThemedText>
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>

          {/* Cement brand (only when fixation includes cement) */}
          {value.fixation === "cemented" || value.fixation === "hybrid" ? (
            <View style={styles.section}>
              <ThemedText
                style={[styles.sectionLabel, { color: theme.textSecondary }]}
              >
                Cement Brand
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundElevated,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="e.g., Palacos, Simplex"
                placeholderTextColor={theme.textTertiary}
                value={value.cementBrand ?? ""}
                onChangeText={(text) =>
                  update({ cementBrand: text || undefined })
                }
              />
            </View>
          ) : null}

          {/* Catalogue / Lot / UDI */}
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              Catalogue / Product Number
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="From implant sticker"
              placeholderTextColor={theme.textTertiary}
              value={value.catalogueNumber ?? ""}
              onChangeText={(text) =>
                update({ catalogueNumber: text || undefined })
              }
            />
          </View>

          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              Lot / Batch Number
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="From implant sticker"
              placeholderTextColor={theme.textTertiary}
              value={value.lotBatchNumber ?? ""}
              onChangeText={(text) =>
                update({ lotBatchNumber: text || undefined })
              }
            />
          </View>

          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              UDI Barcode
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Manual entry"
              placeholderTextColor={theme.textTertiary}
              value={value.udi ?? ""}
              onChangeText={(text) => update({ udi: text || undefined })}
            />
          </View>

          {/* Grommets — Swanson MCP only, sizes 3-9 */}
          {showGrommets ? (
            <View style={[styles.switchRow, { borderTopColor: theme.border }]}>
              <ThemedText style={{ color: theme.text, fontSize: 14 }}>
                Grommets used
              </ThemedText>
              <Switch
                value={value.grommetsUsed ?? false}
                onValueChange={(val) => update({ grommetsUsed: val })}
                trackColor={{
                  false: theme.backgroundElevated,
                  true: theme.link + "40",
                }}
                thumbColor={
                  value.grommetsUsed ? theme.link : theme.textTertiary
                }
              />
            </View>
          ) : null}

          {/* Revision-specific fields */}
          {value.procedureType === "revision" ? (
            <View style={styles.section}>
              <ThemedText
                style={[styles.sectionLabel, { color: theme.textSecondary }]}
              >
                Revision Reason
              </ThemedText>
              <View style={styles.chipRow}>
                {REVISION_REASONS.map((reason) => {
                  const selected = value.revisionReason === reason;
                  return (
                    <Pressable
                      key={reason}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? theme.warning + "15"
                            : "transparent",
                          borderColor: selected ? theme.warning : theme.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        update({
                          revisionReason: selected ? undefined : reason,
                        });
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          {
                            color: selected ? theme.warning : theme.text,
                          },
                        ]}
                      >
                        {REVISION_REASON_LABELS[reason]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText
                style={[
                  styles.sectionLabel,
                  { color: theme.textSecondary, marginTop: Spacing.md },
                ]}
              >
                Components Revised
              </ThemedText>
              <View style={styles.chipRow}>
                {(["cup", "stem", "liner", "all"] as const).map((component) => {
                  const selected =
                    value.componentsRevised?.includes(component) ?? false;
                  return (
                    <Pressable
                      key={component}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? theme.warning + "15"
                            : "transparent",
                          borderColor: selected ? theme.warning : theme.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const current = value.componentsRevised ?? [];
                        const updated = selected
                          ? current.filter((c) => c !== component)
                          : [...current, component];
                        update({
                          componentsRevised:
                            updated.length > 0 ? updated : undefined,
                        });
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          {
                            color: selected ? theme.warning : theme.text,
                          },
                        ]}
                      >
                        {component.charAt(0).toUpperCase() + component.slice(1)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  procedureTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  procedureTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  implantList: {
    gap: 4,
  },
  implantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 44,
  },
  implantRowContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.sm,
  },
  implantName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  implantCategory: {
    fontSize: 12,
  },
  indicationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  indicationLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  indicationValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  technicalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.xs,
  },
  technicalTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  technicalSummary: {
    flex: 1,
    fontSize: 12,
    textAlign: "right",
    marginRight: 4,
  },
  technicalContent: {
    // Content rendered as children
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
});
