import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { palette, Colors } from "@/constants/theme";
import { copy } from "@/constants/onboardingCopy";

const dark = Colors.dark;

// ── Training programme options ──────────────────────────────────────────────

export interface TrainingOption {
  id: string;
  name: string;
  detail?: string;
}

export const TRAINING_OPTIONS: TrainingOption[] = [
  {
    id: "iscp",
    name: "ISCP",
    detail: "Intercollegiate Surgical Curriculum Programme (UK/Ireland)",
  },
  {
    id: "febopras",
    name: "FEBOPRAS",
    detail:
      "European Board of Plastic, Reconstructive and Aesthetic Surgery",
  },
  {
    id: "acgme",
    name: "ACGME",
    detail: "Accreditation Council for Graduate Medical Education (USA)",
  },
  {
    id: "racs",
    name: "RACS",
    detail: "Royal Australasian College of Surgeons (ANZ)",
  },
  { id: "other", name: "Other" },
  { id: "none", name: "Not currently in training" },
];

const SIDE_PADDING = 24;

// ── Radio Indicator ─────────────────────────────────────────────────────────

function RadioIndicator({ selected }: { selected: boolean }) {
  const progress = useSharedValue(selected ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
  }, [selected]);

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
    opacity: progress.value,
  }));

  return (
    <View
      style={[
        styles.radioOuter,
        selected && styles.radioOuterSelected,
      ]}
    >
      <Animated.View style={[styles.radioInner, innerStyle]} />
    </View>
  );
}

// ── Training Screen ─────────────────────────────────────────────────────────

interface Props {
  onComplete: (trainingProgramme: string | null) => void;
}

export function TrainingScreen({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");

  const isNoneSelected = selectedId === "none";
  const canContinue =
    selectedId !== null &&
    (selectedId !== "other" || otherText.trim().length > 0);

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleContinue = () => {
    if (selectedId === "none") {
      onComplete(null);
    } else if (selectedId === "other") {
      onComplete(otherText.trim());
    } else {
      onComplete(selectedId);
    }
  };

  const handleSkip = () => {
    onComplete(null);
  };

  const c = copy.training;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 20 }]}>
      {/* Step indicator */}
      <View style={styles.stepArea}>
        <StepIndicator currentStep={2} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Headline */}
        <Text style={styles.headline}>{c.headline}</Text>

        {/* Subhead */}
        <Text style={styles.subhead}>{c.subhead}</Text>

        {/* Options list */}
        <View style={styles.list}>
          {TRAINING_OPTIONS.map((option, index) => (
            <React.Fragment key={option.id}>
              <Pressable
                style={styles.row}
                onPress={() => handleSelect(option.id)}
                accessibilityLabel={
                  option.detail
                    ? `${option.name}, ${option.detail}`
                    : option.name
                }
                accessibilityRole="radio"
                accessibilityState={{
                  checked: selectedId === option.id,
                }}
              >
                <View style={styles.rowContent}>
                  <Text
                    style={[
                      styles.optionName,
                      selectedId === option.id && styles.optionNameSelected,
                    ]}
                  >
                    {option.name}
                  </Text>
                  {option.detail && (
                    <Text style={styles.optionDetail} numberOfLines={2}>
                      {option.detail}
                    </Text>
                  )}
                </View>
                <RadioIndicator selected={selectedId === option.id} />
              </Pressable>

              {/* "Other" inline text field */}
              {option.id === "other" && selectedId === "other" && (
                <View style={styles.otherInputContainer}>
                  <TextInput
                    style={styles.otherInput}
                    placeholder="Programme name"
                    placeholderTextColor="#636366"
                    value={otherText}
                    onChangeText={setOtherText}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </View>
              )}

              {/* Separator */}
              {index < TRAINING_OPTIONS.length - 1 && (
                <View style={styles.separator} />
              )}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomArea}>
        {/* Continue / Skip button */}
        <Pressable
          style={[styles.ctaButton, !canContinue && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.ctaText}>
            {isNoneSelected ? "Skip" : c.cta}
          </Text>
        </Pressable>

        {/* Skip link */}
        <Pressable
          style={styles.skipButton}
          onPress={handleSkip}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>{c.skip}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.charcoal[950],
  },
  stepArea: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIDE_PADDING,
  },
  headline: {
    fontSize: 28,
    fontWeight: "600",
    color: dark.text,
  },
  subhead: {
    fontSize: 15,
    fontWeight: "400",
    color: "#AEAEB2",
    marginTop: 8,
    lineHeight: 22,
  },
  list: {
    marginTop: 28,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingVertical: 12,
  },
  rowContent: {
    flex: 1,
    marginRight: 16,
  },
  optionName: {
    fontSize: 17,
    fontWeight: "400",
    color: dark.text,
  },
  optionNameSelected: {
    fontWeight: "500",
  },
  optionDetail: {
    fontSize: 13,
    fontWeight: "400",
    color: "#AEAEB2",
    marginTop: 2,
    lineHeight: 18,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#38383A",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: palette.amber[600],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.amber[600],
  },
  separator: {
    height: 1,
    backgroundColor: "#38383A",
    marginLeft: 0,
  },
  otherInputContainer: {
    paddingBottom: 12,
  },
  otherInput: {
    height: 56,
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38383A",
    paddingHorizontal: 16,
    fontSize: 17,
    color: dark.text,
  },
  bottomArea: {
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 16,
    gap: 12,
    alignItems: "center",
  },
  ctaButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: palette.amber[600],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "600",
    color: dark.buttonText,
  },
  skipButton: {
    padding: 4,
  },
  skipText: {
    fontSize: 15,
    color: "#636366",
  },
});
