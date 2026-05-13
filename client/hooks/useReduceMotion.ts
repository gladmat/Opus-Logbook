import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Tracks the OS-level "Reduce Motion" accessibility preference.
 *
 * iOS HIG and Apple App Store reviewers expect apps to respect this
 * setting: when enabled, animations should be replaced with instant state
 * changes (or at least dramatically shorter durations). The hook returns
 * `true` when Reduce Motion is on.
 *
 * Use to gate animation durations:
 *
 *   const reduceMotion = useReduceMotion();
 *   sharedValue.value = withTiming(target, {
 *     duration: reduceMotion ? 0 : 250,
 *   });
 *
 * The initial value defaults to `false` and updates after the first event
 * loop tick. Subsequent OS changes (user toggles the setting while the app
 * is running) are picked up via the AccessibilityInfo change listener.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => setReduceMotion(value),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}
