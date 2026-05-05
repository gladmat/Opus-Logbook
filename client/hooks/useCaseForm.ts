import {
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import {
  Case,
  CaseProcedure,
  DiagnosisGroup,
  Specialty,
  SmokingStatus,
  AnastomosisEntry,
  AnatomicalRegion,
  Gender,
  AdmissionUrgency,
  StayType,
  UnplannedReadmissionReason,
  WoundInfectionRisk,
  AnaestheticType,
  UnplannedICUReason,
  DischargeOutcome,
  MortalityClassification,
  SnomedCodedItem,
  OperativeMediaItem,
  ASAScore,
  SurgeryTiming,
  Prophylaxis,
  FreeFlapDetails,
  ProcedureCode,
  SuggestionAcceptanceEntry,
  ReconstructionTiming,
  QuickCasePrefillData,
  JointCaseContext,
  getAllProcedures,
} from "@/types/case";
import { InfectionOverlay } from "@/types/infection";
import type { EncounterClass, EpisodePrefillData } from "@/types/episode";
import {
  saveCase,
  updateCase,
  getCase,
  CaseDraft,
  getCasesByEpisodeId,
} from "@/lib/storage";
import {
  finalizeInboxAssignment,
  getReservedInboxIdsFromMedia,
} from "@/lib/inboxStorage";
import {
  updateEpisode,
  getEpisode,
  saveEpisode,
  findEpisodesByPatientIdentifier,
  allocateEpisodeSequence,
} from "@/lib/episodeStorage";
import { getDefaultClinicalDetails } from "@/lib/procedureConfig";
import { PICKLIST_TO_FLAP_TYPE } from "@/lib/procedurePicklist";
import {
  findSnomedProcedure,
  getProcedureCodeForCountry,
  getCountryCodeFromProfile,
} from "@/lib/snomedCt";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";
import { UserProfile } from "@/lib/auth";
import { withDefaultFlapOutcome } from "@/lib/flapOutcomeDefaults";
import { toIsoDateValue, parseIsoDateValue } from "@/lib/dateValues";
import type { OperativeRole, SupervisionLevel } from "@/types/operativeRole";
import { toNearestLegacyRole } from "@/types/operativeRole";
import { suggestRoleDefaults, isConsultantLevel } from "@/lib/roleDefaults";
import type {
  CaseTeamMember,
  TeamMemberOperativeRole,
  TeamContact,
} from "@/types/teamContacts";
import { abbreviateName } from "@/types/teamContacts";
import { getSeniorityTier } from "@/lib/seniorityTier";
import {
  restoreDraftDateOnlyValue,
  restoreDraftOperativeMedia,
  restoreDraftProcedureDate,
  serializeDraftOperativeMedia,
} from "@/lib/caseDraftFields";

// ─── Skin Cancer Episode Helpers ────────────────────────────────────────────

import {
  buildSkinCancerFollowUpDiagnosisGroup,
  buildSkinCancerEpisodeLinkPlan,
  buildSkinCancerEpisodeUpdatePlan,
} from "@/lib/skinCancerEpisodeHelpers";
import { normalizeBreastAssessment } from "@/lib/breastState";
import {
  applyBreastEpisodeLinkToCase,
  buildBreastEpisodeCreatePlan,
  buildBreastEpisodeUpdatePlan,
  getBreastEpisodeLinkedId,
} from "@/lib/breastEpisodeHelpers";
import { buildShareableBlob } from "@/lib/buildShareableBlob";
import { shareCase, getSharedOutbox, revokeSharedCase } from "@/lib/sharingApi";
import { verifyAndPinRecipientKeys } from "@/lib/keyPinningStore";
import { getUserDeviceKeys } from "@/lib/teamContactsApi";
import {
  generateCaseKeyHex,
  encryptPayloadWithCaseKey,
  wrapCaseKeyForRecipient,
} from "@/lib/e2ee";
import {
  deriveEpaAssessments,
  type EpaAssessmentTarget,
} from "@/lib/epaDerivation";
import { saveEpaTargets } from "@/lib/assessmentStorage";

// ─── Default Donor Vessels ──────────────────────────────────────────────────

const DEFAULT_DONOR_VESSELS: Record<string, { artery: string; vein: string }> =
  {
    "Anterolateral thigh free flap": {
      artery: "Descending branch of lateral circumflex femoral artery (LCFA)",
      vein: "Venae comitantes of LCFA",
    },
    "ALT Flap": {
      artery: "Descending branch of lateral circumflex femoral artery (LCFA)",
      vein: "Venae comitantes of LCFA",
    },
    "Deep inferior epigastric perforator flap": {
      artery: "Deep inferior epigastric artery (DIEA)",
      vein: "Deep inferior epigastric vein (DIEV)",
    },
    "DIEP Flap": {
      artery: "Deep inferior epigastric artery (DIEA)",
      vein: "Deep inferior epigastric vein (DIEV)",
    },
    "Free fibula flap": {
      artery: "Peroneal artery",
      vein: "Peroneal veins",
    },
    "Fibula Flap": {
      artery: "Peroneal artery",
      vein: "Peroneal veins",
    },
    "Free radial forearm flap": {
      artery: "Radial artery",
      vein: "Radial venae comitantes / Cephalic vein",
    },
    RFFF: {
      artery: "Radial artery",
      vein: "Radial venae comitantes / Cephalic vein",
    },
    "Free latissimus dorsi flap": {
      artery: "Thoracodorsal artery",
      vein: "Thoracodorsal vein",
    },
    "LD Flap": {
      artery: "Thoracodorsal artery",
      vein: "Thoracodorsal vein",
    },
    "Free gracilis flap": {
      artery: "Medial circumflex femoral artery (MCFA)",
      vein: "Venae comitantes of MCFA",
    },
    Gracilis: {
      artery: "Medial circumflex femoral artery (MCFA)",
      vein: "Venae comitantes of MCFA",
    },
    "Free superior gluteal artery perforator flap": {
      artery: "Superior gluteal artery",
      vein: "Superior gluteal vein",
    },
    "SGAP Flap": {
      artery: "Superior gluteal artery",
      vein: "Superior gluteal vein",
    },
    "Free inferior gluteal artery perforator flap": {
      artery: "Inferior gluteal artery",
      vein: "Inferior gluteal vein",
    },
    "IGAP Flap": {
      artery: "Inferior gluteal artery",
      vein: "Inferior gluteal vein",
    },
    "Free scapular flap": {
      artery: "Circumflex scapular artery",
      vein: "Circumflex scapular vein",
    },
    "Scapular Flap": {
      artery: "Circumflex scapular artery",
      vein: "Circumflex scapular vein",
    },
    "Free medial sural artery perforator flap": {
      artery: "Medial sural artery",
      vein: "Medial sural veins",
    },
    "MSAP Flap": {
      artery: "Medial sural artery",
      vein: "Medial sural veins",
    },
  };

// ─── Form State ─────────────────────────────────────────────────────────────

export interface CaseFormState {
  // Patient Info
  patientIdentifier: string;
  procedureDate: string;
  facility: string;
  procedureType: string;
  gender: Gender | "";
  /** @deprecated Use patientDateOfBirth instead. Kept for loading old cases. */
  age: string;
  ethnicity: string;

  // Patient Identity (on-device only)
  patientFirstName: string;
  patientLastName: string;
  patientDateOfBirth: string;
  patientNhi: string;

  // Diagnosis Groups
  diagnosisGroups: DiagnosisGroup[];

  // Admission Details
  admissionDate: string;
  dischargeDate: string;
  admissionUrgency: AdmissionUrgency | "";
  stayType: StayType | "";
  injuryDate: string;
  isUnplannedReadmission: boolean;
  unplannedReadmission: UnplannedReadmissionReason;

  // Patient Factors (strings for text input)
  asaScore: string;
  heightCm: string;
  weightKg: string;
  smoker: SmokingStatus | "";
  diabetes: boolean | null;
  selectedComorbidities: SnomedCodedItem[];

  // Operative Factors
  woundInfectionRisk: WoundInfectionRisk | "";
  anaestheticType: AnaestheticType | "";
  antibioticProphylaxis: boolean;
  dvtProphylaxis: boolean;
  surgeryStartTime: string;
  surgeryEndTime: string;
  role: string;

  // Operative Role & Supervision (3-dimensional model)
  responsibleConsultantName: string;
  responsibleConsultantUserId: string;
  defaultOperativeRole: OperativeRole | "";
  defaultSupervisionLevel: SupervisionLevel | "";

  // Outcomes
  unplannedICU: UnplannedICUReason;
  returnToTheatre: boolean;
  returnToTheatreReason: string;
  outcome: DischargeOutcome | "";
  mortalityClassification: MortalityClassification | "";
  discussedAtMDM: boolean;

  // Media & Infection
  operativeMedia: OperativeMediaItem[];
  infectionOverlay: InfectionOverlay | undefined;
  infectionCollapsed: boolean;

  // Specialty-specific
  clinicalDetails: Record<string, any>;
  recipientSiteRegion: AnatomicalRegion | undefined;
  anastomoses: AnastomosisEntry[];

  // Treatment Context (case-level, visible for free flap cases)
  reconstructionTiming: ReconstructionTiming | "";
  priorRadiotherapy: boolean;
  priorChemotherapy: boolean;
  intraoperativeTransfusion: boolean;
  transfusionUnits: string;

  // Joint Case Context (H&N free flap cases)
  jointCaseContext: JointCaseContext | undefined;

  // Episode linkage
  episodeId: string;
  episodeSequence: number;
  encounterClass: EncounterClass | "";

  // Team sharing (tagged team members for share-on-save)
  teamMembers: {
    userId: string;
    displayName: string;
    role: string;
    publicKeys: { deviceId: string; publicKey: string }[];
  }[];

  // Operative team (contact-based team tagging for case roster)
  operativeTeam: CaseTeamMember[];

  // UI state
  saving: boolean;
  isPlanMode: boolean;
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type CaseFormAction =
  | { type: "SET_FIELD"; field: keyof CaseFormState; value: any }
  | { type: "SET_DIAGNOSIS_GROUPS"; groups: DiagnosisGroup[] }
  | { type: "REORDER_DIAGNOSIS_GROUPS"; groups: DiagnosisGroup[] }
  | { type: "RESET_FORM"; defaults: CaseFormState }
  | { type: "LOAD_DRAFT"; draft: Partial<CaseFormState> }
  | { type: "LOAD_CASE"; formState: CaseFormState }
  | { type: "BULK_UPDATE"; updates: Partial<CaseFormState> }
  | {
      type: "ADD_TEAM_MEMBER";
      member: CaseFormState["teamMembers"][number];
    }
  | { type: "REMOVE_TEAM_MEMBER"; userId: string }
  | { type: "TOGGLE_OPERATIVE_TEAM"; contact: TeamContact }
  | {
      type: "SET_OPERATIVE_TEAM_ROLE";
      contactId: string;
      role: TeamMemberOperativeRole;
    }
  | { type: "REMOVE_OPERATIVE_TEAM_MEMBER"; contactId: string }
  | { type: "CLEAR_OPERATIVE_TEAM" }
  | {
      type: "SET_PROCEDURE_ROLE_OVERRIDE";
      contactId: string;
      procedureIndex: number;
      role: TeamMemberOperativeRole;
    }
  | {
      type: "TOGGLE_MEMBER_PROCEDURE_PRESENCE";
      contactId: string;
      procedureIndex: number;
    };

export function setField<K extends keyof CaseFormState>(
  field: K,
  value: CaseFormState[K],
): CaseFormAction {
  return { type: "SET_FIELD", field, value };
}

// ─── Default State ──────────────────────────────────────────────────────────

export function getDefaultFormState(
  specialty: Specialty,
  primaryFacility: string,
): CaseFormState {
  return {
    patientIdentifier: "",
    procedureDate: toIsoDateValue(new Date()),
    facility: primaryFacility,
    procedureType: "",
    gender: "",
    age: "",
    ethnicity: "",
    patientFirstName: "",
    patientLastName: "",
    patientDateOfBirth: "",
    patientNhi: "",
    diagnosisGroups: [
      {
        id: uuidv4(),
        sequenceOrder: 1,
        specialty,
        procedures: [
          {
            id: uuidv4(),
            sequenceOrder: 1,
            procedureName: "",
            specialty,
            surgeonRole: "PS",
          },
        ],
      },
    ],
    admissionDate: "",
    dischargeDate: "",
    admissionUrgency: "",
    stayType: "",
    injuryDate: "",
    isUnplannedReadmission: false,
    unplannedReadmission: "no",
    asaScore: "",
    heightCm: "",
    weightKg: "",
    smoker: "",
    diabetes: null,
    selectedComorbidities: [],
    woundInfectionRisk: "",
    anaestheticType: "",
    antibioticProphylaxis: false,
    dvtProphylaxis: false,
    surgeryStartTime: "",
    surgeryEndTime: "",
    role: "PS",
    responsibleConsultantName: "",
    responsibleConsultantUserId: "",
    defaultOperativeRole: "",
    defaultSupervisionLevel: "",
    unplannedICU: "no",
    returnToTheatre: false,
    returnToTheatreReason: "",
    outcome: "",
    mortalityClassification: "",
    discussedAtMDM: false,
    operativeMedia: [],
    infectionOverlay: undefined,
    infectionCollapsed: false,
    clinicalDetails: getDefaultClinicalDetails(specialty),
    recipientSiteRegion: undefined,
    anastomoses: [],
    reconstructionTiming: "",
    priorRadiotherapy: false,
    priorChemotherapy: false,
    intraoperativeTransfusion: false,
    transfusionUnits: "",
    jointCaseContext: undefined,
    episodeId: "",
    episodeSequence: 0,
    encounterClass: "",
    teamMembers: [],
    operativeTeam: [],
    saving: false,
    isPlanMode: false,
  };
}

function normalizeBreastDiagnosisGroups(
  groups: DiagnosisGroup[] | undefined,
): DiagnosisGroup[] {
  return (groups ?? []).map((group) => {
    if (!group.breastAssessment) return group;

    return {
      ...group,
      breastAssessment: normalizeBreastAssessment(group.breastAssessment),
    };
  });
}

// ─── Case → FormState conversion ───────────────────────────────────────────

function loadCaseIntoFormState(
  caseData: Case,
  specialty: Specialty,
): CaseFormState {
  const role: string =
    caseData.teamMembers?.find((m) => m.name === "You")?.role ?? "PS";
  const defaultOperativeRole: OperativeRole | "" =
    caseData.defaultOperativeRole ?? "";
  const defaultSupervisionLevel: SupervisionLevel | "" =
    caseData.defaultSupervisionLevel ?? "";

  let clinicalDetails: Record<string, any> =
    getDefaultClinicalDetails(specialty);
  let recipientSiteRegion: AnatomicalRegion | undefined;
  let anastomoses: AnastomosisEntry[] = [];

  if (caseData.clinicalDetails) {
    clinicalDetails = caseData.clinicalDetails as Record<string, any>;
    const details = caseData.clinicalDetails as FreeFlapDetails;
    if (details.recipientSiteRegion) {
      recipientSiteRegion = details.recipientSiteRegion;
    }
    if (details.anastomoses && details.anastomoses.length > 0) {
      anastomoses = details.anastomoses;
    }
  }

  return {
    patientIdentifier: caseData.patientIdentifier,
    procedureDate: caseData.procedureDate,
    facility: caseData.facility,
    procedureType: caseData.procedureType,
    gender: caseData.gender ?? "",
    age: "",
    ethnicity: caseData.ethnicity ?? "",
    patientFirstName: caseData.patientFirstName ?? "",
    patientLastName: caseData.patientLastName ?? "",
    patientDateOfBirth: caseData.patientDateOfBirth ?? "",
    patientNhi: caseData.patientNhi ?? "",
    diagnosisGroups: normalizeBreastDiagnosisGroups(caseData.diagnosisGroups),
    admissionDate: caseData.admissionDate ?? "",
    dischargeDate: caseData.dischargeDate ?? "",
    admissionUrgency: caseData.admissionUrgency ?? "",
    stayType: caseData.stayType ?? "",
    injuryDate: caseData.injuryDate ?? "",
    isUnplannedReadmission: (caseData.unplannedReadmission ?? "no") !== "no",
    unplannedReadmission: caseData.unplannedReadmission ?? "no",
    asaScore: caseData.asaScore ? String(caseData.asaScore) : "",
    heightCm: caseData.heightCm ? String(caseData.heightCm) : "",
    weightKg: caseData.weightKg ? String(caseData.weightKg) : "",
    smoker: caseData.smoker ?? "",
    diabetes: caseData.diabetes ?? null,
    selectedComorbidities: (() => {
      const comorbidities = caseData.comorbidities ?? [];
      // Backward compat: migrate standalone diabetes flag into comorbidities
      if (
        caseData.diabetes === true &&
        !comorbidities.some((c) => c.snomedCtCode === "73211009")
      ) {
        return [
          ...comorbidities,
          { snomedCtCode: "73211009", displayName: "Diabetes Mellitus" },
        ];
      }
      return comorbidities;
    })(),
    woundInfectionRisk: caseData.woundInfectionRisk ?? "",
    anaestheticType: caseData.anaestheticType ?? "",
    antibioticProphylaxis: caseData.prophylaxis?.antibiotics ?? false,
    dvtProphylaxis: caseData.prophylaxis?.dvtPrevention ?? false,
    surgeryStartTime: caseData.surgeryTiming?.startTime ?? "",
    surgeryEndTime: caseData.surgeryTiming?.endTime ?? "",
    role,
    responsibleConsultantName: caseData.responsibleConsultantName ?? "",
    responsibleConsultantUserId: caseData.responsibleConsultantUserId ?? "",
    defaultOperativeRole,
    defaultSupervisionLevel,
    unplannedICU: caseData.unplannedICU ?? "no",
    returnToTheatre: caseData.returnToTheatre ?? false,
    returnToTheatreReason: caseData.returnToTheatreReason ?? "",
    outcome: caseData.outcome ?? "",
    mortalityClassification: caseData.mortalityClassification ?? "",
    discussedAtMDM: caseData.discussedAtMDM ?? false,
    operativeMedia: caseData.operativeMedia ?? [],
    infectionOverlay: caseData.infectionOverlay ?? undefined,
    infectionCollapsed: false,
    clinicalDetails,
    recipientSiteRegion,
    anastomoses,
    reconstructionTiming: caseData.reconstructionTiming ?? "",
    priorRadiotherapy: caseData.priorRadiotherapy ?? false,
    priorChemotherapy: caseData.priorChemotherapy ?? false,
    intraoperativeTransfusion: caseData.intraoperativeTransfusion ?? false,
    transfusionUnits: caseData.transfusionUnits
      ? String(caseData.transfusionUnits)
      : "",
    jointCaseContext: caseData.jointCaseContext ?? undefined,
    episodeId: caseData.episodeId ?? "",
    episodeSequence: caseData.episodeSequence ?? 0,
    encounterClass: (caseData.encounterClass as EncounterClass) ?? "",
    // NOTE: teamMembers (email-tagged share recipients) are not restored on
    // edit-load — the shape requires `publicKeys` which aren't cached on
    // the case record. The share pipeline already derives recipients from
    // `operativeTeam` at save time (and, on edit, revokes removed ones via
    // `getSharedOutbox`), so losing the legacy `teamMembers` array here
    // doesn't lose the actual share state. Restoring the tagged-list UI
    // requires fetching public keys per userId at load time; deferred to a
    // later session.
    teamMembers: [],
    operativeTeam: caseData.operativeTeam ?? [],
    saving: false,
    isPlanMode: false,
  };
}

// ─── FormState → CaseDraft conversion ───────────────────────────────────────

export function formStateToDraft(
  state: CaseFormState,
  specialty: Specialty,
): CaseDraft {
  // Injury date is meaningful only for acute (trauma / emergency) admissions.
  // Previously this also showed for any hand/orthoplastic/PN case, which
  // surfaced "Day of Injury" in elective cases (Dupuytren's, CTS, pressure
  // injury reconstruction). Hand trauma captures its own injury date inside
  // HandTraumaAssessment, which is why OperativeSection additionally gates on
  // `!hasHandTraumaGroup`.
  const showInjuryDate = state.admissionUrgency === "acute";

  return {
    id: "draft",
    patientIdentifier: state.patientIdentifier,
    procedureDate: state.procedureDate,
    facility: state.facility,
    specialty,
    procedureType:
      state.diagnosisGroups[0]?.procedures[0]?.procedureName ||
      state.procedureType,
    diagnosisGroups: normalizeBreastDiagnosisGroups(state.diagnosisGroups),
    surgeryTiming:
      state.surgeryStartTime || state.surgeryEndTime
        ? {
            startTime: state.surgeryStartTime || undefined,
            endTime: state.surgeryEndTime || undefined,
          }
        : undefined,
    responsibleConsultantName: state.responsibleConsultantName || undefined,
    responsibleConsultantUserId: state.responsibleConsultantUserId || undefined,
    defaultOperativeRole: state.defaultOperativeRole || undefined,
    defaultSupervisionLevel: state.defaultSupervisionLevel || undefined,
    gender: state.gender || undefined,
    ethnicity: state.ethnicity.trim() || undefined,
    admissionDate: state.admissionDate || undefined,
    dischargeDate: state.dischargeDate || undefined,
    admissionUrgency: state.admissionUrgency || undefined,
    stayType: state.stayType || undefined,
    injuryDate:
      showInjuryDate && state.injuryDate ? state.injuryDate : undefined,
    unplannedReadmission:
      state.unplannedReadmission !== "no" ? state.unplannedReadmission : "no",
    comorbidities:
      state.selectedComorbidities.length > 0
        ? state.selectedComorbidities
        : undefined,
    asaScore: state.asaScore
      ? (parseInt(state.asaScore) as ASAScore)
      : undefined,
    heightCm: state.heightCm ? parseFloat(state.heightCm) : undefined,
    weightKg: state.weightKg ? parseFloat(state.weightKg) : undefined,
    bmi: calculateBmi(state.heightCm, state.weightKg),
    smoker: state.smoker || undefined,
    diabetes:
      state.selectedComorbidities.some((c) => c.snomedCtCode === "73211009") ||
      undefined,
    woundInfectionRisk: state.woundInfectionRisk || undefined,
    anaestheticType: state.anaestheticType || undefined,
    prophylaxis:
      state.antibioticProphylaxis || state.dvtProphylaxis
        ? {
            antibiotics: state.antibioticProphylaxis,
            dvtPrevention: state.dvtProphylaxis,
          }
        : undefined,
    unplannedICU: state.unplannedICU !== "no" ? state.unplannedICU : "no",
    returnToTheatre: state.returnToTheatre || undefined,
    returnToTheatreReason: state.returnToTheatreReason.trim() || undefined,
    outcome: state.outcome || undefined,
    mortalityClassification: state.mortalityClassification || undefined,
    discussedAtMDM: state.discussedAtMDM || undefined,
    operativeMedia: serializeDraftOperativeMedia(state.operativeMedia),
    clinicalDetails: {
      ...state.clinicalDetails,
      ...(state.recipientSiteRegion
        ? { recipientSiteRegion: state.recipientSiteRegion }
        : {}),
      ...(state.anastomoses.length > 0
        ? { anastomoses: state.anastomoses }
        : {}),
    },
    teamMembers: [
      {
        id: "draft",
        name: "You",
        role: state.role,
        confirmed: true,
        addedAt: new Date().toISOString(),
      },
    ],
    episodeId: state.episodeId || undefined,
    episodeSequence: state.episodeSequence || undefined,
    encounterClass: state.encounterClass || undefined,
    operativeTeam:
      state.operativeTeam.length > 0 ? state.operativeTeam : undefined,
    ownerId: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Draft → partial FormState conversion ───────────────────────────────────

export function draftToFormState(
  draft: CaseDraft,
  specialty: Specialty,
  primaryFacility: string,
): Partial<CaseFormState> {
  const result: Partial<CaseFormState> = {};

  if (draft.patientIdentifier != null)
    result.patientIdentifier = draft.patientIdentifier;
  const restoredProcedureDate = restoreDraftProcedureDate(draft.procedureDate);
  if (restoredProcedureDate) {
    result.procedureDate = restoredProcedureDate;
  }
  result.facility = draft.facility ?? primaryFacility;
  if (draft.procedureType != null) result.procedureType = draft.procedureType;
  if (draft.asaScore != null) result.asaScore = String(draft.asaScore);
  if (draft.heightCm != null) result.heightCm = String(draft.heightCm);
  if (draft.weightKg != null) result.weightKg = String(draft.weightKg);
  result.smoker = draft.smoker ?? "";
  result.diabetes = draft.diabetes ?? null;
  result.role = draft.teamMembers?.[0]?.role ?? "PS";
  result.responsibleConsultantName = draft.responsibleConsultantName ?? "";
  result.responsibleConsultantUserId = draft.responsibleConsultantUserId ?? "";
  result.defaultOperativeRole = draft.defaultOperativeRole ?? "";
  result.defaultSupervisionLevel = draft.defaultSupervisionLevel ?? "";
  result.surgeryStartTime = draft.surgeryTiming?.startTime ?? "";
  result.surgeryEndTime = draft.surgeryTiming?.endTime ?? "";
  result.clinicalDetails =
    (draft.clinicalDetails as Record<string, any>) ??
    getDefaultClinicalDetails(specialty);
  result.recipientSiteRegion = (
    draft.clinicalDetails as FreeFlapDetails | undefined
  )?.recipientSiteRegion;
  result.anastomoses =
    (draft.clinicalDetails as FreeFlapDetails | undefined)?.anastomoses ?? [];
  if (draft.diagnosisGroups) {
    result.diagnosisGroups = normalizeBreastDiagnosisGroups(
      draft.diagnosisGroups,
    );
  }
  result.gender = draft.gender ?? "";
  result.age = "";
  result.ethnicity = draft.ethnicity ?? "";
  result.patientFirstName = draft.patientFirstName ?? "";
  result.patientLastName = draft.patientLastName ?? "";
  result.patientDateOfBirth = draft.patientDateOfBirth ?? "";
  result.patientNhi = draft.patientNhi ?? "";
  result.admissionDate = restoreDraftDateOnlyValue(draft.admissionDate) ?? "";
  result.dischargeDate = restoreDraftDateOnlyValue(draft.dischargeDate) ?? "";
  result.admissionUrgency = draft.admissionUrgency ?? "";
  result.stayType = draft.stayType ?? "";
  result.injuryDate = restoreDraftDateOnlyValue(draft.injuryDate) ?? "";
  result.unplannedReadmission = draft.unplannedReadmission ?? "no";
  result.isUnplannedReadmission = (draft.unplannedReadmission ?? "no") !== "no";
  result.selectedComorbidities = draft.comorbidities ?? [];
  result.woundInfectionRisk = draft.woundInfectionRisk ?? "";
  result.anaestheticType = draft.anaestheticType ?? "";
  result.antibioticProphylaxis = draft.prophylaxis?.antibiotics ?? false;
  result.dvtProphylaxis = draft.prophylaxis?.dvtPrevention ?? false;
  result.unplannedICU = draft.unplannedICU ?? "no";
  result.returnToTheatre = draft.returnToTheatre ?? false;
  result.returnToTheatreReason = draft.returnToTheatreReason ?? "";
  result.outcome = draft.outcome ?? "";
  result.mortalityClassification = draft.mortalityClassification ?? "";
  result.discussedAtMDM = draft.discussedAtMDM ?? false;
  result.operativeMedia = restoreDraftOperativeMedia(draft.operativeMedia);
  result.episodeId = draft.episodeId ?? "";
  result.episodeSequence = draft.episodeSequence ?? 0;
  result.encounterClass = (draft.encounterClass as EncounterClass) ?? "";
  result.operativeTeam = draft.operativeTeam ?? [];

  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function calculateBmi(heightCm: string, weightKg: string): number | undefined {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return undefined;
  const heightM = h / 100;
  return Math.round((w / (heightM * heightM)) * 10) / 10;
}

function calculateDuration(start: string, end: string): number | undefined {
  if (!start || !end) return undefined;
  const startParts = start.split(":").map(Number);
  const endParts = end.split(":").map(Number);
  const startHour = startParts[0];
  const startMin = startParts[1];
  const endHour = endParts[0];
  const endMin = endParts[1];
  if (
    startHour == null ||
    startMin == null ||
    endHour == null ||
    endMin == null ||
    isNaN(startHour) ||
    isNaN(startMin) ||
    isNaN(endHour) ||
    isNaN(endMin)
  ) {
    return undefined;
  }
  let durationMins = endHour * 60 + endMin - (startHour * 60 + startMin);
  if (durationMins < 0) durationMins += 24 * 60;
  return durationMins;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  sectionId: string;
  message: string;
}

/** Per-field inline validation. Returns error message or null if valid. */
export function validateField(
  field: string,
  state: CaseFormState,
): string | null {
  switch (field) {
    case "patientIdentifier":
      if (!state.patientIdentifier.trim())
        return "Patient identifier is required";
      return null;
    case "procedureDate": {
      if (!state.procedureDate) return "Procedure date is required";
      // Compare via `parseIsoDateValue` (local-noon) rather than `new Date(str)`.
      // `new Date("2026-04-25")` is parsed as UTC-midnight, which for users in
      // negative-UTC zones (HST, AKST) drifts into the "previous day" local
      // time and mis-rejects a valid current-day entry.
      const procedureLocalNoon = parseIsoDateValue(state.procedureDate);
      if (!procedureLocalNoon) return "Invalid procedure date";
      // "Today" anchor: local midnight end-of-day so the entire current
      // calendar day counts as "not in the future" regardless of timezone.
      const endOfTodayLocal = new Date();
      endOfTodayLocal.setHours(23, 59, 59, 999);
      if (procedureLocalNoon.getTime() > endOfTodayLocal.getTime())
        return "Procedure date cannot be in the future";
      return null;
    }
    case "facility":
      if (!state.facility.trim()) return "Facility is required";
      return null;
    case "diagnosisGroups": {
      const hasComplete = state.diagnosisGroups.some(
        (g) => g.diagnosis && g.procedures.some((p) => p.procedureName.trim()),
      );
      if (!hasComplete)
        return "At least one diagnosis with a named procedure is required";
      return null;
    }
    default:
      return null;
  }
}

export function validateRequiredFields(state: CaseFormState): {
  valid: boolean;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  // Plan mode only requires patient identifier
  if (!state.patientIdentifier.trim()) {
    errors.push({
      field: "patientIdentifier",
      sectionId: "patient",
      message: "Patient identifier is required",
    });
  }

  if (!state.isPlanMode) {
    if (!state.procedureDate) {
      errors.push({
        field: "procedureDate",
        sectionId: "patient",
        message: "Procedure date is required",
      });
    }
    if (!state.facility.trim()) {
      errors.push({
        field: "facility",
        sectionId: "patient",
        message: "Facility is required",
      });
    }

    const hasCompleteDiagnosisGroup = state.diagnosisGroups.some(
      (g) => g.diagnosis && g.procedures.some((p) => p.procedureName.trim()),
    );
    if (!hasCompleteDiagnosisGroup) {
      errors.push({
        field: "diagnosisGroups",
        sectionId: "case",
        message: "At least one diagnosis with a named procedure is required",
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Team ↔ procedure index remap ─────────────────────────────────────────
//
// `operativeTeam[*].procedureRoleOverrides` and `presentForProcedures` store
// numeric indices into the flattened procedure list. When the user reorders
// diagnosis groups, deletes a procedure, or replaces a group's procedures,
// those indices would otherwise drift silently — overriding Dr. A as
// SURGEON on procedure 2 would, after deleting procedure 1, silently make
// them SURGEON on what USED to be procedure 3. That directly corrupts EPA
// target derivation + CSV/FHIR export attribution.
//
// Fix: on every diagnosisGroups transition, compute the old flat-order
// procedure-ID list vs the new one, build an `oldIndex → newIndex` map by
// UUID match, and rewrite team references. Dropped IDs have their override
// pruned; new IDs don't need mapping (no prior reference).

function flattenProcedureIds(groups: DiagnosisGroup[]): string[] {
  const ids: string[] = [];
  for (const g of groups) {
    for (const p of g.procedures ?? []) {
      ids.push(p.id);
    }
  }
  return ids;
}

function renumberProcedureSequenceOrder(
  groups: DiagnosisGroup[],
): DiagnosisGroup[] {
  let counter = 0;
  return groups.map((g) => ({
    ...g,
    procedures: (g.procedures ?? []).map((p) => {
      counter += 1;
      return { ...p, sequenceOrder: counter };
    }),
  }));
}

function remapTeamProcedureReferences(
  team: CaseTeamMember[],
  oldIds: string[],
  newIds: string[],
): CaseTeamMember[] {
  if (team.length === 0) return team;

  // Fast-path: identical id lists → nothing to remap.
  if (
    oldIds.length === newIds.length &&
    oldIds.every((id, i) => id === newIds[i])
  ) {
    return team;
  }

  const oldIndexByPid = new Map<string, number>();
  oldIds.forEach((id, i) => oldIndexByPid.set(id, i));
  // Build oldIndex -> newIndex map by id match.
  const oldToNew = new Map<number, number>();
  newIds.forEach((id, newIdx) => {
    const oldIdx = oldIndexByPid.get(id);
    if (oldIdx !== undefined) {
      oldToNew.set(oldIdx, newIdx);
    }
  });

  return team.map((m) => {
    let nextOverrides: Record<number, TeamMemberOperativeRole> | undefined =
      undefined;
    if (m.procedureRoleOverrides) {
      const remapped: Record<number, TeamMemberOperativeRole> = {};
      for (const [oldKey, role] of Object.entries(m.procedureRoleOverrides)) {
        const oldIdx = Number(oldKey);
        const newIdx = oldToNew.get(oldIdx);
        if (newIdx !== undefined) {
          remapped[newIdx] = role;
        }
      }
      nextOverrides = Object.keys(remapped).length > 0 ? remapped : undefined;
    }

    let nextPresent: number[] | null | undefined = m.presentForProcedures;
    if (Array.isArray(m.presentForProcedures)) {
      const remappedPresent: number[] = [];
      for (const oldIdx of m.presentForProcedures) {
        const newIdx = oldToNew.get(oldIdx);
        if (newIdx !== undefined) remappedPresent.push(newIdx);
      }
      remappedPresent.sort((a, b) => a - b);
      nextPresent =
        remappedPresent.length === newIds.length
          ? null // present for all post-remap — collapse back to implicit
          : remappedPresent;
    }

    return {
      ...m,
      procedureRoleOverrides: nextOverrides,
      presentForProcedures: nextPresent,
    };
  });
}

/**
 * Apply day-case defaults to a loaded state. The SET_FIELD reducer branch
 * already does this when the user explicitly picks `stayType = "day_case"`,
 * but LOAD_CASE / LOAD_DRAFT previously bypassed the logic. Result: a case
 * loaded with `stayType: day_case` and no outcome would stay at no-outcome,
 * even though the save pipeline expects the discharged-home default.
 */
function applyDayCaseDefaults(state: CaseFormState): CaseFormState {
  if (state.stayType !== "day_case") return state;
  const next = { ...state };
  if (next.admissionDate && !next.dischargeDate) {
    next.dischargeDate = next.admissionDate;
  }
  if (!next.outcome) {
    next.outcome = "discharged_home";
  }
  return next;
}

// ─── Reducer ────────────────────────────────────────────────────────────────

function caseFormReducer(
  state: CaseFormState,
  action: CaseFormAction,
): CaseFormState {
  switch (action.type) {
    case "SET_FIELD": {
      const next = { ...state, [action.field]: action.value };

      // Day case: default both dates to today when stayType switches to day_case
      if (action.field === "stayType" && action.value === "day_case") {
        const today = toIsoDateValue(new Date());
        if (!next.admissionDate) next.admissionDate = today;
        if (!next.dischargeDate)
          next.dischargeDate = next.admissionDate || today;
        if (!next.outcome) next.outcome = "discharged_home";
      }

      // Day case: sync discharge to admission when admission date changes
      if (action.field === "admissionDate" && next.stayType === "day_case") {
        next.dischargeDate = next.admissionDate;
      }

      // Hand trauma injury date → admission date — but only when admission
      // hasn't been set yet. Previously this unconditionally overwrote any
      // admission date the user had already entered, silently losing their
      // explicit value. Keep the day-case discharge-sync behaviour.
      if (
        action.field === "injuryDate" &&
        typeof action.value === "string" &&
        action.value
      ) {
        if (!next.admissionDate) {
          next.admissionDate = action.value as string;
        }
        if (next.stayType === "day_case" && !next.dischargeDate) {
          next.dischargeDate = action.value as string;
        }
      }

      // Discharge date cannot be earlier than admission date
      if (
        (action.field === "dischargeDate" ||
          action.field === "admissionDate") &&
        next.admissionDate &&
        next.dischargeDate &&
        next.dischargeDate < next.admissionDate
      ) {
        next.dischargeDate = next.admissionDate;
      }

      // Facility change: clear operative team (contacts differ per facility)
      if (
        action.field === "facility" &&
        action.value !== state.facility &&
        state.operativeTeam.length > 0
      ) {
        next.operativeTeam = [];
      }

      return next;
    }
    case "SET_DIAGNOSIS_GROUPS": {
      const oldIds = flattenProcedureIds(state.diagnosisGroups);
      const renumbered = renumberProcedureSequenceOrder(action.groups);
      const newIds = flattenProcedureIds(renumbered);
      return {
        ...state,
        diagnosisGroups: renumbered,
        operativeTeam: remapTeamProcedureReferences(
          state.operativeTeam,
          oldIds,
          newIds,
        ),
      };
    }
    case "REORDER_DIAGNOSIS_GROUPS": {
      const oldIds = flattenProcedureIds(state.diagnosisGroups);
      const renumbered = renumberProcedureSequenceOrder(action.groups);
      const newIds = flattenProcedureIds(renumbered);
      return {
        ...state,
        diagnosisGroups: renumbered,
        operativeTeam: remapTeamProcedureReferences(
          state.operativeTeam,
          oldIds,
          newIds,
        ),
      };
    }
    case "RESET_FORM":
      return action.defaults;
    case "LOAD_DRAFT": {
      const merged = { ...state, ...action.draft };
      return applyDayCaseDefaults(merged);
    }
    case "LOAD_CASE":
      return applyDayCaseDefaults(action.formState);
    case "BULK_UPDATE":
      return { ...state, ...action.updates };
    case "ADD_TEAM_MEMBER": {
      // Dedupe against existing teamMembers AND against operativeTeam
      // contacts whose `linkedUserId` points at the same Opus user. Without
      // the second check, the same person added via email search and via
      // the operativeTeam contact list would be tagged twice, and the
      // share-on-save pipeline would produce two shared_cases entries for
      // the same recipient.
      const alreadyInTeamMembers = state.teamMembers.some(
        (m) => m.userId === action.member.userId,
      );
      if (alreadyInTeamMembers) return state;

      const alreadyInOperativeTeam = state.operativeTeam.some(
        (m) => m.linkedUserId && m.linkedUserId === action.member.userId,
      );
      if (alreadyInOperativeTeam) return state;

      return { ...state, teamMembers: [...state.teamMembers, action.member] };
    }
    case "REMOVE_TEAM_MEMBER":
      return {
        ...state,
        teamMembers: state.teamMembers.filter(
          (m) => m.userId !== action.userId,
        ),
      };
    case "TOGGLE_OPERATIVE_TEAM": {
      const { contact } = action;
      const existing = state.operativeTeam.find(
        (m) => m.contactId === contact.id,
      );
      if (existing) {
        return {
          ...state,
          operativeTeam: state.operativeTeam.filter(
            (m) => m.contactId !== contact.id,
          ),
        };
      }
      const newMember: CaseTeamMember = {
        contactId: contact.id,
        linkedUserId: contact.linkedUserId ?? null,
        displayName: contact.displayName,
        abbreviatedName: abbreviateName(contact.firstName, contact.lastName),
        careerStage: contact.careerStage ?? null,
        operativeRole: (contact.defaultRole as TeamMemberOperativeRole) ?? "FA",
        presentForProcedures: null,
      };
      return {
        ...state,
        operativeTeam: [...state.operativeTeam, newMember],
      };
    }
    case "SET_OPERATIVE_TEAM_ROLE":
      return {
        ...state,
        operativeTeam: state.operativeTeam.map((m) =>
          m.contactId === action.contactId
            ? { ...m, operativeRole: action.role }
            : m,
        ),
      };
    case "REMOVE_OPERATIVE_TEAM_MEMBER":
      return {
        ...state,
        operativeTeam: state.operativeTeam.filter(
          (m) => m.contactId !== action.contactId,
        ),
      };
    case "CLEAR_OPERATIVE_TEAM":
      return { ...state, operativeTeam: [] };
    case "SET_PROCEDURE_ROLE_OVERRIDE":
      return {
        ...state,
        operativeTeam: state.operativeTeam.map((m) => {
          if (m.contactId !== action.contactId) return m;
          const overrides = { ...(m.procedureRoleOverrides ?? {}) };
          // If override matches case-level default, remove it
          if (action.role === m.operativeRole) {
            delete overrides[action.procedureIndex];
          } else {
            overrides[action.procedureIndex] = action.role;
          }
          return {
            ...m,
            procedureRoleOverrides:
              Object.keys(overrides).length > 0 ? overrides : undefined,
          };
        }),
      };
    case "TOGGLE_MEMBER_PROCEDURE_PRESENCE": {
      // Compute the total procedure count from the current state so the
      // "present for all except X" case can be materialised as a concrete
      // index set. Previously this fell through to an empty `[]`, which
      // rendered as "present for NO procedures" — a single un-toggle would
      // disappear the member from every procedure, not just the intended one.
      const totalProcedures = state.diagnosisGroups.reduce(
        (sum, g) => sum + (g.procedures?.length ?? 0),
        0,
      );
      return {
        ...state,
        operativeTeam: state.operativeTeam.map((m) => {
          if (m.contactId !== action.contactId) return m;
          const current = m.presentForProcedures;

          if (current === null || current === undefined) {
            // Member was "present for all". Toggling off procedure N means:
            // "present for every procedure EXCEPT N". Materialise that as an
            // explicit index set so the toggle behaves correctly when the
            // user toggles a second procedure off.
            const allExcept: number[] = [];
            for (let i = 0; i < totalProcedures; i++) {
              if (i !== action.procedureIndex) allExcept.push(i);
            }
            return {
              ...m,
              presentForProcedures:
                allExcept.length === totalProcedures ? null : allExcept,
            };
          }

          if (current.includes(action.procedureIndex)) {
            // Remove from present list
            const next = current.filter((i) => i !== action.procedureIndex);
            return {
              ...m,
              presentForProcedures: next.length > 0 ? next : [],
            };
          }

          // Add to present list; collapse back to `null` ("present for all")
          // once the set reaches the full count.
          const appended = [...current, action.procedureIndex].sort(
            (a, b) => a - b,
          );
          return {
            ...m,
            presentForProcedures:
              appended.length === totalProcedures ? null : appended,
          };
        }),
      };
    }
    default:
      return state;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

interface UseCaseFormParams {
  specialty?: Specialty;
  caseId?: string;
  duplicateFrom?: Case;
  skinCancerFollowUpPrefill?: boolean;
  episodeId?: string;
  episodePrefill?: EpisodePrefillData;
  quickPrefill?: QuickCasePrefillData;
  primaryFacility: string;
  profile: UserProfile | null;
}

// ─── Episode Prefill State Builder ──────────────────────────────────────────

function hasProcedureFreeFlap(
  procedure: Pick<CaseProcedure, "picklistEntryId" | "tags">,
): boolean {
  if (
    procedure.picklistEntryId &&
    PICKLIST_TO_FLAP_TYPE[procedure.picklistEntryId]
  ) {
    return true;
  }
  return procedure.tags?.includes("free_flap") ?? false;
}

export function buildEpisodePrefillState(
  episodeId: string,
  prefill: EpisodePrefillData,
  primaryFacility: string,
  defaultAnticoagulation?: FreeFlapDetails["anticoagulationProtocol"],
): CaseFormState {
  const defaults = getDefaultFormState(prefill.specialty, primaryFacility);

  // Clone diagnosis groups with new IDs, stripping per-operation data.
  // Keep: diagnosis identity, specialty, staging, laterality, injury mechanism,
  //       fractures (patient-level), procedure names/codes.
  // Strip: clinicalDetails on procedures (FreeFlapDetails, ischemia times,
  //        anastomoses), woundAssessment, lesionInstances, handTrauma.
  const clonedGroups: DiagnosisGroup[] =
    prefill.diagnosisGroups?.map((g) => ({
      ...g,
      id: uuidv4(),
      procedures: g.procedures.map((p) => {
        const clonedProcedure: CaseProcedure = {
          ...p,
          id: uuidv4(),
          clinicalDetails: undefined, // Strip per-operation FreeFlapDetails etc.
        };

        // Re-apply defaults from surgical preferences (never cloned from previous case).
        if (defaultAnticoagulation && hasProcedureFreeFlap(clonedProcedure)) {
          clonedProcedure.clinicalDetails = {
            anticoagulationProtocol: defaultAnticoagulation,
          } as FreeFlapDetails;
        }

        return clonedProcedure;
      }),
      diagnosisClinicalDetails: g.diagnosisClinicalDetails
        ? {
            laterality: g.diagnosisClinicalDetails.laterality,
            injuryMechanism: g.diagnosisClinicalDetails.injuryMechanism,
            // handTrauma stripped — per-operation structure repairs
          }
        : undefined,
      diagnosisStagingSelections: g.diagnosisStagingSelections
        ? { ...g.diagnosisStagingSelections }
        : undefined,
      woundAssessment: undefined, // Strip — per-operation wound data
      lesionInstances: undefined, // Strip — new excisions are new lesions
    })) ?? defaults.diagnosisGroups;

  return {
    ...defaults,
    patientIdentifier: prefill.patientIdentifier,
    facility: prefill.facility || primaryFacility,
    episodeId,
    episodeSequence: prefill.episodeSequence,
    encounterClass: prefill.encounterClass || "",
    diagnosisGroups: normalizeBreastDiagnosisGroups(clonedGroups),
    // Patient-level facts carry forward
    reconstructionTiming: prefill.reconstructionTiming ?? "",
    priorRadiotherapy: prefill.priorRadiotherapy ?? false,
    priorChemotherapy: prefill.priorChemotherapy ?? false,
  };
}

export function buildQuickPrefillState(
  specialty: Specialty,
  quickPrefill: QuickCasePrefillData,
  primaryFacility: string,
): CaseFormState {
  const defaults = getDefaultFormState(specialty, primaryFacility);

  return {
    ...defaults,
    patientIdentifier: quickPrefill.patientIdentifier,
    facility: quickPrefill.facility || primaryFacility,
  };
}

// ─── Duplicate State Builder ────────────────────────────────────────────────

export function buildDuplicateState(
  source: Case,
  specialty: Specialty,
  primaryFacility: string,
  skinCancerFollowUpPrefill: boolean = false,
): CaseFormState {
  // Deep clone diagnosis groups with new IDs
  const sourceGroups = skinCancerFollowUpPrefill
    ? source.diagnosisGroups?.map((group) =>
        buildSkinCancerFollowUpDiagnosisGroup(group),
      )
    : source.diagnosisGroups;

  const clonedGroups: DiagnosisGroup[] = sourceGroups?.map((g) => ({
    ...g,
    id: uuidv4(),
    procedures: g.procedures.map((p) => ({
      ...p,
      id: uuidv4(),
      // Deep clone every nested object so the duplicate and the source case
      // don't share references. Shallow `{ ...p.clinicalDetails }` leaves
      // inner arrays (anastomoses, ischemia timings, implant component
      // arrays) pointing at the original — editing the duplicate's
      // anastomoses would mutate the source. `structuredClone` is available
      // in Hermes / iOS 17+ and is a no-op on the fields we care about.
      clinicalDetails: p.clinicalDetails
        ? structuredClone(p.clinicalDetails)
        : undefined,
      implantDetails: p.implantDetails
        ? structuredClone(p.implantDetails)
        : undefined,
      osteotomyDetails: p.osteotomyDetails
        ? structuredClone(p.osteotomyDetails)
        : undefined,
      lvaOperativeDetails: p.lvaOperativeDetails
        ? structuredClone(p.lvaOperativeDetails)
        : undefined,
      vlntDetails: p.vlntDetails ? structuredClone(p.vlntDetails) : undefined,
      saplDetails: p.saplDetails ? structuredClone(p.saplDetails) : undefined,
      burnProcedureDetails: p.burnProcedureDetails
        ? structuredClone(p.burnProcedureDetails)
        : undefined,
    })),
    diagnosisClinicalDetails: g.diagnosisClinicalDetails
      ? { ...g.diagnosisClinicalDetails }
      : undefined,
    diagnosisStagingSelections: g.diagnosisStagingSelections
      ? { ...g.diagnosisStagingSelections }
      : undefined,
    skinCancerAssessment: g.skinCancerAssessment
      ? structuredClone(g.skinCancerAssessment)
      : undefined,
    breastAssessment: g.breastAssessment
      ? structuredClone(g.breastAssessment)
      : undefined,
    affectedFingers: g.affectedFingers ? [...g.affectedFingers] : undefined,
    triggerFingerGrading: g.triggerFingerGrading
      ? { ...g.triggerFingerGrading }
      : undefined,
    dupuytrenAssessment: g.dupuytrenAssessment
      ? structuredClone(g.dupuytrenAssessment)
      : undefined,
    peripheralNerveAssessment: g.peripheralNerveAssessment
      ? structuredClone(g.peripheralNerveAssessment)
      : undefined,
    craniofacialAssessment: g.craniofacialAssessment
      ? structuredClone(g.craniofacialAssessment)
      : undefined,
    aestheticAssessment: g.aestheticAssessment
      ? structuredClone(g.aestheticAssessment)
      : undefined,
    burnsAssessment: g.burnsAssessment
      ? structuredClone(g.burnsAssessment)
      : undefined,
    fractures: g.fractures?.map((f) => ({ ...f, id: uuidv4() })) ?? [],
    lesionInstances:
      g.lesionInstances?.map((l) => ({
        ...l,
        id: uuidv4(),
        skinCancerAssessment: l.skinCancerAssessment
          ? structuredClone(l.skinCancerAssessment)
          : undefined,
      })) ?? [],
  })) ?? [
    {
      id: uuidv4(),
      sequenceOrder: 1,
      specialty,
      procedures: [
        {
          id: uuidv4(),
          sequenceOrder: 1,
          procedureName: "",
          specialty,
          surgeonRole: "PS",
        },
      ],
    },
  ];

  // Deep clone anastomoses with new IDs
  const clonedAnastomoses: AnastomosisEntry[] =
    (source.clinicalDetails as FreeFlapDetails | undefined)?.anastomoses?.map(
      (a) => ({ ...a, id: uuidv4() }),
    ) ?? [];

  const defaults = getDefaultFormState(specialty, primaryFacility);

  return {
    ...defaults,
    // ── Copied fields ────────────────────────────────────────
    facility: source.facility || primaryFacility,
    diagnosisGroups: normalizeBreastDiagnosisGroups(clonedGroups),
    role: source.teamMembers?.find((m) => m.name === "You")?.role ?? "PS",
    responsibleConsultantName: source.responsibleConsultantName ?? "",
    responsibleConsultantUserId: source.responsibleConsultantUserId ?? "",
    defaultOperativeRole: source.defaultOperativeRole ?? "",
    defaultSupervisionLevel: source.defaultSupervisionLevel ?? "",
    clinicalDetails: source.clinicalDetails
      ? { ...(source.clinicalDetails as Record<string, any>) }
      : defaults.clinicalDetails,
    woundInfectionRisk: (source.woundInfectionRisk as WoundInfectionRisk) || "",
    anaestheticType: (source.anaestheticType as AnaestheticType) || "",
    antibioticProphylaxis: source.prophylaxis?.antibiotics ?? false,
    dvtProphylaxis: source.prophylaxis?.dvtPrevention ?? false,
    recipientSiteRegion: (source.clinicalDetails as FreeFlapDetails | undefined)
      ?.recipientSiteRegion,
    anastomoses: clonedAnastomoses,

    // ── Patient identity (carried forward — same patient) ───
    patientFirstName: source.patientFirstName ?? "",
    patientLastName: source.patientLastName ?? "",
    patientDateOfBirth: source.patientDateOfBirth ?? "",
    patientNhi: source.patientNhi ?? "",

    // Joint case context (carry forward — same surgical setting)
    jointCaseContext: source.jointCaseContext
      ? { ...source.jointCaseContext }
      : undefined,

    // ── Cleared fields ───────────────────────────────────────
    patientIdentifier: skinCancerFollowUpPrefill
      ? source.patientIdentifier
      : source.patientIdentifier, // Carry forward — same patient
    procedureDate: toIsoDateValue(new Date()),
    gender: source.gender ?? "",
    age: "",
    ethnicity: source.ethnicity ?? "",
    admissionDate: "",
    dischargeDate: "",
    injuryDate: "",
    surgeryStartTime: "",
    surgeryEndTime: "",
    operativeMedia: [],
    infectionOverlay: undefined,
    infectionCollapsed: false,
    asaScore: "",
    heightCm: "",
    weightKg: "",
    smoker: "",
    diabetes: null,
    selectedComorbidities: [],
    unplannedICU: "no",
    returnToTheatre: false,
    returnToTheatreReason: "",
    outcome: "",
    mortalityClassification: "",
    discussedAtMDM: false,
    episodeId: skinCancerFollowUpPrefill ? (source.episodeId ?? "") : "",
    episodeSequence: skinCancerFollowUpPrefill
      ? (source.episodeSequence ?? 0)
      : 0,
    encounterClass: "",
    teamMembers: [],
    saving: false,
    isPlanMode: false,
  };
}

export interface UseCaseFormReturn {
  state: CaseFormState;
  dispatch: React.Dispatch<CaseFormAction>;
  handleSave: (formOpenedAt?: string) => Promise<boolean>;
  isEditMode: boolean;
  existingCase: Case | null;
  loadingExistingCase: boolean;
  loadError: string | null;
  specialty: Specialty;
  calculatedBmi: number | undefined;
  durationDisplay: string | null;
  showInjuryDate: boolean;
  draftLoadedRef: React.MutableRefObject<boolean>;
  savedRef: React.MutableRefObject<boolean>;
  resetForm: () => void;
  revertToSaved: () => void;
  // Diagnosis group callbacks
  handleDiagnosisGroupChange: (
    index: number,
    updated: DiagnosisGroup,
    scrollViewRef?: React.RefObject<any>,
    scrollPositionRef?: React.MutableRefObject<number>,
  ) => void;
  handleDeleteDiagnosisGroup: (index: number) => void;
  addDiagnosisGroup: () => void;
  reorderDiagnosisGroups: (groups: DiagnosisGroup[]) => void;
  // Anastomosis callbacks
  addAnastomosis: (vesselType: "artery" | "vein") => void;
  updateAnastomosis: (entry: AnastomosisEntry) => void;
  removeAnastomosis: (id: string) => void;
  // Clinical detail callback
  updateClinicalDetail: (key: string, value: any) => void;
}

/**
 * Create or reuse a cancer_pathway episode for cases that still have
 * pending skin-cancer histology, then persist the linkage back to the case.
 */
async function ensureSkinCancerEpisodeLink(savedCase: Case): Promise<Case> {
  if (!savedCase.patientIdentifier) return savedCase;

  const now = new Date().toISOString();
  const existing = await findEpisodesByPatientIdentifier(
    savedCase.patientIdentifier,
  );

  const linkPlan = buildSkinCancerEpisodeLinkPlan(
    savedCase,
    existing,
    now,
    uuidv4(),
  );
  if (!linkPlan) return savedCase;
  if (
    savedCase.episodeId === linkPlan.linkedEpisodeId &&
    savedCase.episodeSequence
  ) {
    return savedCase;
  }

  if (linkPlan.episodeToCreate) {
    await saveEpisode(linkPlan.episodeToCreate);
  }

  // Atomic sequence allocation — eliminates the read-then-write race where
  // two parallel saves to the same episode would both read count=N and
  // both assign N+1.
  const episodeSequence = await allocateEpisodeSequence(
    linkPlan.linkedEpisodeId,
  );
  const linkedCase: Case = {
    ...savedCase,
    episodeId: linkPlan.linkedEpisodeId,
    episodeSequence,
  };

  await updateCase(savedCase.id, linkedCase);
  return linkedCase;
}

/**
 * Synchronize cancer-pathway episode state after a case save/edit.
 */
async function syncSkinCancerEpisode(updatedCase: Case): Promise<void> {
  if (!updatedCase.episodeId) return;

  const episode = await getEpisode(updatedCase.episodeId);
  if (!episode || episode.type !== "cancer_pathway") return;
  if (episode.status === "completed" || episode.status === "cancelled") return;

  const updatePlan = buildSkinCancerEpisodeUpdatePlan(
    updatedCase,
    episode,
    new Date().toISOString(),
  );
  if (updatePlan) {
    await updateEpisode(updatedCase.episodeId, updatePlan);
  }
}

async function ensureBreastEpisodeLink(savedCase: Case): Promise<Case> {
  const linkedBreastEpisodeId = getBreastEpisodeLinkedId(savedCase);
  if (!linkedBreastEpisodeId || !savedCase.patientIdentifier) return savedCase;

  const now = new Date().toISOString();
  const existingEpisodes = await findEpisodesByPatientIdentifier(
    savedCase.patientIdentifier,
  );
  const plan = buildBreastEpisodeCreatePlan(
    savedCase,
    existingEpisodes,
    now,
    linkedBreastEpisodeId,
  );
  if (!plan) return savedCase;

  if (plan.episodeToCreate) {
    await saveEpisode(plan.episodeToCreate);
  }

  const episodeSequence = await allocateEpisodeSequence(plan.linkedEpisodeId);
  const linkedCase = applyBreastEpisodeLinkToCase(
    savedCase,
    plan.linkedEpisodeId,
    episodeSequence,
  );

  if (
    linkedCase.episodeId === savedCase.episodeId &&
    linkedCase.episodeSequence === savedCase.episodeSequence
  ) {
    return linkedCase;
  }

  await updateCase(savedCase.id, linkedCase);
  return linkedCase;
}

async function syncBreastEpisode(updatedCase: Case): Promise<void> {
  const linkedBreastEpisodeId = getBreastEpisodeLinkedId(updatedCase);
  if (!linkedBreastEpisodeId) return;

  const episode = await getEpisode(linkedBreastEpisodeId);
  if (!episode || episode.type !== "staged_reconstruction") return;
  if (episode.status === "completed" || episode.status === "cancelled") return;

  const updatePlan = buildBreastEpisodeUpdatePlan(updatedCase, episode);
  if (!updatePlan) return;

  await updateEpisode(linkedBreastEpisodeId, updatePlan);
}

export function useCaseForm({
  specialty: routeSpecialty,
  caseId,
  duplicateFrom,
  skinCancerFollowUpPrefill,
  episodeId: routeEpisodeId,
  episodePrefill,
  quickPrefill,
  primaryFacility,
  profile,
}: UseCaseFormParams): UseCaseFormReturn {
  const isEditMode = !!caseId;
  const isDuplicate = !!duplicateFrom;
  const isEpisodePrefill = !!episodePrefill;
  const isQuickPrefill = !!quickPrefill;
  const [existingCase, setExistingCase] = useState<Case | null>(null);
  const [loadingExistingCase, setLoadingExistingCase] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const specialty: Specialty =
    isEditMode && existingCase?.specialty
      ? existingCase.specialty
      : (routeSpecialty ?? duplicateFrom?.specialty ?? "general");

  const draftLoadedRef = useRef(false);
  const savedRef = useRef(false);
  const editModeLoadedRef = useRef(false);
  const reconstructionTimingAutoSetRef = useRef(false);
  const episodePrefillDefaultsAppliedRef = useRef(false);

  const [state, dispatch] = useReducer(
    caseFormReducer,
    episodePrefill && routeEpisodeId
      ? buildEpisodePrefillState(
          routeEpisodeId,
          episodePrefill,
          primaryFacility,
          profile?.surgicalPreferences?.microsurgery?.anticoagulationProtocol,
        )
      : duplicateFrom
        ? buildDuplicateState(
            duplicateFrom,
            specialty,
            primaryFacility,
            !!skinCancerFollowUpPrefill,
          )
        : quickPrefill
          ? buildQuickPrefillState(specialty, quickPrefill, primaryFacility)
          : getDefaultFormState(specialty, primaryFacility),
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Derived values ──────────────────────────────────────────────────────

  const calculatedBmi = useMemo(
    () => calculateBmi(state.heightCm, state.weightKg),
    [state.heightCm, state.weightKg],
  );

  const durationDisplay = useMemo(() => {
    const mins = calculateDuration(
      state.surgeryStartTime,
      state.surgeryEndTime,
    );
    if (mins === undefined) return null;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }, [state.surgeryStartTime, state.surgeryEndTime]);

  // Injury date is meaningful only for acute (trauma / emergency) admissions.
  // See formStateToDraft() above for the full rationale.
  const showInjuryDate = state.admissionUrgency === "acute";

  // ── Side effects ────────────────────────────────────────────────────────

  // Clear injury date when no longer applicable
  useEffect(() => {
    if (!showInjuryDate && state.injuryDate) {
      dispatch(setField("injuryDate", ""));
    }
  }, [showInjuryDate, state.injuryDate]);

  // Smart defaults for operative role & consultant from profile (new case only)
  const roleDefaultsAppliedRef = useRef(false);
  useEffect(() => {
    if (roleDefaultsAppliedRef.current || isEditMode || isDuplicate) return;
    if (!profile || state.defaultOperativeRole) return;
    roleDefaultsAppliedRef.current = true;

    const defaults = suggestRoleDefaults(profile);
    dispatch(setField("defaultOperativeRole", defaults.role));
    dispatch(setField("defaultSupervisionLevel", defaults.supervision));
    if (
      isConsultantLevel(profile.careerStage) &&
      !state.responsibleConsultantName
    ) {
      const name =
        profile.fullName ||
        [profile.firstName, profile.lastName].filter(Boolean).join(" ");
      if (name) {
        dispatch(setField("responsibleConsultantName", name));
      }
    }
  }, [
    profile,
    isEditMode,
    isDuplicate,
    state.defaultOperativeRole,
    state.responsibleConsultantName,
  ]);

  // Smart default for treatment context timing (Part 4C)
  useEffect(() => {
    if (state.reconstructionTiming || reconstructionTimingAutoSetRef.current) {
      return;
    }

    const hasFreeFlapProcedure = state.diagnosisGroups.some((group) =>
      group.procedures.some((procedure) => hasProcedureFreeFlap(procedure)),
    );
    if (!hasFreeFlapProcedure) return;

    const hasTraumaDiagnosis = state.diagnosisGroups.some((group) => {
      if (!group.diagnosisPicklistId) return false;
      const dx = findDiagnosisById(group.diagnosisPicklistId);
      return dx?.clinicalGroup === "trauma";
    });

    const hasOncologicalDiagnosis = state.diagnosisGroups.some((group) => {
      if (!group.diagnosisPicklistId) return false;
      const dx = findDiagnosisById(group.diagnosisPicklistId);
      return dx?.clinicalGroup === "oncological";
    });

    const shouldDefaultImmediate =
      (state.admissionUrgency === "acute" && hasTraumaDiagnosis) ||
      (state.admissionUrgency === "elective" && hasOncologicalDiagnosis);

    if (!shouldDefaultImmediate) return;

    reconstructionTimingAutoSetRef.current = true;
    dispatch(setField("reconstructionTiming", "immediate"));
  }, [
    state.reconstructionTiming,
    state.admissionUrgency,
    state.diagnosisGroups,
  ]);

  // Episode prefill: ensure anticoagulation defaults are applied from preferences, not inherited overrides
  useEffect(() => {
    const prefAnticoagulation =
      profile?.surgicalPreferences?.microsurgery?.anticoagulationProtocol;
    if (
      !isEpisodePrefill ||
      !prefAnticoagulation ||
      episodePrefillDefaultsAppliedRef.current
    ) {
      return;
    }

    let hasChanges = false;
    const nextGroups = state.diagnosisGroups.map((group) => {
      let groupChanged = false;
      const nextProcedures = group.procedures.map((procedure) => {
        if (!hasProcedureFreeFlap(procedure)) return procedure;
        const details = procedure.clinicalDetails as
          | FreeFlapDetails
          | undefined;
        if (details?.anticoagulationProtocol) return procedure;

        groupChanged = true;
        return {
          ...procedure,
          clinicalDetails: {
            ...(details || {}),
            anticoagulationProtocol: prefAnticoagulation,
          } as FreeFlapDetails,
        };
      });

      if (!groupChanged) return group;
      hasChanges = true;
      return {
        ...group,
        procedures: nextProcedures,
      };
    });

    if (hasChanges) {
      dispatch(setField("diagnosisGroups", nextGroups));
    }
    episodePrefillDefaultsAppliedRef.current = true;
  }, [
    isEpisodePrefill,
    profile?.surgicalPreferences?.microsurgery?.anticoagulationProtocol,
    state.diagnosisGroups,
  ]);

  // Load existing case in edit mode
  useEffect(() => {
    if (!isEditMode || !caseId || editModeLoadedRef.current) return;

    const loadExistingCase = async () => {
      setLoadingExistingCase(true);
      setLoadError(null);

      try {
        const caseData = await getCase(caseId);
        if (!caseData) {
          setLoadError("This case could not be loaded.");
          return;
        }

        setExistingCase(caseData);
        editModeLoadedRef.current = true;

        const formState = loadCaseIntoFormState(caseData, caseData.specialty);
        dispatch({ type: "LOAD_CASE", formState });
      } catch (error) {
        console.error("Error loading case for edit:", error);
        setLoadError("This case could not be loaded.");
      } finally {
        setLoadingExistingCase(false);
      }
    };

    void loadExistingCase();
  }, [isEditMode, caseId]);

  // Mark draft as loaded in edit/duplicate mode (so useCaseDraft doesn't try to load a draft)
  useEffect(() => {
    if (isEditMode || isDuplicate || isQuickPrefill) {
      draftLoadedRef.current = true;
    }
  }, [isEditMode, isDuplicate, isQuickPrefill]);

  // ── Reset / Revert ────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    // Also clear roleDefaultsAppliedRef so the next fresh form picks up the
    // consultant / trainee smart defaults. Previously only the first two
    // refs were reset and `roleDefaultsAppliedRef` latched on forever, which
    // meant after a Clear, subsequent new cases never re-applied defaults.
    reconstructionTimingAutoSetRef.current = false;
    episodePrefillDefaultsAppliedRef.current = false;
    roleDefaultsAppliedRef.current = false;
    dispatch({
      type: "RESET_FORM",
      defaults: getDefaultFormState(specialty, primaryFacility),
    });
  }, [specialty, primaryFacility]);

  const revertToSaved = useCallback(() => {
    if (existingCase) {
      reconstructionTimingAutoSetRef.current = false;
      episodePrefillDefaultsAppliedRef.current = false;
      roleDefaultsAppliedRef.current = false;
      const formState = loadCaseIntoFormState(
        existingCase,
        existingCase.specialty,
      );
      dispatch({ type: "LOAD_CASE", formState });
    }
  }, [existingCase]);

  // ── Diagnosis group callbacks ─────────────────────────────────────────

  const handleDiagnosisGroupChange = useCallback(
    (
      index: number,
      updated: DiagnosisGroup,
      scrollViewRef?: React.RefObject<any>,
      scrollPositionRef?: React.MutableRefObject<number>,
    ) => {
      const pos = scrollPositionRef?.current ?? 0;
      const currentGroups = stateRef.current.diagnosisGroups;
      // Use SET_DIAGNOSIS_GROUPS (not SET_FIELD) so the reducer runs its
      // procedure-id remap + sequence renumber on the resulting groups.
      // Changing a group's procedures otherwise silently leaves stale
      // procedureRoleOverrides pointing at the wrong procedure.
      dispatch({
        type: "SET_DIAGNOSIS_GROUPS",
        groups: currentGroups.map((g, i) => (i === index ? updated : g)),
      });
      if (scrollViewRef?.current) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollViewRef.current?.scrollTo({ y: pos, animated: false });
          });
        });
      }
    },
    [],
  );

  const handleDeleteDiagnosisGroup = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const filtered = stateRef.current.diagnosisGroups.filter(
      (_, i) => i !== index,
    );
    dispatch({
      type: "SET_DIAGNOSIS_GROUPS",
      groups: filtered.map((g, i) => ({ ...g, sequenceOrder: i + 1 })),
    });
  }, []);

  const addDiagnosisGroup = useCallback(
    (overrides?: Partial<DiagnosisGroup>) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const currentGroups = stateRef.current.diagnosisGroups;
      const effectiveSpecialty = overrides?.specialty ?? specialty;
      dispatch({
        type: "SET_DIAGNOSIS_GROUPS",
        groups: [
          ...currentGroups,
          {
            id: uuidv4(),
            sequenceOrder: currentGroups.length + 1,
            specialty: effectiveSpecialty,
            procedures: [
              {
                id: uuidv4(),
                sequenceOrder: 1,
                procedureName: "",
                specialty: effectiveSpecialty,
                surgeonRole: "PS",
              },
            ],
            ...overrides,
          },
        ],
      });
    },
    [specialty],
  );

  const reorderDiagnosisGroups = useCallback((groups: DiagnosisGroup[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch({
      type: "REORDER_DIAGNOSIS_GROUPS",
      groups: groups.map((g, i) => ({ ...g, sequenceOrder: i + 1 })),
    });
  }, []);

  // ── Anastomosis callbacks ─────────────────────────────────────────────

  const addAnastomosis = useCallback((vesselType: "artery" | "vein") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentState = stateRef.current;
    const primaryProcedureName =
      currentState.diagnosisGroups[0]?.procedures[0]?.procedureName;
    const derivedType = primaryProcedureName || currentState.procedureType;
    const donorVessels = DEFAULT_DONOR_VESSELS[derivedType];
    const donorVesselName = donorVessels
      ? vesselType === "artery"
        ? donorVessels.artery
        : donorVessels.vein
      : "";
    const newEntry: AnastomosisEntry = {
      id: uuidv4(),
      vesselType,
      recipientVesselName: "",
      donorVesselName,
      couplingMethod: vesselType === "artery" ? "hand_sewn" : undefined,
    };
    dispatch(setField("anastomoses", [...currentState.anastomoses, newEntry]));
  }, []);

  const updateAnastomosis = useCallback((entry: AnastomosisEntry) => {
    const currentAnastomoses = stateRef.current.anastomoses;
    dispatch(
      setField(
        "anastomoses",
        currentAnastomoses.map((a) => (a.id === entry.id ? entry : a)),
      ),
    );
  }, []);

  const removeAnastomosis = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentAnastomoses = stateRef.current.anastomoses;
    dispatch(
      setField(
        "anastomoses",
        currentAnastomoses.filter((a) => a.id !== id),
      ),
    );
  }, []);

  // ── Clinical detail callback ──────────────────────────────────────────

  const updateClinicalDetail = useCallback((key: string, value: any) => {
    const currentClinicalDetails = stateRef.current.clinicalDetails;
    dispatch(
      setField("clinicalDetails", {
        ...currentClinicalDetails,
        [key]: value,
      }),
    );
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (formOpenedAt?: string): Promise<boolean> => {
      if (isEditMode) {
        if (loadingExistingCase) {
          Alert.alert("Please wait", "The case is still loading.");
          return false;
        }

        if (!existingCase) {
          Alert.alert(
            "Unable to save",
            loadError || "The existing case could not be loaded.",
          );
          return false;
        }
      }

      const saveSpecialty = isEditMode ? existingCase!.specialty : specialty;

      // Derive procedureType from the first diagnosis group's first procedure
      const derivedProcedureType =
        state.diagnosisGroups[0]?.procedures[0]?.procedureName ||
        state.procedureType;

      // Determine if the case has enough data to be considered complete
      const hasDiagnosis = state.diagnosisGroups.some(
        (g) => g.diagnosis || g.procedures.length > 0,
      );
      const isIncomplete = !derivedProcedureType.trim() || !hasDiagnosis;

      dispatch(setField("saving", true));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        const countryCode = getCountryCodeFromProfile(
          profile?.countryOfPractice,
        );
        const snomedProcedure = findSnomedProcedure(
          derivedProcedureType,
          saveSpecialty,
        );
        const procedureCode: ProcedureCode | undefined = snomedProcedure
          ? getProcedureCodeForCountry(snomedProcedure, countryCode)
          : undefined;
        const reservedInboxIds = getReservedInboxIdsFromMedia(
          state.operativeMedia,
        );
        const persistedOperativeMedia = state.operativeMedia.map(
          ({ sourceInboxId: _sourceInboxId, ...item }) => item,
        );

        const surgeryTiming: SurgeryTiming | undefined =
          state.surgeryStartTime || state.surgeryEndTime
            ? {
                startTime: state.surgeryStartTime || undefined,
                endTime: state.surgeryEndTime || undefined,
                durationMinutes: calculateDuration(
                  state.surgeryStartTime,
                  state.surgeryEndTime,
                ),
              }
            : undefined;

        // Entry time tracking
        // Note: entryDurationSeconds includes any time the app was backgrounded.
        // Analytics caps at 7200s.
        const formSavedAt = new Date().toISOString();
        let entryDurationSeconds: number | undefined;
        if (formOpenedAt) {
          const elapsed = Math.round(
            (new Date(formSavedAt).getTime() -
              new Date(formOpenedAt).getTime()) /
              1000,
          );
          entryDurationSeconds = elapsed > 0 ? elapsed : undefined;
        }

        // Suggestion acceptance tracking
        const suggestionAcceptanceLog: SuggestionAcceptanceEntry[] = [];
        for (const group of state.diagnosisGroups) {
          if (
            !group.diagnosisPicklistId ||
            group.procedureSuggestionSource !== "picklist"
          )
            continue;
          const dx = findDiagnosisById(group.diagnosisPicklistId);
          if (!dx) continue;
          const suggestedIds = dx.suggestedProcedures.map(
            (s) => s.procedurePicklistId,
          );
          const acceptedIds = group.procedures
            .filter(
              (p) =>
                p.picklistEntryId && suggestedIds.includes(p.picklistEntryId),
            )
            .map((p) => p.picklistEntryId!);
          const manualIds = group.procedures
            .filter(
              (p) =>
                !p.picklistEntryId || !suggestedIds.includes(p.picklistEntryId),
            )
            .map((p) => p.picklistEntryId || p.procedureName);
          suggestionAcceptanceLog.push({
            diagnosisGroupId: group.id,
            diagnosisPicklistId: group.diagnosisPicklistId,
            suggestedProcedureIds: suggestedIds,
            acceptedProcedureIds: acceptedIds,
            addedManuallyIds: manualIds,
          });
        }

        const userId = uuidv4();

        const prophylaxis: Prophylaxis | undefined =
          state.antibioticProphylaxis || state.dvtProphylaxis
            ? {
                antibiotics: state.antibioticProphylaxis,
                dvtPrevention: state.dvtProphylaxis,
              }
            : undefined;

        // Compute episode sequence at save time to avoid duplicates.
        // On edit, keep the existing sequence. On a new case joining an
        // episode, use `allocateEpisodeSequence` — an atomic
        // read-increment-persist guarded by a per-episode mutex so two
        // concurrent saves can't both assign the same number.
        let computedEpisodeSequence = state.episodeSequence;
        if (state.episodeId) {
          if (isEditMode && existingCase?.episodeId === state.episodeId) {
            computedEpisodeSequence =
              existingCase.episodeSequence || state.episodeSequence;
          } else {
            try {
              computedEpisodeSequence = await allocateEpisodeSequence(
                state.episodeId,
              );
            } catch (seqError) {
              // Fall back to the old counting path; worst case produces a
              // duplicate sequence but doesn't block the save.
              console.warn(
                "[useCaseForm] allocateEpisodeSequence failed; falling back",
                seqError,
              );
              const episodeCases = await getCasesByEpisodeId(state.episodeId);
              computedEpisodeSequence = episodeCases.length + 1;
            }
          }
        }

        const monitoringPreference =
          profile?.surgicalPreferences?.microsurgery?.monitoringProtocol;

        const diagnosisGroupsWithFlapOutcomeDefaults =
          state.diagnosisGroups.map((group) => ({
            ...group,
            procedures: group.procedures.map((procedure) => {
              if (!hasProcedureFreeFlap(procedure)) {
                return procedure;
              }

              const currentDetails = (procedure.clinicalDetails as
                | FreeFlapDetails
                | undefined) || {
                harvestSide: "left",
                anastomoses: [],
              };

              return {
                ...procedure,
                clinicalDetails: {
                  ...currentDetails,
                  flapOutcome: withDefaultFlapOutcome(
                    currentDetails.flapOutcome,
                    {
                      monitoringProtocol: monitoringPreference,
                      returnToTheatre: state.returnToTheatre,
                    },
                  ),
                } as FreeFlapDetails,
              };
            }),
          }));
        const normalizedDiagnosisGroups = normalizeBreastDiagnosisGroups(
          diagnosisGroupsWithFlapOutcomeDefaults,
        );

        const casePayload: Case = {
          id: isEditMode && existingCase ? existingCase.id : uuidv4(),
          patientIdentifier: state.patientIdentifier.trim(),
          procedureDate: state.procedureDate,
          facility: state.facility.trim(),
          specialty: saveSpecialty,
          procedureType: derivedProcedureType,
          procedureCode,
          diagnosisGroups: normalizedDiagnosisGroups,
          surgeryTiming,
          responsibleConsultantName:
            state.responsibleConsultantName.trim() || undefined,
          responsibleConsultantUserId:
            state.responsibleConsultantUserId || undefined,
          defaultOperativeRole: state.defaultOperativeRole || undefined,
          defaultSupervisionLevel: state.defaultSupervisionLevel || undefined,
          gender: state.gender || undefined,
          ethnicity: state.ethnicity.trim() || undefined,
          patientFirstName: state.patientFirstName.trim() || undefined,
          patientLastName: state.patientLastName.trim() || undefined,
          patientDateOfBirth: state.patientDateOfBirth || undefined,
          patientNhi: state.patientNhi.trim() || undefined,
          admissionDate: state.admissionDate || undefined,
          dischargeDate: state.dischargeDate || undefined,
          admissionUrgency: state.admissionUrgency || undefined,
          stayType: state.stayType || undefined,
          injuryDate:
            showInjuryDate && state.injuryDate ? state.injuryDate : undefined,
          unplannedReadmission:
            state.unplannedReadmission !== "no"
              ? state.unplannedReadmission
              : undefined,
          comorbidities:
            state.selectedComorbidities.length > 0
              ? state.selectedComorbidities
              : undefined,
          operativeMedia:
            persistedOperativeMedia.length > 0
              ? persistedOperativeMedia
              : undefined,
          asaScore: state.asaScore
            ? (parseInt(state.asaScore) as ASAScore)
            : undefined,
          heightCm: state.heightCm ? parseFloat(state.heightCm) : undefined,
          weightKg: state.weightKg ? parseFloat(state.weightKg) : undefined,
          bmi: calculatedBmi || undefined,
          smoker: state.smoker || undefined,
          diabetes:
            state.selectedComorbidities.some(
              (c) => c.snomedCtCode === "73211009",
            ) || undefined,
          woundInfectionRisk: state.woundInfectionRisk || undefined,
          anaestheticType: state.anaestheticType || undefined,
          prophylaxis,
          unplannedICU:
            state.unplannedICU !== "no" ? state.unplannedICU : undefined,
          returnToTheatre: state.returnToTheatre || undefined,
          returnToTheatreReason:
            state.returnToTheatreReason.trim() || undefined,
          outcome: state.outcome || undefined,
          mortalityClassification: state.mortalityClassification || undefined,
          discussedAtMDM: state.discussedAtMDM || undefined,
          infectionOverlay: state.infectionOverlay || undefined,
          reconstructionTiming: state.reconstructionTiming || undefined,
          priorRadiotherapy: state.priorRadiotherapy || undefined,
          priorChemotherapy: state.priorChemotherapy || undefined,
          intraoperativeTransfusion:
            state.intraoperativeTransfusion || undefined,
          transfusionUnits: state.transfusionUnits
            ? parseInt(state.transfusionUnits)
            : undefined,
          jointCaseContext: state.jointCaseContext?.isJointCase
            ? state.jointCaseContext
            : undefined,
          episodeId: state.episodeId || undefined,
          episodeSequence: computedEpisodeSequence || undefined,
          encounterClass: state.encounterClass || undefined,
          caseStatus: state.isPlanMode
            ? "planned"
            : isIncomplete
              ? "incomplete"
              : state.dischargeDate
                ? "discharged"
                : "active",
          clinicalDetails: {
            ...state.clinicalDetails,
            ...(state.recipientSiteRegion
              ? { recipientSiteRegion: state.recipientSiteRegion }
              : {}),
            ...(state.anastomoses.length > 0
              ? { anastomoses: state.anastomoses }
              : {}),
          },
          teamMembers:
            isEditMode && existingCase?.teamMembers
              ? existingCase.teamMembers
              : [
                  {
                    id: uuidv4(),
                    userId,
                    name: "You",
                    // Backward compat: derive legacy role from new model
                    role:
                      state.defaultOperativeRole &&
                      state.defaultSupervisionLevel
                        ? toNearestLegacyRole(
                            state.defaultOperativeRole as OperativeRole,
                            state.defaultSupervisionLevel as SupervisionLevel,
                          )
                        : state.role,
                    confirmed: true,
                    addedAt: new Date().toISOString(),
                  },
                  ...state.teamMembers.map((m) => ({
                    id: uuidv4(),
                    userId: m.userId,
                    name: m.displayName,
                    role: m.role,
                    confirmed: false,
                    addedAt: new Date().toISOString(),
                  })),
                ],
          operativeTeam:
            state.operativeTeam.length > 0 ? state.operativeTeam : undefined,
          ownerId: isEditMode && existingCase ? existingCase.ownerId : userId,
          formOpenedAt: formOpenedAt || undefined,
          formSavedAt,
          entryDurationSeconds,
          suggestionAcceptanceLog:
            suggestionAcceptanceLog.length > 0
              ? suggestionAcceptanceLog
              : undefined,
          createdAt:
            isEditMode && existingCase
              ? existingCase.createdAt
              : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        let savedCase = casePayload as Case;
        if (isEditMode && existingCase) {
          await updateCase(existingCase.id, casePayload);
          savedRef.current = true;
        } else {
          await saveCase(casePayload);
          savedRef.current = true;
        }
        finalizeInboxAssignment(reservedInboxIds, savedCase.id);

        // Episode-link sync runs INSIDE its own try/catch so a failure here
        // (e.g. corrupt episode index) doesn't bubble up to the outer catch
        // and show the user "Save failed" when the case was, in fact, saved.
        // That falsely-red alert was producing duplicate cases — users would
        // tap "Try again" and create a second persisted copy.
        try {
          savedCase = await ensureBreastEpisodeLink(savedCase);
          await syncBreastEpisode(savedCase);
          savedCase = await ensureSkinCancerEpisodeLink(savedCase);
          await syncSkinCancerEpisode(savedCase);
        } catch (episodeLinkError) {
          console.warn(
            "[useCaseForm] Episode linking failed after save (case is still saved):",
            episodeLinkError,
          );
          Alert.alert(
            "Case saved — episode link incomplete",
            "The case was saved, but linking it to the treatment episode failed. You can re-link from the episode screen.",
          );
        }

        // Auto-activate planned episode when first case is saved
        if (savedCase.episodeId) {
          try {
            const episode = await getEpisode(savedCase.episodeId);
            if (episode && episode.status === "planned") {
              await updateEpisode(savedCase.episodeId, { status: "active" });
            }
          } catch {
            // Non-critical — episode activation failure shouldn't block case save
          }
        }

        // Share with tagged team members + linked operative team (non-blocking)
        {
          // Collect shareable members: old email-tagged + linked operative team
          const shareableMembers: {
            userId: string;
            displayName: string;
            role: string;
            publicKeys: { deviceId: string; publicKey: string }[];
          }[] = [...state.teamMembers];

          // Add linked operativeTeam members (fetch their device keys).
          // Every fetched-from-server public key set goes through TOFU
          // pinning — on first observation we pin, on subsequent shares
          // we assert the key matches. If the server swapped a key
          // (malicious operator, MITM on an older TLS config, etc.) the
          // mismatch surfaces as a warning and we skip that recipient.
          const tofuMismatchedRecipients: string[] = [];
          const linkedOpMembers = state.operativeTeam.filter(
            (m) => m.linkedUserId,
          );
          for (const member of linkedOpMembers) {
            // Skip if already in shareableMembers (avoid double-share)
            if (
              shareableMembers.some((m) => m.userId === member.linkedUserId)
            ) {
              continue;
            }
            try {
              const keys = await getUserDeviceKeys(member.linkedUserId!);
              if (keys.length > 0) {
                const verification = await verifyAndPinRecipientKeys(
                  member.linkedUserId!,
                  keys,
                );
                if (verification.kind === "mismatch") {
                  tofuMismatchedRecipients.push(member.displayName);
                  console.warn(
                    "[useCaseForm] TOFU mismatch for",
                    member.displayName,
                    verification.mismatches,
                  );
                  continue;
                }
                shareableMembers.push({
                  userId: member.linkedUserId!,
                  displayName: member.displayName,
                  role: member.operativeRole,
                  publicKeys: verification.keys,
                });
              }
            } catch {
              // Skip — user may have no device keys registered
            }
          }
          if (tofuMismatchedRecipients.length > 0) {
            Alert.alert(
              "Sharing skipped for some recipients",
              `The stored device key for ${tofuMismatchedRecipients.join(", ")} doesn't match what the server returned. The case was not shared with them. Confirm their device change in person, then retry.`,
            );
          }

          // Edit-mode revocation: if this case was previously shared with
          // someone who is now NO longer in the team set, revoke the old
          // share so they lose access. Without this, removing a member from
          // `operativeTeam` on edit left them with permanent read access
          // via the prior `shared_cases` row.
          if (isEditMode && existingCase) {
            try {
              const outbox = await getSharedOutbox();
              const existingSharesForCase = outbox.filter(
                (s) => s.caseId === savedCase.id,
              );
              const newRecipientIds = new Set(
                shareableMembers.map((m) => m.userId),
              );
              for (const share of existingSharesForCase) {
                // Defensive check: outbox entries carry recipientUserId;
                // if missing (shouldn't happen), skip to avoid revoking
                // something we can't classify.
                if (!share.recipientUserId) continue;
                if (!newRecipientIds.has(share.recipientUserId)) {
                  try {
                    await revokeSharedCase(share.id);
                  } catch (revokeErr) {
                    console.warn(
                      "[useCaseForm] Failed to revoke stale share",
                      share.id,
                      revokeErr,
                    );
                  }
                }
              }
            } catch (outboxError) {
              // Couldn't enumerate — leave existing shares in place. The
              // subsequent `shareCase()` call still creates new rows for
              // current recipients, so this is a degraded state, not
              // broken.
              console.warn(
                "[useCaseForm] Could not read outbox for revocation check:",
                outboxError,
              );
            }
          }

          if (shareableMembers.length > 0) {
            try {
              const caseKeyHex = await generateCaseKeyHex();
              const teamRoles = shareableMembers.map((m) => ({
                userId: m.userId,
                displayName: m.displayName,
                role: m.role,
              }));
              const blob = buildShareableBlob(savedCase, teamRoles);
              const encryptedBlob = await encryptPayloadWithCaseKey(
                JSON.stringify(blob),
                caseKeyHex,
              );

              const recipients = [];
              for (const member of shareableMembers) {
                const keyEnvelopes = [];
                for (const pk of member.publicKeys) {
                  const envelope = await wrapCaseKeyForRecipient(
                    caseKeyHex,
                    pk.publicKey,
                  );
                  keyEnvelopes.push({
                    deviceId: pk.deviceId,
                    envelopeJson: JSON.stringify(envelope),
                  });
                }
                recipients.push({
                  userId: member.userId,
                  role: member.role,
                  keyEnvelopes,
                });
              }

              await shareCase({
                caseId: savedCase.id,
                encryptedShareableBlob: encryptedBlob,
                recipients,
              });
            } catch (sharingError) {
              console.warn("Sharing failed:", sharingError);
              // Case saved successfully — sharing will need manual retry
            }
          }
        }

        // Derive EPA assessment targets (non-blocking)
        if (state.operativeTeam.length > 0 && profile?.careerStage) {
          try {
            const allProcs = savedCase.diagnosisGroups.flatMap(
              (g: DiagnosisGroup) => g.procedures,
            );
            const epaProcs = allProcs.map((p) => ({
              procedureName: p.procedureName,
              snomedCtCode: p.snomedCtCode,
            }));
            const targets = deriveEpaAssessments(
              profile.userId,
              profile.careerStage,
              profile.userId,
              state.operativeTeam,
              epaProcs,
            );
            if (targets.length > 0) {
              saveEpaTargets(savedCase.id, targets).catch(() => {
                // Non-critical — EPA storage failure doesn't block save
              });
            }
          } catch {
            // Non-critical — EPA derivation failure doesn't block save
          }
        }

        // Surface silent team-sharing / EPA limitations. Sharing and EPA both
        // filter the operativeTeam to linked Opus users with careerStage set;
        // members failing either check are dropped with no visible feedback.
        if (state.operativeTeam.length > 0) {
          const issues: string[] = [];
          const unlinkedCount = state.operativeTeam.filter(
            (m) => !m.linkedUserId,
          ).length;
          const linkedMissingStage = state.operativeTeam.filter(
            (m) => m.linkedUserId && !m.careerStage,
          ).length;
          if (unlinkedCount > 0) {
            issues.push(
              `• ${unlinkedCount} tagged member${unlinkedCount === 1 ? " isn't" : "s aren't"} linked to an Opus account yet, so they won't receive this case.`,
            );
          }
          if (!profile?.careerStage) {
            issues.push(
              "• Your own career stage isn't set, so no assessment targets will be generated. Set it in Edit Profile.",
            );
          } else if (linkedMissingStage > 0) {
            issues.push(
              `• ${linkedMissingStage} linked member${linkedMissingStage === 1 ? " is" : "s are"} missing a career stage, so no assessment targets will be generated for them.`,
            );
          }
          if (issues.length > 0) {
            Alert.alert(
              "Case saved — team features limited",
              issues.join("\n"),
            );
          }
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return true;
      } catch (error) {
        console.error("Error saving case:", error);
        Alert.alert("Error", "Failed to save case. Please try again.");
        return false;
      } finally {
        dispatch(setField("saving", false));
      }
    },
    [
      state,
      isEditMode,
      existingCase,
      loadingExistingCase,
      loadError,
      specialty,
      profile,
      calculatedBmi,
      showInjuryDate,
    ],
  );

  return {
    state,
    dispatch,
    handleSave,
    isEditMode,
    existingCase,
    loadingExistingCase,
    loadError,
    specialty,
    calculatedBmi,
    durationDisplay,
    showInjuryDate,
    draftLoadedRef,
    savedRef,
    resetForm,
    revertToSaved,
    handleDiagnosisGroupChange,
    handleDeleteDiagnosisGroup,
    addDiagnosisGroup,
    reorderDiagnosisGroups,
    addAnastomosis,
    updateAnastomosis,
    removeAnastomosis,
    updateClinicalDetail,
  };
}
