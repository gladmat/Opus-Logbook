import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion as useReducedMotionReanimated } from "react-native-reanimated";

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
 * The initial value is read synchronously from Reanimated, so first-render
 * animation setup (mount `entering` props, shared-value initialisers) sees
 * the correct value with no async flash. Subsequent OS changes (user
 * toggles the setting while the app is running) are picked up via the
 * AccessibilityInfo change listener.
 */
export function useReduceMotion(): boolean {
  // Reanimated reads the preference synchronously at first call — no flash.
  const initialReduceMotion = useReducedMotionReanimated();
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion);

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
