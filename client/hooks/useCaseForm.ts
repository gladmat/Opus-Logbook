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
  DiagnosisGroup,
  Specialty,
  Role,
  SmokingStatus,
  OperatingTeamMember,
  OperatingTeamRole,
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
import { updateEpisode, getEpisode } from "@/lib/episodeStorage";
import { getDefaultClinicalDetails } from "@/lib/procedureConfig";
import {
  findSnomedProcedure,
  getProcedureCodeForCountry,
  getCountryCodeFromProfile,
} from "@/lib/snomedCt";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";
import { UserProfile } from "@/lib/auth";

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
  age: string;
  ethnicity: string;

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
  operatingTeam: OperatingTeamMember[];
  newTeamMemberName: string;
  newTeamMemberRole: OperatingTeamRole;
  role: Role;

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

  // Episode linkage
  episodeId: string;
  episodeSequence: number;
  encounterClass: EncounterClass | "";

  // UI state
  saving: boolean;
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type CaseFormAction =
  | { type: "SET_FIELD"; field: keyof CaseFormState; value: any }
  | { type: "SET_DIAGNOSIS_GROUPS"; groups: DiagnosisGroup[] }
  | { type: "REORDER_DIAGNOSIS_GROUPS"; groups: DiagnosisGroup[] }
  | { type: "RESET_FORM"; defaults: CaseFormState }
  | { type: "LOAD_DRAFT"; draft: Partial<CaseFormState> }
  | { type: "LOAD_CASE"; formState: CaseFormState }
  | { type: "BULK_UPDATE"; updates: Partial<CaseFormState> };

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
    procedureDate: new Date().toISOString().split("T")[0] ?? "",
    facility: primaryFacility,
    procedureType: "",
    gender: "",
    age: "",
    ethnicity: "",
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
    operatingTeam: [],
    newTeamMemberName: "",
    newTeamMemberRole: "scrub_nurse",
    role: "PS",
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
    episodeId: "",
    episodeSequence: 0,
    encounterClass: "",
    saving: false,
  };
}

// ─── Case → FormState conversion ───────────────────────────────────────────

function loadCaseIntoFormState(
  caseData: Case,
  specialty: Specialty,
): CaseFormState {
  const userMember = caseData.teamMembers?.find((m) => m.name === "You");
  const role = (userMember?.role as Role | undefined) ?? "PS";

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
    age: caseData.age ? String(caseData.age) : "",
    ethnicity: caseData.ethnicity ?? "",
    diagnosisGroups: caseData.diagnosisGroups || [],
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
    operatingTeam: caseData.operatingTeam ?? [],
    newTeamMemberName: "",
    newTeamMemberRole: "scrub_nurse",
    role,
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
    episodeId: caseData.episodeId ?? "",
    episodeSequence: caseData.episodeSequence ?? 0,
    encounterClass: (caseData.encounterClass as EncounterClass) ?? "",
    saving: false,
  };
}

// ─── FormState → CaseDraft conversion ───────────────────────────────────────

export function formStateToDraft(
  state: CaseFormState,
  specialty: Specialty,
): CaseDraft {
  const showInjuryDate =
    state.admissionUrgency === "acute" ||
    state.diagnosisGroups.some(
      (g) => g.specialty === "hand_surgery" || g.specialty === "orthoplastic",
    );

  return {
    id: "draft",
    patientIdentifier: state.patientIdentifier,
    procedureDate: state.procedureDate,
    facility: state.facility,
    specialty,
    procedureType:
      state.diagnosisGroups[0]?.procedures[0]?.procedureName ||
      state.procedureType,
    diagnosisGroups: state.diagnosisGroups,
    surgeryTiming:
      state.surgeryStartTime || state.surgeryEndTime
        ? {
            startTime: state.surgeryStartTime || undefined,
            endTime: state.surgeryEndTime || undefined,
          }
        : undefined,
    operatingTeam: state.operatingTeam,
    gender: state.gender || undefined,
    age: state.age ? parseInt(state.age) : undefined,
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
  if (draft.procedureDate != null) result.procedureDate = draft.procedureDate;
  result.facility = draft.facility ?? primaryFacility;
  if (draft.procedureType != null) result.procedureType = draft.procedureType;
  if (draft.asaScore != null) result.asaScore = String(draft.asaScore);
  if (draft.heightCm != null) result.heightCm = String(draft.heightCm);
  if (draft.weightKg != null) result.weightKg = String(draft.weightKg);
  result.smoker = draft.smoker ?? "";
  result.diabetes = draft.diabetes ?? null;
  result.role = (draft.teamMembers?.[0]?.role as Role | undefined) ?? "PS";
  result.surgeryStartTime = draft.surgeryTiming?.startTime ?? "";
  result.surgeryEndTime = draft.surgeryTiming?.endTime ?? "";
  result.operatingTeam = draft.operatingTeam ?? [];
  result.clinicalDetails =
    (draft.clinicalDetails as Record<string, any>) ??
    getDefaultClinicalDetails(specialty);
  result.recipientSiteRegion = (
    draft.clinicalDetails as FreeFlapDetails | undefined
  )?.recipientSiteRegion;
  result.anastomoses =
    (draft.clinicalDetails as FreeFlapDetails | undefined)?.anastomoses ?? [];
  if (draft.diagnosisGroups) result.diagnosisGroups = draft.diagnosisGroups;
  result.gender = draft.gender ?? "";
  result.age = draft.age ? String(draft.age) : "";
  result.ethnicity = draft.ethnicity ?? "";
  result.admissionDate = draft.admissionDate ?? "";
  result.dischargeDate = draft.dischargeDate ?? "";
  result.admissionUrgency = draft.admissionUrgency ?? "";
  result.stayType = draft.stayType ?? "";
  result.injuryDate = draft.injuryDate ?? "";
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
  result.episodeId = draft.episodeId ?? "";
  result.episodeSequence = draft.episodeSequence ?? 0;
  result.encounterClass = (draft.encounterClass as EncounterClass) ?? "";

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
    case "procedureDate":
      if (!state.procedureDate) return "Procedure date is required";
      if (new Date(state.procedureDate) > new Date())
        return "Procedure date cannot be in the future";
      return null;
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

  if (!state.patientIdentifier.trim()) {
    errors.push({
      field: "patientIdentifier",
      sectionId: "patient",
      message: "Patient identifier is required",
    });
  }
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
      sectionId: "diagnosis",
      message: "At least one diagnosis with a named procedure is required",
    });
  }

  return { valid: errors.length === 0, errors };
}

// ─── Reducer ────────────────────────────────────────────────────────────────

function caseFormReducer(
  state: CaseFormState,
  action: CaseFormAction,
): CaseFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_DIAGNOSIS_GROUPS":
      return { ...state, diagnosisGroups: action.groups };
    case "REORDER_DIAGNOSIS_GROUPS":
      return { ...state, diagnosisGroups: action.groups };
    case "RESET_FORM":
      return action.defaults;
    case "LOAD_DRAFT":
      return { ...state, ...action.draft };
    case "LOAD_CASE":
      return action.formState;
    case "BULK_UPDATE":
      return { ...state, ...action.updates };
    default:
      return state;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

interface UseCaseFormParams {
  specialty: Specialty;
  caseId?: string;
  duplicateFrom?: Case;
  episodeId?: string;
  episodePrefill?: EpisodePrefillData;
  primaryFacility: string;
  profile: UserProfile | null;
}

// ─── Episode Prefill State Builder ──────────────────────────────────────────

export function buildEpisodePrefillState(
  episodeId: string,
  prefill: EpisodePrefillData,
  primaryFacility: string,
): CaseFormState {
  const defaults = getDefaultFormState(prefill.specialty, primaryFacility);

  // Clone diagnosis groups with new IDs, stripping per-operation data.
  // Keep: diagnosis identity, specialty, staging, laterality, injury mechanism,
  //       fractures (patient-level), procedure names/codes.
  // Strip: clinicalDetails on procedures (FreeFlapDetails, ischemia times,
  //        anastomoses), woundAssessment, lesionInstances, handTrauma.
  const clonedGroups: DiagnosisGroup[] = prefill.diagnosisGroups?.map((g) => ({
    ...g,
    id: uuidv4(),
    procedures: g.procedures.map((p) => ({
      ...p,
      id: uuidv4(),
      clinicalDetails: undefined, // Strip per-operation FreeFlapDetails etc.
    })),
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
    diagnosisGroups: clonedGroups,
  };
}

// ─── Duplicate State Builder ────────────────────────────────────────────────

export function buildDuplicateState(
  source: Case,
  specialty: Specialty,
  primaryFacility: string,
): CaseFormState {
  // Deep clone diagnosis groups with new IDs
  const clonedGroups: DiagnosisGroup[] = source.diagnosisGroups?.map((g) => ({
    ...g,
    id: uuidv4(),
    procedures: g.procedures.map((p) => ({
      ...p,
      id: uuidv4(),
      clinicalDetails: p.clinicalDetails ? { ...p.clinicalDetails } : undefined,
    })),
    diagnosisClinicalDetails: g.diagnosisClinicalDetails
      ? { ...g.diagnosisClinicalDetails }
      : undefined,
    diagnosisStagingSelections: g.diagnosisStagingSelections
      ? { ...g.diagnosisStagingSelections }
      : undefined,
    fractures: g.fractures?.map((f) => ({ ...f, id: uuidv4() })) ?? [],
    lesionInstances:
      g.lesionInstances?.map((l) => ({ ...l, id: uuidv4() })) ?? [],
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
    (source.clinicalDetails as any)?.anastomoses?.map(
      (a: AnastomosisEntry) => ({ ...a, id: uuidv4() }),
    ) ?? [];

  const defaults = getDefaultFormState(specialty, primaryFacility);

  return {
    ...defaults,
    // ── Copied fields ────────────────────────────────────────
    facility: source.facility || primaryFacility,
    diagnosisGroups: clonedGroups,
    role:
      (source.teamMembers?.find((m) => m.name === "You")?.role as Role) ?? "PS",
    clinicalDetails: source.clinicalDetails
      ? { ...(source.clinicalDetails as Record<string, any>) }
      : defaults.clinicalDetails,
    woundInfectionRisk: (source.woundInfectionRisk as WoundInfectionRisk) || "",
    anaestheticType: (source.anaestheticType as AnaestheticType) || "",
    antibioticProphylaxis: source.prophylaxis?.antibiotics ?? false,
    dvtProphylaxis: source.prophylaxis?.dvtPrevention ?? false,
    recipientSiteRegion:
      (source.clinicalDetails as any)?.recipientSiteRegion ?? undefined,
    anastomoses: clonedAnastomoses,

    // ── Cleared fields ───────────────────────────────────────
    patientIdentifier: "",
    procedureDate: new Date().toISOString().split("T")[0] ?? "",
    gender: "",
    age: "",
    ethnicity: "",
    admissionDate: "",
    dischargeDate: "",
    injuryDate: "",
    surgeryStartTime: "",
    surgeryEndTime: "",
    operatingTeam: [],
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
    episodeId: "",
    episodeSequence: 0,
    encounterClass: "",
    saving: false,
  };
}

export interface UseCaseFormReturn {
  state: CaseFormState;
  dispatch: React.Dispatch<CaseFormAction>;
  handleSave: (formOpenedAt?: string) => Promise<boolean>;
  isEditMode: boolean;
  existingCase: Case | null;
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
  // Team callbacks
  addTeamMember: () => void;
  removeTeamMember: (id: string) => void;
  // Anastomosis callbacks
  addAnastomosis: (vesselType: "artery" | "vein") => void;
  updateAnastomosis: (entry: AnastomosisEntry) => void;
  removeAnastomosis: (id: string) => void;
  // Clinical detail callback
  updateClinicalDetail: (key: string, value: any) => void;
}

export function useCaseForm({
  specialty: routeSpecialty,
  caseId,
  duplicateFrom,
  episodeId: routeEpisodeId,
  episodePrefill,
  primaryFacility,
  profile,
}: UseCaseFormParams): UseCaseFormReturn {
  const isEditMode = !!caseId;
  const isDuplicate = !!duplicateFrom;
  const isEpisodePrefill = !!episodePrefill;
  const [existingCase, setExistingCase] = useState<Case | null>(null);
  const specialty = routeSpecialty || existingCase?.specialty || "general";

  const draftLoadedRef = useRef(false);
  const savedRef = useRef(false);
  const editModeLoadedRef = useRef(false);

  const [state, dispatch] = useReducer(
    caseFormReducer,
    episodePrefill && routeEpisodeId
      ? buildEpisodePrefillState(
          routeEpisodeId,
          episodePrefill,
          primaryFacility,
        )
      : duplicateFrom
        ? buildDuplicateState(duplicateFrom, specialty, primaryFacility)
        : getDefaultFormState(specialty, primaryFacility),
  );

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

  const showInjuryDate =
    state.admissionUrgency === "acute" ||
    state.diagnosisGroups.some(
      (g) => g.specialty === "hand_surgery" || g.specialty === "orthoplastic",
    );

  // ── Side effects ────────────────────────────────────────────────────────

  // Clear injury date when no longer applicable
  useEffect(() => {
    if (!showInjuryDate && state.injuryDate) {
      dispatch(setField("injuryDate", ""));
    }
  }, [showInjuryDate, state.injuryDate]);

  // Auto-fill admission/discharge for day case
  useEffect(() => {
    if (state.stayType === "day_case" && state.procedureDate) {
      dispatch({
        type: "BULK_UPDATE",
        updates: {
          admissionDate: state.procedureDate,
          dischargeDate: state.procedureDate,
        },
      });
    }
  }, [state.stayType, state.procedureDate]);

  // Load existing case in edit mode
  useEffect(() => {
    if (!isEditMode || !caseId || editModeLoadedRef.current) return;

    const loadExistingCase = async () => {
      try {
        const caseData = await getCase(caseId);
        if (!caseData) return;

        setExistingCase(caseData);
        editModeLoadedRef.current = true;

        const formState = loadCaseIntoFormState(caseData, specialty);
        dispatch({ type: "LOAD_CASE", formState });
      } catch (error) {
        console.error("Error loading case for edit:", error);
      }
    };

    loadExistingCase();
  }, [isEditMode, caseId, specialty]);

  // Mark draft as loaded in edit/duplicate mode (so useCaseDraft doesn't try to load a draft)
  useEffect(() => {
    if (isEditMode || isDuplicate) {
      draftLoadedRef.current = true;
    }
  }, [isEditMode, isDuplicate]);

  // ── Reset / Revert ────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    dispatch({
      type: "RESET_FORM",
      defaults: getDefaultFormState(specialty, primaryFacility),
    });
  }, [specialty, primaryFacility]);

  const revertToSaved = useCallback(() => {
    if (existingCase) {
      const formState = loadCaseIntoFormState(existingCase, specialty);
      dispatch({ type: "LOAD_CASE", formState });
    }
  }, [existingCase, specialty]);

  // ── Diagnosis group callbacks ─────────────────────────────────────────

  const handleDiagnosisGroupChange = useCallback(
    (
      index: number,
      updated: DiagnosisGroup,
      scrollViewRef?: React.RefObject<any>,
      scrollPositionRef?: React.MutableRefObject<number>,
    ) => {
      const pos = scrollPositionRef?.current ?? 0;
      dispatch({
        type: "SET_FIELD",
        field: "diagnosisGroups",
        value: state.diagnosisGroups.map((g, i) => (i === index ? updated : g)),
      });
      if (scrollViewRef?.current) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollViewRef.current?.scrollTo({ y: pos, animated: false });
          });
        });
      }
    },
    [state.diagnosisGroups],
  );

  const handleDeleteDiagnosisGroup = useCallback(
    (index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const filtered = state.diagnosisGroups.filter((_, i) => i !== index);
      dispatch({
        type: "SET_DIAGNOSIS_GROUPS",
        groups: filtered.map((g, i) => ({ ...g, sequenceOrder: i + 1 })),
      });
    },
    [state.diagnosisGroups],
  );

  const addDiagnosisGroup = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dispatch({
      type: "SET_DIAGNOSIS_GROUPS",
      groups: [
        ...state.diagnosisGroups,
        {
          id: uuidv4(),
          sequenceOrder: state.diagnosisGroups.length + 1,
          specialty,
          procedures: [
            {
              id: uuidv4(),
              sequenceOrder: 1,
              procedureName: "",
              specialty,
              surgeonRole: "PS" as Role,
            },
          ],
        },
      ],
    });
  }, [state.diagnosisGroups, specialty]);

  const reorderDiagnosisGroups = useCallback((groups: DiagnosisGroup[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch({
      type: "REORDER_DIAGNOSIS_GROUPS",
      groups: groups.map((g, i) => ({ ...g, sequenceOrder: i + 1 })),
    });
  }, []);

  // ── Team callbacks ────────────────────────────────────────────────────

  const addTeamMember = useCallback(() => {
    if (!state.newTeamMemberName.trim()) {
      Alert.alert("Required", "Please enter a name for the team member");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch({
      type: "BULK_UPDATE",
      updates: {
        operatingTeam: [
          ...state.operatingTeam,
          {
            id: uuidv4(),
            name: state.newTeamMemberName.trim(),
            role: state.newTeamMemberRole,
          },
        ],
        newTeamMemberName: "",
      },
    });
  }, [state.newTeamMemberName, state.newTeamMemberRole, state.operatingTeam]);

  const removeTeamMember = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      dispatch(
        setField(
          "operatingTeam",
          state.operatingTeam.filter((m) => m.id !== id),
        ),
      );
    },
    [state.operatingTeam],
  );

  // ── Anastomosis callbacks ─────────────────────────────────────────────

  const addAnastomosis = useCallback(
    (vesselType: "artery" | "vein") => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const derivedType =
        state.diagnosisGroups[0]?.procedures[0]?.procedureName ||
        state.procedureType;
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
      dispatch(setField("anastomoses", [...state.anastomoses, newEntry]));
    },
    [state.procedureType, state.anastomoses],
  );

  const updateAnastomosis = useCallback(
    (entry: AnastomosisEntry) => {
      dispatch(
        setField(
          "anastomoses",
          state.anastomoses.map((a) => (a.id === entry.id ? entry : a)),
        ),
      );
    },
    [state.anastomoses],
  );

  const removeAnastomosis = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      dispatch(
        setField(
          "anastomoses",
          state.anastomoses.filter((a) => a.id !== id),
        ),
      );
    },
    [state.anastomoses],
  );

  // ── Clinical detail callback ──────────────────────────────────────────

  const updateClinicalDetail = useCallback(
    (key: string, value: any) => {
      dispatch(
        setField("clinicalDetails", { ...state.clinicalDetails, [key]: value }),
      );
    },
    [state.clinicalDetails],
  );

  // ── Save ──────────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (formOpenedAt?: string): Promise<boolean> => {
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
          specialty,
        );
        const procedureCode: ProcedureCode | undefined = snomedProcedure
          ? getProcedureCodeForCountry(snomedProcedure, countryCode)
          : undefined;

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

        // Compute episode sequence at save time to avoid duplicates
        let computedEpisodeSequence = state.episodeSequence;
        if (state.episodeId) {
          const caseId =
            isEditMode && existingCase ? existingCase.id : undefined;
          const episodeCases = await getCasesByEpisodeId(state.episodeId);
          if (isEditMode && existingCase?.episodeId === state.episodeId) {
            // Editing a case already in this episode — preserve its sequence
            computedEpisodeSequence =
              existingCase.episodeSequence || state.episodeSequence;
          } else {
            // New case or episode changed — next available sequence
            const existingCount = caseId
              ? episodeCases.filter((c) => c.id !== caseId).length
              : episodeCases.length;
            computedEpisodeSequence = existingCount + 1;
          }
        }

        const casePayload: Case = {
          id: isEditMode && existingCase ? existingCase.id : uuidv4(),
          patientIdentifier: state.patientIdentifier.trim(),
          procedureDate: state.procedureDate,
          facility: state.facility.trim(),
          specialty,
          procedureType: derivedProcedureType,
          procedureCode,
          diagnosisGroups: state.diagnosisGroups,
          surgeryTiming,
          operatingTeam:
            state.operatingTeam.length > 0 ? state.operatingTeam : undefined,
          gender: state.gender || undefined,
          age: state.age ? parseInt(state.age) : undefined,
          ethnicity: state.ethnicity.trim() || undefined,
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
            state.operativeMedia.length > 0 ? state.operativeMedia : undefined,
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
          episodeId: state.episodeId || undefined,
          episodeSequence: computedEpisodeSequence || undefined,
          encounterClass: state.encounterClass || undefined,
          caseStatus: isIncomplete
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
                    role: state.role,
                    confirmed: true,
                    addedAt: new Date().toISOString(),
                  },
                ],
          ownerId: isEditMode && existingCase ? existingCase.ownerId : userId,
          schemaVersion: 3,
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

        if (isEditMode && existingCase) {
          await updateCase(existingCase.id, casePayload);
        } else {
          await saveCase(casePayload);
          savedRef.current = true;
        }

        // Auto-activate planned episode when first case is saved
        if (state.episodeId) {
          try {
            const episode = await getEpisode(state.episodeId);
            if (episode && episode.status === "planned") {
              await updateEpisode(state.episodeId, { status: "active" });
            }
          } catch {
            // Non-critical — episode activation failure shouldn't block case save
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
    addTeamMember,
    removeTeamMember,
    addAnastomosis,
    updateAnastomosis,
    removeAnastomosis,
    updateClinicalDetail,
  };
}
