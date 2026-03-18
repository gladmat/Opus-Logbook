import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  getAllEnergyDevices,
  getEnergyDevicesBySubcategory,
  getEnergyDeviceSpec,
  type EnergyDeviceSubcategory,
  type EnergyDeviceProduct,
} from "@/lib/aestheticProductsEnergy";
import type {
  EnergyDeviceDetails,
  EnergyDeviceCategory,
  FitzpatrickType,
  TreatmentEndpoint,
  AestheticAnesthesia,
  CoolingMethod,
} from "@/types/aesthetics";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

type ThemeColors = typeof Colors.light;

interface EnergyDeviceDetailsCardProps {
  details?: EnergyDeviceDetails;
  onChange: (details: EnergyDeviceDetails) => void;
}

const SUBCATEGORY_LABELS: Record<EnergyDeviceSubcategory, string> = {
  ablative_laser: "Ablative laser",
  fractional_nonablative: "Fractional NA",
  vascular_laser: "Vascular laser",
  pigment_laser: "Pigment / Pico",
  hair_removal_laser: "Hair removal",
  rf_microneedling: "RF Microneedling",
  monopolar_rf: "Monopolar RF",
  hifu: "HIFU",
  ipl: "IPL",
  cryolipolysis: "Cryolipolysis",
  plasma: "Plasma",
  body_contouring_ems: "EMS body",
};

const ALL_SUBCATEGORIES = Object.keys(
  SUBCATEGORY_LABELS,
) as EnergyDeviceSubcategory[];

const FITZPATRICK_OPTIONS: FitzpatrickType[] = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
];

const ENDPOINT_OPTIONS: { value: TreatmentEndpoint; label: string }[] = [
  { value: "erythema_mild", label: "Mild erythema" },
  { value: "erythema_moderate", label: "Moderate erythema" },
  { value: "erythema_severe", label: "Severe erythema" },
  { value: "frosting_level_1", label: "Frost L1" },
  { value: "frosting_level_2", label: "Frost L2" },
  { value: "frosting_level_3", label: "Frost L3" },
  { value: "purpura", label: "Purpura" },
  { value: "pinpoint_bleeding", label: "Pinpoint bleeding" },
  { value: "edema", label: "Edema" },
  { value: "whitening", label: "Whitening" },
  { value: "mends", label: "MENDs" },
  { value: "perifollicular_edema", label: "Perifollicular edema" },
  { value: "none", label: "None" },
];

const ANESTHESIA_OPTIONS: { value: AestheticAnesthesia; label: string }[] = [
  { value: "none", label: "None" },
  { value: "topical_numbing", label: "Topical numbing" },
  { value: "nerve_block", label: "Nerve block" },
  { value: "tumescent", label: "Tumescent" },
  { value: "product_contains_lidocaine", label: "Product lidocaine" },
];

const COOLING_OPTIONS: { value: CoolingMethod; label: string }[] = [
  { value: "none", label: "None" },
  { value: "dcd_cryogen", label: "DCD cryogen" },
  { value: "contact_sapphire", label: "Sapphire tip" },
  { value: "contact_chill_tip", label: "Chill tip" },
  { value: "air_cooling", label: "Air cooling" },
  { value: "zimmer_cryo", label: "Zimmer cryo" },
];

const TIP_TYPE_OPTIONS = [
  { value: "insulated" as const, label: "Insulated" },
  { value: "non_insulated" as const, label: "Non-insulated" },
  { value: "semi_insulated" as const, label: "Semi-insulated" },
];

const DEFAULT_DETAILS: EnergyDeviceDetails = {
  deviceCategory: "ablative_laser",
  manufacturer: "",
  deviceModel: "",
  treatmentAreas: [],
};

/** Map subcategory to the EnergyDeviceCategory union value */
function subcategoryToDeviceCategory(
  sub: EnergyDeviceSubcategory,
): EnergyDeviceCategory {
  const map: Record<EnergyDeviceSubcategory, EnergyDeviceCategory> = {
    ablative_laser: "ablative_laser",
    fractional_nonablative: "fractional_nonablative_laser",
    vascular_laser: "vascular_laser",
    pigment_laser: "pigment_laser",
    hair_removal_laser: "hair_removal_laser",
    rf_microneedling: "rf_microneedling",
    monopolar_rf: "monopolar_rf",
    hifu: "hifu_ultrasound",
    ipl: "ipl",
    cryolipolysis: "cryolipolysis",
    plasma: "plasma",
    body_contouring_ems: "emsculpt_hifem",
  };
  return map[sub];
}

/** Determine which parameter group to show */
type ParamGroup = "laser" | "rf_microneedling" | "hifu" | "cryolipolysis" | "ipl" | "none";

function getParamGroup(sub: EnergyDeviceSubcategory): ParamGroup {
  switch (sub) {
    case "ablative_laser":
    case "fractional_nonablative":
    case "vascular_laser":
    case "pigment_laser":
    case "hair_removal_laser":
      return "laser";
    case "rf_microneedling":
      return "rf_microneedling";
    case "hifu":
      return "hifu";
    case "cryolipolysis":
      return "cryolipolysis";
    case "ipl":
      return "ipl";
    default:
      return "none";
  }
}

export const EnergyDeviceDetailsCard = React.memo(
  function EnergyDeviceDetailsCard({
    details,
    onChange,
  }: EnergyDeviceDetailsCardProps) {
    const { theme } = useTheme();
    const d = details ?? DEFAULT_DETAILS;

    const [selectedSubcategory, setSelectedSubcategory] =
      useState<EnergyDeviceSubcategory | null>(null);

    const update = useCallback(
      (partial: Partial<EnergyDeviceDetails>) => {
        onChange({ ...d, ...partial });
      },
      [d, onChange],
    );

    // Devices filtered by selected subcategory
    const filteredDevices = useMemo(() => {
      if (!selectedSubcategory) return getAllEnergyDevices();
      return getEnergyDevicesBySubcategory(selectedSubcategory);
    }, [selectedSubcategory]);

    const handleSubcategorySelect = useCallback(
      (sub: EnergyDeviceSubcategory) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedSubcategory((prev) => (prev === sub ? null : sub));
      },
      [],
    );

    const handleDeviceSelect = useCallback(
      (device: EnergyDeviceProduct) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const spec = getEnergyDeviceSpec(device.id);
        const deviceCat = subcategoryToDeviceCategory(device.subcategory);
        update({
          deviceCategory: deviceCat,
          manufacturer: device.manufacturer,
          deviceModel: device.productName,
          // Auto-populate from spec defaults
          wavelengthNm: spec?.wavelengthsNm?.[0],
          fluenceJcm2: spec?.defaultFluenceJcm2,
          spotSizeMm: spec?.defaultSpotSizeMm,
          pulseWidth: spec?.defaultPulseWidth,
          handpiece: spec?.availableHandpieces?.[0],
          needleDepthMm: spec?.defaultNeedleDepthMm,
          pinCount: spec?.defaultPinCount,
          rfEnergyLevel: undefined,
          tipType: undefined,
          transducerDepthMm: spec?.transducerDepths?.[0],
          energyPerLineJ: spec?.defaultEnergyPerLineJ,
        });
        setSelectedSubcategory(device.subcategory);
      },
      [update],
    );

    const paramGroup = selectedSubcategory
      ? getParamGroup(selectedSubcategory)
      : "none";

    const selectedEndpoints = useMemo(
      () => new Set(d.endpointObserved ?? []),
      [d.endpointObserved],
    );

    const selectedAreas = useMemo(
      () => new Set(d.treatmentAreas),
      [d.treatmentAreas],
    );

    const chipStyle = useCallback(
      (selected: boolean) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.link : theme.backgroundElevated,
          borderColor: selected ? theme.link : theme.border,
        },
      ],
      [theme],
    );

    const chipTextStyle = useCallback(
      (selected: boolean) => [
        styles.chipText,
        { color: selected ? theme.buttonText : theme.text },
      ],
      [theme],
    );

    const toggleMultiSelect = useCallback(
      <T extends string>(current: T[] | undefined, value: T): T[] => {
        const arr = current ?? [];
        return arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value];
      },
      [],
    );

    const TREATMENT_AREA_OPTIONS = [
      "Full face",
      "Forehead",
      "Periorbital",
      "Cheeks",
      "Nose",
      "Perioral",
      "Chin",
      "Jawline",
      "Neck",
      "Décolletage",
      "Hands",
      "Arms",
      "Abdomen",
      "Flanks",
      "Thighs",
      "Back",
    ];

    return (
      <View style={styles.container}>
        {/* Subcategory chips */}
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Device category
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollChipRow}
          >
            {ALL_SUBCATEGORIES.map((sub) => {
              const selected = selectedSubcategory === sub;
              return (
                <Pressable
                  key={sub}
                  onPress={() => handleSubcategorySelect(sub)}
                  style={chipStyle(selected)}
                >
                  <ThemedText style={chipTextStyle(selected)}>
                    {SUBCATEGORY_LABELS[sub]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Device list */}
        {selectedSubcategory && (
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              Device
            </ThemedText>
            <View style={styles.chipRow}>
              {filteredDevices.map((device) => {
                const selected = d.deviceModel === device.productName;
                return (
                  <Pressable
                    key={device.id}
                    onPress={() => handleDeviceSelect(device)}
                    style={chipStyle(selected)}
                  >
                    <ThemedText style={chipTextStyle(selected)}>
                      {device.productName}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Selected device badge */}
        {d.deviceModel ? (
          <View
            style={[
              styles.deviceBadge,
              { backgroundColor: theme.link + "1A", borderColor: theme.link },
            ]}
          >
            <ThemedText style={[styles.deviceBadgeText, { color: theme.link }]}>
              {d.manufacturer} — {d.deviceModel}
            </ThemedText>
          </View>
        ) : null}

        {/* === CATEGORY-CONDITIONAL PARAMETERS === */}

        {/* Laser parameters */}
        {paramGroup === "laser" && (
          <View style={styles.paramSection}>
            <ThemedText
              style={[styles.paramSectionTitle, { color: theme.text }]}
            >
              Laser parameters
            </ThemedText>
            {d.wavelengthNm != null && (
              <ParamRow label="Wavelength" value={`${d.wavelengthNm} nm`} theme={theme} />
            )}
            <NumericField
              label="Fluence (J/cm²)"
              value={d.fluenceJcm2}
              onChange={(v) => update({ fluenceJcm2: v })}
              theme={theme}
            />
            <TextFieldRow
              label="Pulse width"
              value={d.pulseWidth}
              onChange={(v) => update({ pulseWidth: v })}
              theme={theme}
            />
            <NumericField
              label="Spot size (mm)"
              value={d.spotSizeMm}
              onChange={(v) => update({ spotSizeMm: v })}
              theme={theme}
            />
            <NumericField
              label="Passes"
              value={d.numberOfPasses}
              onChange={(v) => update({ numberOfPasses: v })}
              theme={theme}
              integer
            />
            <NumericField
              label="Coverage (%)"
              value={d.coverageDensityPercent}
              onChange={(v) => update({ coverageDensityPercent: v })}
              theme={theme}
            />
            {/* Handpiece picker from spec */}
            {d.deviceModel && getEnergyDeviceSpec(
              filteredDevices.find((fd) => fd.productName === d.deviceModel)?.id ?? "",
            )?.availableHandpieces && (
              <View style={styles.subSection}>
                <ThemedText
                  style={[styles.sectionLabel, { color: theme.textSecondary }]}
                >
                  Handpiece
                </ThemedText>
                <View style={styles.chipRow}>
                  {(getEnergyDeviceSpec(
                    filteredDevices.find((fd) => fd.productName === d.deviceModel)?.id ?? "",
                  )?.availableHandpieces ?? []).map((hp) => {
                    const selected = d.handpiece === hp;
                    return (
                      <Pressable
                        key={hp}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          update({ handpiece: selected ? undefined : hp });
                        }}
                        style={chipStyle(selected)}
                      >
                        <ThemedText style={chipTextStyle(selected)}>
                          {hp}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* RF Microneedling parameters */}
        {paramGroup === "rf_microneedling" && (
          <View style={styles.paramSection}>
            <ThemedText
              style={[styles.paramSectionTitle, { color: theme.text }]}
            >
              RF Microneedling parameters
            </ThemedText>
            <NumericField
              label="Needle depth (mm)"
              value={d.needleDepthMm}
              onChange={(v) => update({ needleDepthMm: v })}
              theme={theme}
              step={0.5}
              min={0.5}
              max={8.0}
            />
            <NumericField
              label="Energy level"
              value={d.rfEnergyLevel}
              onChange={(v) => update({ rfEnergyLevel: v })}
              theme={theme}
              integer
            />
            {d.pinCount != null && (
              <ParamRow label="Pin count" value={`${d.pinCount}`} theme={theme} />
            )}
            <View style={styles.subSection}>
              <ThemedText
                style={[styles.sectionLabel, { color: theme.textSecondary }]}
              >
                Tip type
              </ThemedText>
              <View style={styles.chipRow}>
                {TIP_TYPE_OPTIONS.map((opt) => {
                  const selected = d.tipType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        update({
                          tipType: selected ? undefined : opt.value,
                        });
                      }}
                      style={chipStyle(selected)}
                    >
                      <ThemedText style={chipTextStyle(selected)}>
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <NumericField
              label="Passes"
              value={d.numberOfPasses}
              onChange={(v) => update({ numberOfPasses: v })}
              theme={theme}
              integer
            />
          </View>
        )}

        {/* HIFU parameters */}
        {paramGroup === "hifu" && (
          <View style={styles.paramSection}>
            <ThemedText
              style={[styles.paramSectionTitle, { color: theme.text }]}
            >
              HIFU parameters
            </ThemedText>
            <View style={styles.subSection}>
              <ThemedText
                style={[styles.sectionLabel, { color: theme.textSecondary }]}
              >
                Transducer depth (mm)
              </ThemedText>
              <View style={styles.chipRow}>
                {[1.5, 3.0, 4.5].map((depth) => {
                  const selected = d.transducerDepthMm === depth;
                  return (
                    <Pressable
                      key={depth}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        update({ transducerDepthMm: selected ? undefined : depth });
                      }}
                      style={chipStyle(selected)}
                    >
                      <ThemedText style={chipTextStyle(selected)}>
                        {depth}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <NumericField
              label="Energy per line (J)"
              value={d.energyPerLineJ}
              onChange={(v) => update({ energyPerLineJ: v })}
              theme={theme}
            />
            <NumericField
              label="Lines per zone"
              value={d.linesPerZone}
              onChange={(v) => update({ linesPerZone: v })}
              theme={theme}
              integer
            />
          </View>
        )}

        {/* Cryolipolysis parameters */}
        {paramGroup === "cryolipolysis" && (
          <View style={styles.paramSection}>
            <ThemedText
              style={[styles.paramSectionTitle, { color: theme.text }]}
            >
              Cryolipolysis parameters
            </ThemedText>
            <TextFieldRow
              label="Applicator"
              value={d.applicatorType}
              onChange={(v) => update({ applicatorType: v })}
              theme={theme}
            />
            <NumericField
              label="Temperature (°C)"
              value={d.treatmentTemperatureC}
              onChange={(v) => update({ treatmentTemperatureC: v })}
              theme={theme}
            />
            <NumericField
              label="Treatment time (min)"
              value={d.treatmentTimeMin}
              onChange={(v) => update({ treatmentTimeMin: v })}
              theme={theme}
              integer
            />
          </View>
        )}

        {/* IPL parameters */}
        {paramGroup === "ipl" && (
          <View style={styles.paramSection}>
            <ThemedText
              style={[styles.paramSectionTitle, { color: theme.text }]}
            >
              IPL parameters
            </ThemedText>
            <NumericField
              label="Filter wavelength (nm)"
              value={d.wavelengthNm}
              onChange={(v) => update({ wavelengthNm: v })}
              theme={theme}
              integer
            />
            <NumericField
              label="Fluence (J/cm²)"
              value={d.fluenceJcm2}
              onChange={(v) => update({ fluenceJcm2: v })}
              theme={theme}
            />
            <TextFieldRow
              label="Pulse width"
              value={d.pulseWidth}
              onChange={(v) => update({ pulseWidth: v })}
              theme={theme}
            />
          </View>
        )}

        {/* === UNIVERSAL FIELDS === */}

        {/* Treatment areas */}
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Treatment areas
          </ThemedText>
          <View style={styles.chipRow}>
            {TREATMENT_AREA_OPTIONS.map((area) => {
              const selected = selectedAreas.has(area);
              return (
                <Pressable
                  key={area}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({
                      treatmentAreas: toggleMultiSelect(d.treatmentAreas, area),
                    });
                  }}
                  style={chipStyle(selected)}
                >
                  <ThemedText style={chipTextStyle(selected)}>
                    {area}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Fitzpatrick skin type */}
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Skin type (Fitzpatrick)
          </ThemedText>
          <View style={styles.chipRow}>
            {FITZPATRICK_OPTIONS.map((ft) => {
              const selected = d.skinType === ft;
              return (
                <Pressable
                  key={ft}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ skinType: selected ? undefined : ft });
                  }}
                  style={chipStyle(selected)}
                >
                  <ThemedText style={chipTextStyle(selected)}>{ft}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Endpoint observed */}
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Endpoint observed
          </ThemedText>
          <View style={styles.chipRow}>
            {ENDPOINT_OPTIONS.map((ep) => {
              const selected = selectedEndpoints.has(ep.value);
              return (
                <Pressable
                  key={ep.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({
                      endpointObserved: toggleMultiSelect(
                        d.endpointObserved,
                        ep.value,
                      ),
                    });
                  }}
                  style={chipStyle(selected)}
                >
                  <ThemedText style={chipTextStyle(selected)}>
                    {ep.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Anesthesia */}
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Anesthesia
          </ThemedText>
          <View style={styles.chipRow}>
            {ANESTHESIA_OPTIONS.map((a) => {
              const selected = d.anesthesia === a.value;
              return (
                <Pressable
                  key={a.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ anesthesia: selected ? undefined : a.value });
                  }}
                  style={chipStyle(selected)}
                >
                  <ThemedText style={chipTextStyle(selected)}>
                    {a.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Cooling */}
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Cooling method
          </ThemedText>
          <View style={styles.chipRow}>
            {COOLING_OPTIONS.map((c) => {
              const selected = d.coolingMethod === c.value;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ coolingMethod: selected ? undefined : c.value });
                  }}
                  style={chipStyle(selected)}
                >
                  <ThemedText style={chipTextStyle(selected)}>
                    {c.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    );
  },
);

// ─── Helper sub-components ──────────────────────────────────────────────────

function ParamRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.paramRow}>
      <ThemedText style={[styles.paramLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.paramValue, { color: theme.text }]}>
        {value}
      </ThemedText>
    </View>
  );
}

function NumericField({
  label,
  value,
  onChange,
  theme,
  integer,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  theme: ThemeColors;
  integer?: boolean;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.paramRow}>
      <ThemedText style={[styles.paramLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.paramInput,
          {
            backgroundColor: theme.backgroundSecondary,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
        value={value != null ? String(value) : ""}
        onChangeText={(text) => {
          if (!text) {
            onChange(undefined);
            return;
          }
          const num = integer ? parseInt(text, 10) : parseFloat(text);
          if (!isNaN(num)) onChange(num);
        }}
        placeholder="—"
        placeholderTextColor={theme.textTertiary}
      />
    </View>
  );
}

function TextFieldRow({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  theme: ThemeColors;
}) {
  return (
    <View style={styles.paramRow}>
      <ThemedText style={[styles.paramLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.paramInput,
          {
            backgroundColor: theme.backgroundSecondary,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        value={value ?? ""}
        onChangeText={(text) => onChange(text || undefined)}
        placeholder="—"
        placeholderTextColor={theme.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.xs,
  },
  subSection: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scrollChipRow: {
    gap: Spacing.xs,
    paddingRight: Spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  deviceBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  deviceBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  paramSection: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.15)",
  },
  paramSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  paramRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  paramLabel: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  paramValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  paramInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    height: 36,
    minWidth: 80,
    textAlign: "right",
    fontSize: 14,
  },
});
