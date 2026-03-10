import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import type { AttentionItem } from "@/hooks/useAttentionItems";

interface AttentionCardProps {
  item: AttentionItem;
  cardWidth: number;
  onLogCase: (item: AttentionItem) => void;
  onDischarge?: (caseId: string) => void;
  onCardPress: (item: AttentionItem) => void;
  onAddEvent?: (caseId: string) => void;
  onAddHistology?: (caseId: string) => void;
}

function getStatusBadge(
  item: AttentionItem,
  accentColor: string,
  successColor: string,
  infoColor: string,
  warningColor: string,
  errorColor: string,
): { bg: string; text: string; label: string } {
  if (item.type === "infection") {
    return { bg: errorColor + "20", text: errorColor, label: "Infection" };
  }
  if (item.type === "inpatient") {
    return { bg: accentColor + "20", text: accentColor, label: "Inpatient" };
  }
  switch (item.episodeStatus) {
    case "active":
      return { bg: successColor + "20", text: successColor, label: "Active" };
    case "on_hold":
      return {
        bg: warningColor + "20",
        text: warningColor,
        label: "On Hold",
      };
    case "planned":
      return { bg: infoColor + "20", text: infoColor, label: "Planned" };
    default:
      return { bg: successColor + "20", text: successColor, label: "Active" };
  }
}

function AttentionCardInner({
  item,
  cardWidth,
  onLogCase,
  onDischarge,
  onCardPress,
  onAddEvent,
  onAddHistology,
}: AttentionCardProps) {
  const { theme, isDark } = useTheme();
  const badge = getStatusBadge(
    item,
    theme.accent,
    theme.success,
    theme.info,
    theme.warning,
    theme.error,
  );

  const actionCaseId = item.caseId || item.lastCaseId;
  const secondaryInfo =
    item.type === "episode" && item.lastProcedureSummary
      ? item.lastProcedureSummary
      : undefined;
  const canLogCase =
    item.type === "inpatient" || item.type === "episode" || !!item.episodeId;
  const logCaseLabel =
    item.type === "episode" || item.episodeId ? "Next Episode" : "Log Case";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${badge.label}, ${item.patientIdentifier}, ${item.diagnosisTitle}`}
      accessibilityHint="Opens the related case or episode"
      style={[
        styles.card,
        {
          width: cardWidth,
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.border,
        },
        !isDark && styles.cardShadow,
      ]}
      onPress={() => onCardPress(item)}
    >
      {/* Row 1: Badge + POD/days */}
      <View style={styles.row1}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <ThemedText style={[styles.badgeText, { color: badge.text }]}>
            {badge.label}
          </ThemedText>
        </View>
        {item.type === "inpatient" ? (
          <ThemedText style={[styles.podText, { color: theme.accent }]}>
            POD {item.postOpDay}
          </ThemedText>
        ) : item.type === "infection" && item.infectionSyndrome ? (
          <ThemedText
            style={[styles.metaText, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {item.infectionSyndrome}
          </ThemedText>
        ) : (
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {item.daysSinceLastEncounter != null
              ? `${item.daysSinceLastEncounter}d since last`
              : "No cases"}
          </ThemedText>
        )}
      </View>

      {/* Row 2: Patient + diagnosis + procedure summary */}
      <View style={styles.row2}>
        <ThemedText style={[styles.patientId, { color: theme.text }]}>
          {item.patientIdentifier}
        </ThemedText>
        <ThemedText
          style={[styles.diagnosisTitle, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {item.diagnosisTitle}
        </ThemedText>
        {secondaryInfo ? (
          <ThemedText
            style={[styles.procedureSummary, { color: theme.textTertiary }]}
            numberOfLines={1}
          >
            {secondaryInfo}
          </ThemedText>
        ) : null}
        {item.type === "episode" && item.pendingAction ? (
          <ThemedText style={[styles.pendingAction, { color: theme.accent }]}>
            {item.pendingAction}
          </ThemedText>
        ) : null}
      </View>

      {/* Row 3: Actions */}
      <View style={styles.row3}>
        {item.canAddHistology && actionCaseId && onAddHistology ? (
          <Pressable
            style={[
              styles.actionChip,
              {
                backgroundColor: theme.accent + "15",
                borderColor: theme.accent + "30",
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onAddHistology(actionCaseId);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add histology for ${item.patientIdentifier}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="file-text" size={13} color={theme.accent} />
            <ThemedText
              style={[styles.histologyChipText, { color: theme.accent }]}
            >
              Histology
            </ThemedText>
          </Pressable>
        ) : null}
        {actionCaseId && onAddEvent ? (
          <Pressable
            style={[
              styles.actionChip,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onAddEvent(actionCaseId);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add event for ${item.patientIdentifier}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="plus" size={13} color={theme.textSecondary} />
            <ThemedText
              style={[styles.actionChipText, { color: theme.textSecondary }]}
            >
              Event
            </ThemedText>
          </Pressable>
        ) : null}
        {item.type === "inpatient" && onDischarge && item.caseId ? (
          <Pressable
            style={[
              styles.actionChip,
              {
                backgroundColor: theme.accent + "15",
                borderColor: theme.accent + "30",
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onDischarge(item.caseId!);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Discharge ${item.patientIdentifier}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ThemedText
              style={[styles.dischargeChipText, { color: theme.accent }]}
            >
              Discharge
            </ThemedText>
          </Pressable>
        ) : null}
        {canLogCase ? (
          <Pressable
            style={[styles.logCaseButton, { backgroundColor: theme.accent }]}
            onPress={(e) => {
              e.stopPropagation();
              onLogCase(item);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${logCaseLabel} for ${item.patientIdentifier}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ThemedText
              style={[styles.logCaseText, { color: theme.accentContrast }]}
            >
              {logCaseLabel}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

export const AttentionCard = React.memo(AttentionCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 6,
  },
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  row1: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  podText: {
    fontSize: 18,
    fontWeight: "700",
  },
  metaText: {
    fontSize: 13,
    fontWeight: "400",
    flexShrink: 1,
  },
  row2: {
    gap: 1,
  },
  patientId: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "SF Mono" : "monospace",
    fontWeight: "500",
  },
  diagnosisTitle: {
    fontSize: 13,
  },
  procedureSummary: {
    fontSize: 12,
  },
  pendingAction: {
    fontSize: 11,
    fontStyle: "italic",
  },
  row3: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  histologyChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  dischargeChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  logCaseButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  logCaseText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
