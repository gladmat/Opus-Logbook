import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { FormField, PickerField } from "@/components/FormField";
import { Spacing } from "@/constants/theme";
import { CollapsibleFormSection } from "@/components/case-form/CollapsibleFormSection";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  useCaseFormDispatch,
  useCaseFormField,
} from "@/contexts/CaseFormContext";
import { setField } from "@/hooks/useCaseForm";
import {
  JOINT_CASE_ABLATIVE_SURGEON_LABELS,
  JOINT_CASE_PARTNER_SPECIALTY_LABELS,
  JOINT_CASE_RECONSTRUCTION_SEQUENCE_LABELS,
  JOINT_CASE_STRUCTURE_RESECTED_LABELS,
  type JointCaseContext,
  type JointCaseDefectDimensions,
  type JointCasePartnerSpecialty,
  type JointCaseStructureResected,
} from "@/types/case";

const STRUCTURE_OPTIONS = Object.entries(
  JOINT_CASE_STRUCTURE_RESECTED_LABELS,
).map(([value, label]) => ({
  value: value as JointCaseStructureResected,
  label,
}));

/**
 * Case-level joint case context for H&N free flap cases.
 * Captures ENT/OMFS/neurosurgery collaboration details.
 * Visible when head_neck specialty + flap procedure.
 */
export const JointCaseContextSection = React.memo(
  function JointCaseContextSection() {
    const { theme } = useTheme();
    const { dispatch } = useCaseFormDispatch();
    const ctx = useCaseFormField("jointCaseContext");

    const update = (partial: Partial<JointCaseContext>) => {
      dispatch(
        setField("jointCaseContext", {
          isJointCase: true,
          ...ctx,
          ...partial,
        }),
      );
    };

    const filledCount = useMemo(() => {
      if (!ctx?.isJointCase) return 0;
      let count = 0;
      if (ctx.partnerSpecialty) count++;
      if (ctx.partnerConsultantName) count++;
      if (ctx.ablativeSurgeon) count++;
      if (ctx.reconstructionSequence) count++;
      if (ctx.ablativeProcedureDescription) count++;
      if (
        ctx.defectDimensions?.length ||
        ctx.defectDimensions?.width ||
        ctx.defectDimensions?.depth
      ) {
        count++;
      }
      if ((ctx.structuresResected?.length ?? 0) > 0) count++;
      return count;
    }, [ctx]);

    const isJoint = ctx?.isJointCase ?? false;
    const defectDimensions = ctx?.defectDimensions;

    const updateDimensions = (
      key: keyof JointCaseDefectDimensions,
      value: string,
    ) => {
      const nextDimensions: JointCaseDefectDimensions = {
        ...defectDimensions,
        [key]: value ? parseFloat(value) : undefined,
      };
      const hasValues =
        nextDimensions.length != null ||
        nextDimensions.width != null ||
        nextDimensions.depth != null;

      update({
        defectDimensions: hasValues ? nextDimensions : undefined,
      });
    };

    const toggleStructure = (value: JointCaseStructureResected) => {
      const current = ctx?.structuresResected ?? [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      update({
        structuresResected: next.length > 0 ? next : undefined,
      });
    };

    return (
      <CollapsibleFormSection
        title="Joint Case"
        subtitle="Multi-team collaboration"
        filledCount={isJoint ? filledCount : 0}
        totalCount={7}
        defaultExpanded={false}
      >
        <View style={styles.content}>
          <PickerField
            label="Joint case with another team?"
            value={isJoint ? "yes" : "no"}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
            onSelect={(v) => {
              if (v === "yes") {
                update({ isJointCase: true });
              } else {
                dispatch(setField("jointCaseContext", undefined));
              }
            }}
          />

          {isJoint ? (
            <>
              <PickerField
                label="Partner Specialty"
                value={ctx?.partnerSpecialty || ""}
                options={Object.entries(
                  JOINT_CASE_PARTNER_SPECIALTY_LABELS,
                ).map(([value, label]) => ({ value, label }))}
                onSelect={(v) =>
                  update({
                    partnerSpecialty: v as JointCasePartnerSpecialty,
                  })
                }
              />

              <FormField
                label="Partner Consultant Name"
                value={ctx?.partnerConsultantName || ""}
                onChangeText={(text) =>
                  update({ partnerConsultantName: text || undefined })
                }
                placeholder="e.g., Mr Smith"
              />

              <PickerField
                label="Ablative Surgeon"
                value={ctx?.ablativeSurgeon || ""}
                options={Object.entries(JOINT_CASE_ABLATIVE_SURGEON_LABELS).map(
                  ([value, label]) => ({ value, label }),
                )}
                onSelect={(v) =>
                  update({
                    ablativeSurgeon: v as JointCaseContext["ablativeSurgeon"],
                  })
                }
              />

              <PickerField
                label="Reconstruction Sequence"
                value={ctx?.reconstructionSequence || ""}
                options={Object.entries(
                  JOINT_CASE_RECONSTRUCTION_SEQUENCE_LABELS,
                ).map(([value, label]) => ({ value, label }))}
                onSelect={(v) =>
                  update({
                    reconstructionSequence:
                      v as JointCaseContext["reconstructionSequence"],
                  })
                }
              />

              <FormField
                label="Ablative Procedure Summary"
                value={ctx?.ablativeProcedureDescription || ""}
                onChangeText={(text) =>
                  update({
                    ablativeProcedureDescription: text || undefined,
                  })
                }
                placeholder="e.g., Segmental mandibulectomy + levels I-III neck dissection"
                multiline
              />

              <View style={styles.dimensionSection}>
                <ThemedText
                  style={[styles.sectionLabel, { color: theme.textSecondary }]}
                >
                  Defect Dimensions (mm)
                </ThemedText>
                <View style={styles.dimensionRow}>
                  <View style={styles.dimensionField}>
                    <FormField
                      label="Length"
                      value={
                        defectDimensions?.length != null
                          ? String(defectDimensions.length)
                          : ""
                      }
                      onChangeText={(text) => updateDimensions("length", text)}
                      placeholder="60"
                      keyboardType="decimal-pad"
                      unit="mm"
                    />
                  </View>
                  <View style={styles.dimensionField}>
                    <FormField
                      label="Width"
                      value={
                        defectDimensions?.width != null
                          ? String(defectDimensions.width)
                          : ""
                      }
                      onChangeText={(text) => updateDimensions("width", text)}
                      placeholder="35"
                      keyboardType="decimal-pad"
                      unit="mm"
                    />
                  </View>
                  <View style={styles.dimensionField}>
                    <FormField
                      label="Depth"
                      value={
                        defectDimensions?.depth != null
                          ? String(defectDimensions.depth)
                          : ""
                      }
                      onChangeText={(text) => updateDimensions("depth", text)}
                      placeholder="25"
                      keyboardType="decimal-pad"
                      unit="mm"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.dimensionSection}>
                <ThemedText
                  style={[styles.sectionLabel, { color: theme.textSecondary }]}
                >
                  Structures Resected
                </ThemedText>
                <View style={styles.structuresWrap}>
                  {STRUCTURE_OPTIONS.map((option) => {
                    const selected =
                      ctx?.structuresResected?.includes(option.value) ?? false;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => toggleStructure(option.value)}
                        style={[
                          styles.structureChip,
                          {
                            backgroundColor: selected
                              ? theme.link + "20"
                              : theme.backgroundDefault,
                            borderColor: selected ? theme.link : theme.border,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.structureChipText,
                            {
                              color: selected ? theme.link : theme.text,
                              fontWeight: selected ? "600" : "400",
                            },
                          ]}
                        >
                          {selected ? "\u2713 " : ""}
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          ) : null}
        </View>
      </CollapsibleFormSection>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    gap: Spacing.sm,
  },
  dimensionSection: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  dimensionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dimensionField: {
    flex: 1,
  },
  structuresWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  structureChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
  },
  structureChipText: {
    fontSize: 13,
  },
});
