/**
 * EpaAssessmentsCard — owner-facing pending-assessment surface on
 * CaseDetailScreen. Renders the EPA targets derived at save time
 * (assessmentStorage.getEpaTargets — previously write-only) joined with
 * the share outbox and per-share assessment status, so the case OWNER
 * finally has an entry point into the commit-reveal assessment flow
 * (which was reachable only from the recipient's shared inbox).
 *
 * Renders null when the case has no EPA targets.
 */

import React, { useState, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getEpaTargets } from "@/lib/assessmentStorage";
import { getSharedOutbox } from "@/lib/sharingApi";
import {
  getAssessmentStatus,
  type AssessmentStatusResponse,
} from "@/lib/assessmentApi";
import type { EpaAssessmentTarget } from "@/lib/epaDerivation";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface TargetRow {
  target: EpaAssessmentTarget;
  /** True when the logger supervises (assesses the counterpart). */
  iAmSupervisor: boolean;
  counterpartName: string;
  /** Share row for the counterpart, when the case reached them. */
  sharedCaseId: string | null;
  status: AssessmentStatusResponse | null;
}

interface EpaAssessmentsCardProps {
  caseId: string;
}

export function EpaAssessmentsCard({ caseId }: EpaAssessmentsCardProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const [rows, setRows] = useState<TargetRow[]>([]);

  const load = useCallback(async () => {
    try {
      const targets = await getEpaTargets(caseId);
      if (targets.length === 0) {
        setRows([]);
        return;
      }
      let outbox: Awaited<ReturnType<typeof getSharedOutbox>> = [];
      try {
        outbox = await getSharedOutbox();
      } catch {
        // Offline — render targets without share status.
      }
      const built = await Promise.all(
        targets.map(async (target): Promise<TargetRow> => {
          const iAmSupervisor = target.supervisorContactId === "self";
          const counterpartUserId = iAmSupervisor
            ? target.traineeLinkedUserId
            : target.supervisorLinkedUserId;
          const counterpartName = iAmSupervisor
            ? target.traineeDisplayName
            : target.supervisorDisplayName;
          const share = outbox.find(
            (s) =>
              s.caseId === caseId && s.recipientUserId === counterpartUserId,
          );
          let status: AssessmentStatusResponse | null = null;
          if (share) {
            try {
              status = await getAssessmentStatus(share.id);
            } catch {
              // Status unavailable — still show the row with a CTA.
            }
          }
          return {
            target,
            iAmSupervisor,
            counterpartName,
            sharedCaseId: share?.id ?? null,
            status,
          };
        }),
      );
      setRows(built);
    } catch {
      setRows([]);
    }
  }, [caseId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (rows.length === 0) return null;

  return (
    <>
      <View style={styles.headerRow}>
        <ThemedText type="h3">Assessments</ThemedText>
      </View>
      <View
        style={[styles.card, { backgroundColor: theme.backgroundDefault }]}
        testID="caseDetail.epa.card"
      >
        {rows.map((row) => {
          const unitLabels = Array.from(
            new Set(
              row.target.units.map(
                (u) => u.stepLabel ?? u.procedureDisplayName,
              ),
            ),
          );
          const scope =
            unitLabels.length <= 2
              ? unitLabels.join(" · ")
              : `${unitLabels.slice(0, 2).join(" · ")} +${unitLabels.length - 2} more`;

          const revealed =
            row.status?.myAssessment?.revealedAt != null &&
            row.status?.otherAssessment?.revealedAt != null;
          const mineDone = row.status?.myAssessment != null;
          const theirsDone = row.status?.otherAssessment != null;

          let statusText: string;
          let cta: { label: string; onPress: () => void } | null = null;
          if (!row.sharedCaseId) {
            statusText = `Not shared with ${row.counterpartName} yet — re-save the case to share it.`;
          } else if (revealed) {
            statusText = "Both assessments revealed.";
            cta = {
              label: "View",
              onPress: () =>
                navigation.navigate("AssessmentReveal", {
                  sharedCaseId: row.sharedCaseId!,
                }),
            };
          } else if (mineDone) {
            statusText = theirsDone
              ? "Both submitted — revealing…"
              : `Submitted — waiting for ${row.counterpartName}.`;
            cta = {
              label: "Open",
              onPress: () =>
                navigation.navigate("Assessment", {
                  sharedCaseId: row.sharedCaseId!,
                }),
            };
          } else {
            statusText = theirsDone
              ? `${row.counterpartName} has submitted — add yours to reveal both.`
              : "Awaiting your assessment.";
            cta = {
              label: "Assess",
              onPress: () =>
                navigation.navigate("Assessment", {
                  sharedCaseId: row.sharedCaseId!,
                  suggestedRole: row.iAmSupervisor ? "supervisor" : "trainee",
                }),
            };
          }

          return (
            <View
              key={`${row.target.supervisorLinkedUserId}-${row.target.traineeLinkedUserId}`}
              style={[styles.row, { borderBottomColor: theme.border }]}
            >
              <View style={styles.rowText}>
                <ThemedText style={[styles.direction, { color: theme.text }]}>
                  {row.iAmSupervisor
                    ? `You assess ${row.counterpartName}`
                    : `${row.counterpartName} assesses you`}
                </ThemedText>
                <ThemedText
                  style={[styles.scope, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {scope}
                </ThemedText>
                <ThemedText
                  style={[styles.status, { color: theme.textTertiary }]}
                >
                  {statusText}
                </ThemedText>
              </View>
              {cta ? (
                <Pressable
                  style={[styles.ctaButton, { backgroundColor: theme.link }]}
                  onPress={cta.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={`${cta.label} assessment with ${row.counterpartName}`}
                  testID={`caseDetail.epa.btn-${row.sharedCaseId}`}
                >
                  <ThemedText
                    style={[styles.ctaText, { color: theme.buttonText }]}
                  >
                    {cta.label}
                  </ThemedText>
                </Pressable>
              ) : (
                <Feather name="clock" size={16} color={theme.textTertiary} />
              )}
            </View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  direction: {
    fontSize: 14,
    fontWeight: "600",
  },
  scope: {
    fontSize: 13,
    marginTop: 1,
  },
  status: {
    fontSize: 12,
    marginTop: 2,
  },
  ctaButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minHeight: 36,
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
