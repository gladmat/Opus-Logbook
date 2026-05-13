import React, { createContext, useContext, useMemo, useRef } from "react";
import { Dimensions } from "react-native";

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

interface FormScrollContextValue {
  scrollViewRef: React.RefObject<ScrollableRef | null>;
  /** Read the most recent scroll Y offset reported by the parent. */
  getScrollOffset: () => number;
  ensureVisible: EnsureVisible;
}

const FormScrollContext = createContext<FormScrollContextValue | null>(null);

interface FormScrollProviderProps {
  scrollViewRef: React.RefObject<ScrollableRef | null>;
  scrollOffsetRef: React.RefObject<number>;
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
  children,
}: FormScrollProviderProps) {
  const lastEnsureAtRef = useRef(0);

  const value = useMemo<FormScrollContextValue>(() => {
    const ensureVisible: EnsureVisible = (absoluteY, height, options) => {
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
    };

    const getScrollOffset = () => scrollOffsetRef.current ?? 0;

    return { scrollViewRef, getScrollOffset, ensureVisible };
  }, [scrollViewRef, scrollOffsetRef]);

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
