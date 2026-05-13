import React from "react";
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export const NAV_BAR_HEIGHT = 44;

export interface FormSection {
  id: string;
  label: string;
  /** Short label used on narrow screens (< 380pt). Fallback: label. */
  shortLabel?: string;
}

export const FORM_SECTIONS: FormSection[] = [
  { id: "patient", label: "Patient" },
  { id: "team", label: "Team" },
  { id: "case", label: "Case" },
  { id: "operative", label: "Operative", shortLabel: "Op" },
  { id: "media", label: "Media" },
  { id: "outcomes", label: "Outcomes", shortLabel: "Outc" },
];

export interface CompletionMap {
  [sectionId: string]: { filled: number; total: number };
}

interface SectionNavBarProps {
  activeSection: string;
  completionMap: CompletionMap;
  onSectionPress: (sectionId: string) => void;
}

type CompletionState = "untouched" | "partial" | "complete";

function classifyCompletion(
  completion: { filled: number; total: number } | undefined,
): CompletionState {
  if (!completion || completion.total === 0 || completion.filled === 0) {
    return "untouched";
  }
  if (completion.filled >= completion.total) {
    return "complete";
  }
  return "partial";
}

/**
 * Six-pill sticky section nav for the case form.
 *
 * Completion state is encoded as a 2pt underline beneath each pill — green
 * for complete, amber for partial, none for untouched — which works whether
 * the pill is active (filled background) or inactive. The previous design
 * paired a 6pt dot with the label, which competed for space and broke the
 * "all six labels visible without horizontal scroll" invariant on iPhone
 * SE 3 (375pt). With the dot gone and a smaller 12pt label on narrow
 * screens, every label fits cleanly on every supported iPhone.
 */
export function SectionNavBar({
  activeSection,
  completionMap,
  onSectionPress,
}: SectionNavBarProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  // 12pt is the project's caption floor (CLAUDE.md typography table). We
  // step down to it only on narrow screens; standard 13pt on the rest.
  const labelFontSize = isNarrow ? 12 : 13;

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
          const state = classifyCompletion(completion);
          const labelText =
            isNarrow && section.shortLabel ? section.shortLabel : section.label;
          const a11yState =
            state === "complete"
              ? "completed"
              : state === "partial"
                ? "partially filled"
                : "not started";

          const underlineColor =
            state === "complete"
              ? theme.success
              : state === "partial"
                ? theme.link
                : "transparent";

          return (
            <Pressable
              key={section.id}
              testID={`caseForm.nav.pill-${section.id}`}
              onPress={() => onSectionPress(section.id)}
              accessibilityRole="tab"
              accessibilityLabel={`${section.label} — ${a11yState}`}
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
              <ThemedText
                numberOfLines={1}
                style={[
                  styles.pillText,
                  {
                    fontSize: labelFontSize,
                    color: isActive ? theme.buttonText : theme.textSecondary,
                  },
                ]}
              >
                {labelText}
              </ThemedText>
              <View
                style={[
                  styles.completionUnderline,
                  {
                    backgroundColor: underlineColor,
                    opacity:
                      state === "partial" ? 0.55 : state === "complete" ? 1 : 0,
                  },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
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
    paddingHorizontal: 6,
    borderRadius: BorderRadius.full,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  pillText: {
    fontWeight: "600",
    textAlign: "center",
  },
  completionUnderline: {
    position: "absolute",
    bottom: 4,
    left: "30%",
    right: "30%",
    height: 2,
    borderRadius: 1,
  },
});
