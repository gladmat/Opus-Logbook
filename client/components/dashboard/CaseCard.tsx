import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { EncryptedImage } from "@/components/EncryptedImage";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import {
  Case,
  getAllProcedures,
  getPrimaryDiagnosisName,
  getPrimarySiteLabel,
  isExcisionBiopsyDiagnosis,
} from "@/types/case";
import { getCasePrimaryTitle } from "@/lib/caseDiagnosisSummary";
import {
  getSkinCancerCaseBadge,
  caseCanAddHistology,
} from "@/lib/skinCancerConfig";
import { RoleBadge } from "@/components/RoleBadge";
import { SpecialtyIcon } from "@/components/SpecialtyIcon";

const BADGE_PRIORITY: Record<string, number> = {
  error: 0,
  warning: 1,
  info: 2,
  success: 3,
};

function getThemeColor(
  theme: ReturnType<typeof useTheme>["theme"],
  key: string,
): string {
  const colorMap: Record<string, string> = {
    warning: theme.warning,
    success: theme.success,
    error: theme.error,
    info: theme.info,
    textSecondary: theme.textSecondary,
  };
  return colorMap[key] ?? theme.textSecondary;
}

function formatRelativeDate(dateStr: string): string {
  const [yearRaw, monthRaw, dayRaw] = dateStr.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date =
    Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? new Date(year, month - 1, day, 12, 0, 0, 0)
      : new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

interface DashboardCaseCardProps {
  caseData: Case;
  onPress: () => void;
  onAddEvent?: () => void;
  onAddHistology?: () => void;
}

const CaseThumbnail = React.memo(function CaseThumbnail({
  caseData,
}: {
  caseData: Case;
}) {
  const { theme } = useTheme();
  const firstPhoto = caseData.operativeMedia?.[0];

  if (firstPhoto?.localUri) {
    return (
      <View
        style={[
          thumbStyles.container,
          { backgroundColor: theme.backgroundElevated },
        ]}
      >
        <EncryptedImage
          uri={firstPhoto.localUri}
          style={thumbStyles.image}
          resizeMode="cover"
          thumbnail
        />
      </View>
    );
  }

  return (
    <View
      style={[
        thumbStyles.container,
        { backgroundColor: theme.specialty[caseData.specialty] + "10" },
      ]}
    >
      <SpecialtyIcon
        specialty={caseData.specialty}
        size={20}
        color={theme.specialty[caseData.specialty]}
      />
    </View>
  );
});

function SiteChip({ caseData }: { caseData: Case }) {
  const { theme } = useTheme();
  const label = getPrimarySiteLabel(caseData);
  if (!label) return null;

  return (
    <View
      style={[chipStyles.chip, { backgroundColor: theme.textTertiary + "15" }]}
    >
      <ThemedText style={[chipStyles.chipText, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function DashboardCaseCardInner({
  caseData,
  onPress,
  onAddEvent,
  onAddHistology,
}: DashboardCaseCardProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const formattedDate = formatRelativeDate(caseData.procedureDate);

  const userRole =
    caseData.teamMembers.find((m) => m.id === caseData.ownerId)?.role || "PS";
  const showRoleBadge = userRole !== "PS";

  const caseTitle = getCasePrimaryTitle(caseData) || caseData.procedureType;
  const primaryDiagnosis = getPrimaryDiagnosisName(caseData) || caseTitle;
  const primaryProcedure =
    getAllProcedures(caseData)[0]?.procedureName || caseData.procedureType;

  const skinCancerBadge = useMemo(() => {
    let best: { label: string; colorKey: string } | null = null;
    let bestPriority = Infinity;

    for (const g of caseData.diagnosisGroups ?? []) {
      if (g.skinCancerAssessment) {
        const b = getSkinCancerCaseBadge(g.skinCancerAssessment);
        if (b && (BADGE_PRIORITY[b.colorKey] ?? 99) < bestPriority) {
          best = b;
          bestPriority = BADGE_PRIORITY[b.colorKey] ?? 99;
        }
      }
      for (const l of g.lesionInstances ?? []) {
        if (l.skinCancerAssessment) {
          const b = getSkinCancerCaseBadge(l.skinCancerAssessment);
          if (b && (BADGE_PRIORITY[b.colorKey] ?? 99) < bestPriority) {
            best = b;
            bestPriority = BADGE_PRIORITY[b.colorKey] ?? 99;
          }
        }
      }
    }
    return best;
  }, [caseData.diagnosisGroups]);

  const hasHistologyPending =
    !skinCancerBadge &&
    caseData.diagnosisGroups?.some(
      (g) =>
        g.diagnosisCertainty === "clinical" ||
        isExcisionBiopsyDiagnosis(g.diagnosisPicklistId),
    );

  const showHistologyAction = onAddHistology && caseCanAddHistology(caseData);
  const hasActions = showHistologyAction || onAddEvent;
  const hasMeta = showRoleBadge || !!skinCancerBadge || !!hasHistologyPending;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${caseData.patientIdentifier}, ${caseTitle}, ${formattedDate}`}
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: theme.backgroundElevated },
      ]}
    >
      <View style={styles.contentRow}>
        <CaseThumbnail caseData={caseData} />
        <View style={styles.contentText}>
          {hasMeta ? (
            <View style={styles.metaRow}>
              {showRoleBadge ? (
                <RoleBadge role={userRole} size="small" />
              ) : null}
              {skinCancerBadge ? (
                <View
                  style={[
                    chipStyles.chip,
                    {
                      backgroundColor:
                        getThemeColor(theme, skinCancerBadge.colorKey) + "20",
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      chipStyles.chipText,
                      {
                        color: getThemeColor(theme, skinCancerBadge.colorKey),
                      },
                    ]}
                  >
                    {skinCancerBadge.label}
                  </ThemedText>
                </View>
              ) : hasHistologyPending ? (
                <View
                  style={[
                    chipStyles.chip,
                    { backgroundColor: theme.accent + "20" },
                  ]}
                >
                  <ThemedText
                    style={[chipStyles.chipText, { color: theme.accent }]}
                  >
                    Histology pending
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}
          <ThemedText style={styles.title} numberOfLines={1}>
            {primaryDiagnosis}
          </ThemedText>
          <ThemedText
            style={[styles.procedureType, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {primaryProcedure}
          </ThemedText>
          <View style={styles.identityRow}>
            <SiteChip caseData={caseData} />
            <ThemedText
              style={[styles.patientId, { color: theme.textTertiary }]}
              numberOfLines={1}
            >
              {caseData.patientIdentifier}
            </ThemedText>
          </View>
          {hasActions ? (
            <View style={styles.actionRow}>
              {showHistologyAction ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onAddHistology!();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add histology for ${caseData.patientIdentifier}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    styles.actionChip,
                    {
                      backgroundColor: theme.accent + "15",
                      borderColor: theme.accent + "30",
                    },
                  ]}
                >
                  <Feather name="file-text" size={12} color={theme.accent} />
                  <ThemedText
                    style={[styles.actionChipText, { color: theme.accent }]}
                  >
                    Histology
                  </ThemedText>
                </Pressable>
              ) : null}
              {onAddEvent ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onAddEvent();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add event for ${caseData.patientIdentifier}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    styles.actionChip,
                    {
                      backgroundColor: theme.backgroundElevated,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Feather name="plus" size={12} color={theme.textSecondary} />
                  <ThemedText
                    style={[
                      styles.actionChipText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Event
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={styles.dateColumn}>
          <ThemedText style={[styles.dateText, { color: theme.textTertiary }]}>
            {formattedDate}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export const DashboardCaseCard = React.memo(DashboardCaseCardInner);

const thumbStyles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  image: {
    width: 48,
    height: 48,
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginRight: Spacing.xs,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "500",
  },
});

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  contentText: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  patientId: {
    fontSize: 11,
    fontWeight: "500",
    fontFamily: "monospace",
  },
  procedureType: {
    fontSize: 13,
  },
  dateColumn: {
    marginLeft: Spacing.sm,
    minWidth: 56,
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    flexWrap: "wrap",
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
