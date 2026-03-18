import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export const NAV_BAR_HEIGHT = 44;

export interface FormSection {
  id: string;
  label: string;
}

export const FORM_SECTIONS: FormSection[] = [
  { id: "patient", label: "Patient" },
  { id: "case", label: "Case" },
  { id: "operative", label: "Operative" },
  { id: "media", label: "Media" },
  { id: "outcomes", label: "Outcomes" },
];

export interface CompletionMap {
  [sectionId: string]: { filled: number; total: number };
}

interface SectionNavBarProps {
  activeSection: string;
  completionMap: CompletionMap;
  onSectionPress: (sectionId: string) => void;
}

export function SectionNavBar({
  activeSection,
  completionMap,
  onSectionPress,
}: SectionNavBarProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
        },
      ]}
    >
      <View style={styles.pillRow} accessibilityRole="tablist">
        {FORM_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          const completion = completionMap[section.id];
          const isComplete =
            completion && completion.filled >= completion.total;

          return (
            <Pressable
              key={section.id}
              testID={`caseForm.nav.pill-${section.id}`}
              onPress={() => onSectionPress(section.id)}
              accessibilityRole="tab"
              accessibilityLabel={section.label}
              accessibilityState={{ selected: isActive }}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive
                    ? theme.link
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <View style={styles.pillContent}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isComplete
                        ? theme.success
                        : theme.textTertiary,
                    },
                  ]}
                />
                <ThemedText
                  style={[
                    styles.pillText,
                    {
                      color: isActive ? theme.buttonText : theme.textSecondary,
                    },
                  ]}
                >
                  {section.label}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: NAV_BAR_HEIGHT,
  },
  pillRow: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  pill: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  pillContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
