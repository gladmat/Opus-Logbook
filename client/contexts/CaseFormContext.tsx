import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  CaseFormState,
  CaseFormAction,
  UseCaseFormReturn,
} from "@/hooks/useCaseForm";
import { Specialty, DiagnosisGroup, AnastomosisEntry } from "@/types/case";

// ─── Store Context ──────────────────────────────────────────────────────────

export interface CaseFormSnapshot {
  state: CaseFormState;
  calculatedBmi: number | undefined;
  durationDisplay: string | null;
  showInjuryDate: boolean;
  isEditMode: boolean;
  specialty: Specialty;
}

interface CaseFormStore {
  getSnapshot: () => CaseFormSnapshot;
  subscribe: (listener: () => void) => () => void;
  emitChange: () => void;
}

const CaseFormStoreContext = createContext<CaseFormStore | null>(null);

function createCaseFormStore(
  snapshotRef: React.MutableRefObject<CaseFormSnapshot>,
): CaseFormStore {
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshotRef.current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emitChange: () => {
      listeners.forEach((listener) => listener());
    },
  };
}

function useCaseFormStore(): CaseFormStore {
  const store = useContext(CaseFormStoreContext);
  if (!store) {
    throw new Error("Case form hooks must be used within CaseFormProvider");
  }
  return store;
}

export function useCaseFormSelector<T>(
  selector: (snapshot: CaseFormSnapshot) => T,
): T {
  const store = useCaseFormStore();

  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getSnapshot()),
  );
}

export function useCaseFormState(): CaseFormSnapshot {
  return useCaseFormSelector((snapshot) => snapshot);
}

export function useCaseFormField<K extends keyof CaseFormState>(
  field: K,
): CaseFormState[K] {
  return useCaseFormSelector((snapshot) => snapshot.state[field]);
}

// ─── Actions Context ────────────────────────────────────────────────────────

export interface CaseFormActionsContextValue {
  dispatch: React.Dispatch<CaseFormAction>;
  getState: () => CaseFormState;
  getSpecialty: () => Specialty;
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
}

const CaseFormActionsContext =
  createContext<CaseFormActionsContextValue | null>(null);

export function useCaseFormDispatch(): CaseFormActionsContextValue {
  const ctx = useContext(CaseFormActionsContext);
  if (!ctx)
    throw new Error("useCaseFormDispatch must be used within CaseFormProvider");
  return ctx;
}

// ─── Validation Context ─────────────────────────────────────────────────────

export interface CaseFormValidationContextValue {
  fieldErrors: Record<string, string>;
  onFieldBlur: (field: string) => void;
}

const CaseFormValidationContext =
  createContext<CaseFormValidationContextValue | null>(null);

export function useCaseFormValidation(): CaseFormValidationContextValue {
  const ctx = useContext(CaseFormValidationContext);
  if (!ctx) {
    throw new Error(
      "useCaseFormValidation must be used within CaseFormProvider",
    );
  }
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
  const snapshot = useMemo<CaseFormSnapshot>(
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
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const storeRef = useRef<CaseFormStore | null>(null);
  const committedSnapshotRef = useRef(snapshot);

  if (!storeRef.current) {
    storeRef.current = createCaseFormStore(snapshotRef);
  }

  useLayoutEffect(() => {
    if (committedSnapshotRef.current !== snapshot) {
      committedSnapshotRef.current = snapshot;
      storeRef.current?.emitChange();
    }
  }, [snapshot]);

  const actionsValue: CaseFormActionsContextValue = useMemo(
    () => ({
      dispatch: form.dispatch,
      getState: () => snapshotRef.current.state,
      getSpecialty: () => snapshotRef.current.specialty,
      addAnastomosis: form.addAnastomosis,
      updateAnastomosis: form.updateAnastomosis,
      removeAnastomosis: form.removeAnastomosis,
      handleDiagnosisGroupChange: form.handleDiagnosisGroupChange,
      handleDeleteDiagnosisGroup: form.handleDeleteDiagnosisGroup,
      addDiagnosisGroup: form.addDiagnosisGroup,
      reorderDiagnosisGroups: form.reorderDiagnosisGroups,
      updateClinicalDetail: form.updateClinicalDetail,
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
    ],
  );

  const validationValue: CaseFormValidationContextValue = useMemo(
    () => ({
      fieldErrors,
      onFieldBlur,
    }),
    [fieldErrors, onFieldBlur],
  );

  return (
    <CaseFormStoreContext.Provider value={storeRef.current}>
      <CaseFormActionsContext.Provider value={actionsValue}>
        <CaseFormValidationContext.Provider value={validationValue}>
          {children}
        </CaseFormValidationContext.Provider>
      </CaseFormActionsContext.Provider>
    </CaseFormStoreContext.Provider>
  );
}
