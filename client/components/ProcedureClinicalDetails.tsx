import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Animated } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { FormField, PickerField } from "@/components/FormField";
import { AnastomosisEntryCard } from "@/components/AnastomosisEntryCard";
import { RecipientSiteSelector } from "@/components/RecipientSiteSelector";
import { FreeFlapPicker } from "@/components/FreeFlapPicker";
import { FlapSpecificFields } from "@/components/FlapSpecificFields";
import { SectionHeader } from "@/components/SectionHeader";
import { v4 as uuidv4 } from "uuid";
import {
  findPicklistEntry,
  PICKLIST_TO_FLAP_TYPE,
} from "@/lib/procedurePicklist";
import {
  type Specialty,
  type AnatomicalRegion,
  type AnastomosisEntry,
  type ClinicalDetails,
  type FreeFlapDetails,
  type HandSurgeryDetails,
  type VesselType,
  type HarvestSide,
  type Indication,
  type ElevationPlane,
  type FreeFlap,
  type FlapSpecificDetails,
  type SlnbDetails,
  type SlnbBasin,
  type SlnbBasinResult,
  type PreoperativeImaging,
  type PerfusionAssessment,
  type DonorSiteClosureMethod,
  INDICATION_LABELS,
  FLAP_SNOMED_MAP,
  RECIPIENT_SITE_SNOMED_MAP,
  FREE_FLAP_LABELS,
  ELEVATION_PLANE_LABELS,
  SLNB_BASIN_LABELS,
  PREOPERATIVE_IMAGING_LABELS,
  PERFUSION_ASSESSMENT_LABELS,
  DONOR_SITE_CLOSURE_LABELS,
} from "@/types/case";
import {
  type AnticoagulationProtocolId,
  ANTICOAGULATION_PROTOCOLS,
} from "@/types/surgicalPreferences";
import { CollapsibleFormSection } from "@/components/case-form/CollapsibleFormSection";
import { FLAP_ELEVATION_PLANES } from "@/data/flapFieldConfig";
import {
  getDefaultFlapSpecificDetails,
  ALT_ELEVATION_TO_COMPOSITION,
  ARTERY_TO_CONCOMITANT_VEIN,
} from "@/data/autoFillMappings";

interface FreeFlapClinicalFieldsProps {
  clinicalDetails: FreeFlapDetails;
  procedureType: string;
  picklistEntryId?: string;
  onUpdate: (details: FreeFlapDetails) => void;
}

const DEFAULT_DONOR_VESSELS: Record<
  FreeFlap,
  { artery: string; vein: string }
> = {
  alt: {
    artery: "Descending branch of lateral circumflex femoral artery",
    vein: "Venae comitantes of lateral circumflex femoral artery",
  },
  diep: {
    artery: "Deep inferior epigastric artery",
    vein: "Deep inferior epigastric vein",
  },
  radial_forearm: {
    artery: "Radial artery",
    vein: "Venae comitantes of radial artery",
  },
  fibula: {
    artery: "Peroneal artery",
    vein: "Venae comitantes of peroneal artery",
  },
  latissimus_dorsi: {
    artery: "Thoracodorsal artery",
    vein: "Thoracodorsal vein",
  },
  gracilis: {
    artery: "Gracilis branch of medial circumflex femoral artery",
    vein: "Venae comitantes of medial circumflex femoral artery",
  },
  tug: {
    artery: "Gracilis branch of medial circumflex femoral artery",
    vein: "Venae comitantes of medial circumflex femoral artery",
  },
  scip: {
    artery: "Superficial circumflex iliac artery",
    vein: "Superficial circumflex iliac vein",
  },
  siea: {
    artery: "Superficial inferior epigastric artery",
    vein: "Superficial inferior epigastric vein",
  },
  medial_sural: {
    artery: "Medial sural artery",
    vein: "Venae comitantes of medial sural artery",
  },
  sgap: {
    artery: "Superior gluteal artery (perforator branch)",
    vein: "Superior gluteal vein",
  },
  igap: {
    artery: "Inferior gluteal artery (perforator branch)",
    vein: "Inferior gluteal vein",
  },
  pap: {
    artery: "Profunda femoris artery (perforator branch)",
    vein: "Venae comitantes of profunda femoris artery",
  },
  tdap: {
    artery: "Thoracodorsal artery (perforator branch)",
    vein: "Thoracodorsal vein",
  },
  parascapular: {
    artery: "Circumflex scapular artery",
    vein: "Circumflex scapular vein",
  },
  scapular: {
    artery: "Circumflex scapular artery",
    vein: "Circumflex scapular vein",
  },
  serratus_anterior: {
    artery: "Thoracodorsal artery (serratus branch)",
    vein: "Thoracodorsal vein",
  },
  other: {
    artery: "",
    vein: "",
  },
};

export function FreeFlapClinicalFields({
  clinicalDetails,
  procedureType,
  picklistEntryId,
  onUpdate,
}: FreeFlapClinicalFieldsProps) {
  const { theme } = useTheme();

  const presetFlapType = picklistEntryId
    ? PICKLIST_TO_FLAP_TYPE[picklistEntryId]
    : undefined;
  const flapIsLocked = !!presetFlapType;

  const anastomoses = clinicalDetails.anastomoses || [];
  const recipientSiteRegion = clinicalDetails.recipientSiteRegion;

  const addAnastomosis = (vesselType: VesselType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newEntry: AnastomosisEntry = {
      id: uuidv4(),
      vesselType,
      recipientVesselName: "",
      couplingMethod: vesselType === "artery" ? "hand_sewn" : undefined,
    };
    onUpdate({
      ...clinicalDetails,
      anastomoses: [...anastomoses, newEntry],
    });
  };

  const updateAnastomosis = (updated: AnastomosisEntry) => {
    onUpdate({
      ...clinicalDetails,
      anastomoses: anastomoses.map((a) => (a.id === updated.id ? updated : a)),
    });
  };

  const removeAnastomosis = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpdate({
      ...clinicalDetails,
      anastomoses: anastomoses.filter((a) => a.id !== id),
    });
  };

  const handleArterySelected = (arteryName: string) => {
    const concomitantVein = ARTERY_TO_CONCOMITANT_VEIN[arteryName];
    if (!concomitantVein) return;

    // Find existing vein entry that hasn't been manually set
    const existingVein = anastomoses.find(
      (a) => a.vesselType === "vein" && !a.recipientVesselName,
    );

    if (existingVein) {
      // Update existing empty vein entry
      onUpdate({
        ...clinicalDetails,
        anastomoses: anastomoses.map((a) =>
          a.id === existingVein.id
            ? {
                ...a,
                recipientVesselName: concomitantVein,
                couplingMethod: "coupler" as const,
                configuration: "end_to_end" as const,
              }
            : a,
        ),
      });
    } else if (!anastomoses.some((a) => a.vesselType === "vein")) {
      // No vein entry at all — create one
      const newVein: AnastomosisEntry = {
        id: uuidv4(),
        vesselType: "vein",
        recipientVesselName: concomitantVein,
        couplingMethod: "coupler",
        configuration: "end_to_end",
      };
      onUpdate({
        ...clinicalDetails,
        anastomoses: [...anastomoses, newVein],
      });
    }
  };

  const flapType = clinicalDetails.flapType;
  const donorVessels = flapType ? DEFAULT_DONOR_VESSELS[flapType] : undefined;

  const FLAPS_WITH_SKIN_ISLAND: FreeFlap[] = [
    "gracilis",
    "tug",
    "serratus_anterior",
    "pap",
    "latissimus_dorsi",
  ];
  const showSkinIsland = flapType
    ? FLAPS_WITH_SKIN_ISLAND.includes(flapType)
    : false;

  const handleFlapTypeChange = (flap: FreeFlap) => {
    const snomedEntry = FLAP_SNOMED_MAP[flap];
    const defaultFlapSpecific = getDefaultFlapSpecificDetails(flap);

    onUpdate({
      ...clinicalDetails,
      flapType: flap,
      flapSnomedCode: snomedEntry?.code,
      flapSnomedDisplay: snomedEntry?.display,
      skinIsland: undefined,
      flapSpecificDetails: defaultFlapSpecific,
    });
  };

  const handleElevationPlaneChange = (plane: ElevationPlane) => {
    const updates: Partial<FreeFlapDetails> = {
      elevationPlane: plane,
    };

    // ALT-specific: cascade elevation plane to tissue composition
    if (clinicalDetails.flapType === "alt") {
      const cascadedComposition = ALT_ELEVATION_TO_COMPOSITION[plane];
      if (cascadedComposition) {
        updates.flapSpecificDetails = {
          ...clinicalDetails.flapSpecificDetails,
          altTissueComposition: cascadedComposition,
        };
      }
    }

    onUpdate({ ...clinicalDetails, ...updates } as FreeFlapDetails);
  };

  const handleRecipientSiteChange = (region: AnatomicalRegion) => {
    const snomedEntry = RECIPIENT_SITE_SNOMED_MAP[region];
    onUpdate({
      ...clinicalDetails,
      recipientSiteRegion: region,
      recipientSiteSnomedCode: snomedEntry?.code,
      recipientSiteSnomedDisplay: snomedEntry?.display,
    });
  };

  return (
    <View style={styles.container}>
      {flapIsLocked && clinicalDetails.flapType ? (
        <View style={styles.lockedFlapSection}>
          <View style={styles.labelRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Flap Type
            </ThemedText>
          </View>
          <View
            style={[
              styles.lockedFlapBadge,
              {
                backgroundColor: theme.link + "15",
                borderColor: theme.link,
              },
            ]}
          >
            <Feather name="check-circle" size={16} color={theme.link} />
            <ThemedText style={[styles.lockedFlapText, { color: theme.link }]}>
              {FREE_FLAP_LABELS[clinicalDetails.flapType]}
            </ThemedText>
          </View>
          {(FLAP_ELEVATION_PLANES[clinicalDetails.flapType] || []).length >
          0 ? (
            <View style={{ marginTop: Spacing.md }}>
              <PickerField
                label="Elevation Plane"
                value={clinicalDetails.elevationPlane || ""}
                options={(
                  FLAP_ELEVATION_PLANES[clinicalDetails.flapType] || []
                ).map((plane) => ({
                  value: plane,
                  label: ELEVATION_PLANE_LABELS[plane],
                }))}
                onSelect={(value) =>
                  handleElevationPlaneChange(value as ElevationPlane)
                }
              />
            </View>
          ) : null}
        </View>
      ) : (
        <FreeFlapPicker
          flapType={clinicalDetails.flapType}
          elevationPlane={clinicalDetails.elevationPlane}
          onFlapTypeChange={handleFlapTypeChange}
          onElevationPlaneChange={handleElevationPlaneChange}
          required
        />
      )}

      {showSkinIsland ? (
        <SelectField
          label="Skin Island"
          value={
            clinicalDetails.skinIsland === true
              ? "yes"
              : clinicalDetails.skinIsland === false
                ? "no"
                : ""
          }
          options={[
            { value: "yes", label: "With skin island" },
            { value: "no", label: "Muscle only" },
          ]}
          onSelect={(v) =>
            onUpdate({ ...clinicalDetails, skinIsland: v === "yes" })
          }
          required
        />
      ) : null}

      <RecipientSiteSelector
        value={clinicalDetails.recipientSiteRegion}
        onSelect={handleRecipientSiteChange}
        required
      />

      <ThemedText style={[styles.subsectionTitle, { color: theme.text }]}>
        Anastomoses
      </ThemedText>
      <ThemedText
        style={[styles.subsectionSubtitle, { color: theme.textSecondary }]}
      >
        Add arterial and venous connections
      </ThemedText>

      {anastomoses.map((entry, index) => {
        const defaultDonorVessel = donorVessels
          ? entry.vesselType === "artery"
            ? donorVessels.artery
            : donorVessels.vein
          : undefined;
        return (
          <AnastomosisEntryCard
            key={entry.id}
            entry={entry}
            index={index}
            recipientRegion={recipientSiteRegion}
            defaultDonorVessel={defaultDonorVessel}
            onUpdate={updateAnastomosis}
            onDelete={() => removeAnastomosis(entry.id)}
            onArterySelected={
              entry.vesselType === "artery"
                ? handleArterySelected
                : undefined
            }
          />
        );
      })}

      <View style={styles.anastomosisButtons}>
        <Pressable
          style={[
            styles.addButton,
            {
              backgroundColor: theme.error + "15",
              borderColor: theme.error + "30",
            },
          ]}
          onPress={() => addAnastomosis("artery")}
        >
          <Feather name="plus" size={16} color={theme.error} />
          <ThemedText style={[styles.addButtonText, { color: theme.error }]}>
            Add Artery
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.addButton,
            {
              backgroundColor: theme.link + "15",
              borderColor: theme.link + "30",
            },
          ]}
          onPress={() => addAnastomosis("vein")}
        >
          <Feather name="plus" size={16} color={theme.link} />
          <ThemedText style={[styles.addButtonText, { color: theme.link }]}>
            Add Vein
          </ThemedText>
        </Pressable>
      </View>

      <SelectField
        label="Harvest Side"
        value={clinicalDetails.harvestSide || ""}
        options={[
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ]}
        onSelect={(v) =>
          onUpdate({ ...clinicalDetails, harvestSide: v as HarvestSide })
        }
        required
      />

      <SelectField
        label="Indication"
        value={clinicalDetails.indication || ""}
        options={Object.entries(INDICATION_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        onSelect={(v) =>
          onUpdate({ ...clinicalDetails, indication: v as Indication })
        }
        required
      />

      {/* Planning & Technique collapsible section */}
      <CollapsibleFormSection
        title="Planning & Technique"
        subtitle="Pre-op imaging, protocols & closure"
        filledCount={
          [
            clinicalDetails.preoperativeImaging,
            clinicalDetails.perfusionAssessment,
            clinicalDetails.anticoagulationProtocol,
            clinicalDetails.positionChangeRequired !== undefined
              ? "filled"
              : undefined,
            clinicalDetails.donorSiteClosureMethod,
          ].filter(Boolean).length
        }
        totalCount={5}
        defaultExpanded={false}
      >
        <View style={{ gap: Spacing.md, paddingBottom: Spacing.md }}>
          <SelectField
            label="Preoperative Imaging"
            value={clinicalDetails.preoperativeImaging || ""}
            options={Object.entries(PREOPERATIVE_IMAGING_LABELS).map(
              ([value, label]) => ({ value, label }),
            )}
            onSelect={(v) =>
              onUpdate({
                ...clinicalDetails,
                preoperativeImaging: v as PreoperativeImaging,
              })
            }
          />

          <SelectField
            label="Perfusion Assessment"
            value={clinicalDetails.perfusionAssessment || ""}
            options={Object.entries(PERFUSION_ASSESSMENT_LABELS).map(
              ([value, label]) => ({ value, label }),
            )}
            onSelect={(v) =>
              onUpdate({
                ...clinicalDetails,
                perfusionAssessment: v as PerfusionAssessment,
              })
            }
          />

          <SelectField
            label="Anticoagulation Protocol"
            value={clinicalDetails.anticoagulationProtocol || ""}
            options={ANTICOAGULATION_PROTOCOLS.map((p) => ({
              value: p.id,
              label: p.label,
            }))}
            onSelect={(v) =>
              onUpdate({
                ...clinicalDetails,
                anticoagulationProtocol: v as AnticoagulationProtocolId,
              })
            }
          />

          <SelectField
            label="Position Change Required"
            value={
              clinicalDetails.positionChangeRequired === true
                ? "yes"
                : clinicalDetails.positionChangeRequired === false
                  ? "no"
                  : ""
            }
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
            onSelect={(v) =>
              onUpdate({
                ...clinicalDetails,
                positionChangeRequired: v === "yes",
              })
            }
          />

          <SelectField
            label="Donor Site Closure"
            value={clinicalDetails.donorSiteClosureMethod || ""}
            options={Object.entries(DONOR_SITE_CLOSURE_LABELS).map(
              ([value, label]) => ({ value, label }),
            )}
            onSelect={(v) =>
              onUpdate({
                ...clinicalDetails,
                donorSiteClosureMethod: v as DonorSiteClosureMethod,
              })
            }
          />
        </View>
      </CollapsibleFormSection>

      <FormField
        label="Ischemia Time (Total)"
        value={
          clinicalDetails.ischemiaTimeMinutes
            ? String(clinicalDetails.ischemiaTimeMinutes)
            : ""
        }
        onChangeText={(v) =>
          onUpdate({
            ...clinicalDetails,
            ischemiaTimeMinutes: v ? parseInt(v) : undefined,
          })
        }
        placeholder="60"
        keyboardType="numeric"
        unit="min"
        required
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <FormField
            label="Warm Ischemia"
            value={
              clinicalDetails.warmIschemiaMinutes
                ? String(clinicalDetails.warmIschemiaMinutes)
                : ""
            }
            onChangeText={(v) =>
              onUpdate({
                ...clinicalDetails,
                warmIschemiaMinutes: v ? parseInt(v) : undefined,
              })
            }
            placeholder="—"
            keyboardType="numeric"
            unit="min"
          />
        </View>
        <View style={styles.halfField}>
          <FormField
            label="Cold Ischemia"
            value={
              clinicalDetails.coldIschemiaMinutes
                ? String(clinicalDetails.coldIschemiaMinutes)
                : ""
            }
            onChangeText={(v) =>
              onUpdate({
                ...clinicalDetails,
                coldIschemiaMinutes: v ? parseInt(v) : undefined,
              })
            }
            placeholder="—"
            keyboardType="numeric"
            unit="min"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <FormField
            label="Flap Width"
            value={
              clinicalDetails.flapWidthCm
                ? String(clinicalDetails.flapWidthCm)
                : ""
            }
            onChangeText={(v) =>
              onUpdate({
                ...clinicalDetails,
                flapWidthCm: v ? parseFloat(v) : undefined,
              })
            }
            placeholder="8"
            keyboardType="decimal-pad"
            unit="cm"
          />
        </View>
        <View style={styles.halfField}>
          <FormField
            label="Flap Length"
            value={
              clinicalDetails.flapLengthCm
                ? String(clinicalDetails.flapLengthCm)
                : ""
            }
            onChangeText={(v) =>
              onUpdate({
                ...clinicalDetails,
                flapLengthCm: v ? parseFloat(v) : undefined,
              })
            }
            placeholder="15"
            keyboardType="decimal-pad"
            unit="cm"
          />
        </View>
      </View>

      {flapType ? (
        <FlapSpecificFields
          flapType={flapType}
          details={clinicalDetails.flapSpecificDetails || {}}
          onUpdate={(fsd: FlapSpecificDetails) =>
            onUpdate({ ...clinicalDetails, flapSpecificDetails: fsd })
          }
        />
      ) : null}
    </View>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  required?: boolean;
}

function SelectField({
  label,
  value,
  options,
  onSelect,
  required,
}: SelectFieldProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.selectField}>
      <ThemedText style={[styles.selectLabel, { color: theme.textSecondary }]}>
        {label}
        {required ? " *" : ""}
      </ThemedText>
      <View style={styles.selectOptions}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.selectOption,
              {
                backgroundColor:
                  value === option.value
                    ? theme.link + "20"
                    : theme.backgroundDefault,
                borderColor: value === option.value ? theme.link : theme.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(option.value);
            }}
          >
            <ThemedText
              style={[
                styles.selectOptionText,
                { color: value === option.value ? theme.link : theme.text },
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

interface HandTraumaClinicalFieldsProps {
  clinicalDetails: Record<string, unknown>;
  onUpdate: (details: Record<string, unknown>) => void;
}

export function HandTraumaClinicalFields({
  clinicalDetails,
  onUpdate,
}: HandTraumaClinicalFieldsProps) {
  return (
    <View style={styles.container}>
      <FormField
        label="Injury Mechanism"
        value={String(clinicalDetails.injuryMechanism || "")}
        onChangeText={(v) =>
          onUpdate({ ...clinicalDetails, injuryMechanism: v })
        }
        placeholder="e.g., Saw injury, crush injury"
      />
      <FormField
        label="Fixation Material"
        value={String(clinicalDetails.fixationMaterial || "")}
        onChangeText={(v) =>
          onUpdate({ ...clinicalDetails, fixationMaterial: v })
        }
        placeholder="e.g., K-wire 1.2mm, plate/screws"
      />
    </View>
  );
}

interface HandSurgeryClinicalFieldsProps {
  clinicalDetails: HandSurgeryDetails;
  onUpdate: (details: HandSurgeryDetails) => void;
}

const HAND_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

const DOMINANT_HAND_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "ambidextrous", label: "Ambidextrous" },
];

export function HandSurgeryClinicalFields({
  clinicalDetails,
  onUpdate,
}: HandSurgeryClinicalFieldsProps) {
  return null;
}

interface BodyContouringClinicalFieldsProps {
  clinicalDetails: Record<string, unknown>;
  onUpdate: (details: Record<string, unknown>) => void;
}

export function BodyContouringClinicalFields({
  clinicalDetails,
  onUpdate,
}: BodyContouringClinicalFieldsProps) {
  return (
    <View style={styles.container}>
      <FormField
        label="Resection Weight"
        value={
          clinicalDetails.resectionWeightGrams
            ? String(clinicalDetails.resectionWeightGrams)
            : ""
        }
        onChangeText={(v) =>
          onUpdate({
            ...clinicalDetails,
            resectionWeightGrams: v ? parseInt(v) : undefined,
          })
        }
        placeholder="e.g., 500"
        keyboardType="numeric"
        unit="g"
      />
      <FormField
        label="Drain Output"
        value={
          clinicalDetails.drainOutputMl
            ? String(clinicalDetails.drainOutputMl)
            : ""
        }
        onChangeText={(v) =>
          onUpdate({
            ...clinicalDetails,
            drainOutputMl: v ? parseInt(v) : undefined,
          })
        }
        placeholder="e.g., 100"
        keyboardType="numeric"
        unit="mL"
      />
    </View>
  );
}

// ─── SLNB Basin Detail Fields ─────────────────────────────────────────────────

const ALL_BASINS: SlnbBasin[] = [
  "right_axilla",
  "left_axilla",
  "right_groin",
  "left_groin",
  "right_popliteal",
  "left_popliteal",
  "right_cervical_parotid",
  "left_cervical_parotid",
  "other",
];

interface SlnbBasinCardProps {
  result: SlnbBasinResult;
  onUpdate: (result: SlnbBasinResult) => void;
  onRemove: () => void;
}

function SlnbBasinCard({ result, onUpdate, onRemove }: SlnbBasinCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        slnbStyles.basinCard,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={slnbStyles.basinCardHeader}>
        <View
          style={[
            slnbStyles.basinBadge,
            {
              backgroundColor: theme.link + "18",
              borderColor: theme.link + "40",
            },
          ]}
        >
          <ThemedText
            style={[slnbStyles.basinBadgeText, { color: theme.link }]}
          >
            {SLNB_BASIN_LABELS[result.basin]}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onRemove();
          }}
          hitSlop={8}
          style={slnbStyles.removeBtnHit}
        >
          <Feather name="x" size={16} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={slnbStyles.basinRow}>
        <View style={slnbStyles.basinHalf}>
          <FormField
            label="Nodes removed"
            value={
              result.nodesRemoved !== undefined
                ? String(result.nodesRemoved)
                : ""
            }
            onChangeText={(v) =>
              onUpdate({ ...result, nodesRemoved: v ? parseInt(v) : undefined })
            }
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
        <View style={slnbStyles.basinHalf}>
          <FormField
            label="Nodes positive"
            value={
              result.nodesPositive !== undefined
                ? String(result.nodesPositive)
                : ""
            }
            onChangeText={(v) =>
              onUpdate({
                ...result,
                nodesPositive: v ? parseInt(v) : undefined,
              })
            }
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      </View>

      <FormField
        label="Largest deposit"
        value={
          result.largestDepositMm !== undefined
            ? String(result.largestDepositMm)
            : ""
        }
        onChangeText={(v) =>
          onUpdate({
            ...result,
            largestDepositMm: v ? parseFloat(v) : undefined,
          })
        }
        placeholder="e.g., 2.5"
        keyboardType="decimal-pad"
        unit="mm"
      />

      {/* Extranodal extension toggle */}
      <View style={slnbStyles.toggleRow}>
        <ThemedText
          style={[slnbStyles.toggleLabel, { color: theme.textSecondary }]}
        >
          Extranodal extension
        </ThemedText>
        <View style={slnbStyles.toggleOptions}>
          {(["yes", "no", "unknown"] as const).map((opt) => {
            const current =
              result.extranodalExtension === true
                ? "yes"
                : result.extranodalExtension === false
                  ? "no"
                  : "unknown";
            const isActive = current === opt;
            return (
              <Pressable
                key={opt}
                style={[
                  slnbStyles.toggleChip,
                  {
                    backgroundColor: isActive
                      ? theme.link + "20"
                      : theme.backgroundDefault,
                    borderColor: isActive ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onUpdate({
                    ...result,
                    extranodalExtension:
                      opt === "yes" ? true : opt === "no" ? false : undefined,
                  });
                }}
              >
                <ThemedText
                  style={[
                    slnbStyles.toggleChipText,
                    { color: isActive ? theme.link : theme.text },
                  ]}
                >
                  {opt === "yes" ? "Yes" : opt === "no" ? "No" : "Unknown"}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {result.basin === "other" ? (
        <FormField
          label="Basin note"
          value={result.basinNote || ""}
          onChangeText={(v) => onUpdate({ ...result, basinNote: v })}
          placeholder="Describe basin / location"
        />
      ) : null}
    </View>
  );
}

interface SlnbClinicalFieldsProps {
  clinicalDetails: SlnbDetails;
  onUpdate: (details: SlnbDetails) => void;
}

const BASIN_GRID_ROWS: {
  label: string;
  left?: SlnbBasin;
  right?: SlnbBasin;
  single?: SlnbBasin;
}[] = [
  {
    label: "Cervical / Parotid",
    left: "left_cervical_parotid",
    right: "right_cervical_parotid",
  },
  { label: "Axilla", left: "left_axilla", right: "right_axilla" },
  { label: "Groin", left: "left_groin", right: "right_groin" },
  { label: "Popliteal", left: "left_popliteal", right: "right_popliteal" },
  { label: "Other", single: "other" },
];

export function SlnbClinicalFields({
  clinicalDetails,
  onUpdate,
}: SlnbClinicalFieldsProps) {
  const { theme } = useTheme();

  const basins = clinicalDetails.basins || [];

  const addBasin = (basin: SlnbBasin) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newResult: SlnbBasinResult = { basin };
    onUpdate({ ...clinicalDetails, basins: [...basins, newResult] });
  };

  const updateBasin = (index: number, result: SlnbBasinResult) => {
    const updated = [...basins];
    updated[index] = result;
    onUpdate({ ...clinicalDetails, basins: updated });
  };

  const removeBasin = (index: number) => {
    onUpdate({
      ...clinicalDetails,
      basins: basins.filter((_, i) => i !== index),
    });
  };

  const usedBasins = new Set(basins.map((b) => b.basin));

  const toggleBasin = (basin: SlnbBasin) => {
    if (usedBasins.has(basin)) {
      const idx = basins.findIndex((b) => b.basin === basin);
      if (idx !== -1) removeBasin(idx);
    } else {
      addBasin(basin);
    }
  };

  const toggleTechnique = (
    field: keyof Pick<
      SlnbDetails,
      "radioisotopeUsed" | "blueDyeUsed" | "gammaProbeUsed" | "spectCtPerformed"
    >,
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({ ...clinicalDetails, [field]: !clinicalDetails[field] });
  };

  const techniqueItems: { key: keyof SlnbDetails; label: string }[] = [
    { key: "radioisotopeUsed", label: "Radioisotope (Tc-99m)" },
    { key: "blueDyeUsed", label: "Blue dye" },
    { key: "gammaProbeUsed", label: "Gamma probe" },
    { key: "spectCtPerformed", label: "SPECT/CT pre-op" },
  ];

  return (
    <View style={slnbStyles.container}>
      {/* Technique section */}
      <ThemedText
        style={[slnbStyles.sectionLabel, { color: theme.textSecondary }]}
      >
        Mapping technique
      </ThemedText>
      <View style={slnbStyles.techniqueGrid}>
        {techniqueItems.map(({ key, label }) => {
          const active = !!clinicalDetails[key];
          return (
            <Pressable
              key={key}
              style={[
                slnbStyles.techniqueChip,
                {
                  backgroundColor: active
                    ? theme.link + "18"
                    : theme.backgroundDefault,
                  borderColor: active ? theme.link : theme.border,
                },
              ]}
              onPress={() => toggleTechnique(key as any)}
            >
              {active ? (
                <Feather
                  name="check"
                  size={13}
                  color={theme.link}
                  style={{ marginRight: 4 }}
                />
              ) : null}
              <ThemedText
                style={[
                  slnbStyles.techniqueChipText,
                  { color: active ? theme.link : theme.text },
                ]}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Basin section */}
      <View style={slnbStyles.basinHeader}>
        <ThemedText
          style={[slnbStyles.sectionLabel, { color: theme.textSecondary }]}
        >
          Basins sampled
        </ThemedText>
        {basins.length > 0 ? (
          <ThemedText style={[slnbStyles.basinCount, { color: theme.link }]}>
            {basins.length} basin{basins.length !== 1 ? "s" : ""}
          </ThemedText>
        ) : null}
      </View>

      {/* Paired left/right basin grid */}
      <View style={slnbStyles.basinGrid}>
        {BASIN_GRID_ROWS.map((row) => {
          if (row.single) {
            const isActive = usedBasins.has(row.single);
            return (
              <View key={row.single} style={slnbStyles.basinGridRow}>
                <ThemedText
                  style={[
                    slnbStyles.basinGridLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  {row.label}
                </ThemedText>
                <Pressable
                  style={[
                    slnbStyles.basinOtherBtn,
                    {
                      backgroundColor: isActive
                        ? theme.link + "18"
                        : theme.backgroundElevated,
                      borderColor: isActive ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => toggleBasin(row.single!)}
                >
                  <ThemedText
                    style={[
                      slnbStyles.basinSideBtnText,
                      { color: isActive ? theme.link : theme.textSecondary },
                    ]}
                  >
                    Other
                  </ThemedText>
                </Pressable>
              </View>
            );
          }
          const leftActive = row.left ? usedBasins.has(row.left) : false;
          const rightActive = row.right ? usedBasins.has(row.right) : false;
          return (
            <View key={row.label} style={slnbStyles.basinGridRow}>
              <ThemedText
                style={[
                  slnbStyles.basinGridLabel,
                  { color: theme.textSecondary },
                ]}
              >
                {row.label}
              </ThemedText>
              <View style={{ flexDirection: "row", gap: Spacing.xs }}>
                <Pressable
                  style={[
                    slnbStyles.basinSideBtn,
                    {
                      backgroundColor: leftActive
                        ? theme.link + "18"
                        : theme.backgroundElevated,
                      borderColor: leftActive ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => row.left && toggleBasin(row.left)}
                >
                  <ThemedText
                    style={[
                      slnbStyles.basinSideBtnText,
                      { color: leftActive ? theme.link : theme.textSecondary },
                    ]}
                  >
                    Left
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    slnbStyles.basinSideBtn,
                    {
                      backgroundColor: rightActive
                        ? theme.link + "18"
                        : theme.backgroundElevated,
                      borderColor: rightActive ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => row.right && toggleBasin(row.right)}
                >
                  <ThemedText
                    style={[
                      slnbStyles.basinSideBtnText,
                      { color: rightActive ? theme.link : theme.textSecondary },
                    ]}
                  >
                    Right
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {/* Basin detail cards */}
      {basins.length > 0 ? (
        <View style={slnbStyles.basinList}>
          {basins.map((result, index) => (
            <SlnbBasinCard
              key={`${result.basin}-${index}`}
              result={result}
              onUpdate={(updated) => updateBasin(index, updated)}
              onRemove={() => removeBasin(index)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const slnbStyles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  techniqueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  techniqueChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  techniqueChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  basinHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  basinCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  basinList: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  basinCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  basinCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  basinBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  basinBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  removeBtnHit: {
    padding: 4,
  },
  basinRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  basinHalf: {
    flex: 1,
  },
  toggleRow: {
    marginBottom: Spacing.md,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  toggleOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  toggleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  toggleChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  basinGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  basinGridRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  basinGridLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  basinSideBtn: {
    width: 68,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  basinSideBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  basinOtherBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
  },
});

// ─── SLNB Disclosure Group ────────────────────────────────────────────────────

function SlnbDisclosureGroup({
  defaultExpanded,
  children,
}: {
  defaultExpanded: boolean;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const animHeight = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const contentHeight = useRef(0);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(animHeight, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      friction: 20,
      tension: 100,
    }).start();
  };

  return (
    <View style={disclosureStyles.container}>
      <Pressable
        style={[
          disclosureStyles.header,
          { borderColor: expanded ? theme.link + "40" : theme.border },
        ]}
        onPress={toggle}
      >
        <Feather
          name={expanded ? "chevron-down" : "chevron-right"}
          size={16}
          color={theme.textSecondary}
        />
        <ThemedText
          style={[disclosureStyles.headerText, { color: theme.text }]}
        >
          SLNB Details
        </ThemedText>
      </Pressable>
      <Animated.View
        style={{
          overflow: "hidden",
          maxHeight: animHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 2000],
          }),
          opacity: animHeight,
        }}
      >
        <View
          onLayout={(e) => {
            contentHeight.current = e.nativeEvent.layout.height;
          }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const disclosureStyles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

// ─── Procedure Clinical Details Router ───────────────────────────────────────

interface ProcedureClinicalDetailsProps {
  specialty: Specialty;
  procedureType: string;
  picklistEntryId?: string;
  clinicalDetails: ClinicalDetails;
  onUpdate: (details: ClinicalDetails) => void;
  /** Set by ProcedureEntryCard when the picklist entry has hasSlnb: true */
  isSlnbProcedure?: boolean;
}

export function ProcedureClinicalDetails({
  specialty,
  procedureType,
  picklistEntryId,
  clinicalDetails,
  onUpdate,
  isSlnbProcedure,
}: ProcedureClinicalDetailsProps) {
  const { theme } = useTheme();

  const picklistEntry = picklistEntryId
    ? findPicklistEntry(picklistEntryId)
    : undefined;
  const isFreeFlapProcedure = picklistEntry
    ? !!picklistEntry.hasFreeFlap
    : procedureType.toLowerCase().includes("free flap") ||
      procedureType.toLowerCase().includes("free tissue");

  // SLNB: triggered by hasSlnb flag on picklist entry, or explicit prop
  const isSlnb =
    isSlnbProcedure || (picklistEntry ? !!picklistEntry.hasSlnb : false);

  if (isSlnb) {
    const existing = clinicalDetails as Partial<SlnbDetails>;
    const slnbDetails: SlnbDetails = {
      basins: existing.basins || [],
      radioisotopeUsed: existing.radioisotopeUsed,
      blueDyeUsed: existing.blueDyeUsed,
      gammaProbeUsed: existing.gammaProbeUsed,
      spectCtPerformed: existing.spectCtPerformed,
    };
    const hasData = (slnbDetails.basins?.length ?? 0) > 0;
    return (
      <SlnbDisclosureGroup defaultExpanded={hasData}>
        <SlnbClinicalFields clinicalDetails={slnbDetails} onUpdate={onUpdate} />
      </SlnbDisclosureGroup>
    );
  }

  // Free flap details are handled by the hub row / FreeFlapSheet modal
  if (isFreeFlapProcedure) {
    return null;
  }

  if (specialty === "hand_surgery") {
    const handDetails: HandSurgeryDetails = {
      injuryMechanism: (clinicalDetails as HandSurgeryDetails)?.injuryMechanism,
      fractures: (clinicalDetails as HandSurgeryDetails)?.fractures,
      dominantHand: (clinicalDetails as HandSurgeryDetails)?.dominantHand,
      affectedHand: (clinicalDetails as HandSurgeryDetails)?.affectedHand,
    };
    return (
      <HandSurgeryClinicalFields
        clinicalDetails={handDetails}
        onUpdate={onUpdate}
      />
    );
  }

  if (specialty === "body_contouring") {
    return (
      <BodyContouringClinicalFields
        clinicalDetails={clinicalDetails as Record<string, unknown>}
        onUpdate={onUpdate}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: Spacing.md,
    marginBottom: 2,
  },
  subsectionSubtitle: {
    fontSize: 12,
    marginBottom: Spacing.sm,
  },
  anastomosisButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  selectField: {
    marginBottom: Spacing.md,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  selectOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  selectOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  selectOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  fractureSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  fractureTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  fractureAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  fractureAddBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  fractureList: {
    gap: Spacing.sm,
  },
  fractureCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  fractureCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  fractureBoneName: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  aoCodeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  aoCodeBadgeText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  emptyFractureCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyFractureText: {
    fontSize: 14,
  },
  lockedFlapSection: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  lockedFlapBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  lockedFlapText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
