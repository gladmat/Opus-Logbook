import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { Shadows, Spacing } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AddCaseFABProps {
  onAddCase: () => void;
  onQuickCapture?: () => void;
  onGuidedCapture?: () => void;
}

const MINI_FAB_SIZE = 44;
const MAIN_FAB_SIZE = 56;
const ITEM_GAP = 16;
// Distance from center of main FAB to center of first mini-FAB
const BASE_OFFSET = MAIN_FAB_SIZE / 2 + ITEM_GAP + MINI_FAB_SIZE / 2;

interface SpeedDialItem {
  key: string;
  label: string;
  icon: "edit-3" | "camera" | "grid";
  isPrimary: boolean;
}

const SPEED_DIAL_ITEMS: SpeedDialItem[] = [
  { key: "log", label: "Log a Case", icon: "edit-3", isPrimary: true },
  { key: "capture", label: "Quick Capture", icon: "camera", isPrimary: false },
  { key: "guided", label: "Guided Capture", icon: "grid", isPrimary: false },
];

function AddCaseFABInner({
  onAddCase,
  onQuickCapture,
  onGuidedCapture,
}: AddCaseFABProps) {
  const { theme, isDark } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const [isExpanded, setIsExpanded] = useState(false);
  const expandedRef = useRef(false);

  // Main FAB press animation
  const fabScale = useSharedValue(1);
  // Icon rotation: 0 → 45° (+ becomes ×)
  const iconRotation = useSharedValue(0);
  // Backdrop opacity
  const backdropOpacity = useSharedValue(0);
  // Per-item progress (0 = collapsed, 1 = expanded)
  const item0 = useSharedValue(0);
  const item1 = useSharedValue(0);
  const item2 = useSharedValue(0);
  const itemProgressValues = useMemo(
    () => [item0, item1, item2],
    [item0, item1, item2],
  );

  const actionHandlers = useMemo(
    () => [
      onAddCase,
      onQuickCapture ?? (() => {}),
      onGuidedCapture ?? (() => {}),
    ],
    [onAddCase, onQuickCapture, onGuidedCapture],
  );

  const expand = useCallback(() => {
    expandedRef.current = true;
    setIsExpanded(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    iconRotation.value = withSpring(45, { damping: 22, stiffness: 200 });
    backdropOpacity.value = withTiming(1, { duration: 200 });

    // Staggered fan-out: closest item first
    for (let i = 0; i < SPEED_DIAL_ITEMS.length; i++) {
      itemProgressValues[i]!.value = withDelay(
        i * 40,
        withSpring(1, { damping: 22, stiffness: 200 }),
      );
    }
  }, [iconRotation, backdropOpacity, itemProgressValues]);

  const collapse = useCallback(
    (action?: () => void) => {
      expandedRef.current = false;

      iconRotation.value = withSpring(0, { damping: 22, stiffness: 200 });
      backdropOpacity.value = withTiming(0, { duration: 150 });

      // Collapse all items (reverse stagger — furthest first)
      for (let i = SPEED_DIAL_ITEMS.length - 1; i >= 0; i--) {
        itemProgressValues[i]!.value = withDelay(
          (SPEED_DIAL_ITEMS.length - 1 - i) * 30,
          withTiming(0, { duration: 150 }),
        );
      }

      // Delay state update so animation plays before pointerEvents change
      setTimeout(() => {
        setIsExpanded(false);
        action?.();
      }, 180);
    },
    [iconRotation, backdropOpacity, itemProgressValues],
  );

  const handleFABPress = useCallback(() => {
    if (expandedRef.current) {
      collapse();
    } else {
      expand();
    }
  }, [expand, collapse]);

  const handleFABPressIn = useCallback(() => {
    fabScale.value = withSpring(0.93, { damping: 20, stiffness: 350 });
  }, [fabScale]);

  const handleFABPressOut = useCallback(() => {
    fabScale.value = withSpring(1, { damping: 20, stiffness: 350 });
  }, [fabScale]);

  const handleItemPress = useCallback(
    (index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const action = actionHandlers[index];
      collapse(action);
    },
    [actionHandlers, collapse],
  );

  // --- Animated styles ---

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.4,
  }));

  const OFFSET_0 = BASE_OFFSET + 0 * (MINI_FAB_SIZE + ITEM_GAP);
  const OFFSET_1 = BASE_OFFSET + 1 * (MINI_FAB_SIZE + ITEM_GAP);
  const OFFSET_2 = BASE_OFFSET + 2 * (MINI_FAB_SIZE + ITEM_GAP);

  const itemStyle0 = useAnimatedStyle(() => ({
    opacity: item0.value,
    transform: [
      { translateY: -(OFFSET_0 * item0.value) },
      { scale: 0.5 + 0.5 * item0.value },
    ],
  }));
  const itemStyle1 = useAnimatedStyle(() => ({
    opacity: item1.value,
    transform: [
      { translateY: -(OFFSET_1 * item1.value) },
      { scale: 0.5 + 0.5 * item1.value },
    ],
  }));
  const itemStyle2 = useAnimatedStyle(() => ({
    opacity: item2.value,
    transform: [
      { translateY: -(OFFSET_2 * item2.value) },
      { scale: 0.5 + 0.5 * item2.value },
    ],
  }));
  const itemAnimatedStyles = [itemStyle0, itemStyle1, itemStyle2];

  const fabBottom = tabBarHeight + 16;

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <AnimatedPressable
          onPress={() => collapse()}
          style={[styles.backdrop, backdropAnimatedStyle]}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
      )}

      {/* Mini-FABs */}
      {SPEED_DIAL_ITEMS.map((item, i) => (
        <Animated.View
          key={item.key}
          pointerEvents={isExpanded ? "auto" : "none"}
          style={[
            styles.miniRow,
            { bottom: fabBottom + (MAIN_FAB_SIZE - MINI_FAB_SIZE) / 2 },
            itemAnimatedStyles[i],
          ]}
        >
          {/* Label pill */}
          <Pressable
            onPress={() => handleItemPress(i)}
            style={[
              styles.labelPill,
              {
                backgroundColor: theme.backgroundElevated,
              },
              !isDark && Shadows.card,
            ]}
          >
            <Text
              style={[styles.labelText, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>

          {/* Mini-FAB circle */}
          <Pressable
            onPress={() => handleItemPress(i)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={[
              styles.miniFab,
              {
                backgroundColor: item.isPrimary
                  ? theme.accent
                  : theme.backgroundElevated,
              },
              !isDark && Shadows.floating,
            ]}
          >
            <Feather
              name={item.icon}
              size={20}
              color={item.isPrimary ? theme.accentContrast : theme.text}
            />
          </Pressable>
        </Animated.View>
      ))}

      {/* Main FAB */}
      <AnimatedPressable
        onPress={handleFABPress}
        onPressIn={handleFABPressIn}
        onPressOut={handleFABPressOut}
        accessibilityRole="button"
        accessibilityLabel="Add case"
        accessibilityHint="Opens options to log or plan a case"
        accessibilityState={{ expanded: isExpanded }}
        style={[
          styles.fab,
          { backgroundColor: theme.accent, bottom: fabBottom },
          !isDark && [styles.fabShadow, { shadowColor: theme.accent }],
          fabAnimatedStyle,
        ]}
      >
        <Animated.View style={iconAnimatedStyle}>
          <Feather name="plus" size={24} color={theme.accentContrast} />
        </Animated.View>
      </AnimatedPressable>
    </>
  );
}

export const AddCaseFAB = React.memo(AddCaseFABInner);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 99,
  },
  fab: {
    position: "absolute",
    right: 16,
    width: MAIN_FAB_SIZE,
    height: MAIN_FAB_SIZE,
    borderRadius: MAIN_FAB_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 101,
  },
  fabShadow: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  miniRow: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 100,
    gap: Spacing.sm,
  },
  miniFab: {
    width: MINI_FAB_SIZE,
    height: MINI_FAB_SIZE,
    borderRadius: MINI_FAB_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  labelPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 8,
  },
  labelText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
