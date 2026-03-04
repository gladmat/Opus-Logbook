import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { Specialty } from "@/types/case";
import { getCaseDraft, saveCaseDraft, clearCaseDraft } from "@/lib/storage";
import {
  CaseFormState,
  CaseFormAction,
  formStateToDraft,
  draftToFormState,
} from "./useCaseForm";

interface UseCaseDraftParams {
  state: CaseFormState;
  specialty: Specialty;
  isEditMode: boolean;
  draftLoadedRef: React.MutableRefObject<boolean>;
  savedRef: React.MutableRefObject<boolean>;
  dispatch: React.Dispatch<CaseFormAction>;
  primaryFacility: string;
}

export function useCaseDraft({
  state,
  specialty,
  isEditMode,
  draftLoadedRef,
  savedRef,
  dispatch,
  primaryFacility,
}: UseCaseDraftParams): { clearDraft: () => Promise<void> } {
  const stateRef = useRef(state);
  stateRef.current = state;

  const prevStateJsonRef = useRef<string>("");
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load draft on mount (new case only) ───────────────────────────────

  useEffect(() => {
    if (isEditMode || draftLoadedRef.current) return;

    const loadDraft = async () => {
      const draft = await getCaseDraft(specialty);
      if (draft) {
        const partial = draftToFormState(draft, specialty, primaryFacility);
        dispatch({ type: "LOAD_DRAFT", draft: partial });
      }
      draftLoadedRef.current = true;
    };

    loadDraft();
  }, [specialty, primaryFacility, isEditMode, draftLoadedRef, dispatch]);

  // ── Flush pending draft immediately ───────────────────────────────────

  const flushDraft = useCallback(() => {
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
    if (!draftLoadedRef.current || savedRef.current || isEditMode) return;
    const draft = formStateToDraft(stateRef.current, specialty);
    saveCaseDraft(specialty, draft);
  }, [specialty, isEditMode, draftLoadedRef, savedRef]);

  // ── Debounced auto-save ───────────────────────────────────────────────

  useEffect(() => {
    if (!draftLoadedRef.current || savedRef.current || isEditMode) return;

    const stateJson = JSON.stringify(state);
    if (stateJson === prevStateJsonRef.current) return;
    prevStateJsonRef.current = stateJson;

    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
    }

    pendingTimeoutRef.current = setTimeout(() => {
      pendingTimeoutRef.current = null;
      if (!savedRef.current) {
        const draft = formStateToDraft(state, specialty);
        saveCaseDraft(specialty, draft);
      }
    }, 500);

    return () => {
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
    };
  }, [state, specialty, isEditMode, draftLoadedRef, savedRef]);

  // ── AppState background save ──────────────────────────────────────────

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        flushDraft();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [flushDraft]);

  // ── Clear draft ───────────────────────────────────────────────────────

  const clearDraft = useCallback(async () => {
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
    await clearCaseDraft(specialty);
  }, [specialty]);

  return { clearDraft };
}
