/**
 * Redesigned fracture classification section for the unified Hand Trauma Assessment.
 * Replaces AOFractureCascadingForm with a faster 3-button bone region picker,
 * progressive inline expansion, and live AO code display.
 *
 * Same data output as AOFractureCascadingForm (FractureEntry), new UI.
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, Pressable, StyleSheet, LayoutAnimation } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import type { FractureEntry, DigitId } from "@/types/case";
import {
  AO_HAND_CLASSIFICATION,
  generateAOCode,
  validateAOCode,
  FINGER_NAMES,
  PHALANX_NAMES,
} from "@/data/aoHandClassification";

type BoneCategory = "carpal" | "metacarpal" | "phalanx" | "crush";

interface BoneOption {
  id: string;
  name: string;
  familyCode: string;
  subBoneId?: string;
}

const CARPAL_BONES: BoneOption[] = [
  { id: "scaphoid", name: "Scaphoid", familyCode: "72" },
  { id: "lunate", name: "Lunate", familyCode: "71" },
  { id: "capitate", name: "Capitate", familyCode: "73" },
  { id: "hamate", name: "Hamate", familyCode: "74" },
  { id: "trapezium", name: "Trapezium", familyCode: "75" },
  { id: "triquetrum", name: "Triquetrum", familyCode: "76", subBoneId: "2" },
  { id: "pisiform", name: "Pisiform", familyCode: "76", subBoneId: "1" },
  { id: "trapezoid", name: "Trapezoid", familyCode: "76", subBoneId: "3" },
];

const FINGER_OPTIONS = [
  { key: "1", label: "Thumb", digit: "I" as DigitId },
  { key: "2", label: "Index", digit: "II" as DigitId },
  { key: "3", label: "Middle", digit: "III" as DigitId },
  { key: "4", label: "Ring", digit: "IV" as DigitId },
  { key: "5", label: "Little", digit: "V" as DigitId },
];

const PHALANX_OPTIONS = [
  { key: "1", label: "Proximal" },
  { key: "2", label: "Middle" },
  { key: "3", label: "Distal" },
];

const SEGMENT_OPTIONS = [
  { key: "1", label: "Base" },
  { key: "2", label: "Shaft" },
  { key: "3", label: "Head" },
];

interface FractureSectionProps {
  fractures: FractureEntry[];
  onFracturesChange: (fractures: FractureEntry[]) => void;
  /** Pre-selected digits from the digit selector — auto-selects finger for metacarpal/phalanx */
  selectedDigits: DigitId[];
}

const DIGIT_TO_FINGER: Record<DigitId, string> = {
  I: "1",
  II: "2",
  III: "3",
  IV: "4",
  V: "5",
};

export function FractureSection({
  fractures,
  onFracturesChange,
  selectedDigits,
}: FractureSectionProps) {
  const { theme } = useTheme();

  // Cascading state for building one fracture entry
  const [boneCategory, setBoneCategory] = useState<BoneCategory | null>(null);
  const [selectedCarpal, setSelectedCarpal] = useState<BoneOption | null>(null);
  const [selectedFinger, setSelectedFinger] = useState("");
  const [selectedPhalanx, setSelectedPhalanx] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedQualifications, setSelectedQualifications] = useState<
    string[]
  >([]);
  const [openStatus, setOpenStatus] = useState<"" | "open" | "closed">("");
  const [isComminuted, setIsComminuted] = useState(false);

  // Auto-select finger if only one digit is selected
  const firstDigit = selectedDigits[0];
  const autoFinger =
    selectedDigits.length === 1 && firstDigit
      ? DIGIT_TO_FINGER[firstDigit]
      : "";
  const availableFingerOptions = useMemo(() => {
    if (selectedDigits.length === 0) return FINGER_OPTIONS;
    const allowed = new Set(
      selectedDigits.map((digit) => DIGIT_TO_FINGER[digit]),
    );
    return FINGER_OPTIONS.filter((finger) => allowed.has(finger.key));
  }, [selectedDigits]);
  const shouldSimplifyToSelectedRays = selectedDigits.length > 0;

  useEffect(() => {
    if (
      selectedFinger &&
      !availableFingerOptions.some((finger) => finger.key === selectedFinger)
    ) {
      setSelectedFinger("");
      resetFrom("finger");
    }
  }, [availableFingerOptions, selectedFinger]);

  const resetFrom = (field: string) => {
    if (field === "category") {
      setSelectedCarpal(null);
      setSelectedFinger("");
      setSelectedPhalanx("");
      setSelectedSegment("");
      setSelectedType("");
      setSelectedQualifications([]);
      setOpenStatus("");
      setIsComminuted(false);
    } else if (field === "bone" || field === "finger") {
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
    }
  };

  const handleCategorySelect = (cat: BoneCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setBoneCategory(cat);
    resetFrom("category");

    // Auto-select finger for single digit
    if ((cat === "metacarpal" || cat === "phalanx") && autoFinger) {
      setSelectedFinger(autoFinger);
    }

    // Crush is instant
    if (cat === "crush") {
      const entry: FractureEntry = {
        id: uuidv4(),
        boneId: "crush",
        boneName: "Crushed / Multiple fractures",
        aoCode: "79",
        details: { familyCode: "79" },
      };
      onFracturesChange([...fractures, entry]);
      setBoneCategory(null);
    }
  };

  const effectiveFinger = selectedFinger || autoFinger;

  const showFingerSelector =
    (boneCategory === "metacarpal" || boneCategory === "phalanx") &&
    !autoFinger &&
    availableFingerOptions.length > 1;
  const showPhalanxSelector =
    boneCategory === "phalanx" && effectiveFinger !== "";
  const showSegmentSelector =
    (boneCategory === "metacarpal" && effectiveFinger !== "") ||
    (boneCategory === "phalanx" && selectedPhalanx !== "");
  const showTypeSelector =
    selectedCarpal !== null || (showSegmentSelector && selectedSegment !== "");

  const needsQualifications =
    selectedCarpal?.familyCode === "72" &&
    (selectedType === "B" || selectedType === "C");

  const currentAOCode = useMemo(() => {
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
    if (boneCategory === "metacarpal" && effectiveFinger && selectedSegment) {
      return generateAOCode({
        familyCode: "77",
        finger: effectiveFinger,
        segment: selectedSegment,
        type: selectedType,
      });
    }
    if (
      boneCategory === "phalanx" &&
      effectiveFinger &&
      selectedPhalanx &&
      selectedSegment
    ) {
      return generateAOCode({
        familyCode: "78",
        finger: effectiveFinger,
        phalanx: selectedPhalanx,
        segment: selectedSegment,
        type: selectedType,
      });
    }
    return "";
  }, [
    boneCategory,
    selectedCarpal,
    effectiveFinger,
    selectedPhalanx,
    selectedSegment,
    selectedType,
    selectedQualifications,
  ]);

  // Progressive code building display
  const progressiveCode = useMemo(() => {
    if (!boneCategory || boneCategory === "crush") return "";
    if (boneCategory === "carpal" && selectedCarpal) {
      let code = selectedCarpal.familyCode;
      if (selectedCarpal.subBoneId) code += `.${selectedCarpal.subBoneId}`;
      if (selectedType) code += selectedType;
      return code;
    }
    if (boneCategory === "metacarpal") {
      let code = "77";
      if (effectiveFinger) code += `.${effectiveFinger}`;
      if (selectedSegment) code += `.${selectedSegment}`;
      if (selectedType) code += selectedType;
      return code;
    }
    if (boneCategory === "phalanx") {
      let code = "78";
      if (effectiveFinger) code += `.${effectiveFinger}`;
      if (selectedPhalanx) code += `.${selectedPhalanx}`;
      if (selectedSegment) code += `.${selectedSegment}`;
      if (selectedType) code += selectedType;
      return code;
    }
    return "";
  }, [
    boneCategory,
    selectedCarpal,
    effectiveFinger,
    selectedPhalanx,
    selectedSegment,
    selectedType,
  ]);

  const canSubmit = currentAOCode !== "" && validateAOCode(currentAOCode).valid;

  const getBoneName = (): string => {
    if (boneCategory === "carpal" && selectedCarpal) return selectedCarpal.name;
    if (boneCategory === "metacarpal" && effectiveFinger) {
      return `${FINGER_NAMES[effectiveFinger]} Metacarpal`;
    }
    if (boneCategory === "phalanx" && effectiveFinger && selectedPhalanx) {
      return `${FINGER_NAMES[effectiveFinger]} ${PHALANX_NAMES[selectedPhalanx]} Phalanx`;
    }
    return "";
  };

  const handleAddFracture = () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const boneName = getBoneName();
    const boneId =
      boneCategory === "carpal"
        ? selectedCarpal?.id || ""
        : boneCategory === "metacarpal"
          ? `mc${effectiveFinger}`
          : `${selectedPhalanx === "1" ? "pp" : selectedPhalanx === "2" ? "mp" : "dp"}${effectiveFinger}`;

    const entry: FractureEntry = {
      id: uuidv4(),
      boneId,
      boneName,
      aoCode: currentAOCode,
      details: {
        familyCode:
          boneCategory === "carpal"
            ? selectedCarpal?.familyCode || ""
            : boneCategory === "metacarpal"
              ? "77"
              : "78",
        type: selectedType || undefined,
        subBoneId: selectedCarpal?.subBoneId,
        finger: effectiveFinger || undefined,
        phalanx: selectedPhalanx || undefined,
        segment: selectedSegment || undefined,
        openStatus: openStatus || undefined,
        isComminuted: isComminuted || undefined,
        qualifications:
          selectedQualifications.length > 0
            ? selectedQualifications
            : undefined,
      },
    };

    onFracturesChange([...fractures, entry]);

    // Reset for another fracture
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setBoneCategory(null);
    resetFrom("category");
  };

  const removeFracture = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFracturesChange(fractures.filter((f) => f.id !== id));
  };

  const getTypeOptions = useCallback(() => {
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
  }, [boneCategory, selectedCarpal, selectedSegment]);

  return (
    <View style={styles.container}>
      {/* Existing fracture entries */}
      {fractures.length > 0 ? (
        <View style={styles.existingEntries}>
          {fractures.map((f) => (
            <View
              key={f.id}
              style={[
                styles.fractureChip,
                {
                  backgroundColor: theme.link + "15",
                  borderColor: theme.link + "30",
                },
              ]}
            >
              <View style={styles.fractureChipContent}>
                <ThemedText
                  style={[
                    styles.fractureCode,
                    { color: theme.link, fontFamily: Fonts?.mono },
                  ]}
                >
                  {f.aoCode}
                </ThemedText>
                <ThemedText
                  style={[styles.fractureName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {f.boneName}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => removeFracture(f.id)}
                hitSlop={8}
                style={styles.removeButton}
              >
                <Feather name="x" size={16} color={theme.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/* Live AO code display */}
      {progressiveCode ? (
        <View
          style={[
            styles.codeDisplay,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText
            style={[styles.codeLabel, { color: theme.textSecondary }]}
          >
            AO Code
          </ThemedText>
          <ThemedText
            style={[
              styles.codeValue,
              { color: theme.link, fontFamily: Fonts?.mono },
            ]}
          >
            {progressiveCode}
          </ThemedText>
          {canSubmit ? (
            <Feather
              name="check-circle"
              size={16}
              color={theme.success}
              style={{ marginLeft: Spacing.xs }}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.subSection}>
        <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
          Fracture Qualifiers
        </ThemedText>
        <View style={styles.pillRow}>
          {(
            [
              { key: "", label: "Unspecified" },
              { key: "open", label: "Open" },
              { key: "closed", label: "Closed" },
            ] as const
          ).map(({ key, label }) => {
            const isSelected = openStatus === key;
            return (
              <Pressable
                key={key || "unspecified"}
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
                  setOpenStatus((prev) => (prev === key ? "" : key))
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
          <Pressable
            style={[
              styles.pill,
              {
                backgroundColor: isComminuted
                  ? theme.link + "15"
                  : theme.backgroundTertiary,
                borderColor: isComminuted ? theme.link : theme.border,
              },
            ]}
            onPress={() => setIsComminuted((prev) => !prev)}
          >
            <ThemedText
              style={[
                styles.pillText,
                { color: isComminuted ? theme.link : theme.text },
              ]}
            >
              Comminuted
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Add-next prompt — visible between existing fractures and region buttons */}
      {fractures.length > 0 && boneCategory === null ? (
        <View
          style={[
            styles.addNextPrompt,
            { borderColor: theme.textTertiary + "50" },
          ]}
        >
          <Feather name="plus-circle" size={16} color={theme.textTertiary} />
          <ThemedText
            style={[styles.addNextText, { color: theme.textTertiary }]}
          >
            Tap a bone region below to add another fracture
          </ThemedText>
        </View>
      ) : null}

      {/* Bone region picker — 3 large buttons */}
      {boneCategory === null ? (
        <View style={styles.regionPicker}>
          {[
            { key: "carpal", label: "Carpal", sub: "71-76" },
            { key: "metacarpal", label: "Metacarpal", sub: "77" },
            { key: "phalanx", label: "Phalanx", sub: "78" },
          ].map(({ key, label, sub }) => (
            <Pressable
              key={key}
              style={[
                styles.regionButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => handleCategorySelect(key as BoneCategory)}
            >
              <Feather name="hexagon" size={20} color={theme.link} />
              <ThemedText style={[styles.regionLabel, { color: theme.text }]}>
                {label}
              </ThemedText>
              <ThemedText
                style={[
                  styles.regionSub,
                  { color: theme.textTertiary, fontFamily: Fonts?.mono },
                ]}
              >
                {sub}
              </ThemedText>
            </Pressable>
          ))}
          <Pressable
            style={styles.crushLink}
            onPress={() => handleCategorySelect("crush")}
          >
            <ThemedText style={[styles.crushLinkText, { color: theme.link }]}>
              Crush / Multiple
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {/* Carpal bone grid */}
      {boneCategory === "carpal" ? (
        <View style={styles.subSection}>
          <View style={styles.subSectionHeader}>
            <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
              Carpal Bone
            </ThemedText>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                setBoneCategory(null);
                resetFrom("category");
              }}
            >
              <ThemedText style={{ color: theme.link, fontSize: 14 }}>
                Change
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.carpalGrid}>
            {CARPAL_BONES.map((bone) => (
              <Pressable
                key={bone.id}
                style={[
                  styles.carpalButton,
                  {
                    backgroundColor:
                      selectedCarpal?.id === bone.id
                        ? theme.link
                        : theme.backgroundTertiary,
                    borderColor:
                      selectedCarpal?.id === bone.id
                        ? theme.link
                        : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setSelectedCarpal(bone);
                  resetFrom("bone");
                }}
              >
                <ThemedText
                  style={[
                    styles.carpalButtonText,
                    {
                      color:
                        selectedCarpal?.id === bone.id
                          ? theme.buttonText
                          : theme.text,
                    },
                  ]}
                >
                  {bone.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Finger selector for MC/phalanx */}
      {showFingerSelector ? (
        <View style={styles.subSection}>
          <View style={styles.subSectionHeader}>
            <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
              {boneCategory === "metacarpal" ? "Metacarpal" : "Phalanx"} —
              {shouldSimplifyToSelectedRays ? "Selected ray" : "Finger"}
            </ThemedText>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                setBoneCategory(null);
                resetFrom("category");
              }}
            >
              <ThemedText style={{ color: theme.link, fontSize: 14 }}>
                Change
              </ThemedText>
            </Pressable>
          </View>
          {renderPills(
            availableFingerOptions.map((f) => ({ key: f.key, label: f.label })),
            selectedFinger,
            (key) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setSelectedFinger(key);
              resetFrom("finger");
            },
            theme,
          )}
        </View>
      ) : null}

      {/* Auto-selected finger indicator */}
      {(boneCategory === "metacarpal" || boneCategory === "phalanx") &&
      autoFinger &&
      !showFingerSelector ? (
        <View style={styles.subSection}>
          <View style={styles.subSectionHeader}>
            <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
              {boneCategory === "metacarpal" ? "Metacarpal" : "Phalanx"} —{" "}
              {FINGER_NAMES[autoFinger]}
            </ThemedText>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                setBoneCategory(null);
                resetFrom("category");
              }}
            >
              <ThemedText style={{ color: theme.link, fontSize: 14 }}>
                Change
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Phalanx selector */}
      {showPhalanxSelector ? (
        <View style={styles.subSection}>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            Phalanx
          </ThemedText>
          {effectiveFinger === "1" ? (
            <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
              Thumb has no middle phalanx
            </ThemedText>
          ) : null}
          {renderPills(
            effectiveFinger === "1"
              ? PHALANX_OPTIONS.filter((p) => p.key !== "2")
              : PHALANX_OPTIONS,
            selectedPhalanx,
            (key) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setSelectedPhalanx(key);
              resetFrom("phalanx");
            },
            theme,
          )}
        </View>
      ) : null}

      {/* Segment selector */}
      {showSegmentSelector ? (
        <View style={styles.subSection}>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            Fracture Location
          </ThemedText>
          {renderPills(
            SEGMENT_OPTIONS,
            selectedSegment,
            (key) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setSelectedSegment(key);
              resetFrom("segment");
            },
            theme,
          )}
        </View>
      ) : null}

      {/* Type selector */}
      {showTypeSelector ? (
        <View style={styles.subSection}>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            Fracture Type
          </ThemedText>
          {renderPills(
            getTypeOptions(),
            selectedType,
            (key) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setSelectedType(key);
            },
            theme,
          )}
        </View>
      ) : null}

      {/* Scaphoid qualifications */}
      {needsQualifications ? (
        <View style={styles.subSection}>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            Scaphoid Location
          </ThemedText>
          <View style={styles.pillRow}>
            {[
              { key: "a", label: "Proximal pole" },
              { key: "b", label: "Waist" },
              { key: "c", label: "Distal pole" },
            ].map((opt) => {
              const isSelected = selectedQualifications.includes(opt.key);
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected
                        ? theme.link
                        : theme.backgroundTertiary,
                      borderColor: isSelected ? theme.link : theme.border,
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
                  <ThemedText
                    style={[
                      styles.pillText,
                      {
                        color: isSelected ? theme.buttonText : theme.text,
                      },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Add fracture button */}
      {canSubmit ? (
        <Pressable
          style={[styles.addButton, { backgroundColor: theme.link }]}
          onPress={handleAddFracture}
        >
          <Feather name="plus" size={18} color={theme.buttonText} />
          <ThemedText
            style={[styles.addButtonText, { color: theme.buttonText }]}
          >
            Add Fracture
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function renderPills(
  options: { key: string; label: string }[],
  selected: string,
  onSelect: (key: string) => void,
  theme: any,
) {
  return (
    <View style={styles.pillRow}>
      {options.map((opt) => {
        const isSelected = selected === opt.key;
        return (
          <Pressable
            key={opt.key}
            style={[
              styles.pill,
              {
                backgroundColor: isSelected
                  ? theme.link
                  : theme.backgroundTertiary,
                borderColor: isSelected ? theme.link : theme.border,
              },
            ]}
            onPress={() => onSelect(opt.key)}
          >
            <ThemedText
              style={[
                styles.pillText,
                { color: isSelected ? theme.buttonText : theme.text },
              ]}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  existingEntries: {
    gap: Spacing.sm,
  },
  fractureChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  fractureChipContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  fractureCode: {
    fontSize: 15,
    fontWeight: "700",
  },
  fractureName: {
    fontSize: 14,
    flex: 1,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  codeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  codeLabel: {
    fontSize: 13,
    marginRight: Spacing.sm,
  },
  codeValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  regionPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  regionButton: {
    flex: 1,
    minWidth: "30%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  regionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  regionSub: {
    fontSize: 12,
  },
  crushLink: {
    width: "100%",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  crushLinkText: {
    fontSize: 14,
    fontWeight: "500",
  },
  subSection: {
    gap: Spacing.sm,
  },
  subSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
  },
  carpalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  carpalButton: {
    width: "48%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  carpalButtonText: {
    fontSize: 14,
    fontWeight: "500",
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
  addNextPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addNextText: {
    fontSize: 13,
    fontWeight: "500",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
