import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useScrollPreserve } from "@/hooks/useScrollPreserve";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { useFormScrollContext } from "@/contexts/FormScrollContext";

interface CollapsibleFormSectionProps {
  title: string;
  subtitle?: string;
  filledCount: number;
  totalCount: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  testID?: string;
  /**
   * Optional stable ID. When set, the section registers itself with
   * FormScrollContext so the field-level deep-link pipeline can call
   * `expandCollapsible(id)` before scrolling to a field that lives inside.
   * Children read the parent ID via `useCollapsibleFormSectionContext()`
   * so field primitives can record it on their layout entry.
   */
  collapsibleId?: string;
}

interface CollapsibleFormSectionContextValue {
  collapsibleId: string;
  expand: () => void;
}

const CollapsibleFormSectionContext =
  createContext<CollapsibleFormSectionContextValue | null>(null);

export function useCollapsibleFormSectionContext(): CollapsibleFormSectionContextValue | null {
  return useContext(CollapsibleFormSectionContext);
}

export const CollapsibleFormSection = React.memo(
  function CollapsibleFormSection({
    title,
    subtitle,
    filledCount,
    totalCount,
    children,
    defaultExpanded = true,
    testID,
    collapsibleId,
  }: CollapsibleFormSectionProps) {
    const { theme } = useTheme();
    const { snapshot, restore } = useScrollPreserve();
    const reduceMotion = useReduceMotion();
    const formScroll = useFormScrollContext();
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [isMeasured, setIsMeasured] = useState(defaultExpanded);
    const expandedRef = useRef(defaultExpanded);
    const contentHeightRef = useRef(0);
    const animatedHeight = useSharedValue(defaultExpanded ? -1 : 0);

    const toggle = useCallback(() => {
      // Collapsing a section above the viewport changes content height above
      // the user's scroll position, which the parent ScrollView doesn't
      // compensate for. Snapshot Y first, restore once layout settles so the
      // visible content stays put.
      snapshot();
      const nextExpanded = !expandedRef.current;
      expandedRef.current = nextExpanded;
      setExpanded(nextExpanded);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (isMeasured) {
        animatedHeight.value = withTiming(
          nextExpanded ? contentHeightRef.current : 0,
          // Honour the OS-level Reduce Motion setting per Apple HIG.
          { duration: reduceMotion ? 0 : 250 },
        );
      }
      restore();
    }, [animatedHeight, isMeasured, snapshot, restore, reduceMotion]);

    /**
     * Force-expand without toggling. Called by the field-level deep-link
     * pipeline before scrolling to a field that lives inside this section.
     * No-op if already expanded so re-fired triggers don't accidentally
     * collapse.
     */
    const expand = useCallback(() => {
      if (expandedRef.current) return;
      expandedRef.current = true;
      setExpanded(true);
      if (isMeasured) {
        animatedHeight.value = withTiming(contentHeightRef.current, {
          duration: reduceMotion ? 0 : 250,
        });
      }
    }, [animatedHeight, isMeasured, reduceMotion]);

    // Register with FormScrollContext when given a collapsibleId so deep-link
    // navigation can expand us before scrolling to an inner field.
    useEffect(() => {
      if (!collapsibleId || !formScroll) return;
      formScroll.setCollapsible(collapsibleId, expand);
      return () => {
        formScroll.removeCollapsible(collapsibleId);
      };
    }, [collapsibleId, formScroll, expand]);

    const contentStyle = useAnimatedStyle(() => {
      if (animatedHeight.value === -1) {
        return { overflow: "hidden" as const };
      }
      return {
        height: animatedHeight.value,
        overflow: "hidden" as const,
      };
    });

    const handleLayout = useCallback(
      (e: { nativeEvent: { layout: { height: number } } }) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && (expandedRef.current || !isMeasured)) {
          contentHeightRef.current = h;
          if (!isMeasured) {
            animatedHeight.value = expandedRef.current ? h : 0;
            setIsMeasured(true);
          } else {
            animatedHeight.value = h;
          }
        }
      },
      [animatedHeight, isMeasured],
    );

    const badgeColor = filledCount > 0 ? theme.link : theme.textTertiary;

    const childContext = useMemo<CollapsibleFormSectionContextValue | null>(
      () => (collapsibleId ? { collapsibleId, expand } : null),
      [collapsibleId, expand],
    );

    const content = (
      <View style={styles.wrapper}>
        <Pressable
          testID={testID}
          onPress={toggle}
          style={styles.header}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${filledCount} of ${totalCount} filled`}
          accessibilityState={{ expanded }}
          accessibilityHint={
            expanded ? "Double tap to collapse" : "Double tap to expand"
          }
        >
          <View style={styles.headerLeft}>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText
                style={[styles.subtitle, { color: theme.textTertiary }]}
              >
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: badgeColor + "15",
                  borderColor: badgeColor + "30",
                },
              ]}
            >
              <ThemedText style={[styles.badgeText, { color: badgeColor }]}>
                {filledCount}/{totalCount}
              </ThemedText>
            </View>
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.textSecondary}
            />
          </View>
        </Pressable>

        {!isMeasured && !expanded ? (
          <View pointerEvents="none" style={styles.hiddenMeasurementContainer}>
            <View onLayout={handleLayout}>{children}</View>
          </View>
        ) : null}

        <Animated.View style={contentStyle}>
          {isMeasured || expanded ? (
            <View onLayout={handleLayout}>{children}</View>
          ) : null}
        </Animated.View>
      </View>
    );

    if (childContext) {
      return (
        <CollapsibleFormSectionContext.Provider value={childContext}>
          {content}
        </CollapsibleFormSectionContext.Provider>
      );
    }
    return content;
  },
);

const styles = StyleSheet.create({
  wrapper: {
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  hiddenMeasurementContainer: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
  },
});
