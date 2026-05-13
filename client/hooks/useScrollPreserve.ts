import { useMemo, useRef } from "react";
import { useFormScrollContext } from "@/contexts/FormScrollContext";

/**
 * Snapshot + restore the surrounding form's scroll position around an
 * interaction that re-layouts content above the viewport — collapsing a
 * section, mutating a diagnosis group, etc.
 *
 * Without this, the parent ScrollView keeps its content offset while content
 * height changes, so the visible content can drift up or down by hundreds of
 * pixels — what surgeons perceive as "the page jumped to the top".
 *
 * Usage:
 *   const { snapshot, restore } = useScrollPreserve();
 *
 *   const onToggle = () => {
 *     snapshot();
 *     setExpanded(next);  // triggers layout change
 *     restore();          // re-applies the snapshotted Y once layout settles
 *   };
 *
 * Outside a {@link FormScrollProvider} both methods are no-ops, so this
 * hook is safe to call from any component without runtime branching.
 */
export function useScrollPreserve() {
  const ctx = useFormScrollContext();
  const snapshotRef = useRef<number | null>(null);

  return useMemo(() => {
    if (!ctx) {
      const noop = () => {};
      return { snapshot: noop, restore: noop };
    }

    return {
      snapshot: () => {
        snapshotRef.current = ctx.getScrollOffset();
      },
      restore: () => {
        const y = snapshotRef.current;
        if (y === null) return;
        // Two animation frames: the first lets React commit the state change,
        // the second waits for native layout to settle before scrolling.
        // animated: false keeps the restore imperceptible.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            ctx.scrollViewRef.current?.scrollTo({
              y: Math.max(0, y),
              animated: false,
            });
          });
        });
      },
    };
  }, [ctx]);
}
