import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { TreatmentEpisode } from "@/types/episode";
import { EPISODE_STATUS_LABELS, PENDING_ACTION_LABELS } from "@/types/episode";
import type { CaseSummary } from "@/types/caseSummary";

interface EpisodeCardProps {
  episode: TreatmentEpisode;
  linkedCases: CaseSummary[];
  onPress: () => void;
  onLogCase: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "success", text: "success" },
  on_hold: { bg: "warning", text: "warning" },
  planned: { bg: "info", text: "info" },
  completed: { bg: "textTertiary", text: "textTertiary" },
  cancelled: { bg: "textTertiary", text: "textTertiary" },
};

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function EpisodeCard({
  episode,
  linkedCases,
  onPress,
  onLogCase,
}: EpisodeCardProps) {
  const { theme } = useTheme();

  const specialtyColor = theme.specialty[episode.specialty];
  const statusConfig = STATUS_COLORS[episode.status] ?? {
    bg: "textTertiary",
    text: "textTertiary",
  };
  const statusColor = (theme as any)[statusConfig.text] as string;

  // Last case info
  const lastCase =
    linkedCases.length > 0 ? linkedCases[linkedCases.length - 1] : null;
  const lastCaseDate = lastCase?.procedureDate;
  const daysSinceLastCase = lastCaseDate ? daysSince(lastCaseDate) : null;

  // Days color coding
  let daysColor = theme.success;
  if (daysSinceLastCase !== null) {
    if (daysSinceLastCase > 14) daysColor = theme.error;
    else if (daysSinceLastCase > 7) daysColor = theme.warning;
  }

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderLeftColor: specialtyColor,
        },
      ]}
    >
      {/* Title row */}
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <ThemedText
            style={[styles.title, { color: theme.text }]}
            numberOfLines={1}
          >
            {episode.title}
          </ThemedText>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "20" },
            ]}
          >
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {EPISODE_STATUS_LABELS[episode.status]}
            </ThemedText>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={theme.textTertiary} />
      </View>

      {/* Specialty + patient ID */}
      <View style={styles.metaRow}>
        <SpecialtyBadge specialty={episode.specialty} size="small" />
        {episode.patientIdentifier ? (
          <ThemedText
            style={[styles.patientId, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {episode.patientIdentifier}
          </ThemedText>
        ) : null}
      </View>

      {/* Pending action pill */}
      {episode.pendingAction ? (
        <View
          style={[
            styles.pendingPill,
            { backgroundColor: theme.warning + "15" },
          ]}
        >
          <Feather name="clock" size={12} color={theme.warning} />
          <ThemedText style={[styles.pendingText, { color: theme.warning }]}>
            {PENDING_ACTION_LABELS[episode.pendingAction]}
          </ThemedText>
        </View>
      ) : null}

      {/* Case count + days since last */}
      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <View style={styles.footerItem}>
            <Feather name="file-text" size={13} color={theme.textTertiary} />
            <ThemedText
              style={[styles.footerText, { color: theme.textTertiary }]}
            >
              {linkedCases.length} case{linkedCases.length !== 1 ? "s" : ""}
            </ThemedText>
          </View>
          {lastCase ? (
            <View style={styles.footerItem}>
              <Feather name="calendar" size={13} color={theme.textTertiary} />
              <ThemedText
                style={[styles.footerText, { color: theme.textTertiary }]}
              >
                Last:{" "}
                {new Date(lastCase.procedureDate).toLocaleDateString(
                  undefined,
                  { day: "numeric", month: "short" },
                )}
              </ThemedText>
            </View>
          ) : null}
          {daysSinceLastCase !== null ? (
            <ThemedText style={[styles.daysText, { color: daysColor }]}>
              {daysSinceLastCase}d ago
            </ThemedText>
          ) : null}
        </View>

        {/* Log Case button */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onLogCase();
          }}
          style={[styles.logCaseButton, { backgroundColor: theme.link }]}
          hitSlop={4}
        >
          <Feather name="plus" size={14} color={theme.buttonText} />
          <ThemedText style={[styles.logCaseText, { color: theme.buttonText }]}>
            Log Case
          </ThemedText>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  titleLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  patientId: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  pendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    alignSelf: "flex-start",
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "500",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: 12,
  },
  daysText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  logCaseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  logCaseText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
