import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { PROCEDURE_CATEGORIES } from "@/constants/procedureCategories";
import { palette, Colors } from "@/constants/theme";
import { copy } from "@/constants/onboardingCopy";
import type { Specialty } from "@/types/case";

const dark = Colors.dark;

const GRID_GAP = 12;
const SIDE_PADDING = 24;

// ── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({
  id,
  label,
  selected,
  onToggle,
  width,
}: {
  id: Specialty;
  label: string;
  selected: boolean;
  onToggle: () => void;
  width: number;
}) {
  const scale = useSharedValue(1);
  const selectionProgress = useSharedValue(selected ? 1 : 0);

  React.useEffect(() => {
    selectionProgress.value = withTiming(selected ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
  }, [selected, selectionProgress]);

  const handlePress = () => {
    // Spring scale animation on tap
    scale.value = withSpring(1.03, { damping: 12, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    onToggle();
  };

  const animatedStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      selectionProgress.value,
      [0, 1],
      ["#1C1C1E", "rgba(229, 160, 13, 0.08)"],
    );
    const borderColor = interpolateColor(
      selectionProgress.value,
      [0, 1],
      ["#38383A", "#E5A00D"],
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor: bgColor,
      borderColor: borderColor,
      borderWidth: selected ? 1.5 : 1,
    };
  });

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={selected ? `${label}, selected` : label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={`onboarding.categories.card-${id}`}
    >
      <Animated.View style={[styles.card, { width }, animatedStyle]}>
        <Text
          style={[styles.cardLabel, selected && styles.cardLabelSelected]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {selected && <Text style={styles.checkmark}>✓</Text>}
      </Animated.View>
    </Pressable>
  );
}

// ── Categories Screen ────────────────────────────────────────────────────────

interface Props {
  initialSelectedCategories?: Specialty[];
  onComplete: (selectedCategories: Specialty[]) => Promise<void> | void;
  onBack?: () => void;
}

export function CategoriesScreen({
  initialSelectedCategories = [],
  onComplete,
  onBack,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Set<Specialty>>(
    () => new Set(initialSelectedCategories),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardWidth = (screenWidth - SIDE_PADDING * 2 - GRID_GAP) / 2;
  const canContinue = selected.size > 0 && !isSubmitting;

  const toggleCategory = useCallback((id: Specialty) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(Array.from(selected));
    } catch (error: any) {
      Alert.alert(
        "Unable to save categories",
        error?.message || "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(PROCEDURE_CATEGORIES.map((category) => category.id));
    } catch (error: any) {
      Alert.alert(
        "Unable to save categories",
        error?.message || "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const c = copy.categories;

  return (
    <View
      testID="screen-onboardingCategories"
      style={[
        styles.root,
        {
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      <StepHeader currentStep={1} onBack={onBack} />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Headline */}
        <Text style={styles.headline}>{c.headline}</Text>

        {/* Subhead */}
        <Text style={styles.subhead}>{c.subhead}</Text>

        {/* Grid */}
        <View style={styles.grid}>
          {PROCEDURE_CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              id={cat.id}
              label={cat.label}
              selected={selected.has(cat.id)}
              onToggle={() => toggleCategory(cat.id)}
              width={cardWidth}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomArea}>
        {/* Continue button */}
        <Pressable
          style={[styles.ctaButton, !canContinue && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityLabel={c.cta}
          accessibilityState={{ disabled: !canContinue, busy: isSubmitting }}
          testID="onboarding.categories.btn-continue"
        >
          <Text style={styles.ctaText}>
            {isSubmitting ? "Saving..." : c.cta}
          </Text>
        </Pressable>

        {/* Skip link */}
        <Pressable
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isSubmitting}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={c.skip}
          accessibilityState={{ disabled: isSubmitting }}
          testID="onboarding.categories.btn-skip"
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    marginTop: 28,
  },
  card: {
    height: 56,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 6,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: dark.text,
    flexShrink: 1,
  },
  cardLabelSelected: {
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 16,
    color: palette.amber[600],
    fontWeight: "700",
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
