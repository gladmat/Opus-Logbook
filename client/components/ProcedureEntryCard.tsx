import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { FormField, PickerField } from "@/components/FormField";
import { ProcedureClinicalDetails } from "@/components/ProcedureClinicalDetails";
import { ProcedureSubcategoryPicker } from "@/components/ProcedureSubcategoryPicker";
import { SnomedSearchPicker } from "@/components/SnomedSearchPicker";
import {
  hasPicklistForSpecialty,
  PICKLIST_TO_FLAP_TYPE,
} from "@/lib/procedurePicklist";
import type { ProcedurePicklistEntry } from "@/lib/procedurePicklist";
import {
  type CaseProcedure,
  type Specialty,
  type ClinicalDetails,
  type FreeFlapDetails,
  type SlnbDetails,
  type ProcedureTag,
  FLAP_SNOMED_MAP,
  RECIPIENT_SITE_SNOMED_MAP,
  SPECIALTY_LABELS,
  PROCEDURE_TYPES,
  PROCEDURE_TAG_LABELS,
  AnatomicalRegion,
  Indication,
} from "@/types/case";
import {
  resolveOperativeRole,
  resolveSupervisionLevel,
  hasRoleOverride,
  formatRoleDisplay,
  supervisionApplicable,
  OPERATIVE_ROLE_LABELS,
  SUPERVISION_LABELS,
  type OperativeRole,
  type SupervisionLevel,
} from "@/types/operativeRole";
import { useCaseFormField } from "@/contexts/CaseFormContext";
import {
  getDefaultFlapSpecificDetails,
  getGracilisContextDefaults,
  getFibulaContextDefaults,
  BREAST_RECON_DEFAULT_RECIPIENT_VESSELS,
  DIAGNOSIS_TO_RECIPIENT_SITE,
  CLINICAL_GROUP_TO_INDICATION,
  DIEP_BILATERAL_DEFAULTS,
} from "@/data/autoFillMappings";

interface ProcedureEntryCardProps {
  procedure: CaseProcedure;
  index: number;
  isOnlyProcedure: boolean;
  onUpdate: (procedure: CaseProcedure) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Diagnosis picklist ID for auto-fill context (e.g. "orth_dx_open_fx_lower_leg") */
  diagnosisId?: string;
  /** Clinical group from diagnosis (e.g. "trauma", "oncological") */
  clinicalGroup?: string;
  /** Diagnosis laterality for context-aware flap defaults (e.g. bilateral DIEP). */
  diagnosisLaterality?: string;
}

function ProcedureEntryCardInner({
  procedure,
  index,
  isOnlyProcedure,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  diagnosisId,
  clinicalGroup,
  diagnosisLaterality,
}: ProcedureEntryCardProps) {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const defaultOperativeRole = useCaseFormField("defaultOperativeRole");
  const defaultSupervisionLevel = useCaseFormField("defaultSupervisionLevel");
  const [showRoleOverride, setShowRoleOverride] = useState(
    hasRoleOverride(procedure),
  );
  const [showTags, setShowTags] = useState((procedure.tags?.length ?? 0) > 0);

  const handleSpecialtyChange = (value: string) => {
    onUpdate({
      ...procedure,
      specialty: value as Specialty,
      procedureName: "",
      picklistEntryId: undefined,
      subcategory: undefined,
      snomedCtCode: undefined,
      snomedCtDisplay: undefined,
      implantDetails: undefined,
    });
  };

  const handlePicklistSelect = (entry: ProcedurePicklistEntry) => {
    const mappedFlapType = PICKLIST_TO_FLAP_TYPE[entry.id];

    let clinicalDetails: ClinicalDetails | undefined = undefined;
    if (entry.hasFreeFlap && mappedFlapType) {
      const snomedEntry = FLAP_SNOMED_MAP[mappedFlapType];
      let flapSpecificDetails = getDefaultFlapSpecificDetails(mappedFlapType);
      const prefAnticoag =
        profile?.surgicalPreferences?.microsurgery?.anticoagulationProtocol;

      // ── Recipient site: use diagnosis mapping, then specialty fallback ──
      let recipientSiteRegion: AnatomicalRegion | undefined;
      if (diagnosisId && DIAGNOSIS_TO_RECIPIENT_SITE[diagnosisId]) {
        recipientSiteRegion = DIAGNOSIS_TO_RECIPIENT_SITE[diagnosisId];
      } else if (procedure.specialty === "breast") {
        recipientSiteRegion = "breast_chest";
      }

      const recipientSiteSnomed = recipientSiteRegion
        ? RECIPIENT_SITE_SNOMED_MAP[recipientSiteRegion]
        : undefined;

      // ── Indication from clinical group ──
      let indication: Indication | undefined;
      if (clinicalGroup && CLINICAL_GROUP_TO_INDICATION[clinicalGroup]) {
        indication = CLINICAL_GROUP_TO_INDICATION[clinicalGroup];
      }

      // ── Context-specific flap overrides ──
      let skinIsland: boolean | undefined;

      if (mappedFlapType === "gracilis" || mappedFlapType === "tug") {
        if (diagnosisId) {
          const gracilisDefaults = getGracilisContextDefaults(diagnosisId);
          flapSpecificDetails = {
            ...flapSpecificDetails,
            ...gracilisDefaults.flapSpecificDetails,
          };
          skinIsland = gracilisDefaults.skinIsland;
        }
      }

      if (mappedFlapType === "fibula") {
        const fibulaDefaults = getFibulaContextDefaults(recipientSiteRegion);
        flapSpecificDetails = {
          ...flapSpecificDetails,
          ...fibulaDefaults,
        };
      }

      if (mappedFlapType === "diep" && diagnosisLaterality === "bilateral") {
        flapSpecificDetails = {
          ...flapSpecificDetails,
          ...DIEP_BILATERAL_DEFAULTS,
        };
      }

      // ── Breast recon default vessels ──
      const anastomoses =
        recipientSiteRegion === "breast_chest"
          ? [
              {
                id: uuidv4(),
                vesselType: "artery" as const,
                recipientVesselName:
                  BREAST_RECON_DEFAULT_RECIPIENT_VESSELS.artery,
                anastomosisConfiguration: "end_to_end" as const,
                couplingMethod: "hand_sewn" as const,
              },
              {
                id: uuidv4(),
                vesselType: "vein" as const,
                recipientVesselName:
                  BREAST_RECON_DEFAULT_RECIPIENT_VESSELS.vein,
                couplingMethod: "coupler" as const,
              },
            ]
          : [];

      clinicalDetails = {
        flapType: mappedFlapType,
        flapSnomedCode: snomedEntry?.code,
        flapSnomedDisplay: snomedEntry?.display,
        harvestSide: "left",
        anastomoses,
        recipientSiteRegion,
        recipientSiteSnomedCode: recipientSiteSnomed?.code,
        recipientSiteSnomedDisplay: recipientSiteSnomed?.display,
        ...(indication ? { indication } : {}),
        ...(skinIsland !== undefined ? { skinIsland } : {}),
        ...(Object.keys(flapSpecificDetails).length > 0
          ? { flapSpecificDetails }
          : {}),
        ...(prefAnticoag ? { anticoagulationProtocol: prefAnticoag } : {}),
      } as FreeFlapDetails;
    } else if (entry.hasSlnb) {
      clinicalDetails = {
        basins: [],
        radioisotopeUsed: true, // default: most SLNBs use radioisotope
        gammaProbeUsed: true,
      } as SlnbDetails;
    }

    onUpdate({
      ...procedure,
      procedureName: entry.displayName,
      picklistEntryId: entry.id,
      subcategory: entry.subcategory,
      tags: entry.tags,
      snomedCtCode: entry.snomedCtCode,
      snomedCtDisplay: entry.snomedCtDisplay,
      clinicalDetails,
      implantDetails:
        entry.hasImplant && entry.id === procedure.picklistEntryId
          ? procedure.implantDetails
          : undefined,
    });
  };

  const handleProcedureNameChange = (value: string) => {
    onUpdate({
      ...procedure,
      procedureName: value,
      picklistEntryId: undefined,
      subcategory: undefined,
      implantDetails: undefined,
    });
  };

  // ── Role override helpers ───────────────────────────────────────────────
  const caseDefaultRole = (defaultOperativeRole as OperativeRole) || undefined;
  const caseDefaultSupervision =
    (defaultSupervisionLevel as SupervisionLevel) || undefined;
  const effectiveRole = resolveOperativeRole(
    procedure.operativeRoleOverride,
    caseDefaultRole,
  );
  const effectiveSupervision = resolveSupervisionLevel(
    procedure.supervisionLevelOverride,
    caseDefaultSupervision,
    effectiveRole,
  );
  const isOverridden = hasRoleOverride(procedure);

  const handleRoleOverrideChange = (value: string) => {
    onUpdate({
      ...procedure,
      operativeRoleOverride: value as OperativeRole,
      // Auto-clear supervision override when switching away from SURGEON
      supervisionLevelOverride: supervisionApplicable(value as OperativeRole)
        ? procedure.supervisionLevelOverride
        : "NOT_APPLICABLE",
    });
  };

  const handleSupervisionOverrideChange = (value: string) => {
    onUpdate({
      ...procedure,
      supervisionLevelOverride: value as SupervisionLevel,
    });
  };

  const handleResetOverrides = () => {
    Haptics.selectionAsync();
    setShowRoleOverride(false);
    onUpdate({
      ...procedure,
      operativeRoleOverride: undefined,
      supervisionLevelOverride: undefined,
    });
  };

  const handleSnomedProcedureSelect = (
    result: { conceptId: string; term: string } | null,
  ) => {
    onUpdate({
      ...procedure,
      snomedCtCode: result?.conceptId || "",
      snomedCtDisplay: result?.term || "",
    });
  };

  const handleNotesChange = (value: string) => {
    onUpdate({
      ...procedure,
      notes: value,
    });
  };

  const handleClinicalDetailsUpdate = (details: ClinicalDetails) => {
    onUpdate({
      ...procedure,
      clinicalDetails: details,
    });
  };

  const handleTagToggle = (tag: ProcedureTag) => {
    const currentTags = procedure.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    onUpdate({
      ...procedure,
      tags: newTags,
    });
  };

  const procedureTypeOptions = procedure.specialty
    ? PROCEDURE_TYPES[procedure.specialty]?.map((type) => ({
        value: type,
        label: type,
      })) || []
    : [];

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
        <View style={styles.headerLeft}>
          <View
            style={[styles.orderBadge, { backgroundColor: theme.link + "20" }]}
          >
            <ThemedText style={[styles.orderText, { color: theme.link }]}>
              {index + 1}
            </ThemedText>
          </View>
          <ThemedText style={[styles.cardTitle, { color: theme.text }]}>
            Procedure
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          {canMoveUp ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onMoveUp?.();
              }}
              hitSlop={8}
              style={styles.iconButton}
            >
              <Feather
                name="chevron-up"
                size={18}
                color={theme.textSecondary}
              />
            </Pressable>
          ) : null}
          {canMoveDown ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onMoveDown?.();
              }}
              hitSlop={8}
              style={styles.iconButton}
            >
              <Feather
                name="chevron-down"
                size={18}
                color={theme.textSecondary}
              />
            </Pressable>
          ) : null}
          {!isOnlyProcedure ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onDelete();
              }}
              hitSlop={8}
              style={styles.iconButton}
            >
              <Feather name="trash-2" size={18} color={theme.error} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <PickerField
        label="Specialty"
        value={procedure.specialty || ""}
        options={Object.entries(SPECIALTY_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        onSelect={handleSpecialtyChange}
        placeholder="Select specialty"
      />

      {procedure.specialty ? (
        hasPicklistForSpecialty(procedure.specialty) ? (
          <View style={styles.procedurePickerSection}>
            <View style={styles.fieldLabelRow}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Procedure
              </ThemedText>
              <ThemedText
                style={[styles.requiredAsterisk, { color: theme.error }]}
              >
                *
              </ThemedText>
            </View>
            <ProcedureSubcategoryPicker
              specialty={procedure.specialty}
              selectedEntryId={procedure.picklistEntryId}
              onSelect={handlePicklistSelect}
            />
          </View>
        ) : (
          <PickerField
            label="Procedure Type"
            value={procedure.procedureName}
            options={procedureTypeOptions}
            onSelect={handleProcedureNameChange}
            placeholder="Select procedure"
            required
          />
        )
      ) : null}

      <View style={styles.tagsSection}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowTags((v) => !v);
          }}
          style={styles.tagsToggle}
        >
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Procedure Tags
            {(procedure.tags?.length ?? 0) > 0
              ? ` (${procedure.tags!.length})`
              : ""}
          </ThemedText>
          <Feather
            name={showTags ? "chevron-up" : "chevron-down"}
            size={14}
            color={theme.textTertiary}
          />
        </Pressable>
        {showTags ? (
          <View style={styles.tagsContainer}>
            {(Object.keys(PROCEDURE_TAG_LABELS) as ProcedureTag[]).map(
              (tag) => {
                const isSelected = procedure.tags?.includes(tag) || false;
                return (
                  <Pressable
                    key={tag}
                    onPress={() => {
                      Haptics.selectionAsync();
                      handleTagToggle(tag);
                    }}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: isSelected
                          ? theme.link
                          : theme.backgroundDefault,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.tagText,
                        {
                          color: isSelected
                            ? theme.buttonText
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {PROCEDURE_TAG_LABELS[tag]}
                    </ThemedText>
                  </Pressable>
                );
              },
            )}
          </View>
        ) : null}
      </View>

      {/* ── Role inheritance display ────────────────────────────── */}
      <View style={styles.roleHeaderRow}>
        <View style={{ flex: 1 }}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Your Role
          </ThemedText>
          <ThemedText
            style={[
              styles.roleValueText,
              isOverridden && { color: theme.link },
            ]}
          >
            {formatRoleDisplay(effectiveRole, effectiveSupervision)}
            {isOverridden ? " (overridden)" : ""}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            if (showRoleOverride) {
              handleResetOverrides();
            } else {
              setShowRoleOverride(true);
            }
          }}
          hitSlop={8}
        >
          <ThemedText style={[styles.roleLink, { color: theme.link }]}>
            {showRoleOverride ? "Use default" : "Override"}
          </ThemedText>
        </Pressable>
      </View>

      {showRoleOverride && (
        <View style={styles.roleOverridePanel}>
          <View style={styles.roleChipRow}>
            {(Object.keys(OPERATIVE_ROLE_LABELS) as OperativeRole[]).map(
              (r) => {
                const selected = procedure.operativeRoleOverride === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      Haptics.selectionAsync();
                      handleRoleOverrideChange(r);
                    }}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: selected
                          ? theme.link
                          : theme.backgroundDefault,
                        borderColor: selected ? theme.link : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.roleChipText,
                        {
                          color: selected
                            ? theme.buttonText
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {OPERATIVE_ROLE_LABELS[r]}
                    </ThemedText>
                  </Pressable>
                );
              },
            )}
          </View>

          {supervisionApplicable(
            procedure.operativeRoleOverride ?? effectiveRole,
          ) && (
            <View style={[styles.roleChipRow, { marginTop: Spacing.sm }]}>
              {(
                [
                  "INDEPENDENT",
                  "SUP_AVAILABLE",
                  "SUP_PRESENT",
                  "SUP_SCRUBBED",
                  "DIRECTED",
                ] as SupervisionLevel[]
              ).map((s) => {
                const selected = procedure.supervisionLevelOverride === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => {
                      Haptics.selectionAsync();
                      handleSupervisionOverrideChange(s);
                    }}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: selected
                          ? theme.link
                          : theme.backgroundDefault,
                        borderColor: selected ? theme.link : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.roleChipText,
                        {
                          color: selected
                            ? theme.buttonText
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {SUPERVISION_LABELS[s]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={handleResetOverrides}
            style={{ marginTop: Spacing.sm }}
            hitSlop={8}
          >
            <ThemedText style={[styles.roleLink, { color: theme.link }]}>
              Reset to case default
            </ThemedText>
          </Pressable>
        </View>
      )}

      <SnomedSearchPicker
        label="SNOMED CT Procedure"
        value={
          procedure.snomedCtCode && procedure.snomedCtDisplay
            ? {
                conceptId: procedure.snomedCtCode,
                term: procedure.snomedCtDisplay,
              }
            : undefined
        }
        onSelect={handleSnomedProcedureSelect}
        searchType="procedure"
        specialty={procedure.specialty}
        placeholder="Search SNOMED CT procedures..."
      />

      <FormField
        label="Notes"
        value={procedure.notes || ""}
        onChangeText={handleNotesChange}
        placeholder="Additional procedure notes..."
        multiline
      />

      {procedure.specialty ? (
        <ProcedureClinicalDetails
          specialty={procedure.specialty}
          procedureType={procedure.procedureName}
          picklistEntryId={procedure.picklistEntryId}
          clinicalDetails={procedure.clinicalDetails || {}}
          onUpdate={handleClinicalDetailsUpdate}
        />
      ) : null}
    </View>
  );
}

function areProcedureEntryCardPropsEqual(
  prev: ProcedureEntryCardProps,
  next: ProcedureEntryCardProps,
): boolean {
  return (
    prev.procedure === next.procedure &&
    prev.index === next.index &&
    prev.isOnlyProcedure === next.isOnlyProcedure &&
    prev.canMoveUp === next.canMoveUp &&
    prev.canMoveDown === next.canMoveDown &&
    prev.diagnosisId === next.diagnosisId &&
    prev.clinicalGroup === next.clinicalGroup &&
    prev.diagnosisLaterality === next.diagnosisLaterality
  );
}

export const ProcedureEntryCard = React.memo(
  ProcedureEntryCardInner,
  areProcedureEntryCardPropsEqual,
);

const styles = StyleSheet.create({
  procedurePickerSection: {
    marginBottom: Spacing.md,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  iconButton: {
    padding: Spacing.xs,
  },
  requiredAsterisk: {
    marginLeft: 2,
    fontSize: 14,
    fontWeight: "600",
  },
  roleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  roleValueText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  roleLink: {
    fontSize: 14,
    fontWeight: "500",
  },
  roleOverridePanel: {
    marginBottom: Spacing.md,
  },
  roleChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  roleChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  tagsSection: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tagsToggle: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: Spacing.xs,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tagChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
