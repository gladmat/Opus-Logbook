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

// ── Shared case inbox ────────────────────────────────────────────────────────

/** Metadata for a case shared with the current user (no PHI, safe for list rendering). */
export interface SharedCaseInboxEntry {
  id: string;
  caseId: string;
  ownerUserId: string;
  ownerDisplayName: string;
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
  operativeRole?: OperativeRole;
  supervisionLevel?: string;
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

export type EntrustmentLevel = 1 | 2 | 3 | 4 | 5;
export type TeachingQualityLevel = 1 | 2 | 3 | 4 | 5;

export const ENTRUSTMENT_LABELS: Record<EntrustmentLevel, string> = {
  1: "I had to do it",
  2: "I had to talk them through it",
  3: "I had to prompt from time to time",
  4: "I needed to be there just in case",
  5: "I did not need to be there",
};

export const TEACHING_QUALITY_LABELS: Record<TeachingQualityLevel, string> = {
  1: "Took over / minimal teaching",
  2: "Instructed but didn't explain why",
  3: "Guided with explanations",
  4: "Excellent — adjusted to my level",
  5: "Outstanding — changed my practice",
};

export interface SupervisorAssessment {
  entrustmentRating: EntrustmentLevel;
  caseComplexity?: "routine" | "moderate" | "complex";
  narrativeFeedback?: string;
}

export interface TraineeAssessment {
  selfEntrustmentRating: EntrustmentLevel;
  teachingQualityRating: TeachingQualityLevel;
  teachingNarrative?: string;
  reflectiveNotes?: string;
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
}
