import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  AO_HAND_CLASSIFICATION,
  generateAOCode,
  validateAOCode,
  FINGER_NAMES,
  PHALANX_NAMES,
  SEGMENT_NAMES,
  getFractureTypeLabel,
} from "@/data/aoHandClassification";

type BoneCategory = "carpal" | "metacarpal" | "phalanx" | "crush" | null;

interface BoneOption {
  id: string;
  name: string;
  familyCode: string;
  subBoneId?: string;
}

const CARPAL_BONES: BoneOption[] = [
  { id: "lunate", name: "Lunate", familyCode: "71" },
  { id: "scaphoid", name: "Scaphoid", familyCode: "72" },
  { id: "capitate", name: "Capitate", familyCode: "73" },
  { id: "hamate", name: "Hamate", familyCode: "74" },
  { id: "trapezium", name: "Trapezium", familyCode: "75" },
  { id: "pisiform", name: "Pisiform", familyCode: "76", subBoneId: "1" },
  { id: "triquetrum", name: "Triquetrum", familyCode: "76", subBoneId: "2" },
  { id: "trapezoid", name: "Trapezoid", familyCode: "76", subBoneId: "3" },
];

const FINGER_OPTIONS = [
  { key: "1", label: "Thumb" },
  { key: "2", label: "Index" },
  { key: "3", label: "Middle" },
  { key: "4", label: "Ring" },
  { key: "5", label: "Little" },
];

const PHALANX_OPTIONS = [
  { key: "1", label: "Proximal" },
  { key: "2", label: "Middle" },
  { key: "3", label: "Distal" },
];

const SEGMENT_OPTIONS = [
  { key: "1", label: "Base (proximal)" },
  { key: "2", label: "Shaft (diaphysis)" },
  { key: "3", label: "Head (distal)" },
];

interface AOFractureCascadingFormProps {
  onComplete: (data: {
    boneId: string;
    boneName: string;
    aoCode: string;
    details: {
      familyCode: string;
      type?: string;
      subBoneId?: string;
      finger?: string;
      phalanx?: string;
      segment?: string;
      qualifications?: string[];
    };
  }) => void;
  onCancel: () => void;
}

export function AOFractureCascadingForm({
  onComplete,
  onCancel,
}: AOFractureCascadingFormProps) {
  const { theme } = useTheme();

  const [boneCategory, setBoneCategory] = useState<BoneCategory>(null);
  const [selectedCarpal, setSelectedCarpal] = useState<BoneOption | null>(null);
  const [selectedFinger, setSelectedFinger] = useState<string>("");
  const [selectedPhalanx, setSelectedPhalanx] = useState<string>("");
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedQualifications, setSelectedQualifications] = useState<
    string[]
  >([]);

  const resetFrom = (field: string) => {
    if (field === "category") {
      setSelectedCarpal(null);
      setSelectedFinger("");
      setSelectedPhalanx("");
      setSelectedSegment("");
      setSelectedType("");
      setSelectedQualifications([]);
    } else if (field === "bone") {
      setSelectedSegment("");
      setSelectedType("");
      setSelectedQualifications([]);
    } else if (field === "finger") {
      setSelectedPhalanx("");
      setSelectedSegment("");
      setSelectedType("");
      setSelectedQualifications([]);
    } else if (field === "phalanx") {
      setSelectedSegment("");
      setSelectedType("");
      setSelectedQualifications([]);
    } else if (field === "segment") {
      setSelectedType("");
      setSelectedQualifications([]);
    } else if (field === "type") {
      setSelectedQualifications([]);
    }
  };

  const handleCategorySelect = (category: BoneCategory) => {
    setBoneCategory(category);
    resetFrom("category");
  };

  const showCarpalSelector = boneCategory === "carpal";
  const showFingerSelector =
    boneCategory === "metacarpal" || boneCategory === "phalanx";
  const showPhalanxSelector =
    boneCategory === "phalanx" && selectedFinger !== "";
  const showSegmentSelector =
    (boneCategory === "metacarpal" && selectedFinger !== "") ||
    (boneCategory === "phalanx" && selectedPhalanx !== "");
  const showTypeSelector =
    selectedCarpal !== null || (showSegmentSelector && selectedSegment !== "");

  const needsQualifications =
    selectedCarpal?.familyCode === "72" &&
    (selectedType === "B" || selectedType === "C");

  const currentAOCode = useMemo(() => {
    if (boneCategory === "crush") return "79";
    if (!selectedType) return "";

    if (boneCategory === "carpal" && selectedCarpal) {
      return generateAOCode({
        familyCode: selectedCarpal.familyCode,
        type: selectedType,
        subBoneId: selectedCarpal.subBoneId,
        qualifications:
          selectedQualifications.length > 0
            ? selectedQualifications
            : undefined,
      });
    }

    if (boneCategory === "metacarpal" && selectedFinger && selectedSegment) {
      return generateAOCode({
        familyCode: "77",
        finger: selectedFinger,
        segment: selectedSegment,
        type: selectedType,
      });
    }

    if (
      boneCategory === "phalanx" &&
      selectedFinger &&
      selectedPhalanx &&
      selectedSegment
    ) {
      return generateAOCode({
        familyCode: "78",
        finger: selectedFinger,
        phalanx: selectedPhalanx,
        segment: selectedSegment,
        type: selectedType,
      });
    }

    return "";
  }, [
    boneCategory,
    selectedCarpal,
    selectedFinger,
    selectedPhalanx,
    selectedSegment,
    selectedType,
    selectedQualifications,
  ]);

  const isComplete =
    boneCategory === "crush" ||
    (currentAOCode !== "" &&
      validateAOCode(currentAOCode).valid &&
      (!needsQualifications ||
        selectedQualifications.length > 0 ||
        !["B", "C"].includes(selectedType)));

  const canSubmit =
    boneCategory === "crush" ||
    (currentAOCode !== "" && validateAOCode(currentAOCode).valid);

  const _ = isComplete;

  const getBoneName = (): string => {
    if (boneCategory === "crush") return "Crushed / Multiple fractures";
    if (boneCategory === "carpal" && selectedCarpal) return selectedCarpal.name;
    if (boneCategory === "metacarpal" && selectedFinger) {
      return `${FINGER_NAMES[selectedFinger]} Metacarpal`;
    }
    if (boneCategory === "phalanx" && selectedFinger && selectedPhalanx) {
      return `${FINGER_NAMES[selectedFinger]} ${PHALANX_NAMES[selectedPhalanx]} Phalanx`;
    }
    return "";
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    const boneName = getBoneName();
    const boneId =
      boneCategory === "crush"
        ? "crush"
        : boneCategory === "carpal"
          ? selectedCarpal?.id || ""
          : boneCategory === "metacarpal"
            ? `mc${selectedFinger}`
            : `${selectedPhalanx === "1" ? "pp" : selectedPhalanx === "2" ? "mp" : "dp"}${selectedFinger}`;

    onComplete({
      boneId,
      boneName,
      aoCode: currentAOCode || "79",
      details: {
        familyCode:
          boneCategory === "crush"
            ? "79"
            : boneCategory === "carpal"
              ? selectedCarpal?.familyCode || ""
              : boneCategory === "metacarpal"
                ? "77"
                : "78",
        type: selectedType || undefined,
        subBoneId: selectedCarpal?.subBoneId,
        finger: selectedFinger || undefined,
        phalanx: selectedPhalanx || undefined,
        segment: selectedSegment || undefined,
        qualifications:
          selectedQualifications.length > 0
            ? selectedQualifications
            : undefined,
      },
    });
  };

  const getTypeOptions = () => {
    if (boneCategory === "carpal" && selectedCarpal) {
      const boneConfig = AO_HAND_CLASSIFICATION.bones.find(
        (b) => b.familyCode === selectedCarpal.familyCode,
      );
      if (!boneConfig) return [];

      if (boneConfig.kind === "carpal_single") {
        return Object.entries(boneConfig.types).map(([key, val]) => ({
          key,
          label: val.label,
        }));
      }

      if (
        boneConfig.kind === "carpal_other_with_subbone" &&
        selectedCarpal.subBoneId
      ) {
        const subBone = boneConfig.subBones[selectedCarpal.subBoneId];
        if (subBone) {
          return Object.entries(subBone.typeLabels).map(([key, label]) => ({
            key,
            label: label as string,
          }));
        }
      }
    }

    if (
      (boneCategory === "metacarpal" || boneCategory === "phalanx") &&
      selectedSegment
    ) {
      const familyCode = boneCategory === "metacarpal" ? "77" : "78";
      const boneConfig = AO_HAND_CLASSIFICATION.bones.find(
        (b) => b.familyCode === familyCode,
      );
      if (
        boneConfig &&
        (boneConfig.kind === "metacarpal_long_bone" ||
          boneConfig.kind === "phalanx_long_bone")
      ) {
        const typeRules = boneConfig.typeRulesBySegment[selectedSegment];
        if (!typeRules) return [];
        return Object.entries(typeRules).map(([key, label]) => ({
          key,
          label: label as string,
        }));
      }
    }

    return [];
  };

  const renderFieldRow = (
    label: string,
    value: string,
    onClear?: () => void,
  ) => (
    <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <View style={styles.fieldValue}>
        <ThemedText style={[styles.fieldValueText, { color: theme.text }]}>
          {value}
        </ThemedText>
        {onClear ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Feather name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const renderOptions = <T extends string | null>(
    options: { key: NonNullable<T>; label: string }[],
    selected: T,
    onSelect: (key: NonNullable<T>) => void,
    columns: number = 2,
  ) => (
    <View style={[styles.optionsGrid, { gap: Spacing.sm }]}>
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          style={[
            styles.optionButton,
            {
              width: columns === 2 ? "48%" : columns === 3 ? "31%" : "100%",
              backgroundColor:
                selected === opt.key ? theme.link : theme.backgroundTertiary,
              borderColor: selected === opt.key ? theme.link : theme.border,
            },
          ]}
          onPress={() => onSelect(opt.key)}
        >
          <ThemedText
            style={[
              styles.optionText,
              { color: selected === opt.key ? "#FFF" : theme.text },
            ]}
          >
            {opt.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.codePreview,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <ThemedText style={[styles.codeLabel, { color: theme.textSecondary }]}>
          AO Code
        </ThemedText>
        <ThemedText style={[styles.codeValue, { color: theme.link }]}>
          {currentAOCode || "—"}
        </ThemedText>
        {currentAOCode && validateAOCode(currentAOCode).valid ? (
          <Feather
            name="check-circle"
            size={18}
            color={theme.success}
            style={styles.codeCheck}
          />
        ) : null}
      </View>

      <View
        style={[styles.section, { backgroundColor: theme.backgroundSecondary }]}
      >
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Bone Category
        </ThemedText>
        <View style={[styles.optionsGrid, { gap: Spacing.sm }]}>
          {[
            { key: "carpal", label: "Carpal (71-76)" },
            { key: "metacarpal", label: "Metacarpal (77)" },
            { key: "phalanx", label: "Phalanx (78)" },
            { key: "crush", label: "Crush/Multiple (79)" },
          ].map((opt) => (
            <Pressable
              key={opt.key}
              style={[
                styles.optionButton,
                {
                  width: "48%",
                  backgroundColor:
                    boneCategory === opt.key
                      ? theme.link
                      : theme.backgroundTertiary,
                  borderColor:
                    boneCategory === opt.key ? theme.link : theme.border,
                },
              ]}
              onPress={() => handleCategorySelect(opt.key as BoneCategory)}
            >
              <ThemedText
                style={[
                  styles.optionText,
                  { color: boneCategory === opt.key ? "#FFF" : theme.text },
                ]}
              >
                {opt.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {showCarpalSelector ? (
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Select Carpal Bone
          </ThemedText>
          {renderOptions(
            CARPAL_BONES.map((b) => ({ key: b.id, label: b.name })),
            selectedCarpal?.id ?? "",
            (id) => {
              const bone = CARPAL_BONES.find((b) => b.id === id);
              setSelectedCarpal(bone || null);
              resetFrom("bone");
            },
            2,
          )}
        </View>
      ) : null}

      {showFingerSelector ? (
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Select Finger
          </ThemedText>
          {renderOptions(
            FINGER_OPTIONS,
            selectedFinger,
            (finger) => {
              setSelectedFinger(finger);
              resetFrom("finger");
            },
            3,
          )}
        </View>
      ) : null}

      {showPhalanxSelector ? (
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Select Phalanx
          </ThemedText>
          <ThemedText
            style={[styles.sectionHint, { color: theme.textSecondary }]}
          >
            {selectedFinger === "1" ? "Thumb has no middle phalanx" : ""}
          </ThemedText>
          {renderOptions(
            selectedFinger === "1"
              ? PHALANX_OPTIONS.filter((p) => p.key !== "2")
              : PHALANX_OPTIONS,
            selectedPhalanx,
            (phalanx) => {
              setSelectedPhalanx(phalanx);
              resetFrom("phalanx");
            },
            3,
          )}
        </View>
      ) : null}

      {showSegmentSelector ? (
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Fracture Location
          </ThemedText>
          {renderOptions(
            SEGMENT_OPTIONS,
            selectedSegment,
            (segment) => {
              setSelectedSegment(segment);
              resetFrom("segment");
            },
            1,
          )}
        </View>
      ) : null}

      {showTypeSelector ? (
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Fracture Type
          </ThemedText>
          {renderOptions(
            getTypeOptions(),
            selectedType,
            (type) => {
              setSelectedType(type);
              resetFrom("type");
            },
            1,
          )}
        </View>
      ) : null}

      {needsQualifications ? (
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Scaphoid Location
          </ThemedText>
          <ThemedText
            style={[styles.sectionHint, { color: theme.textSecondary }]}
          >
            Optional - select one or more
          </ThemedText>
          <View style={[styles.optionsGrid, { gap: Spacing.sm }]}>
            {[
              { key: "a", label: "Proximal pole" },
              { key: "b", label: "Waist" },
              { key: "c", label: "Distal pole" },
            ].map((opt) => (
              <Pressable
                key={opt.key}
                style={[
                  styles.optionButton,
                  styles.checkOption,
                  {
                    backgroundColor: selectedQualifications.includes(opt.key)
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: selectedQualifications.includes(opt.key)
                      ? theme.link
                      : theme.border,
                  },
                ]}
                onPress={() => {
                  setSelectedQualifications((prev) =>
                    prev.includes(opt.key)
                      ? prev.filter((q) => q !== opt.key)
                      : [...prev, opt.key],
                  );
                }}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: selectedQualifications.includes(opt.key)
                        ? "#FFF"
                        : theme.border,
                    },
                  ]}
                >
                  {selectedQualifications.includes(opt.key) ? (
                    <Feather name="check" size={12} color="#FFF" />
                  ) : null}
                </View>
                <ThemedText
                  style={[
                    styles.optionText,
                    {
                      color: selectedQualifications.includes(opt.key)
                        ? "#FFF"
                        : theme.text,
                    },
                  ]}
                >
                  ({opt.key}) {opt.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {boneCategory === "crush" || canSubmit ? (
        <View
          style={[
            styles.summarySection,
            { backgroundColor: theme.backgroundElevated },
          ]}
        >
          <ThemedText style={[styles.summaryTitle, { color: theme.text }]}>
            Summary
          </ThemedText>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <ThemedText
                style={[styles.summaryLabel, { color: theme.textSecondary }]}
              >
                Bone:
              </ThemedText>
              <ThemedText style={[styles.summaryValue, { color: theme.text }]}>
                {getBoneName()}
              </ThemedText>
            </View>
            {selectedSegment ? (
              <View style={styles.summaryRow}>
                <ThemedText
                  style={[styles.summaryLabel, { color: theme.textSecondary }]}
                >
                  Location:
                </ThemedText>
                <ThemedText
                  style={[styles.summaryValue, { color: theme.text }]}
                >
                  {SEGMENT_NAMES[selectedSegment]}
                </ThemedText>
              </View>
            ) : null}
            {selectedType ? (
              <View style={styles.summaryRow}>
                <ThemedText
                  style={[styles.summaryLabel, { color: theme.textSecondary }]}
                >
                  Type:
                </ThemedText>
                <ThemedText
                  style={[styles.summaryValue, { color: theme.text }]}
                >
                  {selectedSegment
                    ? getFractureTypeLabel(selectedSegment, selectedType)
                    : getTypeOptions().find((t) => t.key === selectedType)
                        ?.label || `Type ${selectedType}`}
                </ThemedText>
              </View>
            ) : null}
            {selectedQualifications.length > 0 ? (
              <View style={styles.summaryRow}>
                <ThemedText
                  style={[styles.summaryLabel, { color: theme.textSecondary }]}
                >
                  Qualification:
                </ThemedText>
                <ThemedText
                  style={[styles.summaryValue, { color: theme.text }]}
                >
                  {selectedQualifications
                    .map((q) =>
                      q === "a"
                        ? "Proximal pole"
                        : q === "b"
                          ? "Waist"
                          : "Distal pole",
                    )
                    .join(", ")}
                </ThemedText>
              </View>
            ) : null}
            <View
              style={[styles.aoCodeDisplay, { backgroundColor: theme.link }]}
            >
              <ThemedText style={styles.aoCodeDisplayText}>
                {currentAOCode || "79"}
              </ThemedText>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.cancelButton, { borderColor: theme.border }]}
          onPress={onCancel}
        >
          <ThemedText
            style={[styles.cancelButtonText, { color: theme.textSecondary }]}
          >
            Cancel
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.submitButton,
            {
              backgroundColor: canSubmit
                ? theme.link
                : theme.backgroundTertiary,
              opacity: canSubmit ? 1 : 0.5,
            },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Feather
            name="plus"
            size={18}
            color={canSubmit ? "#FFF" : theme.textSecondary}
          />
          <ThemedText
            style={[
              styles.submitButtonText,
              { color: canSubmit ? "#FFF" : theme.textSecondary },
            ]}
          >
            Add Fracture
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  codePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  codeLabel: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  codeValue: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  codeCheck: {
    marginLeft: Spacing.sm,
  },
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  sectionHint: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  optionButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOption: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "flex-start",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  fieldLabel: {
    fontSize: 14,
  },
  fieldValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  fieldValueText: {
    fontSize: 14,
    fontWeight: "500",
  },
  summarySection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  summaryContent: {
    gap: Spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    minWidth: 80,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  aoCodeDisplay: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  aoCodeDisplayText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
