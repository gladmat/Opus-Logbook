/**
 * CorrectiveOsteotomyDetails — Inline assessment card for corrective osteotomy.
 *
 * Renders inside DiagnosisGroupEditor when any of the three corrective
 * osteotomy procedures are selected. Captures bone, deformity, technique,
 * graft, and fixation via chip-based selections.
 *
 * Activation: procedure-driven (not diagnosis-driven).
 * Storage: CaseProcedure.osteotomyDetails
 */

import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  Switch,
  LayoutAnimation,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  CorrectiveOsteotomyData,
  OsteotomyBone,
  OsteotomyBoneSite,
  OsteotomyDeformityType,
  OsteotomyTechnique,
  OsteotomyGraftType,
  OsteotomyGraftDonorSite,
  OsteotomyFixation,
} from "@/types/osteotomy";
import {
  OSTEOTOMY_BONE_LABELS,
  MC_PHALANX_SITE_LABELS,
  DR_SITE_LABELS,
  DEFORMITY_TYPE_LABELS,
  TECHNIQUE_LABELS,
  GRAFT_TYPE_LABELS,
  GRAFT_DONOR_SITE_LABELS,
  FIXATION_LABELS,
  createEmptyOsteotomyData,
} from "@/types/osteotomy";

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface CorrectiveOsteotomyDetailsProps {
  value: CorrectiveOsteotomyData;
  onChange: (data: CorrectiveOsteotomyData) => void;
  procedureId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SMOOTH_LAYOUT = LayoutAnimation.Presets.easeInEaseOut;

const ALL_BONES: OsteotomyBone[] = [
  "metacarpal",
  "proximal_phalanx",
  "middle_phalanx",
  "distal_radius",
  "distal_ulna",
];

const MC_PHALANX_SITES: OsteotomyBoneSite[] = ["base", "shaft", "neck", "head"];
const DR_SITES: OsteotomyBoneSite[] = ["extra_articular", "intra_articular"];

const ALL_DEFORMITIES: OsteotomyDeformityType[] = [
  "angular",
  "rotational",
  "shortening",
  "combined",
];

const ALL_TECHNIQUES: OsteotomyTechnique[] = [
  "opening_wedge",
  "closing_wedge",
  "dome",
  "step_cut",
  "transverse",
  "oblique",
  "intra_articular",
];

const ALL_GRAFT_TYPES: OsteotomyGraftType[] = [
  "none",
  "autograft",
  "allograft",
  "synthetic",
];

const ALL_DONOR_SITES: OsteotomyGraftDonorSite[] = [
  "iliac_crest",
  "distal_radius",
  "olecranon",
  "local",
  "other",
];

const ALL_FIXATIONS: OsteotomyFixation[] = [
  "plate_screws",
  "lag_screws",
  "kwires",
  "headless_compression_screw",
  "external_fixator",
  "combination",
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const CorrectiveOsteotomyDetails = React.memo(
  function CorrectiveOsteotomyDetails({
    value,
    onChange,
    procedureId,
  }: CorrectiveOsteotomyDetailsProps) {
    const { theme } = useTheme();
    const initializedRef = useRef(false);

    // ── Contextual defaults on first render ─────────────────────────────────
    useEffect(() => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      if (procedureId === "hand_elective_corrective_osteotomy_radius") {
        if (!value.bone) {
          onChange({ ...value, bone: "distal_radius", boneSite: null });
        }
      } else if (procedureId === "hand_elective_ulna_shortening") {
        if (!value.bone) {
          onChange({
            ...value,
            bone: "distal_ulna",
            boneSite: null,
            osteotomyTechnique: value.osteotomyTechnique ?? "oblique",
          });
        }
      }
      // hand_elective_corrective_osteotomy_hand → bone stays null
    }, [procedureId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Field updaters ──────────────────────────────────────────────────────

    const setBone = useCallback(
      (bone: OsteotomyBone) => {
        LayoutAnimation.configureNext(SMOOTH_LAYOUT);
        Haptics.selectionAsync();
        onChange({
          ...value,
          bone: value.bone === bone ? null : bone,
          boneSite: null, // reset site when bone changes
        });
      },
      [value, onChange],
    );

    const setBoneSite = useCallback(
      (site: OsteotomyBoneSite) => {
        Haptics.selectionAsync();
        onChange({
          ...value,
          boneSite: value.boneSite === site ? null : site,
        });
      },
      [value, onChange],
    );

    const toggleDeformity = useCallback(
      (type: OsteotomyDeformityType) => {
        Haptics.selectionAsync();
        const current = value.deformityType;
        const next = current.includes(type)
          ? current.filter((t) => t !== type)
          : [...current, type];
        onChange({ ...value, deformityType: next });
      },
      [value, onChange],
    );

    const setTechnique = useCallback(
      (technique: OsteotomyTechnique) => {
        Haptics.selectionAsync();
        const newTechnique =
          value.osteotomyTechnique === technique ? null : technique;

        // Progressive disclosure: auto-set graft defaults
        let graftType = value.graftType;
        let graftDonorSite = value.graftDonorSite;
        if (newTechnique === "opening_wedge") {
          graftType = graftType ?? "autograft";
        } else if (newTechnique === "closing_wedge") {
          graftType = "none";
          graftDonorSite = null;
        }

        LayoutAnimation.configureNext(SMOOTH_LAYOUT);
        onChange({
          ...value,
          osteotomyTechnique: newTechnique,
          graftType,
          graftDonorSite,
        });
      },
      [value, onChange],
    );

    const setGraftType = useCallback(
      (type: OsteotomyGraftType) => {
        Haptics.selectionAsync();
        LayoutAnimation.configureNext(SMOOTH_LAYOUT);
        const newType = value.graftType === type ? null : type;
        onChange({
          ...value,
          graftType: newType,
          graftDonorSite: newType === "autograft" ? value.graftDonorSite : null,
        });
      },
      [value, onChange],
    );

    const setDonorSite = useCallback(
      (site: OsteotomyGraftDonorSite) => {
        Haptics.selectionAsync();
        onChange({
          ...value,
          graftDonorSite: value.graftDonorSite === site ? null : site,
        });
      },
      [value, onChange],
    );

    const setFixation = useCallback(
      (fixation: OsteotomyFixation) => {
        Haptics.selectionAsync();
        onChange({
          ...value,
          fixation: value.fixation === fixation ? null : fixation,
        });
      },
      [value, onChange],
    );

    const toggleThreeDPlanning = useCallback(
      (val: boolean) => {
        Haptics.selectionAsync();
        onChange({ ...value, threeDPlanning: val });
      },
      [value, onChange],
    );

    // ── Derived state ───────────────────────────────────────────────────────

    const hasBone = value.bone !== null;
    const isMcPhalanx =
      value.bone === "metacarpal" ||
      value.bone === "proximal_phalanx" ||
      value.bone === "middle_phalanx";
    const isDr = value.bone === "distal_radius";
    const isUlna = value.bone === "distal_ulna";
    const showSiteRow = isMcPhalanx || isDr;
    const siteOptions = isMcPhalanx ? MC_PHALANX_SITES : DR_SITES;
    const siteLabels = isMcPhalanx
      ? (MC_PHALANX_SITE_LABELS as Record<string, string>)
      : (DR_SITE_LABELS as Record<string, string>);
    const showDonorSite = value.graftType === "autograft";

    // ── Render helpers ──────────────────────────────────────────────────────

    const renderChip = (
      label: string,
      selected: boolean,
      onPress: () => void,
      disabled = false,
    ) => (
      <Pressable
        key={label}
        onPress={disabled ? undefined : onPress}
        style={[
          styles.chip,
          {
            borderColor: selected ? theme.link : theme.border,
            backgroundColor: selected
              ? `${theme.link}14`
              : theme.backgroundElevated,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.chipText,
            { color: selected ? theme.text : theme.textSecondary },
          ]}
        >
          {label}
        </ThemedText>
      </Pressable>
    );

    const renderSectionHeader = (number: number, title: string) => (
      <View style={styles.sectionHeader}>
        <View
          style={[styles.sectionNumber, { backgroundColor: `${theme.link}20` }]}
        >
          <ThemedText style={[styles.sectionNumberText, { color: theme.link }]}>
            {number}
          </ThemedText>
        </View>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {title}
        </ThemedText>
      </View>
    );

    const renderLabel = (text: string) => (
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        {text}
      </ThemedText>
    );

    // ═════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════════════════════════

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: theme.border,
            borderLeftColor: theme.link,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Feather
            name="tool"
            size={16}
            color={theme.link}
            style={styles.headerIcon}
          />
          <View style={styles.headerText}>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              Osteotomy Details
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              Record the operative technique and fixation.
            </ThemedText>
          </View>
        </View>

        {/* 1. Bone */}
        {renderSectionHeader(1, "Bone")}
        {renderLabel("BONE")}
        <View style={styles.chipRow}>
          {ALL_BONES.map((b) =>
            renderChip(OSTEOTOMY_BONE_LABELS[b], value.bone === b, () =>
              setBone(b),
            ),
          )}
        </View>

        {showSiteRow && (
          <>
            {renderLabel("SITE")}
            <View style={styles.chipRow}>
              {siteOptions.map((s) =>
                renderChip(siteLabels[s] ?? s, value.boneSite === s, () =>
                  setBoneSite(s),
                ),
              )}
            </View>
          </>
        )}

        {/* 2. Deformity */}
        {renderSectionHeader(2, "Deformity")}
        {renderLabel("DEFORMITY TYPE")}
        <View style={[styles.chipRow, !hasBone && styles.disabled]}>
          {ALL_DEFORMITIES.map((d) =>
            renderChip(
              DEFORMITY_TYPE_LABELS[d],
              value.deformityType.includes(d),
              () => toggleDeformity(d),
              !hasBone,
            ),
          )}
        </View>

        {/* 3. Technique */}
        {renderSectionHeader(3, "Technique")}
        {renderLabel("OSTEOTOMY TYPE")}
        <View style={[styles.chipRow, !hasBone && styles.disabled]}>
          {ALL_TECHNIQUES.map((t) =>
            renderChip(
              TECHNIQUE_LABELS[t],
              value.osteotomyTechnique === t,
              () => setTechnique(t),
              !hasBone,
            ),
          )}
        </View>

        <View style={styles.switchRow}>
          <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
            3D planning / patient-specific instrument
          </ThemedText>
          <Switch
            value={value.threeDPlanning}
            onValueChange={toggleThreeDPlanning}
            trackColor={{
              false: theme.border,
              true: `${theme.link}60`,
            }}
            thumbColor={value.threeDPlanning ? theme.link : theme.textTertiary}
            disabled={!hasBone}
          />
        </View>

        {/* 4. Graft */}
        {renderSectionHeader(4, "Graft")}
        {renderLabel("BONE GRAFT")}
        <View style={[styles.chipRow, !hasBone && styles.disabled]}>
          {ALL_GRAFT_TYPES.map((g) =>
            renderChip(
              GRAFT_TYPE_LABELS[g],
              value.graftType === g,
              () => setGraftType(g),
              !hasBone,
            ),
          )}
        </View>

        {showDonorSite && (
          <>
            {renderLabel("DONOR SITE")}
            <View style={styles.chipRow}>
              {ALL_DONOR_SITES.map((s) =>
                renderChip(
                  GRAFT_DONOR_SITE_LABELS[s],
                  value.graftDonorSite === s,
                  () => setDonorSite(s),
                ),
              )}
            </View>
          </>
        )}

        {/* 5. Fixation */}
        {renderSectionHeader(5, "Fixation")}
        {renderLabel("FIXATION METHOD")}
        <View style={[styles.chipRow, !hasBone && styles.disabled]}>
          {ALL_FIXATIONS.map((f) =>
            renderChip(
              FIXATION_LABELS[f],
              value.fixation === f,
              () => setFixation(f),
              !hasBone,
            ),
          )}
        </View>
      </View>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  headerIcon: {
    marginTop: 2,
    marginRight: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.xs,
  },
  sectionNumberText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  switchLabel: {
    fontSize: 14,
    flex: 1,
    marginRight: Spacing.sm,
  },
  disabled: {
    opacity: 0.4,
  },
});
