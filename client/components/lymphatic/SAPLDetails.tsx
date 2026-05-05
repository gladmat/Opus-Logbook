/**
 * SAPLDetails — Suction-Assisted Protein Lipectomy (Brorson technique) operative details.
 *
 * Renders inline within LymphaticAssessment for SAPL and lipedema liposuction procedures.
 * 3-layer progressive disclosure: core fields → expanded details → zones & garment.
 */

import React, { useCallback, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  SAPLOperativeDetails,
  SAPLTechnique,
  CompressionClass,
} from "@/types/lymphatic";
import { SAPL_TECHNIQUE_LABELS } from "@/types/lymphatic";

// ─── Props ──────────────────────────────────────────────────────────────────

interface SAPLDetailsProps {
  value: SAPLOperativeDetails;
  onChange: (d: SAPLOperativeDetails) => void;
  procedureName?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TECHNIQUE_OPTIONS: SAPLTechnique[] = [
  "power_assisted",
  "manual",
  "other",
];
const COMPRESSION_OPTIONS: CompressionClass[] = ["I", "II", "III"];
const COMPRESSION_LABELS: Record<CompressionClass, string> = {
  I: "Class I",
  II: "Class II",
  III: "Class III",
};

const TREATMENT_ZONES = [
  "upper_arm",
  "forearm",
  "hand",
  "thigh",
  "calf",
  "ankle",
  "abdomen",
  "hip",
] as const;
const ZONE_LABELS: Record<string, string> = {
  upper_arm: "Upper arm",
  forearm: "Forearm",
  hand: "Hand",
  thigh: "Thigh",
  calf: "Calf",
  ankle: "Ankle",
  abdomen: "Abdomen",
  hip: "Hip/flank",
};

// ─── Chip helper ────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options,
  labels,
  selected,
  onSelect,
  accentColor,
  theme,
}: {
  options: T[];
  labels: Record<T, string>;
  selected?: T;
  onSelect: (v: T) => void;
  accentColor: string;
  theme: any;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? accentColor + "20"
                  : theme.backgroundSecondary,
                borderColor: isSelected ? accentColor : theme.border,
              },
            ]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[
                styles.chipText,
                { color: isSelected ? accentColor : theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {labels[opt]}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiChipRow({
  options,
  labels,
  selected,
  onToggle,
  accentColor,
  theme,
}: {
  options: readonly string[];
  labels: Record<string, string>;
  selected: string[];
  onToggle: (v: string) => void;
  accentColor: string;
  theme: any;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? accentColor + "20"
                  : theme.backgroundSecondary,
                borderColor: isSelected ? accentColor : theme.border,
              },
            ]}
            onPress={() => onToggle(opt)}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[
                styles.chipText,
                { color: isSelected ? accentColor : theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {labels[opt] ?? opt}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export const SAPLDetailsComponent = React.memo(function SAPLDetailsComponent({
  value,
  onChange,
  procedureName,
}: SAPLDetailsProps) {
  const { theme } = useTheme();
  const accentColor = theme.accent;
  const [showMore, setShowMore] = useState(false);
  const [showZones, setShowZones] = useState(false);

  const update = useCallback(
    (patch: Partial<SAPLOperativeDetails>) => {
      onChange({ ...value, ...patch });
    },
    [value, onChange],
  );

  const toggleZone = useCallback(
    (zone: string) => {
      const current = value.areasZonesTreated ?? [];
      const updated = current.includes(zone)
        ? current.filter((z) => z !== zone)
        : [...current, zone];
      update({ areasZonesTreated: updated });
    },
    [value.areasZonesTreated, update],
  );

  const sectionTitle = procedureName
    ? `SAPL Details — ${procedureName}`
    : "SAPL / Liposuction Details";

  return (
    <SectionWrapper
      title={sectionTitle}
      icon="droplet"
      collapsible
      defaultCollapsed={false}
    >
      {/* ── Layer 1: Core fields (always visible) ── */}
      <View style={styles.fieldRow}>
        <View style={styles.fieldHalf}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Total aspirate (mL)
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            keyboardType="number-pad"
            placeholder="e.g. 1500"
            placeholderTextColor={theme.textTertiary}
            value={
              value.totalAspirateMl != null ? String(value.totalAspirateMl) : ""
            }
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              update({ totalAspirateMl: isNaN(n) ? undefined : n });
            }}
          />
        </View>
        <View style={styles.fieldHalf}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Technique
          </ThemedText>
          <ChipRow
            options={TECHNIQUE_OPTIONS}
            labels={SAPL_TECHNIQUE_LABELS}
            selected={value.technique}
            onSelect={(v) => update({ technique: v })}
            accentColor={accentColor}
            theme={theme}
          />
        </View>
      </View>

      {/* ── Layer 2: Expanded details ── */}
      <TouchableOpacity
        onPress={() => setShowMore(!showMore)}
        style={styles.disclosureLink}
        activeOpacity={0.7}
      >
        <ThemedText
          style={{ color: accentColor, fontSize: 13, fontWeight: "500" }}
        >
          {showMore ? "Hide details" : "More details"}
        </ThemedText>
      </TouchableOpacity>

      {showMore && (
        <View style={{ marginTop: Spacing.xs }}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Tumescent vol (mL)
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="number-pad"
                placeholder="e.g. 3000"
                placeholderTextColor={theme.textTertiary}
                value={
                  value.tumescentVolumeMl != null
                    ? String(value.tumescentVolumeMl)
                    : ""
                }
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  update({ tumescentVolumeMl: isNaN(n) ? undefined : n });
                }}
              />
            </View>
            <View style={styles.fieldHalf}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Fat % of aspirate
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="number-pad"
                placeholder="e.g. 80"
                placeholderTextColor={theme.textTertiary}
                value={
                  value.aspirateFatPercent != null
                    ? String(value.aspirateFatPercent)
                    : ""
                }
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  update({ aspirateFatPercent: isNaN(n) ? undefined : n });
                }}
              />
            </View>
          </View>

          {/* Tourniquet */}
          <View style={[styles.toggleRow, { marginTop: Spacing.sm }]}>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
              Tourniquet used
            </ThemedText>
            <Switch
              value={value.tourniquetUsed ?? false}
              onValueChange={(v) => update({ tourniquetUsed: v })}
              trackColor={{
                false: theme.backgroundSecondary,
                true: accentColor + "60",
              }}
              thumbColor={
                value.tourniquetUsed ? accentColor : theme.textTertiary
              }
            />
          </View>

          {value.tourniquetUsed && (
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Location
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="e.g. upper thigh"
                  placeholderTextColor={theme.textTertiary}
                  value={value.tourniquetLocation ?? ""}
                  onChangeText={(v) =>
                    update({ tourniquetLocation: v || undefined })
                  }
                />
              </View>
              <View style={styles.fieldHalf}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Time (min)
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  keyboardType="number-pad"
                  placeholder="90"
                  placeholderTextColor={theme.textTertiary}
                  value={
                    value.tourniquetTimeMinutes != null
                      ? String(value.tourniquetTimeMinutes)
                      : ""
                  }
                  onChangeText={(v) => {
                    const n = parseInt(v, 10);
                    update({
                      tourniquetTimeMinutes: isNaN(n) ? undefined : n,
                    });
                  }}
                />
              </View>
            </View>
          )}

          <View style={[styles.fieldRow, { marginTop: Spacing.sm }]}>
            <View style={styles.fieldHalf}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Access incisions
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="number-pad"
                placeholder="4"
                placeholderTextColor={theme.textTertiary}
                value={
                  value.accessIncisionCount != null
                    ? String(value.accessIncisionCount)
                    : ""
                }
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  update({ accessIncisionCount: isNaN(n) ? undefined : n });
                }}
              />
            </View>
            <View style={styles.fieldHalf}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Cannula size (mm)
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="decimal-pad"
                placeholder="3.0"
                placeholderTextColor={theme.textTertiary}
                value={
                  value.cannulaSizeMm != null ? String(value.cannulaSizeMm) : ""
                }
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  update({ cannulaSizeMm: isNaN(n) ? undefined : n });
                }}
              />
            </View>
          </View>
        </View>
      )}

      {/* ── Layer 3: Zones & garment ── */}
      <TouchableOpacity
        onPress={() => setShowZones(!showZones)}
        style={styles.disclosureLink}
        activeOpacity={0.7}
      >
        <ThemedText
          style={{ color: accentColor, fontSize: 13, fontWeight: "500" }}
        >
          {showZones ? "Hide zones & garment" : "Zones & garment"}
        </ThemedText>
      </TouchableOpacity>

      {showZones && (
        <View style={{ marginTop: Spacing.xs }}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Areas / zones treated
          </ThemedText>
          <MultiChipRow
            options={TREATMENT_ZONES}
            labels={ZONE_LABELS}
            selected={value.areasZonesTreated ?? []}
            onToggle={toggleZone}
            accentColor={accentColor}
            theme={theme}
          />

          <View style={[styles.toggleRow, { marginTop: Spacing.sm }]}>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
              Garment applied intraop
            </ThemedText>
            <Switch
              value={value.garmentAppliedIntraop ?? false}
              onValueChange={(v) => update({ garmentAppliedIntraop: v })}
              trackColor={{
                false: theme.backgroundSecondary,
                true: accentColor + "60",
              }}
              thumbColor={
                value.garmentAppliedIntraop ? accentColor : theme.textTertiary
              }
            />
          </View>

          {value.garmentAppliedIntraop && (
            <>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Garment class
              </ThemedText>
              <ChipRow
                options={COMPRESSION_OPTIONS}
                labels={COMPRESSION_LABELS}
                selected={value.garmentClass}
                onSelect={(v) => update({ garmentClass: v })}
                accentColor={accentColor}
                theme={theme}
              />
            </>
          )}

          <View style={[styles.fieldRow, { marginTop: Spacing.sm }]}>
            <View style={styles.fieldHalf}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Est. blood loss (mL)
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="number-pad"
                placeholder="50"
                placeholderTextColor={theme.textTertiary}
                value={
                  value.estimatedBloodLossMl != null
                    ? String(value.estimatedBloodLossMl)
                    : ""
                }
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  update({ estimatedBloodLossMl: isNaN(n) ? undefined : n });
                }}
              />
            </View>
          </View>
        </View>
      )}
    </SectionWrapper>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  fieldHalf: {
    flex: 1,
  },
  textInput: {
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  disclosureLink: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
});
