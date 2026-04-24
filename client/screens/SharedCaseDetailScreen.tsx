import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { SharedCaseData } from "@/types/sharing";
import {
  OPERATIVE_ROLE_LABELS,
  type OperativeRole,
} from "@/types/operativeRole";
import {
  TEAM_MEMBER_ROLE_LABELS,
  type CaseTeamMember,
} from "@/types/teamContacts";
import {
  SPECIALTY_LABELS,
  ADMISSION_URGENCY_LABELS,
  ANAESTHETIC_TYPE_LABELS,
  DISCHARGE_OUTCOME_LABELS,
  STAY_TYPE_LABELS,
  type AdmissionUrgency,
  type AnaestheticType,
  type DischargeOutcome,
  type StayType,
} from "@/types/case";
import { getDiagnosisGroupTitle } from "@/lib/caseDiagnosisSummary";
import { getSharedCaseDetail, verifySharedCase } from "@/lib/sharingApi";
import {
  getDecryptedSharedCase,
  saveDecryptedSharedCase,
  saveCaseKey,
} from "@/lib/sharingStorage";
import {
  getOrCreateDeviceIdentity,
  unwrapCaseKeyEnvelope,
  decryptPayloadWithCaseKey,
  type CaseKeyEnvelope,
} from "@/lib/e2ee";
import {
  getAssessmentStatus,
  type AssessmentStatusResponse,
} from "@/lib/assessmentApi";
import { ENTRUSTMENT_LABELS, type EntrustmentLevel } from "@/types/sharing";

type RouteProps = RouteProp<RootStackParamList, "SharedCaseDetail">;
type NavProps = NativeStackNavigationProp<
  RootStackParamList,
  "SharedCaseDetail"
>;

const ROLE_LABELS: Record<string, string> = {
  surgeon: "Surgeon",
  supervisor: "Supervisor",
  trainee: "Trainee",
};

// ── Sub-components ──────────────────────────────────────────────────────────

/**
 * Renders one row of the Team card. Shows the member's name + their
 * per-case role, plus a "Not on Opus" pill for contacts the sender has
 * not linked to an Opus account. The sender's local `team_contacts`
 * email / phone fields are intentionally NOT in the shared blob — those
 * are third-party PII that didn't need to travel to recipients.
 */
function TeamMemberRow({
  member,
  themeColors,
}: {
  member: CaseTeamMember;
  themeColors: {
    text: string;
    accent: string;
    textSecondary: string;
    border: string;
  };
}) {
  const roleLabel =
    TEAM_MEMBER_ROLE_LABELS[member.operativeRole] ?? member.operativeRole;
  const isLinked = !!member.linkedUserId;
  return (
    <View style={styles.teamMemberRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ThemedText
          style={[styles.teamName, { color: themeColors.text }]}
          numberOfLines={1}
        >
          {member.displayName}
        </ThemedText>
        {!isLinked ? (
          <ThemedText
            style={{
              fontSize: 11,
              color: themeColors.textSecondary,
              marginTop: 2,
            }}
          >
            Not on Opus
          </ThemedText>
        ) : null}
      </View>
      <View
        style={[
          styles.teamRoleBadge,
          { backgroundColor: themeColors.accent + "20" },
        ]}
      >
        <ThemedText
          style={[styles.teamRoleText, { color: themeColors.accent }]}
        >
          {roleLabel}
        </ThemedText>
      </View>
    </View>
  );
}

function DetailCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.border,
        },
        Shadows.card,
      ]}
    >
      <View style={styles.cardHeader}>
        <Feather name={icon} size={16} color={theme.accent} />
        <ThemedText style={[styles.cardTitle, { color: theme.text }]}>
          {title}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  const { theme } = useTheme();
  if (!value) return null;
  return (
    <View style={styles.row}>
      <ThemedText style={[styles.rowLabel, { color: theme.textTertiary }]}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.rowValue, { color: theme.text }]}>
        {value}
      </ThemedText>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function SharedCaseDetailScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavProps>();
  const route = useRoute<RouteProps>();
  const { sharedCaseId } = route.params;

  const [caseData, setCaseData] = useState<SharedCaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "verified" | "disputed"
  >("pending");
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [verificationNote, setVerificationNote] = useState<string | null>(null);
  const [recipientRole, setRecipientRole] = useState<string>("");
  const [ownerDisplayName, setOwnerDisplayName] = useState<string>("");
  const [assessmentStatus, setAssessmentStatus] =
    useState<AssessmentStatusResponse | null>(null);

  // Dispute modal state
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [disputeNote, setDisputeNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadCase = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Check local cache first
      const cached = await getDecryptedSharedCase(sharedCaseId);
      if (cached) {
        setCaseData(cached);
        setLoading(false);
        // Still fetch metadata for verification status
        try {
          const detail = await getSharedCaseDetail(sharedCaseId);
          setVerificationStatus(
            detail.verificationStatus as "pending" | "verified" | "disputed",
          );
          setRecipientRole(detail.recipientRole);
        } catch {
          // Offline — use cached data, keep whatever status we have
        }
        return;
      }

      // 2. Fetch encrypted data from server
      const detail = await getSharedCaseDetail(sharedCaseId);
      setVerificationStatus(
        detail.verificationStatus as "pending" | "verified" | "disputed",
      );
      setRecipientRole(detail.recipientRole);

      // 3. Get device identity to find matching envelope
      const { deviceId } = await getOrCreateDeviceIdentity();

      // 4. Find matching key envelope
      const envelope = detail.keyEnvelopes.find(
        (e) => e.recipientDeviceId === deviceId,
      );
      if (!envelope) {
        setError(
          "No decryption key found for this device. The case may have been shared before you registered this device.",
        );
        setLoading(false);
        return;
      }

      // 5. Unwrap case key
      const parsedEnvelope: CaseKeyEnvelope = JSON.parse(envelope.envelopeJson);
      const caseKeyHex = await unwrapCaseKeyEnvelope(parsedEnvelope);

      // 6. Decrypt blob
      const plaintext = decryptPayloadWithCaseKey(
        detail.encryptedShareableBlob,
        caseKeyHex,
      );
      const decrypted: SharedCaseData = JSON.parse(plaintext);

      // 7. Cache locally
      await saveCaseKey(sharedCaseId, caseKeyHex);
      await saveDecryptedSharedCase(sharedCaseId, decrypted);

      setCaseData(decrypted);
    } catch (err) {
      console.error("Error loading shared case:", err);
      setError("Failed to decrypt this case. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sharedCaseId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  // Fetch owner display name from inbox index metadata
  useEffect(() => {
    (async () => {
      try {
        const { getSharedInboxIndex } = await import("@/lib/sharingStorage");
        const index = await getSharedInboxIndex();
        const entry = index.find((e) => e.id === sharedCaseId);
        if (entry) {
          setOwnerDisplayName(entry.ownerDisplayName || "");
          setVerificationStatus(entry.verificationStatus);
        }
      } catch {
        // Non-critical
      }
    })();
  }, [sharedCaseId]);

  // Fetch assessment status when verified (on mount + each focus)
  useFocusEffect(
    useCallback(() => {
      if (verificationStatus !== "verified") return;
      let cancelled = false;
      (async () => {
        try {
          const status = await getAssessmentStatus(sharedCaseId);
          if (!cancelled) setAssessmentStatus(status);
        } catch {
          // Non-critical — assessment card will show default state
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [sharedCaseId, verificationStatus]),
  );

  const handleVerify = async () => {
    setSubmitting(true);
    try {
      await verifySharedCase(sharedCaseId, "verified");
      setVerificationStatus("verified");
      setVerifiedAt(new Date().toISOString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to verify case. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeNote.trim()) {
      Alert.alert("Note required", "Please provide a reason for disputing.");
      return;
    }
    setSubmitting(true);
    try {
      await verifySharedCase(sharedCaseId, "disputed", disputeNote.trim());
      setVerificationStatus("disputed");
      setVerificationNote(disputeNote.trim());
      setShowDisputeInput(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      Alert.alert("Error", "Failed to submit dispute. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View
        testID="screen-sharedCaseDetail"
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator size="large" color={theme.accent} />
        <ThemedText
          style={[styles.loadingText, { color: theme.textSecondary }]}
        >
          Decrypting case...
        </ThemedText>
      </View>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (error || !caseData) {
    return (
      <View
        testID="screen-sharedCaseDetail"
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <Feather name="alert-circle" size={48} color={theme.error} />
        <ThemedText style={[styles.errorText, { color: theme.text }]}>
          {error || "Unable to load case data."}
        </ThemedText>
        <Pressable
          onPress={loadCase}
          style={[styles.retryButton, { backgroundColor: theme.accent }]}
        >
          <ThemedText style={[styles.retryText, { color: theme.buttonText }]}>
            Retry
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  // ── Build patient name ────────────────────────────────────────────────────

  const patientName = [caseData.patientFirstName, caseData.patientLastName]
    .filter(Boolean)
    .join(" ");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View
      testID="screen-sharedCaseDetail"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Role badge */}
        <View
          style={[styles.roleBanner, { backgroundColor: theme.accent + "15" }]}
        >
          <ThemedText style={[styles.roleLabel, { color: theme.accent }]}>
            YOUR ROLE:{" "}
            {(ROLE_LABELS[recipientRole] || recipientRole).toUpperCase()}
          </ThemedText>
        </View>

        {ownerDisplayName ? (
          <ThemedText style={[styles.sharedBy, { color: theme.textSecondary }]}>
            Shared by Dr {ownerDisplayName}
          </ThemedText>
        ) : null}

        {/* Patient card */}
        <DetailCard title="Patient" icon="user">
          {patientName ? <DetailRow label="Name" value={patientName} /> : null}
          <DetailRow
            label="Date of Birth"
            value={caseData.patientDateOfBirth}
          />
          <DetailRow label="NHI" value={caseData.patientNhi} />
          {!patientName &&
          !caseData.patientDateOfBirth &&
          !caseData.patientNhi ? (
            <ThemedText style={[styles.noData, { color: theme.textTertiary }]}>
              No patient identity shared
            </ThemedText>
          ) : null}
        </DetailCard>

        {/* Case card */}
        <DetailCard title="Case" icon="clipboard">
          <DetailRow label="Procedure Date" value={caseData.procedureDate} />
          <DetailRow label="Facility" value={caseData.facility} />
          {(caseData.diagnosisGroups ?? []).map((group, idx) => {
            const title = getDiagnosisGroupTitle(group);
            const specialty =
              SPECIALTY_LABELS[
                group.specialty as keyof typeof SPECIALTY_LABELS
              ];
            const procedures = (group.procedures ?? [])
              .map((p) => p.procedureName)
              .filter(Boolean)
              .join(", ");

            return (
              <View key={idx} style={styles.diagnosisGroup}>
                {specialty ? (
                  <ThemedText
                    style={[styles.specialtyLabel, { color: theme.accent }]}
                  >
                    {specialty}
                  </ThemedText>
                ) : null}
                {title ? (
                  <ThemedText
                    style={[styles.diagnosisName, { color: theme.text }]}
                  >
                    {title}
                  </ThemedText>
                ) : null}
                {procedures ? (
                  <ThemedText
                    style={[
                      styles.procedureList,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {procedures}
                  </ThemedText>
                ) : null}
              </View>
            );
          })}
        </DetailCard>

        {/* Operative card */}
        <DetailCard title="Operative" icon="activity">
          <DetailRow
            label="Urgency"
            value={
              caseData.urgency
                ? ADMISSION_URGENCY_LABELS[caseData.urgency as AdmissionUrgency]
                : undefined
            }
          />
          <DetailRow
            label="Anaesthetic"
            value={
              caseData.anaestheticType
                ? ANAESTHETIC_TYPE_LABELS[
                    caseData.anaestheticType as AnaestheticType
                  ]
                : undefined
            }
          />
          <DetailRow
            label="Stay Type"
            value={
              caseData.stayType
                ? STAY_TYPE_LABELS[caseData.stayType as StayType]
                : undefined
            }
          />
          <DetailRow
            label="Operative Role"
            value={
              caseData.operativeRole
                ? OPERATIVE_ROLE_LABELS[caseData.operativeRole as OperativeRole]
                : undefined
            }
          />
          <DetailRow label="Supervision" value={caseData.supervisionLevel} />
        </DetailCard>

        {/* Outcomes card */}
        <DetailCard title="Outcomes" icon="check-circle">
          <DetailRow
            label="Discharge"
            value={
              caseData.outcomes?.outcome
                ? DISCHARGE_OUTCOME_LABELS[
                    caseData.outcomes.outcome as DischargeOutcome
                  ]
                : undefined
            }
          />
          {caseData.outcomes?.complications &&
          caseData.outcomes.complications.length > 0 ? (
            <View style={styles.row}>
              <ThemedText
                style={[styles.rowLabel, { color: theme.textTertiary }]}
              >
                Complications
              </ThemedText>
              {caseData.outcomes.complications.map((c, i) => (
                <ThemedText
                  key={i}
                  style={[styles.rowValue, { color: theme.error }]}
                >
                  {c.description || "Unknown complication"}
                </ThemedText>
              ))}
            </View>
          ) : null}
          <DetailRow
            label="MDM Discussed"
            value={
              caseData.outcomes?.discussedAtMDM != null
                ? caseData.outcomes.discussedAtMDM
                  ? "Yes"
                  : "No"
                : undefined
            }
          />
          <DetailRow
            label="Unplanned ICU"
            value={caseData.outcomes?.unplannedICU}
          />
          <DetailRow
            label="Return to Theatre"
            value={
              caseData.outcomes?.returnToTheatre != null
                ? caseData.outcomes.returnToTheatre
                  ? caseData.outcomes.returnToTheatreReason || "Yes"
                  : "No"
                : undefined
            }
          />
        </DetailCard>

        {/* Team card. We prefer the operativeTeam data when present (richer:
            all team members incl. those not on Opus, with their per-case
            role + per-procedure overrides). If a sender is still on the
            v1 blob (teamRoles only — Opus-linked users), fall back to
            that so older shares don't break. */}
        <DetailCard title="Team" icon="users">
          {(() => {
            const operativeTeam = caseData.operativeTeam ?? [];
            if (operativeTeam.length > 0) {
              return operativeTeam.map((member, idx) => (
                <TeamMemberRow
                  key={`${member.contactId}-${idx}`}
                  member={member}
                  themeColors={{
                    text: theme.text,
                    accent: theme.accent,
                    textSecondary: theme.textSecondary,
                    border: theme.border,
                  }}
                />
              ));
            }

            const teamRoles = caseData.teamRoles ?? [];
            if (teamRoles.length > 0) {
              return teamRoles.map((member, idx) => (
                <View key={idx} style={styles.teamMemberRow}>
                  <ThemedText style={[styles.teamName, { color: theme.text }]}>
                    {member.displayName}
                  </ThemedText>
                  <View
                    style={[
                      styles.teamRoleBadge,
                      { backgroundColor: theme.accent + "20" },
                    ]}
                  >
                    <ThemedText
                      style={[styles.teamRoleText, { color: theme.accent }]}
                    >
                      {ROLE_LABELS[member.role] || member.role}
                    </ThemedText>
                  </View>
                </View>
              ));
            }

            return (
              <ThemedText
                style={[styles.noData, { color: theme.textTertiary }]}
              >
                No team data shared
              </ThemedText>
            );
          })()}
        </DetailCard>

        {/* Verification section */}
        <View style={styles.verificationSection}>
          {verificationStatus === "pending" ? (
            <>
              <ThemedText
                style={[styles.verificationPrompt, { color: theme.text }]}
              >
                Verify your involvement in this case
              </ThemedText>

              {showDisputeInput ? (
                <View style={styles.disputeInputContainer}>
                  <TextInput
                    value={disputeNote}
                    onChangeText={setDisputeNote}
                    placeholder="Reason for dispute..."
                    placeholderTextColor={theme.textTertiary}
                    multiline
                    style={[
                      styles.disputeInput,
                      {
                        backgroundColor: theme.backgroundElevated,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                  />
                  <View style={styles.disputeActions}>
                    <Pressable
                      onPress={() => {
                        setShowDisputeInput(false);
                        setDisputeNote("");
                      }}
                      style={[
                        styles.actionButton,
                        { borderColor: theme.border, borderWidth: 1 },
                      ]}
                    >
                      <ThemedText style={{ color: theme.textSecondary }}>
                        Cancel
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={handleDispute}
                      disabled={submitting}
                      style={[
                        styles.actionButton,
                        { backgroundColor: theme.warning },
                      ]}
                    >
                      <ThemedText
                        style={{ color: "#FFFFFF", fontWeight: "600" }}
                      >
                        {submitting ? "Submitting..." : "Submit Dispute"}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.verificationButtons}>
                  <Pressable
                    testID="sharedCaseDetail.btn-verify"
                    onPress={handleVerify}
                    disabled={submitting}
                    style={[
                      styles.verifyButton,
                      { backgroundColor: theme.success },
                    ]}
                  >
                    <Feather name="check" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.verifyButtonText}>
                      {submitting ? "Verifying..." : "Verify"}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    testID="sharedCaseDetail.btn-dispute"
                    onPress={() => setShowDisputeInput(true)}
                    disabled={submitting}
                    style={[
                      styles.disputeButton,
                      { borderColor: theme.warning },
                    ]}
                  >
                    <Feather
                      name="alert-triangle"
                      size={18}
                      color={theme.warning}
                    />
                    <ThemedText
                      style={[
                        styles.disputeButtonText,
                        { color: theme.warning },
                      ]}
                    >
                      Dispute
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </>
          ) : verificationStatus === "verified" ? (
            <View
              style={[
                styles.statusBanner,
                { backgroundColor: theme.success + "15" },
              ]}
            >
              <Feather name="check-circle" size={20} color={theme.success} />
              <ThemedText style={[styles.statusText, { color: theme.success }]}>
                Verified
                {verifiedAt
                  ? ` on ${new Date(verifiedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                  : ""}
              </ThemedText>
            </View>
          ) : (
            <View
              style={[
                styles.statusBanner,
                { backgroundColor: theme.error + "15" },
              ]}
            >
              <Feather name="alert-triangle" size={20} color={theme.error} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText style={[styles.statusText, { color: theme.error }]}>
                  Disputed
                </ThemedText>
                {verificationNote ? (
                  <ThemedText
                    style={[
                      styles.disputeNoteText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {verificationNote}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          )}
        </View>

        {/* Assessment card */}
        {verificationStatus === "verified"
          ? (() => {
              const my = assessmentStatus?.myAssessment;
              const other = assessmentStatus?.otherAssessment;
              const isRevealed = !!(
                my?.revealedAt &&
                (other?.revealedAt || !other)
              );

              // Revealed — show summary with "View Results" button
              if (isRevealed && my) {
                return (
                  <Pressable
                    onPress={() =>
                      navigation.navigate("AssessmentReveal", { sharedCaseId })
                    }
                    style={[
                      styles.assessmentCard,
                      {
                        backgroundColor: theme.backgroundElevated,
                        borderColor: theme.accent,
                      },
                      Shadows.card,
                    ]}
                  >
                    <Feather
                      name="check-circle"
                      size={20}
                      color={theme.success}
                    />
                    <View style={styles.assessmentCardText}>
                      <ThemedText
                        style={[styles.assessmentTitle, { color: theme.text }]}
                      >
                        Assessment Complete
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.assessmentSubtitle,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Tap to view results
                      </ThemedText>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={theme.accent}
                    />
                  </Pressable>
                );
              }

              // Submitted, waiting for other party
              if (my && !my.revealedAt) {
                return (
                  <View
                    style={[
                      styles.assessmentCard,
                      {
                        backgroundColor: theme.backgroundElevated,
                        borderColor: theme.border,
                      },
                      Shadows.card,
                    ]}
                  >
                    <Feather name="clock" size={20} color={theme.accent} />
                    <View style={styles.assessmentCardText}>
                      <ThemedText
                        style={[styles.assessmentTitle, { color: theme.text }]}
                      >
                        Assessment Submitted
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.assessmentSubtitle,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Waiting for the other party to submit
                      </ThemedText>
                    </View>
                  </View>
                );
              }

              // Not started — show "Begin Assessment" CTA
              return (
                <Pressable
                  onPress={() =>
                    navigation.navigate("Assessment", { sharedCaseId })
                  }
                  style={[
                    styles.assessmentCard,
                    {
                      backgroundColor: theme.backgroundElevated,
                      borderColor: theme.accent,
                    },
                    Shadows.card,
                  ]}
                >
                  <Feather name="bar-chart-2" size={20} color={theme.accent} />
                  <View style={styles.assessmentCardText}>
                    <ThemedText
                      style={[styles.assessmentTitle, { color: theme.text }]}
                    >
                      Assess Operative Performance
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.assessmentSubtitle,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Rate entrustment and teaching quality
                    </ThemedText>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={theme.accent}
                  />
                </Pressable>
              );
            })()
          : null}
      </ScrollView>
    </View>
  );
}

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
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing["3xl"],
  },
  loadingText: {
    fontSize: 15,
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Role banner
  roleBanner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sharedBy: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: Spacing.md,
  },

  // Cards
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Rows
  row: {
    marginBottom: Spacing.xs,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
  },

  // Diagnosis groups
  diagnosisGroup: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  specialtyLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  diagnosisName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  procedureList: {
    fontSize: 14,
  },

  // Team
  teamMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  teamName: {
    fontSize: 15,
    flex: 1,
  },
  teamRoleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  teamRoleText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Verification
  verificationSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  verificationPrompt: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  verificationButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  verifyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  disputeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  disputeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  disputeInputContainer: {
    gap: Spacing.sm,
  },
  disputeInput: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.sm,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 15,
  },
  disputeActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
  },

  // Status banners
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "600",
  },
  disputeNoteText: {
    fontSize: 14,
    marginTop: 2,
  },

  // Assessment card
  assessmentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  assessmentCardText: {
    flex: 1,
  },
  assessmentTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  assessmentSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  noData: {
    fontSize: 14,
    fontStyle: "italic",
  },
});
