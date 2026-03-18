/**
 * SectionWrapper
 * ═══════════════
 * Shared card wrapper for assessment sections (skin cancer, hand, breast, etc.).
 * Bordered card with amber Feather icon + numbered title.
 *
 * Optionally collapsible with subtitle and info icon.
 */

import React, { useState } from "react";
import { View, Pressable, LayoutAnimation, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SectionWrapperProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  /** If true, section can be collapsed/expanded by tapping the header */
  collapsible?: boolean;
  /** Start collapsed (only used when collapsible=true, uncontrolled mode) */
  defaultCollapsed?: boolean;
  /** Optional subtitle shown below the title (e.g. info/hint text) */
  subtitle?: string;
  /** Controlled collapsed state — overrides internal state when provided */
  isCollapsed?: boolean;
  /** Called when collapse state changes (works in both controlled and uncontrolled modes) */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Test identifier for automation (forwarded to header touchable) */
  testID?: string;
}

export function SectionWrapper({
  title,
  icon,
  children,
  collapsible = false,
  defaultCollapsed = false,
  subtitle,
  isCollapsed,
  onCollapsedChange,
  testID,
}: SectionWrapperProps) {
  const { theme } = useTheme();
  const isControlled = isCollapsed !== undefined;
  const [internalCollapsed, setInternalCollapsed] = useState(
    collapsible ? defaultCollapsed : false,
  );
  const collapsed = isControlled ? isCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (!collapsible) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = !collapsed;
    if (!isControlled) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setInternalCollapsed(newVal);
    }
    onCollapsedChange?.(newVal);
  };

  const HeaderTag = collapsible ? Pressable : View;

  return (
    <View
      style={[
        styles.card,
        collapsed && styles.cardCollapsed,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      <HeaderTag
        testID={testID}
        style={[styles.header, collapsed && styles.headerCollapsed]}
        {...(collapsible
          ? {
              onPress: handleToggle,
              hitSlop: { top: 8, bottom: 8, left: 4, right: 4 },
            }
          : {})}
      >
        <Feather name={icon as any} size={16} color={theme.link} />
        <ThemedText style={[styles.title, { color: theme.text, flex: 1 }]}>
          {title}
        </ThemedText>
        {collapsible ? (
          <View style={styles.chevronWrap}>
            <Feather
              name={collapsed ? "chevron-down" : "chevron-up"}
              size={18}
              color={theme.textSecondary}
            />
          </View>
        ) : null}
      </HeaderTag>
      {subtitle && collapsed ? (
        <ThemedText style={[styles.subtitle, { color: theme.textTertiary }]}>
          {subtitle}
        </ThemedText>
      ) : null}
      {!collapsed ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardCollapsed: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
    minHeight: 36,
  },
  headerCollapsed: {
    marginBottom: 0,
    minHeight: 28,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  chevronWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: -4,
  },
});
