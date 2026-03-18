/**
 * BurnEpisodeTimeline — Horizontal timeline for burn episode detail screen.
 *
 * Shows chronological case cards with procedure badges, TBSA excised,
 * graft status, and a summary row with aggregate metrics.
 */

import React, { useMemo } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { BURN_PHASE_LABELS } from "@/types/burns";
import type {
  BurnEpisodeCaseSummary,
  BurnEpisodeAggregate,
} from "@/lib/burnsEpisodeHelpers";
import { computeBurnEpisodeAggregate } from "@/lib/burnsEpisodeHelpers";

// ─── Props ──────────────────────────────────────────────────────────────────

interface BurnEpisodeTimelineProps {
  cases: BurnEpisodeCaseSummary[];
  injuryDate?: string;
}

// ─── Category labels ────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  excision: "Excision",
  grafting: "Grafting",
  dermalSubstitute: "Dermal Sub",
  temporaryCoverage: "Temp Cover",
  contractureRelease: "Contracture",
  laser: "Laser",
  other: "Other",
};

// ─── Component ──────────────────────────────────────────────────────────────

export const BurnEpisodeTimeline = React.memo(function BurnEpisodeTimeline({
  cases,
  injuryDate,
}: BurnEpisodeTimelineProps) {
  const { theme } = useTheme();

  const aggregate = useMemo(
    () => computeBurnEpisodeAggregate(cases, injuryDate),
    [cases, injuryDate],
  );

  if (cases.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Summary metrics row */}
      <SummaryRow aggregate={aggregate} theme={theme} />

      {/* Horizontal case card timeline */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cases.map((c, idx) => (
          <React.Fragment key={c.caseId}>
            {idx > 0 ? (
              <View style={[styles.connector, { backgroundColor: theme.border }]} />
            ) : null}
            <CaseTimelineCard caseData={c} theme={theme} />
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
});

// ─── Summary row ────────────────────────────────────────────────────────────

function SummaryRow({
  aggregate,
  theme,
}: {
  aggregate: BurnEpisodeAggregate;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any;
}) {
  const metrics = useMemo(() => {
    const items: Array<{ label: string; value: string; icon: string }> = [];

    // Procedure counts
    const totalProcs = Object.values(aggregate.totalProceduresByCategory).reduce(
      (a, b) => a + b,
      0,
    );
    if (totalProcs > 0) {
      items.push({
        label: "Procedures",
        value: String(totalProcs),
        icon: "activity",
      });
    }

    // Cumulative TBSA excised
    if (aggregate.cumulativeTBSAExcised > 0) {
      items.push({
        label: "TBSA Excised",
        value: `${aggregate.cumulativeTBSAExcised}%`,
        icon: "scissors",
      });
    }

    // Average graft take
    if (aggregate.averageGraftTake != null) {
      items.push({
        label: "Graft Take",
        value: `${aggregate.averageGraftTake}%`,
        icon: "check-circle",
      });
    }

    // Days to first excision (BRANZ quality indicator)
    if (aggregate.daysToFirstExcision != null) {
      items.push({
        label: "Injury → Excision",
        value: `${aggregate.daysToFirstExcision}d`,
        icon: "clock",
      });
    }

    // Total treatment span
    if (aggregate.totalTreatmentSpanDays != null) {
      items.push({
        label: "Treatment Span",
        value: `${aggregate.totalTreatmentSpanDays}d`,
        icon: "calendar",
      });
    }

    return items;
  }, [aggregate]);

  return (
    <View style={styles.summaryRow}>
      {metrics.map((m) => (
        <View
          key={m.label}
          style={[
            styles.summaryCard,
            { backgroundColor: theme.backgroundElevated, borderColor: theme.border },
          ]}
        >
          <Feather name={m.icon as any} size={12} color={theme.link} />
          <ThemedText
            style={[styles.summaryValue, { color: theme.text }]}
          >
            {m.value}
          </ThemedText>
          <ThemedText
            style={[styles.summaryLabel, { color: theme.textTertiary }]}
            numberOfLines={1}
          >
            {m.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

// ─── Case card ──────────────────────────────────────────────────────────────

function CaseTimelineCard({
  caseData,
  theme,
}: {
  caseData: BurnEpisodeCaseSummary;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any;
}) {
  return (
    <View
      style={[
        styles.caseCard,
        { backgroundColor: theme.backgroundElevated, borderColor: theme.border },
      ]}
    >
      {/* Date + day count */}
      <View style={styles.cardHeader}>
        <ThemedText style={[styles.cardDate, { color: theme.text }]}>
          {caseData.date}
        </ThemedText>
        {caseData.daysSinceInjury != null ? (
          <ThemedText
            style={[styles.cardDayCount, { color: theme.textTertiary }]}
          >
            Day {caseData.daysSinceInjury}
          </ThemedText>
        ) : null}
      </View>

      {/* Phase badge */}
      <View
        style={[
          styles.phaseBadge,
          { backgroundColor: theme.link + "15", borderColor: theme.link + "30" },
        ]}
      >
        <ThemedText style={[styles.phaseBadgeText, { color: theme.link }]}>
          {BURN_PHASE_LABELS[caseData.phase]}
        </ThemedText>
      </View>

      {/* Procedure badges */}
      <View style={styles.procBadges}>
        {caseData.procedures.map((proc, idx) => (
          <View
            key={idx}
            style={[styles.procBadge, { backgroundColor: theme.backgroundRoot }]}
          >
            <ThemedText
              style={[styles.procBadgeText, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {proc.category
                ? CATEGORY_LABELS[proc.category] ?? proc.name
                : proc.name}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* TBSA excised */}
      {caseData.tbsaExcised ? (
        <ThemedText style={[styles.metric, { color: theme.textSecondary }]}>
          {caseData.tbsaExcised}% excised
        </ThemedText>
      ) : null}

      {/* Graft take */}
      {caseData.graftTake != null ? (
        <ThemedText
          style={[
            styles.metric,
            {
              color:
                caseData.graftTake >= 90
                  ? theme.success
                  : caseData.graftTake >= 70
                    ? theme.warning
                    : theme.error,
            },
          ]}
        >
          Graft take: {caseData.graftTake}%
        </ThemedText>
      ) : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  summaryCard: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 2,
    minWidth: 80,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
    gap: 0,
    alignItems: "center",
  },
  connector: {
    width: 20,
    height: 2,
  },
  caseCard: {
    width: 180,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  cardDate: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardDayCount: {
    fontSize: 11,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  phaseBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  phaseBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  procBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  procBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  procBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  metric: {
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
