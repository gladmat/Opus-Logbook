import React, { createContext, useContext, useMemo } from "react";
import {
  CaseFormState,
  CaseFormAction,
  UseCaseFormReturn,
} from "@/hooks/useCaseForm";
import { Specialty, DiagnosisGroup, AnastomosisEntry } from "@/types/case";

// ─── State Context ──────────────────────────────────────────────────────────

export interface CaseFormStateContextValue {
  state: CaseFormState;
  calculatedBmi: number | undefined;
  durationDisplay: string | null;
  showInjuryDate: boolean;
  isEditMode: boolean;
  specialty: Specialty;
}

const CaseFormStateContext = createContext<CaseFormStateContextValue | null>(
  null,
);

export function useCaseFormState(): CaseFormStateContextValue {
  const ctx = useContext(CaseFormStateContext);
  if (!ctx)
    throw new Error("useCaseFormState must be used within CaseFormProvider");
  return ctx;
}

// ─── Dispatch Context ───────────────────────────────────────────────────────

export interface CaseFormDispatchContextValue {
  dispatch: React.Dispatch<CaseFormAction>;
  addAnastomosis: (vesselType: "artery" | "vein") => void;
  updateAnastomosis: (entry: AnastomosisEntry) => void;
  removeAnastomosis: (id: string) => void;
  handleDiagnosisGroupChange: (
    index: number,
    updated: DiagnosisGroup,
    scrollViewRef?: React.RefObject<any>,
    scrollPositionRef?: React.MutableRefObject<number>,
  ) => void;
  handleDeleteDiagnosisGroup: (index: number) => void;
  addDiagnosisGroup: () => void;
  reorderDiagnosisGroups: (groups: DiagnosisGroup[]) => void;
  updateClinicalDetail: (key: string, value: any) => void;
  fieldErrors: Record<string, string>;
  onFieldBlur: (field: string) => void;
}

const CaseFormDispatchContext =
  createContext<CaseFormDispatchContextValue | null>(null);

export function useCaseFormDispatch(): CaseFormDispatchContextValue {
  const ctx = useContext(CaseFormDispatchContext);
  if (!ctx)
    throw new Error("useCaseFormDispatch must be used within CaseFormProvider");
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface CaseFormProviderProps {
  form: UseCaseFormReturn;
  fieldErrors: Record<string, string>;
  onFieldBlur: (field: string) => void;
  children: React.ReactNode;
}

export function CaseFormProvider({
  form,
  fieldErrors,
  onFieldBlur,
  children,
}: CaseFormProviderProps) {
  const stateValue: CaseFormStateContextValue = useMemo(
    () => ({
      state: form.state,
      calculatedBmi: form.calculatedBmi,
      durationDisplay: form.durationDisplay,
      showInjuryDate: form.showInjuryDate,
      isEditMode: form.isEditMode,
      specialty: form.specialty,
    }),
    [
      form.state,
      form.calculatedBmi,
      form.durationDisplay,
      form.showInjuryDate,
      form.isEditMode,
      form.specialty,
    ],
  );

  const dispatchValue: CaseFormDispatchContextValue = useMemo(
    () => ({
      dispatch: form.dispatch,
      addAnastomosis: form.addAnastomosis,
      updateAnastomosis: form.updateAnastomosis,
      removeAnastomosis: form.removeAnastomosis,
      handleDiagnosisGroupChange: form.handleDiagnosisGroupChange,
      handleDeleteDiagnosisGroup: form.handleDeleteDiagnosisGroup,
      addDiagnosisGroup: form.addDiagnosisGroup,
      reorderDiagnosisGroups: form.reorderDiagnosisGroups,
      updateClinicalDetail: form.updateClinicalDetail,
      fieldErrors,
      onFieldBlur,
    }),
    [
      form.dispatch,
      form.addAnastomosis,
      form.updateAnastomosis,
      form.removeAnastomosis,
      form.handleDiagnosisGroupChange,
      form.handleDeleteDiagnosisGroup,
      form.addDiagnosisGroup,
      form.reorderDiagnosisGroups,
      form.updateClinicalDetail,
      fieldErrors,
      onFieldBlur,
    ],
  );

  return (
    <CaseFormStateContext.Provider value={stateValue}>
      <CaseFormDispatchContext.Provider value={dispatchValue}>
        {children}
      </CaseFormDispatchContext.Provider>
    </CaseFormStateContext.Provider>
  );
}
