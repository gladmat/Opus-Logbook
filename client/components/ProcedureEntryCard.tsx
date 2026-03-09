import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal } from "react-native";
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
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { SnomedSearchPicker } from "@/components/SnomedSearchPicker";
import {
  hasPicklistForSpecialty,
  PICKLIST_TO_FLAP_TYPE,
} from "@/lib/procedurePicklist";
import type { ProcedurePicklistEntry } from "@/lib/procedurePicklist";
import {
  type CaseProcedure,
  type Role,
  type Specialty,
  type ClinicalDetails,
  type FreeFlapDetails,
  type SlnbDetails,
  type ProcedureTag,
  FLAP_SNOMED_MAP,
  RECIPIENT_SITE_SNOMED_MAP,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  SPECIALTY_LABELS,
  PROCEDURE_TYPES,
  PROCEDURE_TAG_LABELS,
  AnatomicalRegion,
  Indication,
} from "@/types/case";
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

export function ProcedureEntryCard({
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
  const [showRoleInfoModal, setShowRoleInfoModal] = useState(false);

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

  const handleRoleChange = (value: string) => {
    onUpdate({
      ...procedure,
      surgeonRole: value as Role,
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
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Procedure Tags
        </ThemedText>
        <View style={styles.tagsContainer}>
          {(Object.keys(PROCEDURE_TAG_LABELS) as ProcedureTag[]).map((tag) => {
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
          })}
        </View>
      </View>

      <View style={styles.roleHeaderRow}>
        <View style={styles.labelRow}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Your Role (RACS MALT)
          </ThemedText>
          <ThemedText style={[styles.requiredAsterisk, { color: theme.error }]}>
            *
          </ThemedText>
        </View>
        <Pressable
          style={[styles.infoButton, { backgroundColor: theme.link + "15" }]}
          onPress={() => setShowRoleInfoModal(true)}
          hitSlop={8}
        >
          <Feather name="info" size={14} color={theme.link} />
        </Pressable>
      </View>

      <PickerField
        label=""
        value={procedure.surgeonRole}
        options={[
          { value: "PS", label: "PS - Primary Surgeon" },
          { value: "PP", label: "PP - Performed with Peer" },
          { value: "AS", label: "AS - Assisting (scrubbed)" },
          { value: "ONS", label: "ONS - Observing (not scrubbed)" },
          { value: "SS", label: "SS - Supervising (scrubbed)" },
          { value: "SNS", label: "SNS - Supervising (not scrubbed)" },
          { value: "A", label: "A - Available" },
        ]}
        onSelect={handleRoleChange}
      />

      {/* Role Info Modal */}
      <Modal
        visible={showRoleInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRoleInfoModal(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.backgroundRoot },
          ]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <ThemedText style={styles.modalTitle}>
              Supervision Levels
            </ThemedText>
            <Pressable
              style={[
                styles.modalCloseButton,
                { backgroundColor: theme.backgroundDefault },
              ]}
              onPress={() => setShowRoleInfoModal(false)}
              hitSlop={8}
            >
              <Feather name="x" size={20} color={theme.text} />
            </Pressable>
          </View>
          <KeyboardAwareScrollViewCompat
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
          >
            <ThemedText
              style={[styles.modalSubtitle, { color: theme.textSecondary }]}
            >
              RACS MALT role in theatre definitions
            </ThemedText>
            {(Object.keys(ROLE_LABELS) as Role[]).map((roleKey) => (
              <View
                key={roleKey}
                style={[
                  styles.roleInfoCard,
                  { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <View style={styles.roleInfoHeader}>
                  <View
                    style={[
                      styles.roleCodeBadge,
                      { backgroundColor: theme.link + "20" },
                    ]}
                  >
                    <ThemedText
                      style={[styles.roleCode, { color: theme.link }]}
                    >
                      {roleKey}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.roleLabel}>
                    {ROLE_LABELS[roleKey]}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[
                    styles.roleDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {ROLE_DESCRIPTIONS[roleKey]}
                </ThemedText>
              </View>
            ))}
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>

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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  requiredAsterisk: {
    marginLeft: 2,
    fontSize: 14,
    fontWeight: "600",
  },
  infoButton: {
    padding: 4,
    borderRadius: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  roleInfoCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  roleInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  roleCodeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  roleCode: {
    fontSize: 12,
    fontWeight: "700",
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  roleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  tagsSection: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
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
