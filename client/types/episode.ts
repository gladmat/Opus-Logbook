import type { Specialty, DiagnosisGroup } from "@/types/case";

// ── Episode Status (state machine) ──────────────────────────────────────────
// planned → active ⇄ on_hold → completed | cancelled
export type EpisodeStatus =
  | "planned"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export const EPISODE_STATUS_LABELS: Record<EpisodeStatus, string> = {
  planned: "Planned",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const EPISODE_STATUS_TRANSITIONS: Record<
  EpisodeStatus,
  EpisodeStatus[]
> = {
  planned: ["active", "cancelled"],
  active: ["on_hold", "completed", "cancelled"],
  on_hold: ["active", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// ── Episode Type (7 values) ─────────────────────────────────────────────────
export type EpisodeType =
  | "wound_management"
  | "staged_reconstruction"
  | "multi_stage_microsurgery"
  | "burns_management"
  | "infection_management"
  | "cancer_pathway"
  | "other";

export const EPISODE_TYPE_LABELS: Record<EpisodeType, string> = {
  wound_management: "Wound Management",
  staged_reconstruction: "Staged Reconstruction",
  multi_stage_microsurgery: "Multi-Stage Microsurgery",
  burns_management: "Burns Management",
  infection_management: "Infection Management",
  cancer_pathway: "Cancer Pathway",
  other: "Other",
};

// ── Encounter Class (4 values) ──────────────────────────────────────────────
export type EncounterClass =
  | "inpatient_theatre"
  | "day_case_theatre"
  | "outpatient_procedure"
  | "emergency_theatre";

export const ENCOUNTER_CLASS_LABELS: Record<EncounterClass, string> = {
  inpatient_theatre: "Inpatient Theatre",
  day_case_theatre: "Day Case Theatre",
  outpatient_procedure: "Outpatient Procedure",
  emergency_theatre: "Emergency Theatre",
};

// ── Pending Action (9 values) ───────────────────────────────────────────────
export type PendingAction =
  | "awaiting_histology"
  | "awaiting_reexcision"
  | "awaiting_reconstruction"
  | "awaiting_grafting"
  | "npwt_in_progress"
  | "wound_healing"
  | "staged_procedure_planned"
  | "awaiting_mdt"
  | "other";

export const PENDING_ACTION_LABELS: Record<PendingAction, string> = {
  awaiting_histology: "Awaiting histology",
  awaiting_reexcision: "Awaiting re-excision (incomplete margins)",
  awaiting_reconstruction: "Awaiting reconstruction",
  awaiting_grafting: "Awaiting skin grafting",
  npwt_in_progress: "NPWT in progress",
  wound_healing: "Wound healing — monitoring",
  staged_procedure_planned: "Staged procedure planned",
  awaiting_mdt: "Awaiting MDT discussion",
  other: "Other (see notes)",
};

// ── Laterality ──────────────────────────────────────────────────────────────
export type EpisodeLaterality = "left" | "right" | "bilateral" | "midline";

// ── Treatment Episode ───────────────────────────────────────────────────────
export interface TreatmentEpisode {
  id: string;
  patientIdentifier: string;
  title: string;
  primaryDiagnosisCode: string;
  primaryDiagnosisDisplay: string;
  bodySite?: string;
  laterality?: EpisodeLaterality;
  type: EpisodeType;
  specialty: Specialty;
  status: EpisodeStatus;
  pendingAction?: PendingAction;
  onsetDate: string;
  resolvedDate?: string;
  notes?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// ── Episode Prefill Data (for "+ Log Case" workflow) ────────────────────────
export interface EpisodePrefillData {
  patientIdentifier: string;
  facility?: string;
  specialty: Specialty;
  diagnosisGroups?: DiagnosisGroup[];
  encounterClass?: EncounterClass;
  episodeSequence: number;
  // Patient-level facts carried forward across episodes
  priorRadiotherapy?: boolean;
  priorChemotherapy?: boolean;
}
