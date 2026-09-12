import {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useState,
} from "react";
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
  /** Skip draft loading when form is pre-filled from an episode */
  isEpisodePrefill?: boolean;
  /** Skip draft loading when form is opened as a quick-log prefill */
  isQuickPrefill?: boolean;
  draftLoadedRef: React.MutableRefObject<boolean>;
  savedRef: React.MutableRefObject<boolean>;
  dispatch: React.Dispatch<CaseFormAction>;
  primaryFacility: string;
}

export function useCaseDraft({
  state,
  specialty,
  isEditMode,
  isEpisodePrefill,
  isQuickPrefill,
  draftLoadedRef,
  savedRef,
  dispatch,
  primaryFacility,
}: UseCaseDraftParams): {
  clearDraft: () => Promise<void>;
  lastSavedAt: number | null;
} {
  const stateRef = useRef(state);
  // Committed-state mirror for the AppState flush (written after commit,
  // never during render, so the React Compiler can memoise this hook).
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Reference of the last state a draft save was scheduled for. The
  // reducer returns the SAME object for no-op actions, so reference
  // inequality is the dirty signal — this replaces a JSON.stringify of the
  // entire form state on every dispatch (every keystroke).
  const prevStateRef = useRef<CaseFormState>(state);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timestamp of the last successful draft write — drives the header
  // auto-save indicator. Null until the first save lands.
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // ── Load draft on mount (new case only) ───────────────────────────────

  useEffect(() => {
    if (
      isEditMode ||
      isEpisodePrefill ||
      isQuickPrefill ||
      draftLoadedRef.current
    )
      return;

    const loadDraft = async () => {
      const draft = await getCaseDraft(specialty);
      if (draft) {
        const partial = draftToFormState(draft, specialty, primaryFacility);
        dispatch({ type: "LOAD_DRAFT", draft: partial });
      }
      draftLoadedRef.current = true;
    };

    loadDraft();
  }, [
    specialty,
    primaryFacility,
    isEditMode,
    isEpisodePrefill,
    isQuickPrefill,
    draftLoadedRef,
    dispatch,
  ]);

  // ── Flush pending draft immediately ───────────────────────────────────

  const flushDraft = useCallback(() => {
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
    if (!draftLoadedRef.current || savedRef.current || isEditMode) return;
    const draft = formStateToDraft(stateRef.current, specialty);
    saveCaseDraft(specialty, draft)
      .then(() => setLastSavedAt(Date.now()))
      .catch(() => {});
  }, [specialty, isEditMode, draftLoadedRef, savedRef]);

  // ── Debounced auto-save ───────────────────────────────────────────────

  useEffect(() => {
    if (!draftLoadedRef.current || savedRef.current || isEditMode) return;

    if (state === prevStateRef.current) return;
    prevStateRef.current = state;

    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
    }

    pendingTimeoutRef.current = setTimeout(() => {
      pendingTimeoutRef.current = null;
      if (!savedRef.current) {
        const draft = formStateToDraft(state, specialty);
        saveCaseDraft(specialty, draft)
          .then(() => setLastSavedAt(Date.now()))
          .catch(() => {});
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

  return { clearDraft, lastSavedAt };
}
