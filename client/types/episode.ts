import type {
  Specialty,
  DiagnosisGroup,
  ReconstructionTiming,
} from "@/types/case";

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
  | "awaiting_expander_exchange"
  | "expansion_in_progress"
  | "awaiting_nipple_recon"
  | "awaiting_fat_grafting"
  | "awaiting_symmetrisation"
  | "awaiting_tattoo"
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
  awaiting_expander_exchange: "Awaiting expander-to-implant exchange",
  expansion_in_progress: "Tissue expansion in progress",
  awaiting_nipple_recon: "Awaiting nipple reconstruction",
  awaiting_fat_grafting: "Awaiting fat grafting",
  awaiting_symmetrisation: "Awaiting symmetrisation procedure",
  awaiting_tattoo: "Awaiting nipple tattooing",
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
  /** Multi-select pending actions. Takes precedence over pendingAction; pendingAction is derived from pendingActions[0]. */
  pendingActions?: PendingAction[];
  onsetDate: string;
  resolvedDate?: string;
  notes?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  /** Breast reconstruction episode metadata (nullable, populated for staged_reconstruction breast episodes) */
  breastReconstructionMeta?: import("./breast").BreastReconstructionMeta;
  /** Burn injury event data (episode-level, captured once on first acute case) */
  burnInjuryEvent?: import("./burns").BurnInjuryEvent;
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
  reconstructionTiming?: ReconstructionTiming;
  priorRadiotherapy?: boolean;
  priorChemotherapy?: boolean;
}
