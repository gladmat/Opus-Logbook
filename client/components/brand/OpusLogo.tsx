import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { OpusMark } from "./OpusMark";
import { useTheme } from "@/hooks/useTheme";
import { palette } from "@/constants/theme";

interface OpusLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  color?: string;
}

const sizes = {
  sm: { mark: 20, wordmark: 16, subtitle: 7, gap: 6, subtitleSpacing: 2 },
  md: { mark: 32, wordmark: 24, subtitle: 8, gap: 10, subtitleSpacing: 2.5 },
  lg: { mark: 56, wordmark: 36, subtitle: 9, gap: 16, subtitleSpacing: 3 },
};

/**
 * Opus horizontal lockup: Mark + Wordmark + optional Subtitle
 *
 * Uses system font (SF Pro on iOS) for the wordmark with bold weight
 * and generous letter-spacing for the brand treatment.
 */
export function OpusLogo({
  size = "md",
  showSubtitle = false,
  color = palette.amber[600],
}: OpusLogoProps) {
  const { theme } = useTheme();
  const s = sizes[size];

  return (
    <View style={[styles.container, { gap: s.gap }]}>
      <OpusMark size={s.mark} color={color} />
      <View>
        <Text
          style={{
            fontWeight: "700",
            fontSize: s.wordmark,
            color: color,
            letterSpacing: 4,
            lineHeight: s.wordmark * 1.1,
          }}
        >
          opus
        </Text>
        {showSubtitle && (
          <Text
            style={{
              fontWeight: "500",
              fontSize: s.subtitle,
              color: theme.textTertiary,
              letterSpacing: s.subtitleSpacing,
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            surgical case logbook
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
});
