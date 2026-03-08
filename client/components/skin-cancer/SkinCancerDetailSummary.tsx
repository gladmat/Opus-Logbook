/**
 * SkinCancerDetailSummary
 * ═══════════════════════════════════════════════════════════
 * Read-only summary component rendered in CaseDetailScreen.
 * Shows per-lesion pathology, margins, SLNB
 * using label-value pairs matching existing detail screen patterns.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import {
  RARE_TYPE_METADATA,
  getSkinCancerPrimaryHistology,
} from "@/lib/skinCancerConfig";
import type { SkinCancerLesionAssessment } from "@/types/skinCancer";

// Theme color key lookup — avoids TS issues with `theme[colorKey]` since theme has nested objects
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

// ─── Constants ─────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  bcc: "BCC",
  scc: "SCC",
  melanoma: "Melanoma",
  merkel_cell: "MCC",
  rare_malignant: "Rare malignant",
  benign: "Benign",
  uncertain: "Uncertain",
};

const MARGIN_LABELS: Record<string, { label: string; key: string }> = {
  complete: { label: "Clear", key: "success" },
  close: { label: "Close", key: "warning" },
  incomplete: { label: "Involved", key: "error" },
  pending: { label: "Pending", key: "warning" },
  unknown: { label: "Unknown", key: "textSecondary" },
};

// ─── Props ─────────────────────────────────────────────────────────

interface SkinCancerDetailSummaryProps {
  assessment: SkinCancerLesionAssessment;
  /** Label for multi-lesion mode: "Lesion 1", "Lesion 2", etc. */
  lesionLabel?: string;
}

// ─── Component ─────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <ThemedText
        style={[styles.value, { color: valueColor ?? theme.text }]}
        numberOfLines={1}
      >
        {value}
      </ThemedText>
    </View>
  );
}

export function SkinCancerDetailSummary({
  assessment,
  lesionLabel,
}: SkinCancerDetailSummaryProps) {
  const { theme } = useTheme();
  const histo = getSkinCancerPrimaryHistology(assessment);
  const priorOnlyHistology =
    assessment.currentHistology?.pathologyCategory &&
    assessment.priorHistology?.pathologyCategory
      ? assessment.priorHistology
      : undefined;

  // Pathology label
  let pathologyText = "";
  if (histo?.pathologyCategory) {
    pathologyText = CATEGORY_LABELS[histo.pathologyCategory] ?? histo.pathologyCategory;
    if (histo.pathologyCategory === "rare_malignant" && histo.rareSubtype) {
      const meta = RARE_TYPE_METADATA[histo.rareSubtype];
      if (meta) pathologyText = meta.label;
    }
    if (histo.bccSubtype) pathologyText += ` — ${histo.bccSubtype}`;
    if (histo.melanomaSubtype) pathologyText += ` — ${histo.melanomaSubtype}`;
  } else if (assessment.clinicalSuspicion) {
    pathologyText = `?${(CATEGORY_LABELS[assessment.clinicalSuspicion] ?? assessment.clinicalSuspicion).toUpperCase()}`;
  }

  // Breslow
  const breslow =
    histo?.pathologyCategory === "melanoma" && histo.melanomaBreslowMm !== undefined
      ? `${histo.melanomaBreslowMm} mm`
      : undefined;

  // Margin status
  const marginInfo = histo?.marginStatus
    ? MARGIN_LABELS[histo.marginStatus]
    : undefined;

  // Site
  const site = assessment.site;
  const laterality = assessment.laterality;
  const siteText = [site, laterality].filter(Boolean).join(", ");

  // SLNB
  let slnbText: string | undefined;
  if (assessment.slnb) {
    const s = assessment.slnb;
    if (s.performed) {
      const sitesLabel = s.sites.length > 0 ? s.sites.join(", ") : "";
      slnbText = `Performed${sitesLabel ? ` — ${sitesLabel}` : ""}`;
      if (s.nodesRetrieved !== undefined) {
        slnbText += `, ${s.nodesRetrieved} node(s)`;
      }
      if (s.result) {
        const isPositive = s.result.startsWith("positive");
        slnbText += ` — ${s.result === "negative" ? "Negative" : isPositive ? "Positive" : "Pending"}`;
      }
    } else if (s.offered === false) {
      slnbText = "Not offered";
    } else if (s.offered) {
      slnbText = "Offered — not performed";
    }
  }

  return (
    <View
      style={[styles.container, { borderTopColor: theme.border }]}
    >
      {lesionLabel && (
        <ThemedText style={[styles.lesionHeader, { color: theme.link }]}>
          {lesionLabel}
        </ThemedText>
      )}

      {pathologyText ? (
        <DetailRow label="Pathology" value={pathologyText} />
      ) : null}

      {priorOnlyHistology?.pathologyCategory ? (
        <DetailRow
          label="Prior histology"
          value={
            priorOnlyHistology.pathologyCategory === "rare_malignant" &&
            priorOnlyHistology.rareSubtype
              ? (RARE_TYPE_METADATA[priorOnlyHistology.rareSubtype]?.label ??
                "Rare malignant")
              : (CATEGORY_LABELS[priorOnlyHistology.pathologyCategory] ??
                priorOnlyHistology.pathologyCategory)
          }
        />
      ) : null}

      {breslow && <DetailRow label="Breslow" value={breslow} />}

      {siteText ? <DetailRow label="Site" value={siteText} /> : null}

      {marginInfo && (
        <DetailRow
          label="Margins"
          value={marginInfo.label}
          valueColor={getThemeColor(theme, marginInfo.key)}
        />
      )}

      {slnbText && <DetailRow label="SLNB" value={slnbText} />}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    gap: 4,
  },
  lesionHeader: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "400",
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
});
