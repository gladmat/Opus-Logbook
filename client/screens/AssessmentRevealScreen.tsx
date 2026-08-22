import React, { useState, useEffect, useCallback } from "react";
import {
  Alert,
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type {
  EntrustmentLevel,
  RevealedAssessmentPair,
  SupervisorAssessment,
  TraineeAssessment,
  SharedCaseData,
} from "@/types/sharing";
import {
  ENTRUSTMENT_LABELS,
  AUTONOMY_MATCH_LABELS,
  AUTONOMY_MATCH_DESCRIPTIONS,
  BID_ITEM_KEYS,
  BID_ITEM_TITLES,
  BID_ITEM_PROMPTS,
  BID_ITEM_LABELS,
  teachingQualityLabel,
} from "@/types/sharing";
import { getAssessmentStatus } from "@/lib/assessmentApi";
import {
  getRevealedPair,
  saveRevealedPair,
  getMyAssessment,
} from "@/lib/assessmentStorage";
import { getDecryptedSharedCase } from "@/lib/sharingStorage";
import { buildRevealedPair, isFullRevealedPair } from "@/lib/revealedPair";
import { resolveAssessmentProcedure } from "@/lib/assessmentProcedure";
import { deriveEpaFromSharedBlob } from "@/lib/epaFromBlob";
import {
  getOrCreateDeviceIdentity,
  unwrapCaseKeyEnvelope,
  decryptPayloadWithCaseKey,
  type CaseKeyEnvelope,
} from "@/lib/e2ee";
import {
  parseRevealPayload,
  verifyCommitment,
} from "@/lib/assessmentCommitment";

type RouteProps = RouteProp<RootStackParamList, "AssessmentReveal">;

// ── Calibration gap helpers ──────────────────────────────────────────────────

function getGapInfo(
  supervisorRating: EntrustmentLevel,
  traineeRating: EntrustmentLevel,
): { message: string; color: "success" | "warning" | "error" } {
  const gap = supervisorRating - traineeRating;
  const absGap = Math.abs(gap);

  if (absGap === 0) {
    return { message: "Aligned", color: "success" };
  }
  if (absGap === 1) {
    if (gap > 0) {
      return {
        message: "You may be underestimating yourself",
        color: "success",
      };
    }
    return {
      message: "Close alignment — minor difference",
      color: "success",
    };
  }
  if (absGap === 2) {
    if (gap > 0) {
      return {
        message: "Your supervisor sees more independence than you do",
        color: "warning",
      };
    }
    return {
      message: "Your supervisor sees room for growth here",
      color: "warning",
    };
  }
  // absGap >= 3
  if (gap > 0) {
    return {
      message: "Significant gap — you may be too self-critical",
      color: "error",
    };
  }
  return {
    message: "Significant gap — worth discussing together",
    color: "error",
  };
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function AssessmentRevealScreen() {
  const { theme } = useTheme();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { sharedCaseId } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pair, setPair] = useState<RevealedAssessmentPair | null>(null);
  const [caseData, setCaseData] = useState<SharedCaseData | null>(null);
  const [isPartialReveal, setIsPartialReveal] = useState(false);
  // "verified" | "failed" — null for legacy (pre-commit-reveal) payloads.
  const [integrity, setIntegrity] = useState<"verified" | "failed" | null>(
    null,
  );

  const loadReveal = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Load case data for context
      const sharedCase = await getDecryptedSharedCase(sharedCaseId);
      setCaseData(sharedCase);

      // 1. Check local cache first. A cached PARTIAL pair (72h path) is
      // upgraded when the counterpart has since revealed — fall through to
      // the full path and overwrite it.
      const cached = await getRevealedPair(sharedCaseId);
      let status: Awaited<ReturnType<typeof getAssessmentStatus>> | null = null;
      if (cached) {
        if (isFullRevealedPair(cached)) {
          setPair(cached);
          setLoading(false);
          return;
        }
        try {
          status = await getAssessmentStatus(sharedCaseId);
        } catch {
          // Offline — keep showing the cached partial pair.
        }
        if (!status?.otherAssessment?.revealedAt) {
          setIsPartialReveal(true);
          setPair(cached);
          setLoading(false);
          return;
        }
      }

      // 2. Fetch from server
      if (!status) status = await getAssessmentStatus(sharedCaseId);
      const myLocalAssessment = await getMyAssessment(sharedCaseId);

      // Procedure attribution: committed payloads carry it (2.23.0+);
      // the derived target / first procedure is the legacy fallback.
      const epaView = sharedCase
        ? deriveEpaFromSharedBlob({
            blob: sharedCase,
            viewerUserId: user.id,
            ownerUserId: status.ownerUserId,
            counterpartUserId:
              user.id === status.ownerUserId
                ? status.recipientUserId
                : status.ownerUserId,
          })
        : null;
      const fallbackProcedure = resolveAssessmentProcedure(
        epaView?.myTarget ?? null,
        sharedCase,
      );

      // Handle partial reveal (72h timeout — other party didn't submit)
      if (!status.otherAssessment) {
        setIsPartialReveal(true);

        if (myLocalAssessment) {
          // Build a partial pair from our own assessment only
          const isSupervisor =
            status.myAssessment?.assessorRole === "supervisor";
          const partialPair = buildRevealedPair({
            supervisor: isSupervisor
              ? (myLocalAssessment as SupervisorAssessment)
              : null,
            trainee: isSupervisor
              ? null
              : (myLocalAssessment as TraineeAssessment),
            revealedAt:
              status.myAssessment?.revealedAt ?? new Date().toISOString(),
            fallbackProcedure,
          });
          setPair(partialPair);
          await saveRevealedPair(sharedCaseId, partialPair);
        }
        setLoading(false);
        return;
      }

      // 3. Full reveal — decrypt other party's assessment
      const { deviceId } = await getOrCreateDeviceIdentity();
      const envelope = status.otherAssessment.keyEnvelopes.find(
        (e) => e.recipientDeviceId === deviceId,
      );

      if (!envelope || !status.otherAssessment.encryptedAssessment) {
        setError(
          "Cannot decrypt assessment — no key envelope found for this device.",
        );
        setLoading(false);
        return;
      }

      const parsedEnvelope: CaseKeyEnvelope = JSON.parse(envelope.envelopeJson);
      const assessmentKeyHex = await unwrapCaseKeyEnvelope(parsedEnvelope);
      const otherPlaintext = decryptPayloadWithCaseKey(
        status.otherAssessment.encryptedAssessment,
        assessmentKeyHex,
      );

      // Commit-reveal integrity check: the v2 payload carries the exact
      // JSON string the counterpart committed to, plus their nonce. If the
      // recomputed hash doesn't match the commitment the server stored at
      // phase 1, the content was changed after committing — surface loudly.
      const { shareableJson, commitmentNonce } =
        parseRevealPayload(otherPlaintext);
      if (commitmentNonce && status.otherAssessment.commitment) {
        const verified = verifyCommitment(
          shareableJson,
          commitmentNonce,
          status.otherAssessment.commitment,
        );
        setIntegrity(verified ? "verified" : "failed");
        if (!verified) {
          Alert.alert(
            "Integrity check failed",
            "The other party's assessment does not match the commitment they made before seeing yours. Treat this assessment with caution.",
          );
        }
      } else {
        setIntegrity(null);
      }

      const otherAssessment = JSON.parse(shareableJson) as
        | SupervisorAssessment
        | TraineeAssessment;

      // 4. Build revealed pair
      const myRole = status.myAssessment?.assessorRole;
      const iAmSupervisor = myRole === "supervisor";

      const supervisorAssessment = iAmSupervisor
        ? (myLocalAssessment as SupervisorAssessment)
        : (otherAssessment as SupervisorAssessment);
      const traineeAssessment = iAmSupervisor
        ? (otherAssessment as TraineeAssessment)
        : (myLocalAssessment as TraineeAssessment);

      const revealedPair = buildRevealedPair({
        supervisor: supervisorAssessment,
        trainee: traineeAssessment,
        revealedAt: status.myAssessment?.revealedAt ?? new Date().toISOString(),
        fallbackProcedure,
      });

      setIsPartialReveal(false);
      setPair(revealedPair);
      await saveRevealedPair(sharedCaseId, revealedPair);
    } catch (err) {
      console.error("Error loading reveal:", err);
      setError("Failed to load assessment results. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sharedCaseId, user]);

  useEffect(() => {
    loadReveal();
  }, [loadReveal]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator size="large" color={theme.accent} />
        <ThemedText
          style={[styles.loadingText, { color: theme.textSecondary }]}
        >
          Decrypting assessments...
        </ThemedText>
      </View>
    );
  }

  if (error || !pair) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ThemedText style={[styles.errorText, { color: theme.error }]}>
          {error || "No assessment data available"}
        </ThemedText>
      </View>
    );
  }

  const hasFullPair = !isPartialReveal && isFullRevealedPair(pair);
  const gapInfo = hasFullPair
    ? getGapInfo(pair.supervisorEntrustment, pair.traineeSelfEntrustment)
    : null;
  const missingSide = !(pair.supervisorEntrustment > 0)
    ? "Supervisor"
    : !(pair.traineeSelfEntrustment > 0)
      ? "Trainee"
      : null;

  return (
    <View
      testID="screen-assessmentReveal"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Procedure context */}
        <View
          style={[
            styles.contextCard,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
            Shadows.card,
          ]}
        >
          <ThemedText style={[styles.contextProcedure, { color: theme.text }]}>
            {pair.procedureDisplayName}
          </ThemedText>
          {caseData ? (
            <ThemedText
              style={[styles.contextDetail, { color: theme.textSecondary }]}
            >
              {caseData.procedureDate} · {caseData.facility}
            </ThemedText>
          ) : null}
          {integrity !== null ? (
            <View style={styles.integrityRow}>
              <Feather
                name={
                  integrity === "verified" ? "check-circle" : "alert-triangle"
                }
                size={13}
                color={integrity === "verified" ? theme.success : theme.error}
              />
              <ThemedText
                style={[
                  styles.integrityText,
                  {
                    color:
                      integrity === "verified" ? theme.success : theme.error,
                  },
                ]}
                testID="assessmentReveal.integrity"
              >
                {integrity === "verified"
                  ? "Integrity verified — matches their pre-reveal commitment"
                  : "Integrity check FAILED — content changed after commitment"}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Partial reveal banner (Phase C) */}
        {!hasFullPair && missingSide ? (
          <View
            testID="assessmentReveal.partial"
            style={[
              styles.partialBanner,
              {
                backgroundColor: theme.warningSurface,
                borderColor: theme.warningBorder,
              },
            ]}
          >
            <Feather name="clock" size={16} color={theme.warning} />
            <ThemedText style={[styles.partialText, { color: theme.warning }]}>
              Partial reveal — {missingSide.toLowerCase()} did not respond
              within 72 hours. Excluded from learning curves and calibration.
            </ThemedText>
          </View>
        ) : null}

        {/* Entrustment comparison */}
        <View
          style={[
            styles.comparisonCard,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
            Shadows.card,
          ]}
        >
          <ThemedText
            style={[styles.cardSectionTitle, { color: theme.textSecondary }]}
          >
            OPERATIVE ENTRUSTMENT
          </ThemedText>

          <View style={styles.numbersRow}>
            {/* Supervisor rating */}
            <View style={styles.ratingColumn}>
              {pair.supervisorEntrustment > 0 ? (
                <>
                  <ThemedText
                    testID="assessmentReveal.entrustment-supervisor"
                    style={[styles.bigNumber, { color: theme.text }]}
                  >
                    {pair.supervisorEntrustment}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.ratingRoleLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Supervisor
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.ratingDescription,
                      { color: theme.textTertiary },
                    ]}
                    numberOfLines={2}
                  >
                    {ENTRUSTMENT_LABELS[pair.supervisorEntrustment]}
                  </ThemedText>
                </>
              ) : (
                <>
                  <ThemedText
                    style={[styles.bigNumber, { color: theme.textTertiary }]}
                  >
                    —
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.ratingRoleLabel,
                      { color: theme.textTertiary },
                    ]}
                  >
                    Supervisor
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.ratingDescription,
                      { color: theme.textTertiary },
                    ]}
                  >
                    Did not respond
                  </ThemedText>
                </>
              )}
            </View>

            {/* Trainee self-assessment */}
            <View style={styles.ratingColumn}>
              {pair.traineeSelfEntrustment > 0 ? (
                <>
                  <ThemedText
                    testID="assessmentReveal.entrustment-trainee"
                    style={[styles.bigNumber, { color: theme.text }]}
                  >
                    {pair.traineeSelfEntrustment}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.ratingRoleLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Self
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.ratingDescription,
                      { color: theme.textTertiary },
                    ]}
                    numberOfLines={2}
                  >
                    {ENTRUSTMENT_LABELS[pair.traineeSelfEntrustment]}
                  </ThemedText>
                </>
              ) : (
                <>
                  <ThemedText
                    style={[styles.bigNumber, { color: theme.textTertiary }]}
                  >
                    —
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.ratingRoleLabel,
                      { color: theme.textTertiary },
                    ]}
                  >
                    Self
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.ratingDescription,
                      { color: theme.textTertiary },
                    ]}
                  >
                    Did not respond
                  </ThemedText>
                </>
              )}
            </View>
          </View>

          {/* Calibration gap badge */}
          {gapInfo ? (
            <View
              testID="assessmentReveal.badge-calibrationGap"
              style={[
                styles.gapBadge,
                { backgroundColor: `${theme[gapInfo.color]}18` },
              ]}
            >
              <Feather
                name={
                  gapInfo.color === "success"
                    ? "check-circle"
                    : gapInfo.color === "warning"
                      ? "alert-circle"
                      : "alert-triangle"
                }
                size={16}
                color={theme[gapInfo.color]}
              />
              <ThemedText
                style={[styles.gapText, { color: theme[gapInfo.color] }]}
              >
                {gapInfo.message}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Autonomy match (trainee instrument v2, Part A) */}
        {pair.autonomyMatch ? (
          <View
            style={[
              styles.comparisonCard,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
              },
              Shadows.card,
            ]}
          >
            <ThemedText
              style={[styles.cardSectionTitle, { color: theme.textSecondary }]}
            >
              AUTONOMY MATCH
            </ThemedText>
            <ThemedText
              testID="assessmentReveal.autonomy"
              style={[styles.teachingNumber, { color: theme.text }]}
            >
              {pair.autonomyMatch}
            </ThemedText>
            <ThemedText
              style={[styles.teachingDescription, { color: theme.text }]}
            >
              {AUTONOMY_MATCH_LABELS[pair.autonomyMatch]}
            </ThemedText>
            <ThemedText
              style={[styles.autonomyHint, { color: theme.textSecondary }]}
            >
              {AUTONOMY_MATCH_DESCRIPTIONS[pair.autonomyMatch]}
            </ThemedText>
            <ThemedText
              style={[styles.autonomyCaption, { color: theme.textTertiary }]}
            >
              How the autonomy granted this case matched what the trainee could
              handle — 3 is the ideal.
            </ThemedText>
          </View>
        ) : null}

        {/* Teaching behaviours (trainee instrument v2, Part B) */}
        {pair.bid ? (
          <View
            style={[
              styles.comparisonCard,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
              },
              Shadows.card,
            ]}
          >
            <ThemedText
              style={[styles.cardSectionTitle, { color: theme.textSecondary }]}
            >
              TEACHING THIS CASE
            </ThemedText>
            {BID_ITEM_KEYS.map((key) => {
              const level = pair.bid![key];
              return (
                <View
                  key={key}
                  testID={`assessmentReveal.bid-${key}`}
                  style={[styles.bidRow, { borderBottomColor: theme.border }]}
                >
                  <View style={styles.bidRowText}>
                    <ThemedText
                      style={[styles.bidTitle, { color: theme.text }]}
                    >
                      {BID_ITEM_TITLES[key]}
                    </ThemedText>
                    <ThemedText
                      style={[styles.bidPrompt, { color: theme.textTertiary }]}
                      numberOfLines={2}
                    >
                      {BID_ITEM_PROMPTS[key]}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.bidBadge,
                      {
                        backgroundColor:
                          level === 2
                            ? theme.successSurface
                            : level === 1
                              ? theme.warningSurface
                              : theme.backgroundSecondary,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.bidBadgeText,
                        {
                          color:
                            level === 2
                              ? theme.success
                              : level === 1
                                ? theme.warning
                                : theme.textSecondary,
                        },
                      ]}
                    >
                      {BID_ITEM_LABELS[level]}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Teaching quality (global) */}
        {pair.teachingQuality > 0 ? (
          <View
            style={[
              styles.comparisonCard,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
              },
              Shadows.card,
            ]}
          >
            <ThemedText
              style={[styles.cardSectionTitle, { color: theme.textSecondary }]}
            >
              {pair.instrumentVersion === 2
                ? "OVERALL TEACHING THIS CASE"
                : "TEACHING QUALITY"}
            </ThemedText>
            <ThemedText
              testID="assessmentReveal.teaching-quality"
              style={[styles.teachingNumber, { color: theme.text }]}
            >
              {pair.teachingQuality}
            </ThemedText>
            <ThemedText
              style={[
                styles.teachingDescription,
                { color: theme.textSecondary },
              ]}
            >
              {teachingQualityLabel(
                pair.teachingQuality,
                pair.instrumentVersion,
              )}
            </ThemedText>
          </View>
        ) : null}

        {/* Trainee narrative on the teaching (Phase C — was dropped before) */}
        {pair.teachingNarrative ? (
          <View
            style={[
              styles.narrativeCard,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
              },
              Shadows.card,
            ]}
          >
            <ThemedText
              style={[styles.cardSectionTitle, { color: theme.textSecondary }]}
            >
              TRAINEE FEEDBACK ON TEACHING
            </ThemedText>
            <View
              style={[
                styles.narrativeBlock,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText
                testID="assessmentReveal.teachingNarrative"
                style={[styles.narrativeText, { color: theme.text }]}
              >
                {pair.teachingNarrative}
              </ThemedText>
            </View>
          </View>
        ) : null}

        {/* Supervisor narrative */}
        {pair.supervisorNarrative ? (
          <View
            style={[
              styles.narrativeCard,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
              },
              Shadows.card,
            ]}
          >
            <ThemedText
              style={[styles.cardSectionTitle, { color: theme.textSecondary }]}
            >
              SUPERVISOR FEEDBACK
            </ThemedText>
            <View
              style={[
                styles.narrativeBlock,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText style={[styles.narrativeText, { color: theme.text }]}>
                {pair.supervisorNarrative}
              </ThemedText>
            </View>
          </View>
        ) : null}

        {/* Case complexity */}
        {pair.caseComplexity ? (
          <View style={styles.metaRow}>
            <ThemedText
              style={[styles.metaLabel, { color: theme.textTertiary }]}
            >
              Case complexity:
            </ThemedText>
            <View
              style={[
                styles.complexityBadge,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText
                style={[styles.complexityText, { color: theme.textSecondary }]}
              >
                {pair.caseComplexity.charAt(0).toUpperCase() +
                  pair.caseComplexity.slice(1)}
              </ThemedText>
            </View>
          </View>
        ) : null}

        {/* Immutability footer */}
        <View style={styles.footer}>
          <Feather name="lock" size={14} color={theme.textTertiary} />
          <ThemedText
            style={[styles.footerText, { color: theme.textTertiary }]}
          >
            Assessments locked on{" "}
            {new Date(pair.revealedAt).toLocaleDateString("en-NZ", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    fontSize: 15,
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["3xl"],
  },
  // Context card
  contextCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  contextProcedure: {
    fontSize: 18,
    fontWeight: "700",
  },
  contextDetail: {
    fontSize: 14,
    marginTop: 4,
  },
  integrityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  integrityText: {
    fontSize: 12,
    flexShrink: 1,
  },
  // Comparison card
  comparisonCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  numbersRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.md,
  },
  ratingColumn: {
    alignItems: "center",
    flex: 1,
  },
  bigNumber: {
    fontSize: 48,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    lineHeight: 56,
  },
  ratingRoleLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  ratingDescription: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  // Gap badge
  gapBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  gapText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  // Partial banner
  partialBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  partialText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  // Autonomy match
  autonomyHint: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  autonomyCaption: {
    fontSize: 12,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  // BID rows
  bidRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bidRowText: {
    flex: 1,
  },
  bidTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  bidPrompt: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  bidBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  bidBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Teaching quality
  teachingNumber: {
    fontSize: 36,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  teachingDescription: {
    fontSize: 15,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  // Narrative
  narrativeCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  narrativeBlock: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  narrativeText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: "italic",
  },
  // Meta row
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metaLabel: {
    fontSize: 13,
  },
  complexityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  complexityText: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  footerText: {
    fontSize: 13,
  },
});
