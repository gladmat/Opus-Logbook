import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import {
  isAppLockEnabled,
  isBiometricPreferenceEnabled,
  getAutoLockTimeout,
  verifyPin,
  isPinSet,
  migratePinIfNeeded,
} from "@/lib/appLockStorage";
import { isFaceIdUnsupportedInCurrentRuntime } from "@/lib/biometrics";
import { clearDecryptedCache } from "@/components/EncryptedImage";
import { clearEncryptionKeyCache } from "@/lib/encryption";
import { clearUserCaches } from "@/lib/storage";
import { getActiveUserIdOrNull, onActiveUserChange } from "@/lib/activeUser";
import { useAuth } from "@/contexts/AuthContext";

export interface PinUnlockResult {
  ok: boolean;
  /** Seconds until the next PIN attempt is allowed. 0 if not locked out. */
  lockoutSecondsRemaining: number;
  /** Failed-attempt counter (for optional UI hinting). */
  attempts: number;
}

interface AppLockContextType {
  isLocked: boolean;
  isAppLockConfigured: boolean;
  /**
   * True once the cold-start lock decision has been made. The root
   * navigator holds its loading screen until this flips so protected
   * content can never paint a frame before the lock overlay mounts.
   */
  isLockStateReady: boolean;
  unlockWithBiometrics: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<PinUnlockResult>;
  refreshLockState: () => Promise<void>;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { isLoading: isAuthLoading } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [isAppLockConfigured, setIsAppLockConfigured] = useState(false);
  const [isLockStateReady, setIsLockStateReady] = useState(false);
  const backgroundTimestamp = useRef<number | null>(null);
  const hasInitialized = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const checkIfConfigured = useCallback(async (): Promise<boolean> => {
    // Guard: app lock storage requires an active user for scoped keys
    if (!getActiveUserIdOrNull()) {
      setIsAppLockConfigured(false);
      return false;
    }

    try {
      const [enabled, pinExists] = await Promise.all([
        isAppLockEnabled(),
        isPinSet(),
      ]);
      const configured = enabled && pinExists;
      setIsAppLockConfigured(configured);
      return configured;
    } catch {
      setIsAppLockConfigured(false);
      return false;
    }
  }, []);

  const refreshLockState = useCallback(async (): Promise<void> => {
    await checkIfConfigured();
  }, [checkIfConfigured]);

  // One-shot init, gated on auth restoration. AuthContext restores the
  // storage identity (setActiveUserId) before flipping isLoading false, so
  // waiting on isAuthLoading is what makes the cold-start lock decision
  // deterministic — previously this ran before restoration, threw inside
  // migratePinIfNeeded ("No active user"), and the app never locked again
  // until a manual refreshLockState.
  useEffect(() => {
    if (isAuthLoading || hasInitialized.current) return;
    hasInitialized.current = true;

    void (async () => {
      try {
        clearDecryptedCache();
        const userId = getActiveUserIdOrNull();
        lastUserIdRef.current = userId;
        if (userId) {
          // Migration needs scoped keys; never let a failure here skip the
          // configured check (and never leave the ready gate closed).
          await migratePinIfNeeded().catch(() => {});
          const configured = await checkIfConfigured();
          if (configured) {
            // Restored session on a fresh process → require local re-auth.
            setIsLocked(true);
          }
        } else {
          setIsAppLockConfigured(false);
        }
      } finally {
        // Must be reached on every path — the root navigator's loading
        // gate waits on this and would otherwise deadlock.
        setIsLockStateReady(true);
      }
    })();
  }, [isAuthLoading, checkIfConfigured]);

  // Track identity changes after init: interactive login/signup, logout,
  // session expiry, account deletion. A restore-time event (before init has
  // run) is ignored — the init effect reads the final identity itself.
  useEffect(() => {
    return onActiveUserChange((newId) => {
      const prevId = lastUserIdRef.current;
      lastUserIdRef.current = newId;
      if (!hasInitialized.current) return;

      if (newId === null) {
        // Logout / session expired / account deleted.
        setIsAppLockConfigured(false);
        setIsLocked(false);
        backgroundTimestamp.current = null;
        return;
      }

      void (async () => {
        await migratePinIfNeeded().catch(() => {});
        const configured = await checkIfConfigured();
        // null → id after init means the user just authenticated with
        // credentials (login/signup/Apple), which is equivalent trust to a
        // PIN — refresh configured state but don't lock. A direct id → id
        // swap without a logout between is non-interactive (stale-token
        // repair), so lock defensively.
        if (configured && prevId !== null && prevId !== newId) {
          setIsLocked(true);
        }
      })();
    });
  }, [checkIfConfigured]);

  // Listen to AppState changes
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        // Always clear decrypted media from temp files and memory,
        // regardless of app lock configuration — clinical photos should
        // never persist as plaintext in the cache directory.
        clearDecryptedCache();
        // Clear cached encryption keys from RAM to reduce exposure window
        clearEncryptionKeyCache();
        // Also clear the in-memory case / summary caches. The summary
        // cache holds every patient's name + NHI + DOB in RAM for the
        // session — a process-memory dump attack on a backgrounded app
        // would otherwise recover the full patient list.
        clearUserCaches();
      }

      if (!isAppLockConfigured) return;

      if (nextState === "background") {
        // Only real backgrounding starts the auto-lock clock. Transient
        // "inactive" blips — share sheets, notification centre, permission
        // dialogs, the Face ID prompt itself — must not re-lock the app
        // mid-workflow (with the default "Immediately" timeout they would
        // re-lock on every share-sheet dismissal).
        if (!isLocked) {
          backgroundTimestamp.current = Date.now();
        }
      } else if (nextState === "active") {
        if (backgroundTimestamp.current !== null) {
          const elapsed = (Date.now() - backgroundTimestamp.current) / 1000;
          const timeout = await getAutoLockTimeout();

          if (elapsed >= timeout) {
            setIsLocked(true);
          }
          backgroundTimestamp.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [isAppLockConfigured, isLocked]);

  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      const biometricEnabled = await isBiometricPreferenceEnabled();
      if (!biometricEnabled) return false;

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return false;

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) return false;

      const authenticationTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (isFaceIdUnsupportedInCurrentRuntime(authenticationTypes)) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Opus",
        disableDeviceFallback: true,
        cancelLabel: "Cancel",
      });

      if (result.success) {
        // Clear timestamp BEFORE unlocking to prevent the AppState "active"
        // handler from immediately re-locking (the biometric prompt causes
        // an inactive→active transition that would otherwise trigger re-lock).
        backgroundTimestamp.current = null;
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const unlockWithPin = useCallback(
    async (pin: string): Promise<PinUnlockResult> => {
      const outcome = await verifyPin(pin);
      if (outcome.ok) {
        backgroundTimestamp.current = null;
        setIsLocked(false);
      }
      return {
        ok: outcome.ok,
        lockoutSecondsRemaining: outcome.lockoutSecondsRemaining,
        attempts: outcome.attempts,
      };
    },
    [],
  );

  return (
    <AppLockContext.Provider
      value={{
        isLocked,
        isAppLockConfigured,
        isLockStateReady,
        unlockWithBiometrics,
        unlockWithPin,
        refreshLockState,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const context = useContext(AppLockContext);
  if (context === undefined) {
    throw new Error("useAppLock must be used within an AppLockProvider");
  }
  return context;
}
