/**
 * ImplantDetailsCard — Per-side implant data capture.
 *
 * 3-tier progressive disclosure (mirrors JointImplantSection):
 * - Tier 1 (always): device type, volume, plane, incision
 * - Tier 2 ("Details"): manufacturer, product, surface, fill, shape, profile
 * - Tier 3 ("Advanced"): ADM, intraop technique, sizer, expander, device ID
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, TextInput, LayoutAnimation, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  BreastChipRow,
  BreastCheckboxRow,
  BreastNumericField,
  BreastSectionToggle,
} from "./BreastCardHelpers";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { IMPLANT_MANUFACTURERS, ADM_PRODUCTS } from "@/lib/breastConfig";
import type {
  ImplantDetailsData,
  AdmDetails,
  ImplantDeviceType,
  ImplantPlane,
  ImplantIncision,
  ImplantSurface,
  ImplantFill,
  ImplantShape,
  ImplantProfile,
  ImplantShellType,
  DualPlaneType,
  PocketRinse,
  ExpanderPortType,
  AdmOrigin,
  AdmPosition,
} from "@/types/breast";
import {
  IMPLANT_DEVICE_TYPE_LABELS,
  IMPLANT_PLANE_LABELS,
  IMPLANT_INCISION_LABELS,
  IMPLANT_SURFACE_LABELS,
  IMPLANT_FILL_LABELS,
  IMPLANT_SHAPE_LABELS,
  IMPLANT_PROFILE_LABELS,
  IMPLANT_SHELL_TYPE_LABELS,
  DUAL_PLANE_TYPE_LABELS,
  POCKET_RINSE_LABELS,
  EXPANDER_PORT_TYPE_LABELS,
  ADM_ORIGIN_LABELS,
  ADM_POSITION_LABELS,
} from "@/types/breast";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEVICE_TYPES: readonly ImplantDeviceType[] = [
  "permanent_implant",
  "tissue_expander",
  "expander_implant",
] as const;

const PLANES: readonly ImplantPlane[] = [
  "subglandular",
  "subfascial",
  "subpectoral",
  "dual_plane",
  "prepectoral",
] as const;

const INCISIONS: readonly ImplantIncision[] = [
  "inframammary",
  "periareolar",
  "axillary",
  "mastectomy_wound",
  "mastopexy_pattern",
] as const;

const SURFACES: readonly ImplantSurface[] = [
  "smooth",
  "microtextured",
  "macrotextured",
  "polyurethane",
  "nanotextured",
] as const;

const FILLS: readonly ImplantFill[] = [
  "silicone_standard",
  "silicone_highly_cohesive",
  "saline",
  "structured_saline",
  "composite",
] as const;

const SHAPES: readonly ImplantShape[] = ["round", "anatomical"] as const;

const PROFILES: readonly ImplantProfile[] = [
  "low",
  "moderate",
  "moderate_plus",
  "high",
  "extra_high",
] as const;

const SHELL_TYPES: readonly ImplantShellType[] = [
  "single_lumen",
  "dual_lumen",
] as const;

const DUAL_PLANE_TYPES: readonly DualPlaneType[] = ["I", "II", "III"] as const;

const POCKET_RINSES: readonly PocketRinse[] = [
  "none",
  "saline_only",
  "betadine",
  "triple_antibiotic",
  "adams_solution",
  "other",
] as const;

const PORT_TYPES: readonly ExpanderPortType[] = [
  "integrated_magnetic",
  "integrated_rfid",
  "remote",
  "external",
] as const;

const ADM_ORIGINS: readonly AdmOrigin[] = [
  "human_allograft",
  "porcine_xenograft",
  "bovine_xenograft",
  "synthetic_absorbable",
  "synthetic_nonabsorbable",
  "other",
] as const;

const ADM_POSITIONS: readonly AdmPosition[] = [
  "inferior_sling",
  "anterior_wrap",
  "total_wrap",
  "partial_coverage",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  value: ImplantDetailsData;
  onChange: (data: ImplantDetailsData) => void;
  /** Auto-fill empty fields from saved breast preferences */
  breastPreferences?: {
    preferredImplantManufacturer?: string;
    preferredImplantSurface?: ImplantSurface;
    preferredAdmProduct?: string;
    defaultPocketRinse?: PocketRinse;
    always14PointPlan?: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

function getImplantSummaryText(d: ImplantDetailsData): string {
  const parts: string[] = [];
  if (d.volumeCc) parts.push(`${d.volumeCc}cc`);
  if (d.manufacturer) {
    const mfr = IMPLANT_MANUFACTURERS.find((m) => m.id === d.manufacturer);
    if (mfr) parts.push(mfr.label);
  }
  if (d.shape) parts.push(IMPLANT_SHAPE_LABELS[d.shape]);
  if (d.implantPlane) parts.push(IMPLANT_PLANE_LABELS[d.implantPlane]);
  return parts.join(" · ") || "Tap to configure";
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ImplantDetailsCard = React.memo(function ImplantDetailsCard({
  value,
  onChange,
  breastPreferences,
}: Props) {
  const { theme } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasAppliedDefaults = useRef(false);

  // Auto-fill from preferences on first render when value is empty
  useEffect(() => {
    if (hasAppliedDefaults.current || !breastPreferences) return;
    hasAppliedDefaults.current = true;

    const patch: Partial<ImplantDetailsData> = {};
    let changed = false;

    if (!value.manufacturer && breastPreferences.preferredImplantManufacturer) {
      patch.manufacturer = breastPreferences.preferredImplantManufacturer;
      changed = true;
    }
    if (!value.shellSurface && breastPreferences.preferredImplantSurface) {
      patch.shellSurface = breastPreferences.preferredImplantSurface;
      changed = true;
    }
    if (!value.pocketRinseSolution && breastPreferences.defaultPocketRinse) {
      patch.pocketRinseSolution = breastPreferences.defaultPocketRinse;
      changed = true;
    }
    if (
      value.antibiotic14PointPlan == null &&
      breastPreferences.always14PointPlan
    ) {
      patch.antibiotic14PointPlan = true;
      changed = true;
    }
    if (
      !value.admDetails?.productName &&
      breastPreferences.preferredAdmProduct
    ) {
      patch.admDetails = {
        ...value.admDetails,
        productName: breastPreferences.preferredAdmProduct,
      } as AdmDetails;
      changed = true;
    }

    if (changed) {
      onChange({ ...value, ...patch });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(
    (patch: Partial<ImplantDetailsData>) => {
      onChange({ ...value, ...patch });
    },
    [onChange, value],
  );

  const isExpander =
    value.deviceType === "tissue_expander" ||
    value.deviceType === "expander_implant";

  const summary = getImplantSummaryText(value);

  return (
    <SectionWrapper
      title="Implant Details"
      icon="disc"
      collapsible
      defaultCollapsed={false}
      subtitle={summary}
      testID="caseForm.breast.section-implant"
    >
      {/* ── Tier 1: Core fields ──────────────────────────────────────────── */}

      <BreastChipRow
        label="Device Type"
        options={DEVICE_TYPES}
        labels={IMPLANT_DEVICE_TYPE_LABELS}
        selected={value.deviceType}
        onSelect={(v) => {
          const patch: Partial<ImplantDetailsData> = { deviceType: v! };
          // Clear expander fields when switching to permanent
          if (v === "permanent_implant") {
            patch.expanderMaxVolumeCc = undefined;
            patch.expanderIntraopFillCc = undefined;
            patch.expanderTargetFillCc = undefined;
            patch.expanderPortType = undefined;
          }
          update(patch);
        }}
      />

      <BreastNumericField
        label="Volume"
        value={value.volumeCc}
        onValueChange={(v) => update({ volumeCc: v })}
        unit="cc"
        placeholder="e.g. 350"
        integer
      />

      <BreastChipRow
        label="Implant Plane"
        options={PLANES}
        labels={IMPLANT_PLANE_LABELS}
        selected={value.implantPlane}
        onSelect={(v) => {
          const patch: Partial<ImplantDetailsData> = { implantPlane: v };
          if (v !== "dual_plane") patch.dualPlaneType = undefined;
          update(patch);
        }}
        allowDeselect
      />

      {value.implantPlane === "dual_plane" && (
        <BreastChipRow
          label="Dual Plane Type"
          options={DUAL_PLANE_TYPES}
          labels={DUAL_PLANE_TYPE_LABELS}
          selected={value.dualPlaneType}
          onSelect={(v) => update({ dualPlaneType: v })}
          allowDeselect
        />
      )}

      <BreastChipRow
        label="Incision"
        options={INCISIONS}
        labels={IMPLANT_INCISION_LABELS}
        selected={value.incisionSite}
        onSelect={(v) => update({ incisionSite: v })}
        allowDeselect
      />

      {/* ── Tier 2: Details ──────────────────────────────────────────────── */}

      <BreastSectionToggle
        label={showDetails ? "Hide Details" : "Show Details"}
        isExpanded={showDetails}
        onToggle={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setShowDetails(!showDetails);
        }}
        subtitle={
          value.manufacturer
            ? IMPLANT_MANUFACTURERS.find((m) => m.id === value.manufacturer)
                ?.label
            : undefined
        }
      />

      {showDetails && (
        <View>
          {/* Manufacturer */}
          <BreastChipRow
            label="Manufacturer"
            options={IMPLANT_MANUFACTURERS.map((m) => m.id)}
            labels={
              Object.fromEntries(
                IMPLANT_MANUFACTURERS.map((m) => [m.id, m.label]),
              ) as Record<string, string>
            }
            selected={value.manufacturer}
            onSelect={(v) => update({ manufacturer: v })}
            allowDeselect
          />

          {/* Product name */}
          <View style={styles.textFieldGroup}>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}
            >
              Product Name
            </ThemedText>
            <TextInput
              value={value.productName ?? ""}
              onChangeText={(v) => update({ productName: v || undefined })}
              placeholder="e.g. Natrelle Inspira"
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
          </View>

          <BreastChipRow
            label="Surface"
            options={SURFACES}
            labels={IMPLANT_SURFACE_LABELS}
            selected={value.shellSurface}
            onSelect={(v) => update({ shellSurface: v })}
            allowDeselect
          />

          <BreastChipRow
            label="Fill Material"
            options={FILLS}
            labels={IMPLANT_FILL_LABELS}
            selected={value.fillMaterial}
            onSelect={(v) => update({ fillMaterial: v })}
            allowDeselect
          />

          <BreastChipRow
            label="Shape"
            options={SHAPES}
            labels={IMPLANT_SHAPE_LABELS}
            selected={value.shape}
            onSelect={(v) => update({ shape: v })}
            allowDeselect
          />

          <BreastChipRow
            label="Profile"
            options={PROFILES}
            labels={IMPLANT_PROFILE_LABELS}
            selected={value.profile}
            onSelect={(v) => update({ profile: v })}
            allowDeselect
          />

          <BreastChipRow
            label="Shell Type"
            options={SHELL_TYPES}
            labels={IMPLANT_SHELL_TYPE_LABELS}
            selected={value.shellType}
            onSelect={(v) => update({ shellType: v })}
            allowDeselect
          />
        </View>
      )}

      {/* ── Tier 3: Advanced ─────────────────────────────────────────────── */}

      <BreastSectionToggle
        label={showAdvanced ? "Hide Advanced" : "Show Advanced"}
        isExpanded={showAdvanced}
        onToggle={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setShowAdvanced(!showAdvanced);
        }}
      />

      {showAdvanced && (
        <View>
          {/* ADM Section */}
          <BreastCheckboxRow
            label="ADM / Mesh Used"
            value={value.admUsed ?? false}
            onChange={(v) => {
              if (!v) {
                update({ admUsed: false, admDetails: undefined });
              } else {
                update({ admUsed: true, admDetails: value.admDetails ?? {} });
              }
            }}
          />

          {value.admUsed && (
            <View style={styles.indentedSection}>
              <BreastChipRow
                label="ADM Product"
                options={ADM_PRODUCTS.map((p) => p.id)}
                labels={
                  Object.fromEntries(
                    ADM_PRODUCTS.map((p) => [p.id, p.label]),
                  ) as Record<string, string>
                }
                selected={value.admDetails?.productName}
                onSelect={(v) =>
                  update({
                    admDetails: {
                      ...value.admDetails,
                      productName: v,
                    } as AdmDetails,
                  })
                }
                allowDeselect
              />

              <BreastChipRow
                label="Origin"
                options={ADM_ORIGINS}
                labels={ADM_ORIGIN_LABELS}
                selected={value.admDetails?.origin}
                onSelect={(v) =>
                  update({
                    admDetails: {
                      ...value.admDetails,
                      origin: v,
                    } as AdmDetails,
                  })
                }
                allowDeselect
              />

              <BreastChipRow
                label="Position"
                options={ADM_POSITIONS}
                labels={ADM_POSITION_LABELS}
                selected={value.admDetails?.position}
                onSelect={(v) =>
                  update({
                    admDetails: {
                      ...value.admDetails,
                      position: v,
                    } as AdmDetails,
                  })
                }
                allowDeselect
              />
            </View>
          )}

          {/* Intraop Technique */}
          <ThemedText
            type="small"
            style={{
              color: theme.textSecondary,
              marginTop: Spacing.sm,
              marginBottom: Spacing.xs,
            }}
          >
            Intraoperative Technique
          </ThemedText>

          <BreastCheckboxRow
            label="14-point antibiotic plan"
            value={value.antibiotic14PointPlan ?? false}
            onChange={(v) => update({ antibiotic14PointPlan: v })}
          />
          <BreastCheckboxRow
            label="Glove change prior to insertion"
            value={value.gloveChangePriorToInsertion ?? false}
            onChange={(v) => update({ gloveChangePriorToInsertion: v })}
          />
          <BreastCheckboxRow
            label="Delivery sleeve / funnel used"
            value={value.deliverySleeveOrFunnel ?? false}
            onChange={(v) => update({ deliverySleeveOrFunnel: v })}
          />
          <BreastCheckboxRow
            label="Occlusive nipple shield"
            value={value.occlusiveNippleShield ?? false}
            onChange={(v) => update({ occlusiveNippleShield: v })}
          />
          <BreastCheckboxRow
            label="Drain used"
            value={value.drainUsed ?? false}
            onChange={(v) => update({ drainUsed: v })}
          />

          <BreastChipRow
            label="Pocket Rinse"
            options={POCKET_RINSES}
            labels={POCKET_RINSE_LABELS}
            selected={value.pocketRinseSolution}
            onSelect={(v) => update({ pocketRinseSolution: v })}
            allowDeselect
          />

          {/* Sizer */}
          <BreastCheckboxRow
            label="Sizer used"
            value={value.sizerUsed ?? false}
            onChange={(v) => {
              update({
                sizerUsed: v,
                sizerSizeCc: v ? value.sizerSizeCc : undefined,
              });
            }}
          />
          {value.sizerUsed && (
            <BreastNumericField
              label="Sizer Size"
              value={value.sizerSizeCc}
              onValueChange={(v) => update({ sizerSizeCc: v })}
              unit="cc"
              integer
            />
          )}

          {/* Expander fields */}
          {isExpander && (
            <View style={styles.indentedSection}>
              <ThemedText
                type="small"
                style={{
                  color: theme.textSecondary,
                  marginBottom: Spacing.xs,
                  fontWeight: "600",
                }}
              >
                Expander Details
              </ThemedText>

              <BreastNumericField
                label="Max Volume"
                value={value.expanderMaxVolumeCc}
                onValueChange={(v) => update({ expanderMaxVolumeCc: v })}
                unit="cc"
                integer
              />

              <BreastNumericField
                label="Intraop Fill"
                value={value.expanderIntraopFillCc}
                onValueChange={(v) => update({ expanderIntraopFillCc: v })}
                unit="cc"
                integer
              />

              <BreastNumericField
                label="Target Fill"
                value={value.expanderTargetFillCc}
                onValueChange={(v) => update({ expanderTargetFillCc: v })}
                unit="cc"
                integer
              />

              <BreastChipRow
                label="Port Type"
                options={PORT_TYPES}
                labels={EXPANDER_PORT_TYPE_LABELS}
                selected={value.expanderPortType}
                onSelect={(v) => update({ expanderPortType: v })}
                allowDeselect
              />
            </View>
          )}

          {/* Device Identification */}
          <ThemedText
            type="small"
            style={{
              color: theme.textSecondary,
              marginTop: Spacing.sm,
              marginBottom: Spacing.xs,
            }}
          >
            Device Identification
          </ThemedText>

          <View style={styles.textFieldGroup}>
            <ThemedText type="small" style={{ color: theme.textTertiary }}>
              Catalogue Reference
            </ThemedText>
            <TextInput
              value={value.catalogReference ?? ""}
              onChangeText={(v) => update({ catalogReference: v || undefined })}
              placeholder="e.g. 68-2035XX"
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
          </View>

          <View style={styles.textFieldGroup}>
            <ThemedText type="small" style={{ color: theme.textTertiary }}>
              Serial Number
            </ThemedText>
            <TextInput
              value={value.serialNumber ?? ""}
              onChangeText={(v) => update({ serialNumber: v || undefined })}
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
          </View>

          <View style={styles.textFieldGroup}>
            <ThemedText type="small" style={{ color: theme.textTertiary }}>
              Lot Number
            </ThemedText>
            <TextInput
              value={value.lotNumber ?? ""}
              onChangeText={(v) => update({ lotNumber: v || undefined })}
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
          </View>

          <View style={styles.textFieldGroup}>
            <ThemedText type="small" style={{ color: theme.textTertiary }}>
              UDI (Unique Device Identifier)
            </ThemedText>
            <TextInput
              value={value.udi ?? ""}
              onChangeText={(v) => update({ udi: v || undefined })}
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
          </View>
        </View>
      )}
    </SectionWrapper>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  textFieldGroup: {
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: 15,
    marginTop: 4,
  },
  indentedSection: {
    marginLeft: Spacing.md,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(128,128,128,0.2)",
    marginVertical: Spacing.xs,
  },
});
