import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getLockoutSecondsRemaining } from "@/lib/appLockStorage";

export interface LockoutCountdown {
  /** Seconds until the next PIN attempt is allowed. 0 when not locked out. */
  lockoutSeconds: number;
  /** Ready-to-render lockout line, or null when not locked out. */
  lockoutMessage: string | null;
  /** Seed the countdown from a fresh verifyPin outcome. */
  startLockout: (seconds: number) => void;
}

/**
 * Keeps a PIN-lockout countdown honest against the persisted deadline in
 * appLockStorage.
 *
 * - Seeds from storage whenever `active` becomes true, so a lockout that
 *   survived a process kill is visible the moment the keypad mounts —
 *   previously the user only discovered it after typing six digits.
 * - Re-seeds on AppState "active" because iOS freezes JS timers in the
 *   background; the stored deadline is the source of truth after a resume.
 */
export function useLockoutCountdown(active: boolean): LockoutCountdown {
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const activeRef = useRef(active);
  activeRef.current = active;

  const seedFromStorage = useCallback(async () => {
    try {
      const remaining = await getLockoutSecondsRemaining();
      if (activeRef.current) {
        setLockoutSeconds(remaining);
      }
    } catch {
      // No active user / storage failure → treat as not locked out; the
      // persisted state still gates verifyPin itself.
    }
  }, []);

  useEffect(() => {
    if (!active) {
      setLockoutSeconds(0);
      return;
    }

    void seedFromStorage();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void seedFromStorage();
      }
    });
    return () => subscription.remove();
  }, [active, seedFromStorage]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const id = setInterval(() => {
      setLockoutSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutSeconds]);

  const startLockout = useCallback((seconds: number) => {
    setLockoutSeconds(Math.max(0, Math.ceil(seconds)));
  }, []);

  return {
    lockoutSeconds,
    lockoutMessage:
      lockoutSeconds > 0
        ? `Too many attempts — try again in ${lockoutSeconds}s`
        : null,
    startLockout,
  };
}
