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
        backgroundTimestamp.current = Date.now();
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
  }, [isAppLockConfigured]);

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
