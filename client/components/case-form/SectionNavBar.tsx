import React, { useRef, useEffect } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
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
  { id: "diagnosis", label: "Diagnosis" },
  { id: "admission", label: "Admission" },
  { id: "media", label: "Media" },
  { id: "factors", label: "Factors" },
  { id: "operative", label: "Operative" },
  { id: "infection", label: "Infection" },
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
  const scrollRef = useRef<ScrollView>(null);
  const pillRefs = useRef<Record<string, { x: number; width: number }>>({});

  useEffect(() => {
    const pill = pillRefs.current[activeSection];
    if (pill && scrollRef.current) {
      scrollRef.current.scrollTo({
        x: Math.max(0, pill.x - 60),
        animated: true,
      });
    }
  }, [activeSection]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
        },
      ]}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        accessibilityRole="tablist"
      >
        {FORM_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          const completion = completionMap[section.id];
          const isComplete =
            completion && completion.filled >= completion.total;

          return (
            <Pressable
              key={section.id}
              onPress={() => onSectionPress(section.id)}
              onLayout={(e) => {
                pillRefs.current[section.id] = {
                  x: e.nativeEvent.layout.x,
                  width: e.nativeEvent.layout.width,
                };
              }}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: NAV_BAR_HEIGHT,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    minHeight: 44,
    justifyContent: "center",
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
