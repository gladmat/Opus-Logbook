import type { CaseProcedure, Specialty } from "@/types/case";

export type HandCaseType = "trauma" | "acute" | "elective" | null | undefined;

export interface ElectiveSnomedSelection {
  conceptId: string;
  term: string;
}

export interface ElectiveSnomedFallbackState {
  selectedDiagnosis: null;
  primaryDiagnosis: ElectiveSnomedSelection;
  diagnosis: string;
  diagnosisStaging: null;
  stagingValues: Record<string, string>;
  selectedSuggestionIds: Set<string>;
  isDiagnosisPickerCollapsed: true;
  showAllProcedures: false;
  handCaseType: "elective";
  handInfectionDetails: undefined;
  acuteProceduresAccepted: false;
  showAcuteFullProcedurePicker: false;
  procedures: CaseProcedure[];
}

export function isElectiveHandFlow(
  groupSpecialty: Specialty,
  handCaseType: HandCaseType,
): boolean {
  return groupSpecialty === "hand_wrist" && handCaseType === "elective";
}

export function shouldRenderGenericDiagnosisSnomedPicker(params: {
  hasDiagnosisPicklist: boolean;
  isDiagnosisPickerCollapsed: boolean;
  groupSpecialty: Specialty;
  handCaseType: HandCaseType;
}): boolean {
  return (
    params.hasDiagnosisPicklist &&
    !params.isDiagnosisPickerCollapsed &&
    !isElectiveHandFlow(params.groupSpecialty, params.handCaseType)
  );
}

export function buildElectiveSnomedFallbackState(
  result: ElectiveSnomedSelection,
  procedures: CaseProcedure[],
): ElectiveSnomedFallbackState {
  return {
    selectedDiagnosis: null,
    primaryDiagnosis: result,
    diagnosis: result.term,
    diagnosisStaging: null,
    stagingValues: {},
    selectedSuggestionIds: new Set<string>(),
    isDiagnosisPickerCollapsed: true,
    showAllProcedures: false,
    handCaseType: "elective",
    handInfectionDetails: undefined,
    acuteProceduresAccepted: false,
    showAcuteFullProcedurePicker: false,
    procedures,
  };
}
