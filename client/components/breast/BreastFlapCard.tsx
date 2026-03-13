/**
 * BreastFlapCard — Per-side breast-specific flap data capture.
 *
 * Extends (does NOT replace) FreeFlapDetailsForm with breast-specific fields:
 * 1. Perforators — repeatable list (max 4) with row, calibre, type, course
 * 2. Recipient vessels — artery, vein, IMA interspace, rib management
 * 3. Anastomosis — arterial/venous technique, coupler, SIEV
 * 4. Flap measurements — weight, skin paddle dimensions
 * 5. Donor site — fascial closure, mesh, nerve management
 */

import React, { useCallback, useState } from "react";
import { View, Pressable, LayoutAnimation, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  BreastChipRow,
  BreastCheckboxRow,
  BreastNumericField,
  BreastSectionToggle,
} from "./BreastCardHelpers";
import { SectionWrapper } from "@/components/skin-cancer/SectionWrapper";
import type {
  BreastFlapDetailsData,
  PerforatorEntry,
  BreastRecipientArtery,
  BreastRecipientVein,
  ImaInterspace,
  RibManagement,
  AnastomosisTechnique,
  DieaBranchingPattern,
  FascialClosureMethod,
  ThoracodorsalNerveManagement,
  PerforatorRow,
  PerforatorType,
  IntramuscularCourse,
} from "@/types/breast";
import {
  BREAST_RECIPIENT_ARTERY_LABELS,
  BREAST_RECIPIENT_VEIN_LABELS,
  IMA_INTERSPACE_LABELS,
  RIB_MANAGEMENT_LABELS,
  ANASTOMOSIS_TECHNIQUE_LABELS,
  DIEA_BRANCHING_LABELS,
  FASCIAL_CLOSURE_LABELS,
  THORACODORSAL_NERVE_LABELS,
  PERFORATOR_ROW_LABELS,
  PERFORATOR_TYPE_LABELS,
  INTRAMUSCULAR_COURSE_LABELS,
} from "@/types/breast";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ARTERIES: readonly BreastRecipientArtery[] = [
  "ima",
  "ima_perforator",
  "thoracodorsal",
  "circumflex_scapular",
  "lateral_thoracic",
  "other",
] as const;

const VEINS: readonly BreastRecipientVein[] = [
  "imv",
  "imv_perforator",
  "thoracodorsal",
  "cephalic",
  "other",
] as const;

const INTERSPACES: readonly ImaInterspace[] = ["2nd", "3rd", "4th"] as const;

const RIB_MGMTS: readonly RibManagement[] = [
  "total_preservation",
  "partial_removal",
  "full_segment_removal",
] as const;

const ANAST_TECHNIQUES: readonly AnastomosisTechnique[] = [
  "end_to_end_handsewn",
  "end_to_side_handsewn",
  "coupler",
  "end_to_end_coupler",
] as const;

const DIEA_PATTERNS: readonly DieaBranchingPattern[] = [
  "type_1",
  "type_2",
  "type_3",
  "unknown",
] as const;

const FASCIAL_CLOSURES: readonly FascialClosureMethod[] = [
  "primary",
  "mesh_onlay",
  "mesh_sublay",
  "mesh_inlay",
  "component_separation",
] as const;

const TD_NERVES: readonly ThoracodorsalNerveManagement[] = [
  "preserved",
  "divided",
  "partial_neurectomy",
] as const;

const PERF_ROWS: readonly PerforatorRow[] = ["medial", "lateral"] as const;
const PERF_TYPES: readonly PerforatorType[] = [
  "musculocutaneous",
  "septocutaneous",
] as const;
const IM_COURSES: readonly IntramuscularCourse[] = [
  "short_direct",
  "long_oblique",
] as const;

const MAX_PERFORATORS = 4;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  value: BreastFlapDetailsData;
  onChange: (data: BreastFlapDetailsData) => void;
  mode?: "free" | "pedicled";
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

function getFlapSummaryText(d: BreastFlapDetailsData): string {
  const parts: string[] = [];
  const perfCount = d.perforators?.length ?? 0;
  if (perfCount > 0)
    parts.push(`${perfCount} perforator${perfCount > 1 ? "s" : ""}`);
  if (d.recipientArtery === "ima" || d.recipientArtery === "ima_perforator") {
    if (d.imaInterspace)
      parts.push(`IMA ${IMA_INTERSPACE_LABELS[d.imaInterspace]}`);
    else parts.push("IMA");
  }
  if (d.venousCouplerUsed && d.venousCouplerSizeMm)
    parts.push(`coupler ${d.venousCouplerSizeMm}mm`);
  if (d.flapWeightGrams) parts.push(`${d.flapWeightGrams}g`);
  return parts.join(", ") || "Tap to configure";
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const BreastFlapCard = React.memo(function BreastFlapCard({
  value,
  onChange,
  mode = "free",
}: Props) {
  const { theme } = useTheme();
  const [showDonorSite, setShowDonorSite] = useState(false);
  const isPedicled = mode === "pedicled";

  const update = useCallback(
    (patch: Partial<BreastFlapDetailsData>) => {
      onChange({ ...value, ...patch });
    },
    [onChange, value],
  );

  const isIma =
    value.recipientArtery === "ima" ||
    value.recipientArtery === "ima_perforator";

  const summary = getFlapSummaryText(value);

  // ── Perforator helpers ──

  const addPerforator = useCallback(() => {
    const current = value.perforators ?? [];
    if (current.length >= MAX_PERFORATORS) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    update({
      perforators: [...current, { id: `perf_${Date.now()}` }],
    });
  }, [update, value.perforators]);

  const updatePerforator = useCallback(
    (id: string, patch: Partial<PerforatorEntry>) => {
      const perfs = (value.perforators ?? []).map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      );
      update({ perforators: perfs });
    },
    [update, value.perforators],
  );

  const removePerforator = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      update({
        perforators: (value.perforators ?? []).filter((p) => p.id !== id),
      });
    },
    [update, value.perforators],
  );

  return (
    <SectionWrapper
      title={isPedicled ? "Pedicled Flap Details" : "Breast Flap Details"}
      icon="scissors"
      collapsible
      defaultCollapsed={false}
      subtitle={summary}
    >
      {!isPedicled ? (
        <>
          {/* ── 1. Perforators ───────────────────────────────────────────── */}

          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, fontWeight: "600" }}
          >
            Perforators
          </ThemedText>

          {(value.perforators ?? []).map((perf, idx) => (
            <View
              key={perf.id}
              style={[
                styles.perforatorCard,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundRoot,
                },
              ]}
            >
              <View style={styles.perforatorHeader}>
                <ThemedText
                  type="small"
                  style={{ color: theme.text, fontWeight: "600" }}
                >
                  Perforator {idx + 1}
                </ThemedText>
                <Pressable onPress={() => removePerforator(perf.id)}>
                  <Feather name="x" size={16} color={theme.textTertiary} />
                </Pressable>
              </View>

              <BreastChipRow
                label="Row"
                options={PERF_ROWS}
                labels={PERFORATOR_ROW_LABELS}
                selected={perf.row}
                onSelect={(v) => updatePerforator(perf.id, { row: v })}
                allowDeselect
              />

              <BreastNumericField
                label="Calibre"
                value={perf.calibreMm}
                onValueChange={(v) =>
                  updatePerforator(perf.id, { calibreMm: v })
                }
                unit="mm"
              />

              <BreastChipRow
                label="Type"
                options={PERF_TYPES}
                labels={PERFORATOR_TYPE_LABELS}
                selected={perf.type}
                onSelect={(v) => updatePerforator(perf.id, { type: v })}
                allowDeselect
              />

              <BreastChipRow
                label="Intramuscular Course"
                options={IM_COURSES}
                labels={INTRAMUSCULAR_COURSE_LABELS}
                selected={perf.intramuscularCourse}
                onSelect={(v) =>
                  updatePerforator(perf.id, { intramuscularCourse: v })
                }
                allowDeselect
              />
            </View>
          ))}

          {(value.perforators ?? []).length < MAX_PERFORATORS ? (
            <Pressable onPress={addPerforator} style={styles.addButton}>
              <Feather name="plus" size={14} color={theme.link} />
              <ThemedText
                type="small"
                style={{ color: theme.link, marginLeft: 4 }}
              >
                Add Perforator
              </ThemedText>
            </Pressable>
          ) : null}

          <BreastChipRow
            label="DIEA Branching Pattern"
            options={DIEA_PATTERNS}
            labels={DIEA_BRANCHING_LABELS}
            selected={value.dieaBranchingPattern}
            onSelect={(v) => update({ dieaBranchingPattern: v })}
            allowDeselect
          />

          {/* ── 2. Recipient Vessels ────────────────────────────────────── */}

          <View style={styles.sectionDivider} />

          <BreastChipRow
            label="Recipient Artery"
            options={ARTERIES}
            labels={BREAST_RECIPIENT_ARTERY_LABELS}
            selected={value.recipientArtery}
            onSelect={(v) => {
              const patch: Partial<BreastFlapDetailsData> = {
                recipientArtery: v,
              };
              if (v !== "ima" && v !== "ima_perforator") {
                patch.imaInterspace = undefined;
                patch.ribManagement = undefined;
              }
              update(patch);
            }}
            allowDeselect
          />

          <BreastChipRow
            label="Recipient Vein"
            options={VEINS}
            labels={BREAST_RECIPIENT_VEIN_LABELS}
            selected={value.recipientVein}
            onSelect={(v) => update({ recipientVein: v })}
            allowDeselect
          />

          {isIma ? (
            <>
              <BreastChipRow
                label="IMA Interspace"
                options={INTERSPACES}
                labels={IMA_INTERSPACE_LABELS}
                selected={value.imaInterspace}
                onSelect={(v) => update({ imaInterspace: v })}
                allowDeselect
              />

              <BreastChipRow
                label="Rib Management"
                options={RIB_MGMTS}
                labels={RIB_MANAGEMENT_LABELS}
                selected={value.ribManagement}
                onSelect={(v) => update({ ribManagement: v })}
                allowDeselect
              />
            </>
          ) : null}

          {/* ── 3. Anastomosis ─────────────────────────────────────────── */}

          <View style={styles.sectionDivider} />

          <BreastChipRow
            label="Arterial Technique"
            options={ANAST_TECHNIQUES}
            labels={ANASTOMOSIS_TECHNIQUE_LABELS}
            selected={value.arterialTechnique}
            onSelect={(v) => update({ arterialTechnique: v })}
            allowDeselect
          />

          <BreastChipRow
            label="Venous Technique"
            options={ANAST_TECHNIQUES}
            labels={ANASTOMOSIS_TECHNIQUE_LABELS}
            selected={value.venousTechnique}
            onSelect={(v) => update({ venousTechnique: v })}
            allowDeselect
          />

          <BreastCheckboxRow
            label="Venous coupler used"
            value={value.venousCouplerUsed ?? false}
            onChange={(v) => {
              update({
                venousCouplerUsed: v,
                venousCouplerSizeMm: v ? value.venousCouplerSizeMm : undefined,
              });
            }}
          />

          {value.venousCouplerUsed ? (
            <BreastNumericField
              label="Coupler Size"
              value={value.venousCouplerSizeMm}
              onValueChange={(v) => update({ venousCouplerSizeMm: v })}
              unit="mm"
            />
          ) : null}

          <BreastChipRow
            label="Venous Anastomoses"
            options={["1", "2"] as const}
            labels={{ "1": "Single", "2": "Dual" }}
            selected={
              value.numberOfVenousAnastomoses != null
                ? (String(value.numberOfVenousAnastomoses) as "1" | "2")
                : undefined
            }
            onSelect={(v) =>
              update({
                numberOfVenousAnastomoses: v ? (Number(v) as 1 | 2) : undefined,
              })
            }
            allowDeselect
          />

          <BreastCheckboxRow
            label="SIEV supercharging"
            value={value.sievSupercharging ?? false}
            onChange={(v) => update({ sievSupercharging: v })}
          />
        </>
      ) : null}

      {/* ── 4. Flap Measurements ─────────────────────────────────────────── */}

      <View style={styles.sectionDivider} />

      <BreastNumericField
        label="Flap Weight"
        value={value.flapWeightGrams}
        onValueChange={(v) => update({ flapWeightGrams: v })}
        unit="g"
        integer
      />

      <View style={styles.dimensionRow}>
        <View style={{ flex: 1 }}>
          <BreastNumericField
            label="Skin Paddle Length"
            value={value.skinPaddleDimensions?.lengthCm}
            onValueChange={(v) =>
              update({
                skinPaddleDimensions: {
                  ...value.skinPaddleDimensions,
                  lengthCm: v,
                },
              })
            }
            unit="cm"
          />
        </View>
        <View style={{ flex: 1 }}>
          <BreastNumericField
            label="Skin Paddle Width"
            value={value.skinPaddleDimensions?.widthCm}
            onValueChange={(v) =>
              update({
                skinPaddleDimensions: {
                  ...value.skinPaddleDimensions,
                  widthCm: v,
                },
              })
            }
            unit="cm"
          />
        </View>
      </View>

      {/* ── 5. Donor Site ────────────────────────────────────────────────── */}

      <BreastSectionToggle
        label={showDonorSite ? "Hide Donor Site" : "Donor Site Details"}
        isExpanded={showDonorSite}
        onToggle={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setShowDonorSite(!showDonorSite);
        }}
      />

      {showDonorSite && (
        <View>
          <BreastChipRow
            label="Fascial Closure"
            options={FASCIAL_CLOSURES}
            labels={FASCIAL_CLOSURE_LABELS}
            selected={value.fascialClosureMethod}
            onSelect={(v) => update({ fascialClosureMethod: v })}
            allowDeselect
          />

          <BreastCheckboxRow
            label="Mesh reinforcement"
            value={value.meshReinforcement ?? false}
            onChange={(v) => {
              update({
                meshReinforcement: v,
                meshType: v ? value.meshType : undefined,
              });
            }}
          />

          <BreastCheckboxRow
            label="Umbilicoplasty"
            value={value.umbilicoplasty ?? false}
            onChange={(v) => update({ umbilicoplasty: v })}
          />

          <BreastChipRow
            label="Thoracodorsal Nerve"
            options={TD_NERVES}
            labels={THORACODORSAL_NERVE_LABELS}
            selected={value.thoracodorsalNerve}
            onSelect={(v) => update({ thoracodorsalNerve: v })}
            allowDeselect
          />

          <BreastCheckboxRow
            label="Quilting sutures"
            value={value.quiltingSutures ?? false}
            onChange={(v) => update({ quiltingSutures: v })}
          />
        </View>
      )}
    </SectionWrapper>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  perforatorCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  perforatorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(128,128,128,0.15)",
    marginVertical: Spacing.sm,
  },
  dimensionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
});
