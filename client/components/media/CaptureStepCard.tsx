import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { EncryptedImage } from "@/components/EncryptedImage";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { MediaTagBadge } from "./MediaTagBadge";
import type { MediaTag } from "@/types/media";
import type { MediaAttachment } from "@/types/case";
import type {
  CaptureStep,
  MergedCaptureStep,
} from "@/data/mediaCaptureProtocols";

// ═══════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════

interface CaptureStepCardProps {
  step: CaptureStep | MergedCaptureStep;
  capturedMedia?: MediaAttachment;
  onCapture: (tag: MediaTag) => void;
  onRemove?: (mediaId: string) => void;
  sectionLabel?: string;
}

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const CARD_WIDTH = 120;
const CARD_HEIGHT = 140;

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

/**
 * Individual protocol step card. Two states:
 * - Empty: dashed border, camera icon, tap to capture
 * - Captured: thumbnail with green check overlay
 */
function CaptureStepCardInner({
  step,
  capturedMedia,
  onCapture,
  onRemove,
  sectionLabel,
}: CaptureStepCardProps) {
  const { theme } = useTheme();
  const isCaptured = !!capturedMedia;

  const handlePress = () => {
    if (!isCaptured) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onCapture(step.tag);
    }
  };

  const handleRemove = () => {
    if (capturedMedia && onRemove) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRemove(capturedMedia.id);
    }
  };

  return (
    <View>
      {/* Section divider */}
      {sectionLabel ? (
        <View style={styles.sectionDivider}>
          <View
            style={[styles.sectionLine, { backgroundColor: theme.border }]}
          />
          <ThemedText
            style={[styles.sectionText, { color: theme.textSecondary }]}
          >
            {sectionLabel}
          </ThemedText>
          <View
            style={[styles.sectionLine, { backgroundColor: theme.border }]}
          />
        </View>
      ) : null}

      <Pressable
        onPress={handlePress}
        style={[
          styles.card,
          isCaptured
            ? {
                borderColor: theme.success + "60",
                borderWidth: 1,
                borderStyle: "solid" as const,
              }
            : {
                borderColor: theme.link + "40",
                borderWidth: 1,
                borderStyle: "dashed" as const,
              },
        ]}
      >
        {isCaptured ? (
          /* ── Captured state ── */
          <View style={styles.capturedContainer}>
            <EncryptedImage
              uri={capturedMedia.localUri}
              style={styles.thumbnail}
              thumbnail
            />

            {/* Green check overlay */}
            <View
              style={[styles.checkOverlay, { backgroundColor: theme.success }]}
            >
              <Feather name="check" size={10} color={theme.buttonText} />
            </View>

            {/* Tag badge overlay */}
            <View style={styles.badgeOverlay}>
              <MediaTagBadge tag={step.tag} size="small" />
            </View>

            {/* Remove button */}
            {onRemove ? (
              <Pressable
                onPress={handleRemove}
                style={[
                  styles.removeButton,
                  { backgroundColor: theme.error + "CC" },
                ]}
                hitSlop={8}
              >
                <Feather name="x" size={10} color={theme.buttonText} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          /* ── Empty state ── */
          <View style={styles.emptyContainer}>
            {/* Required indicator dot */}
            {step.required ? (
              <View
                style={[styles.requiredDot, { backgroundColor: theme.link }]}
              />
            ) : null}

            <Feather name="plus-circle" size={24} color={theme.link} />
            <ThemedText
              style={[styles.emptyLabel, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {step.label}
            </ThemedText>
            {step.captureHint ? (
              <ThemedText
                style={[styles.emptyHint, { color: theme.textTertiary }]}
                numberOfLines={2}
              >
                {step.captureHint}
              </ThemedText>
            ) : null}
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },

  // Section divider
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    gap: 4,
  },
  emptyLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 9,
    textAlign: "center",
  },
  requiredDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Captured state
  capturedContainer: {
    flex: 1,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.md,
  },
  checkOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeOverlay: {
    position: "absolute",
    bottom: 6,
    left: 4,
  },
  removeButton: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});

export const CaptureStepCard = React.memo(CaptureStepCardInner);
