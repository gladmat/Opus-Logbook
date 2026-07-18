import { useEffect, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import { isFaceIdUnsupportedInCurrentRuntime } from "@/lib/biometrics";

export type BiometricLabel = "Face ID" | "Touch ID" | "Biometrics";

export interface BiometricCapability {
  /** True while the initial hardware/enrolment detection is running. */
  isChecking: boolean;
  /** Hardware present, biometrics enrolled, and usable in this runtime. */
  available: boolean;
  label: BiometricLabel;
  /** Feather icon name matching the biometric type. */
  icon: "smile" | "smartphone";
  /**
   * Hardware supports Face ID but the current runtime (Expo Go on iOS)
   * cannot exercise it. Screens map this to their own explanatory copy.
   */
  expoGoFaceIdBlocked: boolean;
}

/**
 * Detects biometric hardware, enrolment, and type once on mount.
 * Shared by LockScreen, SetupAppLockScreen, and onboarding SecurityScreen so
 * the three keypad surfaces agree on availability and labelling.
 */
export function useBiometricCapability(): BiometricCapability {
  const [capability, setCapability] = useState<BiometricCapability>({
    isChecking: true,
    available: false,
    label: "Biometrics",
    icon: "smartphone",
    expoGoFaceIdBlocked: false,
  });

  useEffect(() => {
    let mounted = true;

    const detect = async () => {
      let available = false;
      let label: BiometricLabel = "Biometrics";
      let expoGoFaceIdBlocked = false;

      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = hasHardware
          ? await LocalAuthentication.isEnrolledAsync()
          : false;

        if (hasHardware && isEnrolled) {
          const types =
            await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (
            types.includes(
              LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
            )
          ) {
            label = "Face ID";
          } else if (
            types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
          ) {
            label = "Touch ID";
          }

          expoGoFaceIdBlocked = isFaceIdUnsupportedInCurrentRuntime(types);
          available = !expoGoFaceIdBlocked;
        }
      } catch {
        // Detection failure → report unavailable rather than crash the screen.
      }

      if (mounted) {
        setCapability({
          isChecking: false,
          available,
          label,
          icon: label === "Face ID" ? "smile" : "smartphone",
          expoGoFaceIdBlocked,
        });
      }
    };

    void detect();
    return () => {
      mounted = false;
    };
  }, []);

  return capability;
}

/**
 * Runs a single biometric authentication so enabling the preference proves
 * it actually works on this device. Returns true iff the user passed.
 */
export async function verifyBiometricsBeforeEnable(
  label: BiometricLabel,
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Confirm ${label} to enable it`,
      cancelLabel: "Cancel",
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}
