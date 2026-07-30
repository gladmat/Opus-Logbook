import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { FormField, PickerField } from "@/components/FormField";
import {
  type AnastomosisEntry,
  type AnastomosisType,
  type CouplingMethod,
  type AnatomicalRegion,
  type SnomedRefItem,
  VESSEL_TYPE_LABELS,
  VEIN_COUPLING_METHOD_OPTIONS,
  ANASTOMOSIS_LABELS,
} from "@/types/case";
import {
  fetchVesselsByRegion,
  getRecipientVesselPresets,
} from "@/lib/snomedApi";
import {
  unionVesselOptions,
  type RegionVesselOption,
} from "@/lib/recipientRegions";
import { REGION_ARTERIAL_CONFIGURATION } from "@/data/autoFillMappings";

interface AnastomosisEntryCardProps {
  entry: AnastomosisEntry;
  index: number;
  /** Selected recipient regions in selection order — [0] is the primary. */
  recipientRegions?: AnatomicalRegion[];
  defaultDonorVessel?: string;
  onUpdate: (entry: AnastomosisEntry) => void;
  onDelete: () => void;
  /** Fired when an artery vessel is selected — parent uses this to auto-populate vein entry */
  onArterySelected?: (payload: ArterySelectionPayload) => void;
}

const COUPLER_SIZES = ["1.5", "2.0", "2.5", "3.0", "3.5", "4.0"];

export interface ArterySelectionPayload {
  entryId: string;
  arteryDisplayName: string;
  arteryCommonName?: string;
  arterySnomedCtCode: string;
  recipientRegion?: AnatomicalRegion;
  availableVeinOptions: {
    snomedCtCode: string;
    displayName: string;
    commonName?: string;
  }[];
  defaultArterialConfiguration?: AnastomosisType;
}

/** Wrap a local preset vessel name in the SnomedRefItem shape (synthetic code). */
function presetToItem(name: string): SnomedRefItem {
  return {
    snomedCtCode: name.toLowerCase().replace(/\s+/g, "_"),
    displayName: name,
    commonName: name,
  } as SnomedRefItem;
}

/**
 * Load artery + vein options for one region: head & neck uses curated local
 * presets directly (no API round-trip); other regions fetch from the server
 * and fall back to local presets on empty result or error.
 */
async function loadRegionVessels(region: AnatomicalRegion): Promise<{
  region: AnatomicalRegion;
  arteries: SnomedRefItem[];
  veins: SnomedRefItem[];
}> {
  const localArteries = () =>
    getRecipientVesselPresets(region, "artery").map(presetToItem);
  const localVeins = () =>
    getRecipientVesselPresets(region, "vein").map(presetToItem);

  if (region === "head_neck") {
    return { region, arteries: localArteries(), veins: localVeins() };
  }

  try {
    const [arteriesData, veinsData] = await Promise.all([
      fetchVesselsByRegion(region, "artery"),
      fetchVesselsByRegion(region, "vein"),
    ]);
    return {
      region,
      arteries: arteriesData.length > 0 ? arteriesData : localArteries(),
      veins: veinsData.length > 0 ? veinsData : localVeins(),
    };
  } catch (err) {
    console.error("Error fetching vessels:", err);
    return { region, arteries: localArteries(), veins: localVeins() };
  }
}

export function AnastomosisEntryCard({
  entry,
  index,
  recipientRegions,
  defaultDonorVessel,
  onUpdate,
  onDelete,
  onArterySelected,
}: AnastomosisEntryCardProps) {
  const { theme } = useTheme();
  const [arteries, setArteries] = useState<RegionVesselOption[]>([]);
  const [veins, setVeins] = useState<RegionVesselOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      entry.couplingMethod === "coupler" &&
      entry.configuration !== "end_to_end"
    ) {
      onUpdate({ ...entry, configuration: "end_to_end" });
    }
  }, [entry, onUpdate]);

  // Stable key: the parent recreates the array every render, so depending on
  // array identity would re-fire the fetch on every keystroke elsewhere.
  const regionsKey = (recipientRegions ?? []).join(",");

  useEffect(() => {
    const regions = regionsKey
      ? (regionsKey.split(",") as AnatomicalRegion[])
      : [];
    if (regions.length === 0) return;

    let cancelled = false;
    if (regions.some((r) => r !== "head_neck")) {
      setIsLoading(true);
    }

    Promise.all(regions.map(loadRegionVessels))
      .then((results) => {
        if (cancelled) return;
        setArteries(
          unionVesselOptions(
            results.map(({ region, arteries: items }) => ({ region, items })),
          ),
        );
        setVeins(
          unionVesselOptions(
            results.map(({ region, veins: items }) => ({ region, items })),
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [regionsKey]);

  const vesselOptions =
    entry.vesselType === "artery"
      ? arteries.map((v) => ({
          value: v.snomedCtCode,
          label: v.commonName || v.displayName,
        }))
      : veins.map((v) => ({
          value: v.snomedCtCode,
          label: v.commonName || v.displayName,
        }));

  const handleVesselTypeChange = (value: string) => {
    onUpdate({
      ...entry,
      vesselType: value as "artery" | "vein",
      recipientVesselSnomedCode: undefined,
      recipientVesselName: "",
    });
  };

  const handleVesselSelect = (snomedCode: string) => {
    const vessel =
      entry.vesselType === "artery"
        ? arteries.find((v) => v.snomedCtCode === snomedCode)
        : veins.find((v) => v.snomedCtCode === snomedCode);

    const vesselName = vessel?.displayName || vessel?.commonName || "";

    if (entry.vesselType === "artery") {
      // Auto-set arterial configuration based on the selected vessel's own
      // source region (matters when selected regions differ in default
      // configuration); fall back to the primary region.
      const configRegion = vessel?.sourceRegion ?? recipientRegions?.[0];
      const defaultConfig = configRegion
        ? REGION_ARTERIAL_CONFIGURATION[configRegion]
        : undefined;
      const updatedArteryEntry: AnastomosisEntry = {
        ...entry,
        recipientVesselSnomedCode: snomedCode,
        recipientVesselName: vesselName,
        ...(defaultConfig && !entry.configuration
          ? { configuration: defaultConfig }
          : {}),
      };

      // Parent handles a single combined update (artery + potential vein autofill)
      if (onArterySelected) {
        onArterySelected({
          entryId: entry.id,
          arteryDisplayName: vesselName,
          arteryCommonName: vessel?.commonName || undefined,
          arterySnomedCtCode: snomedCode,
          recipientRegion: configRegion,
          availableVeinOptions: veins.map((v) => ({
            snomedCtCode: v.snomedCtCode,
            displayName: v.displayName,
            commonName: v.commonName || undefined,
          })),
          defaultArterialConfiguration:
            defaultConfig && !entry.configuration ? defaultConfig : undefined,
        });
      } else {
        onUpdate(updatedArteryEntry);
      }
    } else {
      onUpdate({
        ...entry,
        recipientVesselSnomedCode: snomedCode,
        recipientVesselName: vesselName,
      });
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <ThemedText style={[styles.cardTitle, { color: theme.text }]}>
          {entry.vesselType === "artery" ? "Arterial" : "Venous"} Anastomosis{" "}
          {index + 1}
        </ThemedText>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Feather name="trash-2" size={18} color={theme.error} />
        </Pressable>
      </View>

      <PickerField
        label="Vessel Type"
        value={entry.vesselType}
        options={Object.entries(VESSEL_TYPE_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        onSelect={handleVesselTypeChange}
        required
      />

      {recipientRegions && recipientRegions.length > 0 ? (
        isLoading ? (
          <ThemedText
            style={{ color: theme.textSecondary, marginBottom: Spacing.md }}
          >
            Loading vessels...
          </ThemedText>
        ) : vesselOptions.length > 0 ? (
          <View style={styles.vesselSelectContainer}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Recipient Vessel
            </ThemedText>
            <View style={styles.vesselOptions}>
              {vesselOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleVesselSelect(option.value)}
                  style={[
                    styles.vesselOption,
                    {
                      backgroundColor:
                        entry.recipientVesselSnomedCode === option.value
                          ? theme.accentSurface
                          : theme.backgroundDefault,
                      borderColor:
                        entry.recipientVesselSnomedCode === option.value
                          ? theme.link
                          : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.vesselOptionText,
                      {
                        color:
                          entry.recipientVesselSnomedCode === option.value
                            ? theme.link
                            : theme.text,
                        fontWeight:
                          entry.recipientVesselSnomedCode === option.value
                            ? "600"
                            : "400",
                      },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FormField
            label="Recipient Vessel"
            value={entry.recipientVesselName}
            onChangeText={(text) =>
              onUpdate({ ...entry, recipientVesselName: text })
            }
            placeholder="Enter vessel name"
          />
        )
      ) : (
        <FormField
          label="Recipient Vessel"
          value={entry.recipientVesselName}
          onChangeText={(text) =>
            onUpdate({ ...entry, recipientVesselName: text })
          }
          placeholder="Select recipient site first"
        />
      )}

      <FormField
        label="Donor Vessel"
        value={entry.donorVesselName || ""}
        onChangeText={(text) => onUpdate({ ...entry, donorVesselName: text })}
        placeholder={defaultDonorVessel || "e.g., Desc. branch LCFA"}
      />

      {entry.vesselType === "artery" ? (
        <View style={styles.fixedValue}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Technique
          </ThemedText>
          <ThemedText style={[styles.fixedValueText, { color: theme.text }]}>
            Hand-sewn (standard for arteries)
          </ThemedText>
        </View>
      ) : (
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Technique
          </ThemedText>
          <View
            style={[
              styles.segmentedControl,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundDefault,
              },
            ]}
          >
            {VEIN_COUPLING_METHOD_OPTIONS.map((option) => {
              const isSelected = entry.couplingMethod === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.segmentedButton,
                    isSelected ? { backgroundColor: theme.link } : undefined,
                  ]}
                  onPress={() => {
                    const newMethod = option.value as CouplingMethod;
                    const configUpdate =
                      newMethod === "coupler"
                        ? { configuration: "end_to_end" as AnastomosisType }
                        : {};
                    onUpdate({
                      ...entry,
                      couplingMethod: newMethod,
                      ...configUpdate,
                    });
                  }}
                >
                  <ThemedText
                    style={[
                      styles.segmentedButtonText,
                      {
                        color: isSelected
                          ? theme.buttonText
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {entry.vesselType === "vein" && entry.couplingMethod === "coupler" ? (
        <PickerField
          label="Coupler Size (mm)"
          value={entry.couplerSizeMm?.toString() || ""}
          options={COUPLER_SIZES.map((size) => ({ value: size, label: size }))}
          onSelect={(value) =>
            onUpdate({ ...entry, couplerSizeMm: parseFloat(value) })
          }
        />
      ) : null}

      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Configuration
        </ThemedText>
        <View
          style={[
            styles.segmentedControl,
            {
              borderColor: theme.border,
              backgroundColor: theme.backgroundDefault,
            },
          ]}
        >
          {(
            Object.entries(ANASTOMOSIS_LABELS) as [AnastomosisType, string][]
          ).map(([value, label]) => {
            const isSelected = entry.configuration === value;
            const isLocked =
              entry.couplingMethod === "coupler" && value !== "end_to_end";
            return (
              <Pressable
                key={value}
                style={[
                  styles.segmentedButton,
                  isSelected ? { backgroundColor: theme.link } : undefined,
                  isLocked ? { opacity: 0.35 } : undefined,
                ]}
                onPress={() => {
                  if (isLocked) return;
                  onUpdate({ ...entry, configuration: value });
                }}
              >
                <ThemedText
                  style={[
                    styles.segmentedButtonText,
                    {
                      color: isSelected
                        ? theme.buttonText
                        : theme.textSecondary,
                    },
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

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  vesselSelectContainer: {
    marginBottom: Spacing.lg,
  },
  vesselOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  vesselOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  vesselOptionText: {
    fontSize: 13,
  },
  fixedValue: {
    marginBottom: Spacing.lg,
  },
  fixedValueText: {
    fontSize: 16,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
