import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dimensions } from "react-native";
import {
  createFormScrollRegistry,
  type FieldLayoutEntry,
  type FormScrollRegistry,
} from "@/lib/formScrollRegistry";

interface ScrollableRef {
  scrollTo: (opts: { y?: number; x?: number; animated?: boolean }) => void;
}

/**
 * Lightweight context that lets descendants ask the surrounding form's
 * KeyboardAwareScrollView to keep a region (e.g. an inline date picker that
 * just expanded) visible. The provider is optional — callers without a
 * provider get a no-op via `useFormScrollContext()`.
 *
 * The provider exposes:
 *   - `scrollViewRef`     — same ref the form passes to its scroll view
 *   - `ensureVisible(y, h)` — scroll just enough to keep the absolute screen
 *                           rect [y, y+h] inside the viewport. No-op when
 *                           the region already fits.
 *   - field-level deep-link API (Cluster 4): a registry of field layouts and
 *     focus callbacks, plus collapsible-expand handles, plus a reactive
 *     `lastDeepLinkedFieldId` that field components subscribe to via
 *     `useDeepLinkPulse(fieldId)` to drive a brief amber border pulse on
 *     deep-link arrival.
 *
 * `ensureVisible` is intentionally minimal — it scrolls by a positive delta
 * only and never scrolls *up* (so existing scroll context above the field is
 * preserved). It uses `measureInWindow` from the caller so the provider
 * doesn't need to know about the picker's child structure.
 */

type EnsureVisible = (
  absoluteY: number,
  height: number,
  options?: { extraPadding?: number },
) => void;

interface ScrollToFieldOptions {
  /** Pixels above the field after scroll. Default 80 (clears the SectionNavBar). */
  topPadding?: number;
  animated?: boolean;
}

interface DeepLinkPulseTrigger {
  id: string;
  /**
   * Monotonic timestamp. Same id with a new timestamp re-fires the pulse,
   * which lets a repeat tap on the same warning row replay the animation.
   */
  ts: number;
}

export interface FormScrollContextValue {
  scrollViewRef: React.RefObject<ScrollableRef | null>;
  /** Read the most recent scroll Y offset reported by the parent. */
  getScrollOffset: () => number;
  ensureVisible: EnsureVisible;

  // ── Field registry (Cluster 4) ────────────────────────────────────────
  setFieldLayout: FormScrollRegistry["setFieldLayout"];
  removeField: FormScrollRegistry["removeField"];
  setFieldFocusable: FormScrollRegistry["setFieldFocusable"];
  removeFieldFocusable: FormScrollRegistry["removeFieldFocusable"];
  setCollapsible: FormScrollRegistry["setCollapsible"];
  removeCollapsible: FormScrollRegistry["removeCollapsible"];
  /** Returns true if the field was registered (scroll is async via measure). */
  scrollToField: (fieldId: string, opts?: ScrollToFieldOptions) => boolean;
  /** Returns true if a focus callback was registered and invoked. */
  focusField: (fieldId: string) => boolean;
  /** Returns true if a collapsible was registered (expand is fired). */
  expandCollapsible: (collapsibleId: string) => boolean;
  /** Reactive trigger — fields subscribe via useDeepLinkPulse(fieldId). */
  lastDeepLinkedFieldId: DeepLinkPulseTrigger;
  triggerDeepLinkPulse: (fieldId: string) => void;
}

const FormScrollContext = createContext<FormScrollContextValue | null>(null);

interface FormScrollProviderProps {
  scrollViewRef: React.RefObject<ScrollableRef | null>;
  scrollOffsetRef: React.RefObject<number>;
  /**
   * Optional imperative escape hatch — populated with the live context value
   * on mount so a parent component (which sits OUTSIDE the provider, e.g.
   * CaseFormScreen wiring `handleEditFromSummary`) can call into the field
   * registry without itself being inside the context tree.
   */
  controlsRef?: React.MutableRefObject<FormScrollContextValue | null>;
  children: React.ReactNode;
}

/**
 * Provider wired into the form's outer scroll view. Pass the same ref you
 * give the KeyboardAwareScrollView, plus a ref tracking the current scroll
 * offset (the form already maintains one via onScroll).
 */
export function FormScrollProvider({
  scrollViewRef,
  scrollOffsetRef,
  controlsRef,
  children,
}: FormScrollProviderProps) {
  const lastEnsureAtRef = useRef(0);
  const registryRef = useRef<FormScrollRegistry | null>(null);
  if (registryRef.current === null) {
    registryRef.current = createFormScrollRegistry();
  }
  const registry = registryRef.current;

  const [lastDeepLinkedFieldId, setLastDeepLinkedFieldId] =
    useState<DeepLinkPulseTrigger>({ id: "", ts: 0 });

  const ensureVisible = useCallback<EnsureVisible>(
    (absoluteY, height, options) => {
      // Debounce: ignore rapid retriggers within the same animation window.
      const now = Date.now();
      if (now - lastEnsureAtRef.current < 60) return;
      lastEnsureAtRef.current = now;

      const screenHeight = Dimensions.get("window").height;
      const padding = options?.extraPadding ?? 24;
      const targetBottom = absoluteY + height + padding;

      // If the bottom of the region is already on-screen, do nothing.
      if (targetBottom <= screenHeight) return;

      const delta = targetBottom - screenHeight;
      const nextOffset = (scrollOffsetRef.current ?? 0) + delta;
      scrollViewRef.current?.scrollTo({ y: nextOffset, animated: true });
    },
    [scrollOffsetRef, scrollViewRef],
  );

  const getScrollOffset = useCallback(
    () => scrollOffsetRef.current ?? 0,
    [scrollOffsetRef],
  );

  // ── Field-level deep-link pipeline ───────────────────────────────────────

  const scrollToField = useCallback(
    (fieldId: string, opts?: ScrollToFieldOptions): boolean => {
      const entry = registry.getFieldLayout(fieldId);
      if (!entry) return false;
      const topPadding = opts?.topPadding ?? 80;
      const animated = opts?.animated ?? true;

      const performScroll = () => {
        // Live-measure each time so a sibling collapse since registration
        // doesn't strand us on a stale Y. Mirrors the scrollToSection
        // pattern (audit B1.6).
        entry.measure((scrollContentY) => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, scrollContentY - topPadding),
            animated,
          });
        });
      };

      // If the field's parent CollapsibleFormSection is collapsed, expand it
      // first so the measured Y reflects the post-expand layout, not the
      // collapsed-card-header Y. One rAF lets the expand animation start
      // before we re-measure; the live measure inside performScroll will
      // converge on the correct Y as the animation progresses (RN measures
      // the LAYOUT tree, not the visual transform).
      if (entry.parentCollapsibleId) {
        const expand = registry.getCollapsible(entry.parentCollapsibleId);
        if (expand) {
          expand();
          requestAnimationFrame(performScroll);
          return true;
        }
      }
      performScroll();
      return true;
    },
    [registry, scrollViewRef],
  );

  const focusField = useCallback(
    (fieldId: string): boolean => {
      const focus = registry.getFieldFocusable(fieldId);
      if (!focus) return false;
      focus();
      return true;
    },
    [registry],
  );

  const expandCollapsible = useCallback(
    (collapsibleId: string): boolean => {
      const expand = registry.getCollapsible(collapsibleId);
      if (!expand) return false;
      expand();
      return true;
    },
    [registry],
  );

  const triggerDeepLinkPulse = useCallback((fieldId: string) => {
    setLastDeepLinkedFieldId({ id: fieldId, ts: Date.now() });
  }, []);

  // Stable wrappers around registry mutators so the context value identity
  // stays stable across renders (the underlying Map mutates in place).
  const setFieldLayout = useCallback<FormScrollRegistry["setFieldLayout"]>(
    (fieldId: string, entry: FieldLayoutEntry) => {
      registry.setFieldLayout(fieldId, entry);
    },
    [registry],
  );
  const removeField = useCallback<FormScrollRegistry["removeField"]>(
    (fieldId: string) => {
      registry.removeField(fieldId);
    },
    [registry],
  );
  const setFieldFocusable = useCallback<
    FormScrollRegistry["setFieldFocusable"]
  >(
    (fieldId: string, focus: () => void) => {
      registry.setFieldFocusable(fieldId, focus);
    },
    [registry],
  );
  const removeFieldFocusable = useCallback<
    FormScrollRegistry["removeFieldFocusable"]
  >(
    (fieldId: string) => {
      registry.removeFieldFocusable(fieldId);
    },
    [registry],
  );
  const setCollapsible = useCallback<FormScrollRegistry["setCollapsible"]>(
    (collapsibleId: string, expand: () => void) => {
      registry.setCollapsible(collapsibleId, expand);
    },
    [registry],
  );
  const removeCollapsible = useCallback<
    FormScrollRegistry["removeCollapsible"]
  >(
    (collapsibleId: string) => {
      registry.removeCollapsible(collapsibleId);
    },
    [registry],
  );

  const value = useMemo<FormScrollContextValue>(
    () => ({
      scrollViewRef,
      getScrollOffset,
      ensureVisible,
      setFieldLayout,
      removeField,
      setFieldFocusable,
      removeFieldFocusable,
      setCollapsible,
      removeCollapsible,
      scrollToField,
      focusField,
      expandCollapsible,
      lastDeepLinkedFieldId,
      triggerDeepLinkPulse,
    }),
    [
      scrollViewRef,
      getScrollOffset,
      ensureVisible,
      setFieldLayout,
      removeField,
      setFieldFocusable,
      removeFieldFocusable,
      setCollapsible,
      removeCollapsible,
      scrollToField,
      focusField,
      expandCollapsible,
      lastDeepLinkedFieldId,
      triggerDeepLinkPulse,
    ],
  );

  useEffect(() => {
    if (!controlsRef) return;
    controlsRef.current = value;
    return () => {
      if (controlsRef.current === value) {
        controlsRef.current = null;
      }
    };
  }, [controlsRef, value]);

  return (
    <FormScrollContext.Provider value={value}>
      {children}
    </FormScrollContext.Provider>
  );
}

/**
 * Read the form scroll context. Returns `null` when used outside a provider
 * — callers should treat that case as a no-op (e.g. a date field inside a
 * non-scrollable modal).
 */
export function useFormScrollContext(): FormScrollContextValue | null {
  return useContext(FormScrollContext);
}
