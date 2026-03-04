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
} from "@/lib/appLockStorage";

interface AppLockContextType {
  isLocked: boolean;
  isAppLockConfigured: boolean;
  unlockWithBiometrics: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  refreshLockState: () => Promise<void>;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isAppLockConfigured, setIsAppLockConfigured] = useState(false);
  const backgroundTimestamp = useRef<number | null>(null);
  const hasInitialized = useRef(false);

  const checkIfConfigured = useCallback(async (): Promise<boolean> => {
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

  // Initial check — lock if app lock is configured
  useEffect(() => {
    const init = async () => {
      const configured = await checkIfConfigured();
      if (configured && !hasInitialized.current) {
        setIsLocked(true);
      }
      hasInitialized.current = true;
    };
    init();
  }, [checkIfConfigured]);

  // Listen to AppState changes
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (!isAppLockConfigured) return;

      if (nextState === "background" || nextState === "inactive") {
        // Only record background time when the app is actually unlocked.
        // While locked, the biometric prompt causes inactive→active transitions
        // that would otherwise create an immediate re-lock loop.
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

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Opus",
        fallbackLabel: "Use PIN",
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
    async (pin: string): Promise<boolean> => {
      const valid = await verifyPin(pin);
      if (valid) {
        backgroundTimestamp.current = null;
        setIsLocked(false);
        return true;
      }
      return false;
    },
    [],
  );

  return (
    <AppLockContext.Provider
      value={{
        isLocked,
        isAppLockConfigured,
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
