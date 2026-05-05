/**
 * VLNTDetails — VLNT donor-specific extension fields.
 *
 * Renders inline within LymphaticAssessment for VLNT procedures.
 * Captures donor site, node count, reverse mapping, recipient site, and closure details.
 * The existing FreeFlapSheet handles pedicle vessels, ischaemia, and anastomosis.
 */

import React, { useCallback } from "react";
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
  VLNTSpecificDetails,
  VLNTDonorSite,
  VLNTRecipientSite,
  ReverseMapTechnique,
} from "@/types/lymphatic";
import {
  VLNT_DONOR_SITE_LABELS,
  VLNT_RECIPIENT_SITE_LABELS,
  VLNT_DONOR_PEDICLE_MAP,
  REVERSE_MAP_TECHNIQUE_LABELS,
} from "@/types/lymphatic";

// ─── Props ──────────────────────────────────────────────────────────────────

interface VLNTDetailsProps {
  value: VLNTSpecificDetails;
  onChange: (d: VLNTSpecificDetails) => void;
  procedureName?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DONOR_SITES: VLNTDonorSite[] = [
  "submental",
  "supraclavicular",
  "lateral_thoracic",
  "thoracodorsal",
  "inguinal",
  "gastroepiploic",
  "jejunal_mesenteric",
  "appendicular",
  "other",
];

const RECIPIENT_SITES: VLNTRecipientSite[] = [
  "axilla",
  "wrist",
  "elbow",
  "groin",
  "ankle",
  "knee",
  "cervical",
  "other",
];

const REVERSE_MAP_TECHNIQUES: ReverseMapTechnique[] = [
  "tc99m_icg",
  "icg_only",
  "blue_dye",
  "other",
];

const CLOSURE_OPTIONS = ["primary", "skin_graft", "local_flap"] as const;
const CLOSURE_LABELS: Record<string, string> = {
  primary: "Primary",
  skin_graft: "Skin graft",
  local_flap: "Local flap",
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
              numberOfLines={2}
            >
              {labels[opt]}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export const VLNTDetailsComponent = React.memo(function VLNTDetailsComponent({
  value,
  onChange,
  procedureName,
}: VLNTDetailsProps) {
  const { theme } = useTheme();
  const accentColor = theme.accent;

  const update = useCallback(
    (patch: Partial<VLNTSpecificDetails>) => {
      onChange({ ...value, ...patch });
    },
    [value, onChange],
  );

  const pedicleInfo = value.donorSite
    ? VLNT_DONOR_PEDICLE_MAP[value.donorSite]
    : null;

  const sectionTitle = procedureName
    ? `VLNT Details — ${procedureName}`
    : "VLNT Details";

  return (
    <SectionWrapper
      title={sectionTitle}
      icon="git-branch"
      collapsible
      defaultCollapsed={false}
    >
      {/* Donor site */}
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        Donor site
      </ThemedText>
      <ChipRow
        options={DONOR_SITES}
        labels={VLNT_DONOR_SITE_LABELS}
        selected={value.donorSite}
        onSelect={(v) => update({ donorSite: v })}
        accentColor={accentColor}
        theme={theme}
      />

      {/* Auto-filled pedicle info */}
      {pedicleInfo && pedicleInfo.artery ? (
        <View
          style={[
            styles.infoBadge,
            {
              backgroundColor: theme.info + "10",
              borderColor: theme.info + "40",
            },
          ]}
        >
          <ThemedText
            style={{ color: theme.info, fontSize: 12, fontWeight: "500" }}
          >
            Pedicle: {pedicleInfo.artery} / {pedicleInfo.vein}
          </ThemedText>
        </View>
      ) : null}

      {/* Node count + recipient site */}
      <View style={[styles.fieldRow, { marginTop: Spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Node count
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
            placeholder="3"
            placeholderTextColor={theme.textTertiary}
            value={value.nodeCount != null ? String(value.nodeCount) : ""}
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              update({ nodeCount: isNaN(n) ? undefined : n });
            }}
          />
        </View>
        <View style={{ flex: 2 }}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Recipient site
          </ThemedText>
          <ChipRow
            options={RECIPIENT_SITES}
            labels={VLNT_RECIPIENT_SITE_LABELS}
            selected={value.recipientSite}
            onSelect={(v) => update({ recipientSite: v })}
            accentColor={accentColor}
            theme={theme}
          />
        </View>
      </View>

      {/* Reverse lymphatic mapping */}
      <View style={[styles.toggleRow, { marginTop: Spacing.sm }]}>
        <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
          Reverse lymphatic mapping
        </ThemedText>
        <Switch
          value={value.reverseLymphaticMapping ?? false}
          onValueChange={(v) => update({ reverseLymphaticMapping: v })}
          trackColor={{
            false: theme.backgroundSecondary,
            true: accentColor + "60",
          }}
          thumbColor={
            value.reverseLymphaticMapping ? accentColor : theme.textTertiary
          }
        />
      </View>

      {value.reverseLymphaticMapping && (
        <>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Technique
          </ThemedText>
          <ChipRow
            options={REVERSE_MAP_TECHNIQUES}
            labels={REVERSE_MAP_TECHNIQUE_LABELS}
            selected={value.reverseMapTechnique}
            onSelect={(v) => update({ reverseMapTechnique: v })}
            accentColor={accentColor}
            theme={theme}
          />
        </>
      )}

      {/* Additional fields */}
      <View style={[styles.fieldRow, { marginTop: Spacing.sm }]}>
        <View style={styles.fieldHalf}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Flap dimensions
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
            placeholder="e.g. 6x4 cm"
            placeholderTextColor={theme.textTertiary}
            value={value.flapDesignDimensions ?? ""}
            onChangeText={(v) =>
              update({ flapDesignDimensions: v || undefined })
            }
          />
        </View>
        <View style={styles.fieldHalf}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Inset technique
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
            placeholder="e.g. subcutaneous"
            placeholderTextColor={theme.textTertiary}
            value={value.insetTechnique ?? ""}
            onChangeText={(v) => update({ insetTechnique: v || undefined })}
          />
        </View>
      </View>

      {/* Toggles row */}
      <View style={[styles.toggleRow, { marginTop: Spacing.xs }]}>
        <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
          Simultaneous LVA
        </ThemedText>
        <Switch
          value={value.simultaneousLVA ?? false}
          onValueChange={(v) => update({ simultaneousLVA: v })}
          trackColor={{
            false: theme.backgroundSecondary,
            true: accentColor + "60",
          }}
          thumbColor={value.simultaneousLVA ? accentColor : theme.textTertiary}
        />
      </View>
      <View style={styles.toggleRow}>
        <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
          Drain placed
        </ThemedText>
        <Switch
          value={value.drainPlaced ?? false}
          onValueChange={(v) => update({ drainPlaced: v })}
          trackColor={{
            false: theme.backgroundSecondary,
            true: accentColor + "60",
          }}
          thumbColor={value.drainPlaced ? accentColor : theme.textTertiary}
        />
      </View>

      {/* Donor site closure */}
      <ThemedText
        style={[
          styles.fieldLabel,
          { color: theme.textSecondary, marginTop: Spacing.xs },
        ]}
      >
        Donor site closure
      </ThemedText>
      <ChipRow
        options={[...CLOSURE_OPTIONS]}
        labels={CLOSURE_LABELS as Record<string, string>}
        selected={value.donorSiteClosure}
        onSelect={(v) =>
          update({
            donorSiteClosure: v as VLNTSpecificDetails["donorSiteClosure"],
          })
        }
        accentColor={accentColor}
        theme={theme}
      />
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
  infoBadge: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
});
