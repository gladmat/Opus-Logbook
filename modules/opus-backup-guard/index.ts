import { requireOptionalNativeModule } from "expo-modules-core";

export interface BackupGuardResult {
  /** Directories found and successfully marked excluded-from-backup. */
  excluded: number;
  /** Candidate directories that don't exist (yet) on this install. */
  missing: number;
  /** Directories that exist but whose resource values couldn't be set. */
  failed: number;
}

interface OpusBackupGuardNative {
  excludePhiPathsFromBackup(): Promise<BackupGuardResult>;
}

const native =
  requireOptionalNativeModule<OpusBackupGuardNative>("OpusBackupGuard");

/**
 * Marks the PHI-bearing directories (opus-media, AsyncStorage, MMKV) as
 * excluded from iCloud backup. Safe no-op where the native module isn't
 * present (Android — covered by `android.allowBackup: false` — Expo Go,
 * and test environments).
 *
 * Their contents are AEAD ciphertext under a WHEN_UNLOCKED_THIS_DEVICE_ONLY
 * Keychain key that never survives a backup restore, so exclusion loses no
 * recovery capability — it only removes the iCloud exposure.
 */
export async function excludePhiPathsFromBackup(): Promise<BackupGuardResult> {
  if (!native) {
    return { excluded: 0, missing: 0, failed: 0 };
  }
  return native.excludePhiPathsFromBackup();
}
