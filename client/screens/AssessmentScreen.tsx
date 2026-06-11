import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type {
  EntrustmentLevel,
  TeachingQualityLevel,
  SupervisorAssessment,
  TraineeAssessment,
  SharedCaseData,
} from "@/types/sharing";
import { ENTRUSTMENT_LABELS, TEACHING_QUALITY_LABELS } from "@/types/sharing";
import {
  getAssessmentStatus,
  commitAssessment,
  type AssessmentStatusResponse,
} from "@/lib/assessmentApi";
import { saveMyAssessment, savePendingCommit } from "@/lib/assessmentStorage";
import {
  generateCommitmentNonce,
  computeCommitment,
} from "@/lib/assessmentCommitment";
import { uploadPendingReveal } from "@/lib/assessmentReveal";
import {
  getDecryptedSharedCase,
  getSharedInboxIndex,
} from "@/lib/sharingStorage";
import {
  determineAssessorRole,
  type AssessorRole,
} from "@/lib/assessmentRoles";

type RouteProps = RouteProp<RootStackParamList, "Assessment">;
type NavProps = NativeStackNavigationProp<RootStackParamList, "Assessment">;

const ENTRUSTMENT_DESCRIPTIONS: Record<EntrustmentLevel, string> = {
  1: "Needed to take over the procedure entirely",
  2: "Guided each step with verbal instructions",
  3: "Occasional prompting to keep on track",
  4: "Supervised without needing to intervene",
  5: "Could have been absent — fully independent",
};

const TEACHING_DESCRIPTIONS: Record<TeachingQualityLevel, string> = {
  1: "Limited opportunity to learn or practice",
  2: "Told what to do without rationale",
  3: "Clear guidance with reasoning explained",
  4: "Teaching adapted to skill level with feedback",
  5: "Transformative — new insight or technique gained",
};

// ── Sub-components ───────────────────────────────────────────────────────────

function LevelCard({
  level,
  label,
  description,
  selected,
  onPress,
  testID,
}: {
  level: number;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.levelCard,
        {
          backgroundColor: selected
            ? `${theme.accent}18`
            : theme.backgroundElevated,
          borderColor: selected ? theme.accent : theme.border,
          borderLeftWidth: selected ? 3 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.levelNumberCircle,
          {
            backgroundColor: selected
              ? `${theme.accent}30`
              : theme.backgroundSecondary,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.levelNumber,
            { color: selected ? theme.accent : theme.textSecondary },
          ]}
        >
          {level}
        </ThemedText>
      </View>
      <View style={styles.levelTextContainer}>
        <ThemedText
          style={[
            styles.levelLabel,
            { color: selected ? theme.text : theme.textSecondary },
          ]}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
        <ThemedText
          style={[styles.levelDescription, { color: theme.textTertiary }]}
          numberOfLines={2}
        >
          {description}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function RoleChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.roleChip,
        {
          backgroundColor: selected
            ? `${theme.accent}18`
            : theme.backgroundElevated,
          borderColor: selected ? theme.accent : theme.border,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.roleChipText,
          { color: selected ? theme.accent : theme.textSecondary },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function AssessmentScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavProps>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { sharedCaseId } = route.params;

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AssessmentStatusResponse | null>(null);
  const [caseData, setCaseData] = useState<SharedCaseData | null>(null);
  const [ownerDisplayName, setOwnerDisplayName] = useState("");

  // Form state
  const [role, setRole] = useState<AssessorRole>("trainee");
  const [entrustment, setEntrustment] = useState<EntrustmentLevel | null>(null);
  const [teachingQuality, setTeachingQuality] =
    useState<TeachingQualityLevel | null>(null);
  const [complexity, setComplexity] = useState<
    "routine" | "moderate" | "complex" | null
  >(null);
  const [narrative, setNarrative] = useState("");
  const [teachingNarrative, setTeachingNarrative] = useState("");
  const [reflectiveNotes, setReflectiveNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showComplexity, setShowComplexity] = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);

  // Derive procedure name from shared case data
  const procedureName =
    caseData?.diagnosisGroups?.[0]?.procedures?.[0]?.procedureName ??
    caseData?.diagnosisGroups?.[0]?.diagnosis?.displayName ??
    "Procedure";

  // ── Load data ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [assessmentStatus, sharedCase, inboxIndex] = await Promise.all([
        getAssessmentStatus(sharedCaseId),
        getDecryptedSharedCase(sharedCaseId),
        getSharedInboxIndex(),
      ]);

      setStatus(assessmentStatus);
      setCaseData(sharedCase);

      // Get owner display name from inbox index
      const entry = inboxIndex.find((e) => e.id === sharedCaseId);
      if (entry) setOwnerDisplayName(entry.ownerDisplayName || "");

      // Auto-detect role
      const detectedRole = determineAssessorRole(
        user.id,
        assessmentStatus.ownerUserId,
        assessmentStatus.recipientUserId,
        sharedCase,
      );
      setRole(detectedRole);

      // If already revealed, navigate to reveal screen
      if (
        assessmentStatus.myAssessment?.revealedAt &&
        assessmentStatus.otherAssessment?.revealedAt
      ) {
        navigation.replace("AssessmentReveal", { sharedCaseId });
        return;
      }
    } catch (err) {
      console.error("Error loading assessment data:", err);
      setError("Failed to load assessment data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sharedCaseId, user, navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll for reveal on focus (when already submitted). For commit-reveal
  // submissions this also performs the phase-2 ciphertext upload as soon as
  // the counterpart has committed.
  useFocusEffect(
    useCallback(() => {
      if (!status?.myAssessment || status.myAssessment.revealedAt) return;

      let cancelled = false;
      (async () => {
        try {
          if (user) {
            const outcome = await uploadPendingReveal(sharedCaseId, user.id);
            if (!cancelled && outcome === "revealed") {
              navigation.replace("AssessmentReveal", { sharedCaseId });
              return;
            }
          }
          const updated = await getAssessmentStatus(sharedCaseId);
          if (cancelled) return;
          setStatus(updated);
          if (
            updated.myAssessment?.revealedAt &&
            updated.otherAssessment?.revealedAt
          ) {
            navigation.replace("AssessmentReveal", { sharedCaseId });
          }
        } catch {
          // Offline — ignore
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [sharedCaseId, status?.myAssessment, navigation, user]),
  );

  // ── Submit handler ───────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!user || !status || !entrustment) return;
    if (role === "trainee" && !teachingQuality) return;

    setSubmitting(true);
    try {
      // 1. Build assessment
      let assessment: SupervisorAssessment | TraineeAssessment;
      let shareable:
        | SupervisorAssessment
        | Omit<TraineeAssessment, "reflectiveNotes">;

      if (role === "supervisor") {
        const sup: SupervisorAssessment = {
          entrustmentRating: entrustment,
          ...(complexity ? { caseComplexity: complexity } : {}),
          ...(narrative.trim() ? { narrativeFeedback: narrative.trim() } : {}),
        };
        assessment = sup;
        shareable = sup;
      } else {
        const traineeAssessment: TraineeAssessment = {
          selfEntrustmentRating: entrustment,
          teachingQualityRating: teachingQuality!,
          ...(teachingNarrative.trim()
            ? { teachingNarrative: teachingNarrative.trim() }
            : {}),
          ...(reflectiveNotes.trim()
            ? { reflectiveNotes: reflectiveNotes.trim() }
            : {}),
        };
        assessment = traineeAssessment;
        // Strip reflective notes from shareable — they NEVER leave device
        const { reflectiveNotes: _stripped, ...rest } = traineeAssessment;
        shareable = rest;
      }

      // 2. Commit-reveal phase 1: send ONLY a hash commitment. The exact
      // serialized string is what gets hashed AND what later travels inside
      // the E2EE blob, so the counterpart can verify integrity on-device.
      // No assessment content reaches the server until both parties commit.
      const shareableJson = JSON.stringify(shareable);
      const nonceHex = await generateCommitmentNonce();
      const commitment = computeCommitment(shareableJson, nonceHex);

      const result = await commitAssessment({
        sharedCaseId,
        assessorRole: role,
        commitment,
      });

      // 3. Save own assessment locally (with reflective notes intact) plus
      // the pending-reveal state (survives restarts; any surface can upload).
      await saveMyAssessment(sharedCaseId, assessment);
      await savePendingCommit({
        sharedCaseId,
        assessmentId: result.id,
        assessorRole: role,
        shareableJson,
        nonceHex,
        commitment,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 4. If the counterpart already committed, complete the reveal now.
      if (result.bothCommitted) {
        const outcome = await uploadPendingReveal(sharedCaseId, user.id);
        if (outcome === "revealed") {
          navigation.replace("AssessmentReveal", { sharedCaseId });
          return;
        }
        if (outcome === "key-mismatch") {
          Alert.alert(
            "Reveal blocked — device key changed",
            "The other party's device key doesn't match the one pinned on this phone. Verify the change with them in Settings → Device Key Verification, then reopen this assessment.",
          );
        }
      }

      // Refresh status to show the waiting state.
      const updated = await getAssessmentStatus(sharedCaseId);
      setStatus(updated);
    } catch (err) {
      console.error("Error submitting assessment:", err);
      Alert.alert(
        "Submission Failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    user,
    status,
    role,
    entrustment,
    teachingQuality,
    complexity,
    narrative,
    teachingNarrative,
    reflectiveNotes,
    sharedCaseId,
    navigation,
  ]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ThemedText style={[styles.errorText, { color: theme.error }]}>
          {error}
        </ThemedText>
        <Pressable
          onPress={loadData}
          style={[styles.retryButton, { backgroundColor: theme.accent }]}
        >
          <ThemedText style={{ color: theme.buttonText, fontWeight: "600" }}>
            Retry
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  // Already submitted — show waiting state
  if (status?.myAssessment && !status.myAssessment.revealedAt) {
    const otherName =
      user?.id === status.ownerUserId
        ? "the other party"
        : ownerDisplayName || "the other party";

    return (
      <View
        testID="screen-assessment"
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.waitingContainer}>
          <View
            style={[
              styles.waitingCard,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
              },
              Shadows.card,
            ]}
          >
            <View style={styles.waitingIconRow}>
              <Feather name="check-circle" size={32} color={theme.success} />
            </View>
            <ThemedText style={[styles.waitingTitle, { color: theme.text }]}>
              Assessment Submitted
            </ThemedText>
            <ThemedText
              style={[styles.waitingSubtitle, { color: theme.textSecondary }]}
            >
              Waiting for {otherName} to complete their assessment
            </ThemedText>
            <ThemedText
              style={[styles.waitingDate, { color: theme.textTertiary }]}
            >
              Submitted{" "}
              {new Date(status.myAssessment.submittedAt).toLocaleDateString(
                "en-NZ",
                { day: "numeric", month: "short", year: "numeric" },
              )}
            </ThemedText>
            <ThemedText
              style={[styles.waitingHint, { color: theme.textTertiary }]}
            >
              Results will be available once both assessments are submitted, or
              after 72 hours.
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  const isValid =
    entrustment !== null && (role === "supervisor" || teachingQuality !== null);

  return (
    <View
      testID="screen-assessment"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Procedure context */}
        <View
          style={[
            styles.procedureHeader,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="activity" size={16} color={theme.accent} />
          <ThemedText
            style={[styles.procedureName, { color: theme.text }]}
            numberOfLines={2}
          >
            {procedureName}
          </ThemedText>
        </View>

        {/* Role selector */}
        <View style={styles.roleSection}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            You are assessing as:
          </ThemedText>
          <View style={styles.roleChipRow}>
            <RoleChip
              label="Supervisor"
              selected={role === "supervisor"}
              onPress={() => {
                setRole("supervisor");
                setTeachingQuality(null);
              }}
              testID="assessment.chip-role-supervisor"
            />
            <RoleChip
              label="Trainee"
              selected={role === "trainee"}
              onPress={() => {
                setRole("trainee");
                setComplexity(null);
                setNarrative("");
              }}
              testID="assessment.chip-role-trainee"
            />
          </View>
        </View>

        {/* Entrustment scale */}
        <View style={styles.scaleSection}>
          <ThemedText style={[styles.scaleTitle, { color: theme.text }]}>
            {role === "supervisor"
              ? "How independently did the trainee perform?"
              : "How independently did you perform?"}
          </ThemedText>
          {([1, 2, 3, 4, 5] as EntrustmentLevel[]).map((level) => (
            <LevelCard
              key={`entrustment-${level}`}
              level={level}
              label={ENTRUSTMENT_LABELS[level]}
              description={ENTRUSTMENT_DESCRIPTIONS[level]}
              selected={entrustment === level}
              onPress={() => setEntrustment(level)}
              testID={`assessment.card-entrustment-${level}`}
            />
          ))}
        </View>

        {/* Teaching quality (trainee only) */}
        {role === "trainee" ? (
          <View style={styles.scaleSection}>
            <ThemedText style={[styles.scaleTitle, { color: theme.text }]}>
              How was the teaching?
            </ThemedText>
            {([1, 2, 3, 4, 5] as TeachingQualityLevel[]).map((level) => (
              <LevelCard
                key={`teaching-${level}`}
                level={level}
                label={TEACHING_QUALITY_LABELS[level]}
                description={TEACHING_DESCRIPTIONS[level]}
                selected={teachingQuality === level}
                onPress={() => setTeachingQuality(level)}
                testID={`assessment.card-teaching-${level}`}
              />
            ))}
          </View>
        ) : null}

        {/* Case complexity (supervisor only, optional) */}
        {role === "supervisor" ? (
          <View style={styles.optionalSection}>
            <Pressable
              onPress={() => setShowComplexity((v) => !v)}
              style={styles.optionalToggle}
            >
              <ThemedText
                style={[
                  styles.optionalToggleText,
                  { color: theme.textSecondary },
                ]}
              >
                Case Complexity
              </ThemedText>
              <Feather
                name={showComplexity ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.textTertiary}
              />
            </Pressable>
            {showComplexity ? (
              <View style={styles.complexityChipRow}>
                {(["routine", "moderate", "complex"] as const).map((c) => (
                  <RoleChip
                    key={c}
                    label={c.charAt(0).toUpperCase() + c.slice(1)}
                    selected={complexity === c}
                    onPress={() => setComplexity(complexity === c ? null : c)}
                    testID={`assessment.chip-complexity-${c}`}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Narrative feedback (supervisor only, optional) */}
        {role === "supervisor" ? (
          <View style={styles.optionalSection}>
            <Pressable
              onPress={() => setShowNarrative((v) => !v)}
              style={styles.optionalToggle}
            >
              <ThemedText
                style={[
                  styles.optionalToggleText,
                  { color: theme.textSecondary },
                ]}
              >
                Narrative Feedback
              </ThemedText>
              <Feather
                name={showNarrative ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.textTertiary}
              />
            </Pressable>
            {showNarrative ? (
              <TextInput
                testID="assessment.input-narrative"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundElevated,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Any specific feedback?"
                placeholderTextColor={theme.textTertiary}
                value={narrative}
                onChangeText={setNarrative}
                multiline
                maxLength={500}
              />
            ) : null}
          </View>
        ) : null}

        {/* Teaching narrative (trainee, optional) */}
        {role === "trainee" ? (
          <View style={styles.optionalSection}>
            <TextInput
              testID="assessment.input-teachingNarrative"
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Any thoughts on the teaching? (optional)"
              placeholderTextColor={theme.textTertiary}
              value={teachingNarrative}
              onChangeText={setTeachingNarrative}
              multiline
              maxLength={500}
            />
          </View>
        ) : null}

        {/* Reflective notes (trainee only, private) */}
        {role === "trainee" ? (
          <View style={styles.optionalSection}>
            <TextInput
              testID="assessment.input-reflective"
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Private reflective notes (optional)"
              placeholderTextColor={theme.textTertiary}
              value={reflectiveNotes}
              onChangeText={setReflectiveNotes}
              multiline
              maxLength={1000}
            />
            <View style={styles.privateBadgeRow}>
              <Feather name="lock" size={12} color={theme.info} />
              <ThemedText
                style={[styles.privateBadgeText, { color: theme.info }]}
              >
                Private — never shared
              </ThemedText>
            </View>
          </View>
        ) : null}

        {/* Submit button */}
        <Pressable
          testID="assessment.btn-submit"
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          style={[
            styles.submitButton,
            {
              backgroundColor: isValid
                ? theme.accent
                : theme.backgroundSecondary,
              opacity: submitting ? 0.7 : 1,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={theme.buttonText} />
          ) : (
            <ThemedText
              style={[
                styles.submitButtonText,
                {
                  color: isValid ? theme.buttonText : theme.textTertiary,
                },
              ]}
            >
              Submit Assessment
            </ThemedText>
          )}
        </Pressable>
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
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["3xl"],
  },
  // Procedure header
  procedureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  procedureName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  // Role selector
  roleSection: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  roleChipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  roleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  roleChipText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // Scale sections
  scaleSection: {
    marginBottom: Spacing.lg,
  },
  scaleTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  // Level cards
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    minHeight: 72,
    gap: Spacing.md,
  },
  levelNumberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  levelTextContainer: {
    flex: 1,
  },
  levelLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  levelDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Optional sections
  optionalSection: {
    marginBottom: Spacing.md,
  },
  optionalToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  optionalToggleText: {
    fontSize: 15,
    fontWeight: "500",
  },
  complexityChipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  privateBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
  },
  privateBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Submit button
  submitButton: {
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
  // Waiting state
  waitingContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  waitingCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: "center",
  },
  waitingIconRow: {
    marginBottom: Spacing.md,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  waitingSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  waitingDate: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  waitingHint: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
