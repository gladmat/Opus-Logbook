import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import {
  WoundAssessment,
  WOUND_BED_TISSUE_LABELS,
  EXUDATE_AMOUNT_LABELS,
  EXUDATE_TYPE_LABELS,
  WOUND_EDGE_STATUS_LABELS,
  SURROUNDING_SKIN_LABELS,
  INFECTION_SIGN_LABELS,
  HEALING_TREND_LABELS,
  DRESSING_CATEGORY_LABELS,
  HealingTrend,
} from "@/types/wound";

interface WoundAssessmentCardProps {
  data: WoundAssessment;
  createdAt: string;
}

function getHealingTrendColor(
  trend: HealingTrend,
  theme: typeof import("@/constants/theme").Colors.light,
): string {
  switch (trend) {
    case "improving":
      return theme.success;
    case "static":
      return theme.warning;
    case "deteriorating":
      return theme.error;
    default:
      return theme.textSecondary;
  }
}

function getHealingTrendIcon(trend: HealingTrend): string {
  switch (trend) {
    case "improving":
      return "trending-up";
    case "static":
      return "minus";
    case "deteriorating":
      return "trending-down";
    default:
      return "minus";
  }
}

export function WoundAssessmentCard({
  data,
  createdAt,
}: WoundAssessmentCardProps) {
  const { theme } = useTheme();

  const hasDimensions =
    data.lengthCm != null || data.widthCm != null || data.depthCm != null;
  const hasInfectionSigns = (data.infectionSigns?.length ?? 0) > 0;
  const hasDressings = (data.dressings?.length ?? 0) > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={styles.headerRow}>
        <View
          style={[styles.iconBadge, { backgroundColor: theme.info + "20" }]}
        >
          <Feather name="thermometer" size={14} color={theme.info} />
        </View>
        <View style={styles.headerText}>
          <ThemedText style={[styles.headerTitle, { color: theme.info }]}>
            Wound Assessment
          </ThemedText>
          <ThemedText
            style={[styles.headerDate, { color: theme.textTertiary }]}
          >
            {new Date(createdAt).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
      {hasDimensions ? (
        <View style={styles.dimensionsRow}>
          <Feather name="maximize" size={14} color={theme.info} />
          <ThemedText style={[styles.dimensionText, { color: theme.text }]}>
            {data.lengthCm != null ? `${data.lengthCm}` : "-"} x{" "}
            {data.widthCm != null ? `${data.widthCm}` : "-"}
            {data.depthCm != null ? ` x ${data.depthCm}` : ""} cm
          </ThemedText>
          {data.areaCm2 != null ? (
            <ThemedText style={[styles.areaText, { color: theme.info }]}>
              {data.areaCm2.toFixed(1)} cm²
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.detailsGrid}>
        {data.tissueType ? (
          <View style={styles.detailItem}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textTertiary }]}
            >
              Tissue
            </ThemedText>
            <ThemedText style={[styles.detailValue, { color: theme.text }]}>
              {WOUND_BED_TISSUE_LABELS[data.tissueType]}
            </ThemedText>
          </View>
        ) : null}

        {data.exudateAmount ? (
          <View style={styles.detailItem}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textTertiary }]}
            >
              Exudate
            </ThemedText>
            <ThemedText style={[styles.detailValue, { color: theme.text }]}>
              {EXUDATE_AMOUNT_LABELS[data.exudateAmount]}
              {data.exudateType
                ? ` (${EXUDATE_TYPE_LABELS[data.exudateType]})`
                : ""}
            </ThemedText>
          </View>
        ) : null}

        {data.edgeStatus ? (
          <View style={styles.detailItem}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textTertiary }]}
            >
              Edge
            </ThemedText>
            <ThemedText style={[styles.detailValue, { color: theme.text }]}>
              {WOUND_EDGE_STATUS_LABELS[data.edgeStatus]}
            </ThemedText>
          </View>
        ) : null}

        {data.surroundingSkin ? (
          <View style={styles.detailItem}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textTertiary }]}
            >
              Skin
            </ThemedText>
            <ThemedText style={[styles.detailValue, { color: theme.text }]}>
              {SURROUNDING_SKIN_LABELS[data.surroundingSkin]}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {hasInfectionSigns ? (
        <View
          style={[styles.infectionRow, { backgroundColor: theme.error + "15" }]}
        >
          <Feather name="alert-triangle" size={13} color={theme.error} />
          <ThemedText style={[styles.infectionText, { color: theme.error }]}>
            {data
              .infectionSigns!.map((s) => INFECTION_SIGN_LABELS[s])
              .join(", ")}
          </ThemedText>
        </View>
      ) : null}

      {hasDressings ? (
        <View style={styles.dressingsSection}>
          <ThemedText
            style={[styles.detailLabel, { color: theme.textTertiary }]}
          >
            Dressings
          </ThemedText>
          {data.dressings.map((d, idx) => (
            <View key={`${d.productId}-${idx}`} style={styles.dressingItem}>
              <ThemedText style={[styles.dressingName, { color: theme.text }]}>
                {d.productName}
                {d.quantity != null && d.quantity > 1 ? ` x${d.quantity}` : ""}
              </ThemedText>
              <ThemedText
                style={[styles.dressingCategory, { color: theme.textTertiary }]}
              >
                {DRESSING_CATEGORY_LABELS[d.category]}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      {data.healingTrend ? (
        <View style={styles.trendRow}>
          <Feather
            name={getHealingTrendIcon(data.healingTrend) as any}
            size={14}
            color={getHealingTrendColor(data.healingTrend, theme)}
          />
          <ThemedText
            style={[
              styles.trendText,
              { color: getHealingTrendColor(data.healingTrend, theme) },
            ]}
          >
            {HEALING_TREND_LABELS[data.healingTrend]}
          </ThemedText>
        </View>
      ) : null}

      {data.clinicianNote ? (
        <ThemedText
          style={[styles.clinicianNote, { color: theme.textSecondary }]}
        >
          {data.clinicianNote}
        </ThemedText>
      ) : null}

      {data.nextReviewDate ? (
        <View style={styles.reviewRow}>
          <Feather name="calendar" size={12} color={theme.textTertiary} />
          <ThemedText
            style={[styles.reviewText, { color: theme.textTertiary }]}
          >
            Next review: {new Date(data.nextReviewDate).toLocaleDateString()}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  headerDate: {
    fontSize: 11,
  },
  container: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  dimensionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dimensionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  areaText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: "auto",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  detailItem: {
    minWidth: 80,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  infectionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  infectionText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  dressingsSection: {
    gap: 2,
  },
  dressingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  dressingName: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  dressingCategory: {
    fontSize: 11,
    marginLeft: Spacing.sm,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  trendText: {
    fontSize: 13,
    fontWeight: "700",
  },
  clinicianNote: {
    fontSize: 13,
    fontStyle: "italic",
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  reviewText: {
    fontSize: 11,
  },
});
