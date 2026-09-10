import type { OperativeRole } from "./operativeRole";
import type {
  DiagnosisGroup,
  DischargeOutcome,
  MortalityClassification,
  ComplicationEntry,
  UnplannedICUReason,
  AnaestheticType,
  StayType,
  AdmissionUrgency,
} from "./case";
import type { CaseTeamMember, TeamMemberOperativeRole } from "./teamContacts";

// ── Shared case inbox ────────────────────────────────────────────────────────

/** Metadata for a case shared with the current user (no PHI, safe for list rendering). */
export interface SharedCaseInboxEntry {
  id: string;
  caseId: string;
  ownerUserId: string;
  ownerDisplayName: string;
  /**
   * Only populated on outbox entries (i.e. cases the current user has
   * shared with others). On inbox entries this is absent — the recipient
   * is the current user.
   */
  recipientUserId?: string;
  recipientRole: string;
  verificationStatus: "pending" | "verified" | "disputed";
  blobVersion: number;
  createdAt: string;
  updatedAt: string;
}

// ── Shared case data (decrypted payload) ─────────────────────────────────────

/** Outcome fields extracted from a Case for sharing. */
export interface SharedCaseOutcomes {
  outcome?: DischargeOutcome;
  mortalityClassification?: MortalityClassification;
  unplannedICU?: UnplannedICUReason;
  returnToTheatre?: boolean;
  returnToTheatreReason?: string;
  discussedAtMDM?: boolean;
  complications?: ComplicationEntry[];
}

/** Decrypted shared case payload — the clinical record visible to team members. */
export interface SharedCaseData {
  // Patient identity — included for care team members
  patientFirstName?: string;
  patientLastName?: string;
  patientDateOfBirth?: string;
  patientNhi?: string;

  // Clinical record
  procedureDate: string;
  facility: string;
  diagnosisGroups: DiagnosisGroup[];
  urgency?: AdmissionUrgency;
  anaestheticType?: AnaestheticType;
  stayType?: StayType;
  outcomes: SharedCaseOutcomes;

  // Team
  teamRoles: TeamMemberEntry[];
  operativeTeam?: CaseTeamMember[];
  operativeRole?: OperativeRole;
  supervisionLevel?: string;
  /**
   * The case OWNER's identity snapshot (additive, 2.22.0+). operativeTeam
   * only carries TAGGED contacts, so without this the recipient side can
   * neither tier-compare against the owner (assessor role detection) nor
   * re-derive owner-involving EPA targets from the blob. careerStage is a
   * share-time snapshot, same semantics as team-member snapshots. Legacy
   * blobs simply lack the field — readers must fall back gracefully.
   */
  ownerParticipant?: OwnerParticipant;
}

/** The case owner's snapshot inside the shared blob. */
export interface OwnerParticipant {
  userId: string;
  displayName?: string;
  careerStage?: string | null;
}

// ── Team members ─────────────────────────────────────────────────────────────

export interface TeamMemberEntry {
  userId: string;
  displayName: string;
  role: string;
}

// ── User search ──────────────────────────────────────────────────────────────

export interface UserSearchResult {
  id: string;
  displayName: string;
  publicKeys: { deviceId: string; publicKey: string }[];
}

// ── EPA / Assessment types ───────────────────────────────────────────────────

/** Which side of the double-blind pair a party is on. Persisted server-side
 *  on `case_assessments.assessorRole` and, since 2.25.0, on the local
 *  `RevealedAssessmentPair.viewerRole` so every reveal / analytics surface
 *  can address the viewer correctly. */
export type AssessorRole = "supervisor" | "trainee";

export type EntrustmentLevel = 1 | 2 | 3 | 4 | 5;
export type TeachingQualityLevel = 1 | 2 | 3 | 4 | 5;

export const ENTRUSTMENT_LABELS: Record<EntrustmentLevel, string> = {
  1: "I had to do it",
  2: "I had to talk them through it",
  3: "I had to prompt from time to time",
  4: "I needed to be there just in case",
  5: "I did not need to be there",
};

/**
 * Part C of the trainee instrument (v2): a per-case global with PER-CASE
 * ATTAINABLE anchors. The field name `teachingQualityRating` is kept across
 * versions so legacy readers keep working; only the anchors changed (the v1
 * top anchor "changed my practice" was an aspirational lifetime event, not
 * a per-case outcome, and ceiling-compressed the scale).
 */
export const TEACHING_QUALITY_LABELS: Record<TeachingQualityLevel, string> = {
  1: "Poor",
  2: "Adequate",
  3: "Good",
  4: "Very good",
  5: "Outstanding",
};

/** v1 anchors — display-only for records committed before 2.23.0. */
export const TEACHING_QUALITY_LABELS_V1: Record<TeachingQualityLevel, string> =
  {
    1: "Took over / minimal teaching",
    2: "Instructed but didn't explain why",
    3: "Guided with explanations",
    4: "Excellent — adjusted to my level",
    5: "Outstanding — changed my practice",
  };

export function teachingQualityLabel(
  level: TeachingQualityLevel,
  instrumentVersion?: 1 | 2,
): string {
  return instrumentVersion === 2
    ? TEACHING_QUALITY_LABELS[level]
    : TEACHING_QUALITY_LABELS_V1[level];
}

/**
 * Part A of the trainee instrument (v2): granted-autonomy MATCH. How the
 * autonomy the supervisor granted compared with what the trainee could have
 * handled THIS case. A calibration construct, not a quality construct — the
 * ideal is the CENTRE (3), not the top, so it has no ceiling asymmetry and
 * is the true mirror of the supervisor's entrustment rating. Signed: both
 * tails are informative (under-entrustment / equity analysis).
 */
export type AutonomyMatchLevel = 1 | 2 | 3 | 4 | 5;

export const AUTONOMY_MATCH_LABELS: Record<AutonomyMatchLevel, string> = {
  1: "Held back",
  2: "Slightly under",
  3: "Well matched",
  4: "Slightly over",
  5: "Beyond me",
};

export const AUTONOMY_MATCH_DESCRIPTIONS: Record<AutonomyMatchLevel, string> = {
  1: "I was ready for more responsibility than I was given this case",
  2: "I could have done a little more",
  3: "The autonomy I was given fit what I could handle",
  4: "I was given a bit more than I was ready for",
  5: "I was given more responsibility than I could handle this case",
};

/**
 * The same anchors re-voiced for the SUPERVISOR reading the trainee's answer
 * at reveal. The first-person map above is what the trainee ticked; showing
 * it verbatim to the supervisor reads as if the supervisor were describing
 * themselves.
 */
export const AUTONOMY_MATCH_DESCRIPTIONS_FOR_SUPERVISOR: Record<
  AutonomyMatchLevel,
  string
> = {
  1: "They were ready for more responsibility than they were given this case",
  2: "They felt they could have done a little more",
  3: "The autonomy you gave fit what they could handle",
  4: "They were given a bit more than they were ready for",
  5: "They were given more responsibility than they could handle this case",
};

/**
 * Part B of the trainee instrument (v2): three BID (Briefing /
 * Intraoperative teaching / Debriefing) behaviour-frequency items, each
 * per-case attainable.
 */
export type BidItemKey = "briefing" | "intraop" | "debrief";
export const BID_ITEM_KEYS: readonly BidItemKey[] = [
  "briefing",
  "intraop",
  "debrief",
];
export type BidItemLevel = 0 | 1 | 2;
export type BidBehaviours = Record<BidItemKey, BidItemLevel>;

export const BID_ITEM_TITLES: Record<BidItemKey, string> = {
  briefing: "Set-up",
  intraop: "In-case teaching",
  debrief: "Debrief",
};

export const BID_ITEM_PROMPTS: Record<BidItemKey, string> = {
  briefing: "Before or early in the case, we agreed what I would focus on",
  intraop:
    "During the case I got useful guidance or feedback at the right moments",
  debrief: "After the case we discussed how I did and how to improve",
};

/** Supervisor-facing wording of the BID prompts (see
 *  `AUTONOMY_MATCH_DESCRIPTIONS_FOR_SUPERVISOR`). */
export const BID_ITEM_PROMPTS_FOR_SUPERVISOR: Record<BidItemKey, string> = {
  briefing: "Before or early in the case, you agreed what they would focus on",
  intraop:
    "During the case they got useful guidance or feedback at the right moments",
  debrief: "After the case you discussed how they did and how to improve",
};

export const BID_ITEM_LABELS: Record<BidItemLevel, string> = {
  0: "Not this case",
  1: "Somewhat",
  2: "Yes, clearly",
};

/**
 * Procedure attribution carried INSIDE the committed payload (first PS unit
 * of the derived target) so the reveal no longer guesses
 * `diagnosisGroups[0].procedures[0]`.
 */
export interface AssessmentProcedureRef {
  procedureSnomedCode: string;
  procedureDisplayName: string;
  procedureId?: string;
}

export interface SupervisorAssessment {
  entrustmentRating: EntrustmentLevel;
  caseComplexity?: "routine" | "moderate" | "complex";
  narrativeFeedback?: string;
  /** 2.23.0+ */
  procedure?: AssessmentProcedureRef;
  /** The trainee's role on the assessed unit — "PS" when target-derived. */
  traineeOperativeRole?: TeamMemberOperativeRole;
}

/** Pre-2.23.0 trainee payload (self-entrustment + old teaching global). */
export interface TraineeAssessmentV1 {
  instrumentVersion?: undefined;
  selfEntrustmentRating: EntrustmentLevel;
  teachingQualityRating: TeachingQualityLevel;
  teachingNarrative?: string;
  reflectiveNotes?: string;
}

/** 2.23.0+ trainee payload: self-entrustment + Part A + Part B + Part C. */
export interface TraineeAssessmentV2 {
  instrumentVersion: 2;
  selfEntrustmentRating: EntrustmentLevel;
  /** Part A — granted-autonomy match (required). */
  autonomyMatch: AutonomyMatchLevel;
  /** Part B — BID behaviour items (required). */
  bid: BidBehaviours;
  /** Part C — per-case global (required; per-case anchors). */
  teachingQualityRating: TeachingQualityLevel;
  teachingNarrative?: string;
  /** Never leaves the device — stripped before the shareable JSON is built. */
  reflectiveNotes?: string;
  procedure?: AssessmentProcedureRef;
  traineeOperativeRole?: TeamMemberOperativeRole;
}

export type TraineeAssessment = TraineeAssessmentV1 | TraineeAssessmentV2;

export function isTraineeAssessmentV2(
  a: TraineeAssessment,
): a is TraineeAssessmentV2 {
  return a.instrumentVersion === 2;
}

export interface RevealedAssessmentPair {
  supervisorEntrustment: EntrustmentLevel;
  traineeSelfEntrustment: EntrustmentLevel;
  teachingQuality: TeachingQualityLevel;
  supervisorNarrative?: string;
  caseComplexity?: string;
  revealedAt: string;
  procedureCode: string;
  procedureDisplayName: string;
  /** Phase C: true when only one side responded (72h timeout). Absent on
   *  legacy records — treated as full unless a rating is 0. */
  partial?: boolean;
  /** Phase C: the trainee's narrative feedback on the teaching. */
  teachingNarrative?: string;
  /** Which trainee instrument produced `teachingQuality` (anchors differ). */
  instrumentVersion?: 1 | 2;
  autonomyMatch?: AutonomyMatchLevel;
  bid?: BidBehaviours;
  /** "PS" on every target-derived record (2.23.0+). */
  traineeOperativeRole?: TeamMemberOperativeRole;
  /**
   * Which side the LOCAL user was on when this pair was revealed (2.25.0+).
   * Drives audience-aware copy on the reveal screen and the role split in
   * training analytics. Absent on records written before 2.25.0 — readers
   * backfill it from the locally stored own assessment where possible.
   */
  viewerRole?: AssessorRole;
}
