/**
 * Soft-tissue subsections for the unified Hand Trauma Assessment.
 *
 * Covers:
 * - Soft-tissue coverage descriptors with per-location zone/surface/size
 * - Special injury flags: HPI, fight bite, compartment syndrome, ring avulsion
 */

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { CoverageZone, CoverageSize, DigitId } from "@/types/case";

export interface DefectLocation {
  digits: DigitId[];
  zone?: CoverageZone;
  surfaces: ("palmar" | "dorsal")[];
  size?: CoverageSize;
}

export interface SoftTissueState {
  isHighPressureInjection: boolean;
  isFightBite: boolean;
  isCompartmentSyndrome: boolean;
  isRingAvulsion: boolean;
  hasSoftTissueDefect: boolean;
  hasSoftTissueLoss: boolean;
  hasDegloving: boolean;
  hasGrossContamination: boolean;
  defectLocations: DefectLocation[];
}

interface SoftTissueSectionProps {
  value: SoftTissueState;
  onChange: (value: SoftTissueState) => void;
  selectedDigits: DigitId[];
}

const ZONE_OPTIONS: { key: CoverageZone; label: string }[] = [
  { key: "fingertip", label: "Fingertip" },
  { key: "digit_shaft", label: "Digit" },
  { key: "web_space", label: "Web space" },
  { key: "palm", label: "Palm" },
  { key: "dorsum_hand", label: "Dorsum" },
  { key: "wrist_forearm", label: "Wrist / forearm" },
];

const SIZE_OPTIONS: { key: CoverageSize; label: string }[] = [
  { key: "small", label: "Small (<2 cm)" },
  { key: "medium", label: "Medium (2–4 cm)" },
  { key: "large", label: "Large (>4 cm)" },
];

/** Zones with an implicit surface — no sub-picker needed */
const ZONE_IMPLICIT_SURFACE: Partial<
  Record<CoverageZone, ("palmar" | "dorsal")[]>
> = {
  palm: ["palmar"],
  dorsum_hand: ["dorsal"],
  web_space: [], // interdigital — no surface concept
};

/** Zones that need a palmar/dorsal sub-picker */
const ZONES_NEEDING_SURFACE: CoverageZone[] = [
  "fingertip",
  "digit_shaft",
  "wrist_forearm",
];

const SPECIAL_INJURIES: {
  key: keyof Pick<
    SoftTissueState,
    | "isHighPressureInjection"
    | "isFightBite"
    | "isCompartmentSyndrome"
    | "isRingAvulsion"
  >;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    key: "isHighPressureInjection",
    label: "High-pressure injection",
    description: "Paint gun, grease gun, hydraulic",
    icon: "alert-triangle",
  },
  {
    key: "isFightBite",
    label: "Fight bite",
    description: "Human bite to MCP joint",
    icon: "alert-circle",
  },
  {
    key: "isCompartmentSyndrome",
    label: "Compartment syndrome",
    description: "Hand / forearm compartment pressure",
    icon: "activity",
  },
  {
    key: "isRingAvulsion",
    label: "Ring avulsion",
    description: "Ring-related degloving / avulsion",
    icon: "circle",
  },
];

// ─── Location Card ──────────────────────────────────────────────────────────

function LocationCard({
  location,
  index,
  totalLocations,
  selectedDigits,
  onUpdate,
  onRemove,
  theme,
}: {
  location: DefectLocation;
  index: number;
  totalLocations: number;
  selectedDigits: DigitId[];
  onUpdate: (loc: DefectLocation) => void;
  onRemove: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const showHeader = totalLocations > 1;
  const showDigitPicker = selectedDigits.length > 1;

  const toggleZone = (zone: CoverageZone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (location.zone === zone) {
      onUpdate({ ...location, zone: undefined, surfaces: [] });
    } else {
      const implicitSurface = ZONE_IMPLICIT_SURFACE[zone];
      onUpdate({
        ...location,
        zone,
        surfaces: implicitSurface ?? location.surfaces,
      });
    }
  };

  const toggleSurface = (surface: "palmar" | "dorsal") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = location.surfaces.includes(surface)
      ? location.surfaces.filter((s) => s !== surface)
      : [...location.surfaces, surface];
    onUpdate({ ...location, surfaces: next });
  };

  const toggleSize = (size: CoverageSize) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({
      ...location,
      size: location.size === size ? undefined : size,
    });
  };

  const toggleDigit = (digit: DigitId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = location.digits.includes(digit)
      ? location.digits.filter((d) => d !== digit)
      : [...location.digits, digit];
    onUpdate({ ...location, digits: next });
  };

  return (
    <View
      style={[
        styles.locationCard,
        {
          borderColor: theme.border,
          backgroundColor: theme.backgroundTertiary,
        },
      ]}
    >
      {showHeader ? (
        <View style={styles.locationHeader}>
          <ThemedText style={[styles.locationTitle, { color: theme.text }]}>
            Location {index + 1}
            {location.digits.length > 0
              ? ` (${location.digits.join(", ")})`
              : ""}
          </ThemedText>
          <Pressable
            hitSlop={12}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRemove();
            }}
          >
            <Feather name="x" size={18} color={theme.textTertiary} />
          </Pressable>
        </View>
      ) : null}

      {showDigitPicker ? (
        <View style={styles.subRow}>
          <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
            Digits
          </ThemedText>
          <View style={styles.pillRow}>
            {selectedDigits.map((digit) => {
              const isSelected = location.digits.includes(digit);
              return (
                <Pressable
                  key={digit}
                  style={[
                    styles.smallPill,
                    {
                      backgroundColor: isSelected
                        ? theme.link + "15"
                        : theme.backgroundDefault,
                      borderColor: isSelected ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => toggleDigit(digit)}
                >
                  <ThemedText
                    style={[
                      styles.smallPillText,
                      { color: isSelected ? theme.link : theme.text },
                    ]}
                  >
                    {digit}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Zone picker */}
      <View style={styles.subRow}>
        <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
          Defect zone
        </ThemedText>
        <View style={styles.pillRow}>
          {ZONE_OPTIONS.map(({ key, label }) => {
            const isSelected = location.zone === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected
                      ? theme.link + "15"
                      : theme.backgroundDefault,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => toggleZone(key)}
              >
                <ThemedText
                  style={[
                    styles.pillText,
                    { color: isSelected ? theme.link : theme.text },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Surface sub-picker — only for ambiguous zones */}
      {location.zone && ZONES_NEEDING_SURFACE.includes(location.zone) ? (
        <View style={styles.subRow}>
          <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
            Surface
          </ThemedText>
          <View style={styles.pillRow}>
            {(["palmar", "dorsal"] as const).map((surface) => {
              const isSelected = location.surfaces.includes(surface);
              return (
                <Pressable
                  key={surface}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected
                        ? theme.link + "15"
                        : theme.backgroundDefault,
                      borderColor: isSelected ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => toggleSurface(surface)}
                >
                  <ThemedText
                    style={[
                      styles.pillText,
                      { color: isSelected ? theme.link : theme.text },
                    ]}
                  >
                    {surface === "palmar" ? "Palmar" : "Dorsal"}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Size picker */}
      <View style={styles.subRow}>
        <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
          Defect size
        </ThemedText>
        <View style={styles.pillRow}>
          {SIZE_OPTIONS.map(({ key, label }) => {
            const isSelected = location.size === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected
                      ? theme.link + "15"
                      : theme.backgroundDefault,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => toggleSize(key)}
              >
                <ThemedText
                  style={[
                    styles.pillText,
                    { color: isSelected ? theme.link : theme.text },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Descriptor Section ─────────────────────────────────────────────────────

export function SoftTissueDescriptorSection({
  value,
  onChange,
  selectedDigits,
}: SoftTissueSectionProps) {
  const { theme } = useTheme();

  const toggleDescriptor = (
    key:
      | "hasSoftTissueDefect"
      | "hasSoftTissueLoss"
      | "hasDegloving"
      | "hasGrossContamination",
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = { ...value, [key]: !value[key] };
    // Ensure at least one default location when activating first coverage descriptor
    const hasCoverage =
      next.hasSoftTissueDefect || next.hasSoftTissueLoss || next.hasDegloving;
    if (hasCoverage && next.defectLocations.length === 0) {
      next.defectLocations = [
        {
          digits: [...selectedDigits],
          zone: undefined,
          surfaces: [],
          size: undefined,
        },
      ];
    }
    onChange(next);
  };

  const hasCoverage =
    value.hasSoftTissueDefect || value.hasSoftTissueLoss || value.hasDegloving;

  const updateLocation = (index: number, loc: DefectLocation) => {
    const next = [...value.defectLocations];
    next[index] = loc;
    onChange({ ...value, defectLocations: next });
  };

  const removeLocation = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = value.defectLocations.filter((_, i) => i !== index);
    onChange({ ...value, defectLocations: next.length > 0 ? next : [] });
  };

  const addLocation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // New location starts with unassigned digits
    const usedDigits = new Set(value.defectLocations.flatMap((l) => l.digits));
    const remaining = selectedDigits.filter((d) => !usedDigits.has(d));
    onChange({
      ...value,
      defectLocations: [
        ...value.defectLocations,
        {
          digits: remaining.length > 0 ? remaining : [],
          zone: undefined,
          surfaces: [],
          size: undefined,
        },
      ],
    });
  };

  return (
    <View style={styles.subSection}>
      <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
        Descriptors / coverage
      </ThemedText>
      <View style={styles.pillRow}>
        {[
          { key: "hasSoftTissueDefect", label: "Defect" },
          { key: "hasSoftTissueLoss", label: "Loss" },
          { key: "hasDegloving", label: "Degloving" },
          { key: "hasGrossContamination", label: "Gross contamination" },
        ].map(({ key, label }) => {
          const isSelected = value[key as keyof SoftTissueState] === true;
          return (
            <Pressable
              key={key}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected
                    ? theme.link
                    : theme.backgroundTertiary,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
              onPress={() =>
                toggleDescriptor(
                  key as
                    | "hasSoftTissueDefect"
                    | "hasSoftTissueLoss"
                    | "hasDegloving"
                    | "hasGrossContamination",
                )
              }
            >
              <ThemedText
                style={[
                  styles.pillText,
                  { color: isSelected ? theme.buttonText : theme.text },
                ]}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {hasCoverage ? (
        <View style={styles.coverageDetails}>
          {value.defectLocations.map((loc, i) => (
            <LocationCard
              key={i}
              location={loc}
              index={i}
              totalLocations={value.defectLocations.length}
              selectedDigits={selectedDigits}
              onUpdate={(updated) => updateLocation(i, updated)}
              onRemove={() => removeLocation(i)}
              theme={theme}
            />
          ))}

          {selectedDigits.length > 1 ? (
            <Pressable
              style={[
                styles.addLocationButton,
                { borderColor: theme.textTertiary },
              ]}
              onPress={addLocation}
            >
              <Feather name="plus" size={16} color={theme.textTertiary} />
              <ThemedText
                style={[styles.addLocationText, { color: theme.textTertiary }]}
              >
                Add defect location
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ─── Special Injury Section ─────────────────────────────────────────────────

export function SoftTissueSpecialInjurySection({
  value,
  onChange,
}: Omit<SoftTissueSectionProps, "selectedDigits">) {
  const { theme } = useTheme();

  const toggleSpecialInjury = (
    key: keyof Pick<
      SoftTissueState,
      | "isHighPressureInjection"
      | "isFightBite"
      | "isCompartmentSyndrome"
      | "isRingAvulsion"
    >,
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <View style={styles.subSection}>
      <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
        Special injuries
      </ThemedText>
      <View style={styles.specialGrid}>
        {SPECIAL_INJURIES.map(({ key, label, description, icon }) => {
          const isActive = value[key];
          return (
            <Pressable
              key={key}
              style={[
                styles.specialCard,
                {
                  backgroundColor: isActive
                    ? theme.link + "15"
                    : theme.backgroundTertiary,
                  borderColor: isActive ? theme.link : theme.border,
                },
              ]}
              onPress={() => toggleSpecialInjury(key)}
            >
              <View style={styles.specialCardTop}>
                <Feather
                  name={icon as any}
                  size={18}
                  color={isActive ? theme.link : theme.textSecondary}
                />
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isActive ? theme.link : theme.textTertiary,
                      backgroundColor: isActive ? theme.link : "transparent",
                    },
                  ]}
                >
                  {isActive ? (
                    <Feather name="check" size={12} color={theme.buttonText} />
                  ) : null}
                </View>
              </View>
              <ThemedText
                style={[styles.specialLabel, { color: theme.text }]}
                numberOfLines={1}
              >
                {label}
              </ThemedText>
              <ThemedText
                style={[styles.specialDesc, { color: theme.textTertiary }]}
                numberOfLines={2}
              >
                {description}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SoftTissueSection(props: SoftTissueSectionProps) {
  return (
    <View style={styles.container}>
      <SoftTissueDescriptorSection {...props} />
      <SoftTissueSpecialInjurySection
        value={props.value}
        onChange={props.onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  subSection: {
    gap: Spacing.sm,
  },
  subRow: {
    gap: Spacing.xs,
  },
  coverageDetails: {
    gap: Spacing.md,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
  },
  locationCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  addLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addLocationText: {
    fontSize: 13,
    fontWeight: "500",
  },
  specialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  specialCard: {
    width: "48%",
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  specialCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  specialLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  specialDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  smallPill: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
  },
  smallPillText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
