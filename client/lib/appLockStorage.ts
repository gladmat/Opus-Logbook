import { scrypt } from "@noble/hashes/scrypt.js";
import {
  bytesToHex,
  hexToBytes,
  randomBytes,
  utf8ToBytes,
} from "@noble/hashes/utils.js";
import { userScopedSecureKey } from "./activeUser";
import {
  getSecureItem,
  setSecureItem,
  deleteSecureItem,
} from "./secureStorage";

// ── Base key names (scoped per user at runtime) ─────────────────────────────
export const APP_LOCK_KEY_NAMES = {
  PIN_HASH: "opus_app_lock_pin_hash",
  PIN_SALT: "opus_app_lock_pin_salt",
  BIOMETRIC_ENABLED: "opus_app_lock_biometric_enabled",
  APP_LOCK_ENABLED: "opus_app_lock_enabled",
  AUTO_LOCK_TIMEOUT: "opus_app_lock_timeout",
  PIN_VERSION: "opus_app_lock_pin_version",
  ATTEMPT_STATE: "opus_app_lock_attempt_state",
} as const;

// Version 3: scrypt(N=2^15, r=8, p=1) + 16-byte random per-user salt + hex
// output. v1/v2 used unsalted SHA-256 with a 4-digit keyspace — brute-force
// recoverable in under a second on a consumer GPU. On boot we migrate any
// pre-v3 entries by wiping them (users re-set their PIN next unlock).
const CURRENT_PIN_VERSION = "3";

// scrypt parameters. N chosen so one hash takes ~150–300ms on an iPhone A-series
// CPU — slow enough to meaningfully hurt a 10,000-candidate brute force yet
// still tolerable on the unlock path. Memory cost = 128 * r * N bytes = 32 MiB.
const SCRYPT_N = 1 << 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_DK_LEN = 32;
const SALT_BYTES = 16;

// ── Lockout state ───────────────────────────────────────────────────────────
// Persisted as JSON in SecureStore so it survives process restarts and cannot
// be reset by backgrounding the app.
//   { attempts: number, lockedUntilMs: number | null, updatedAtMs: number }
//
// Lockout schedule (post-fail counter):
//   0–4 failures → no lockout
//   5            → 30 s
//   6            → 60 s
//   7            → 2 min
//   8            → 5 min
//   9            → 15 min
//   10+          → 1 h (clamped)
const LOCKOUT_LADDER_MS = [
  0, // 1st failure
  0, // 2nd failure
  0, // 3rd failure
  0, // 4th failure
  30_000, // 5th failure → 30 s
  60_000, // 6th failure → 1 min
  2 * 60_000, // 7th failure → 2 min
  5 * 60_000, // 8th failure → 5 min
  15 * 60_000, // 9th failure → 15 min
  60 * 60_000, // 10th+ failure → 1 h (clamped)
] as const;

interface AttemptState {
  attempts: number;
  lockedUntilMs: number | null;
  updatedAtMs: number;
}

function emptyAttemptState(): AttemptState {
  return { attempts: 0, lockedUntilMs: null, updatedAtMs: Date.now() };
}

async function readAttemptState(): Promise<AttemptState> {
  const raw = await getSecureItem(getUserKeys().ATTEMPT_STATE);
  if (!raw) return emptyAttemptState();
  try {
    const parsed = JSON.parse(raw) as Partial<AttemptState>;
    if (
      typeof parsed.attempts !== "number" ||
      typeof parsed.updatedAtMs !== "number"
    ) {
      return emptyAttemptState();
    }
    return {
      attempts: Math.max(0, Math.floor(parsed.attempts)),
      lockedUntilMs:
        typeof parsed.lockedUntilMs === "number" ? parsed.lockedUntilMs : null,
      updatedAtMs: parsed.updatedAtMs,
    };
  } catch {
    return emptyAttemptState();
  }
}

async function writeAttemptState(state: AttemptState): Promise<void> {
  await setSecureItem(getUserKeys().ATTEMPT_STATE, JSON.stringify(state));
}

async function clearAttemptState(): Promise<void> {
  await deleteSecureItem(getUserKeys().ATTEMPT_STATE);
}

/** Returns the user-facing seconds remaining on the current lockout, or 0. */
export async function getLockoutSecondsRemaining(): Promise<number> {
  const state = await readAttemptState();
  if (!state.lockedUntilMs) return 0;
  const remainingMs = state.lockedUntilMs - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 1000);
}

/** Returns the current failed-attempt count (for UI hinting). */
export async function getFailedAttemptCount(): Promise<number> {
  const state = await readAttemptState();
  return state.attempts;
}

/** Returns user-scoped SecureStore keys for the active user. */
function getUserKeys() {
  return {
    PIN_HASH: userScopedSecureKey(APP_LOCK_KEY_NAMES.PIN_HASH),
    PIN_SALT: userScopedSecureKey(APP_LOCK_KEY_NAMES.PIN_SALT),
    BIOMETRIC_ENABLED: userScopedSecureKey(
      APP_LOCK_KEY_NAMES.BIOMETRIC_ENABLED,
    ),
    APP_LOCK_ENABLED: userScopedSecureKey(APP_LOCK_KEY_NAMES.APP_LOCK_ENABLED),
    AUTO_LOCK_TIMEOUT: userScopedSecureKey(
      APP_LOCK_KEY_NAMES.AUTO_LOCK_TIMEOUT,
    ),
    PIN_VERSION: userScopedSecureKey(APP_LOCK_KEY_NAMES.PIN_VERSION),
    ATTEMPT_STATE: userScopedSecureKey(APP_LOCK_KEY_NAMES.ATTEMPT_STATE),
  };
}

// ── Preferences (booleans / numbers) ────────────────────────────────────────

export async function isAppLockEnabled(): Promise<boolean> {
  const value = await getSecureItem(getUserKeys().APP_LOCK_ENABLED);
  return value === "true";
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await setSecureItem(
    getUserKeys().APP_LOCK_ENABLED,
    enabled ? "true" : "false",
  );
}

export async function isBiometricPreferenceEnabled(): Promise<boolean> {
  const value = await getSecureItem(getUserKeys().BIOMETRIC_ENABLED);
  return value === "true";
}

export async function setBiometricPreference(enabled: boolean): Promise<void> {
  await setSecureItem(
    getUserKeys().BIOMETRIC_ENABLED,
    enabled ? "true" : "false",
  );
}

export async function getAutoLockTimeout(): Promise<number> {
  const value = await getSecureItem(getUserKeys().AUTO_LOCK_TIMEOUT);
  if (value === null) return 0;
  return parseInt(value, 10);
}

export async function setAutoLockTimeout(seconds: number): Promise<void> {
  await setSecureItem(getUserKeys().AUTO_LOCK_TIMEOUT, seconds.toString());
}

// ── PIN hashing (scrypt) ────────────────────────────────────────────────────

function hashPin(pin: string, saltHex: string): string {
  const salt = hexToBytes(saltHex);
  const input = utf8ToBytes(`opus_pin_v3_${pin}`);
  const dk = scrypt(input, salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    dkLen: SCRYPT_DK_LEN,
  });
  return bytesToHex(dk);
}

export async function savePin(pin: string): Promise<void> {
  const saltHex = bytesToHex(randomBytes(SALT_BYTES));
  const hash = hashPin(pin, saltHex);
  const keys = getUserKeys();
  await setSecureItem(keys.PIN_SALT, saltHex);
  await setSecureItem(keys.PIN_HASH, hash);
  await setSecureItem(keys.PIN_VERSION, CURRENT_PIN_VERSION);
  // Successful (re)set clears any stale lockout.
  await clearAttemptState();
}

/**
 * Constant-time comparison of two hex strings.
 * Guards against timing-side-channel PIN recovery, however marginal.
 */
function timingSafeEqHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export interface PinVerifyOutcome {
  ok: boolean;
  /** If locked out, seconds until retry is allowed. 0 otherwise. */
  lockoutSecondsRemaining: number;
  /** Failed-attempt counter. 0 on success or when no PIN is set. */
  attempts: number;
}

export async function verifyPin(pin: string): Promise<PinVerifyOutcome> {
  const keys = getUserKeys();
  const stored = await getSecureItem(keys.PIN_HASH);
  const salt = await getSecureItem(keys.PIN_SALT);
  if (!stored || !salt) {
    return { ok: false, lockoutSecondsRemaining: 0, attempts: 0 };
  }

  // Enforce lockout before spending CPU on scrypt — saves battery under a
  // sustained brute-force attempt and doesn't leak timing info about whether
  // the PIN was correct.
  const state = await readAttemptState();
  if (state.lockedUntilMs && state.lockedUntilMs > Date.now()) {
    return {
      ok: false,
      lockoutSecondsRemaining: Math.ceil(
        (state.lockedUntilMs - Date.now()) / 1000,
      ),
      attempts: state.attempts,
    };
  }

  const candidate = hashPin(pin, salt);
  const matches = timingSafeEqHex(candidate, stored);

  if (matches) {
    await clearAttemptState();
    return { ok: true, lockoutSecondsRemaining: 0, attempts: 0 };
  }

  // Miss: increment attempts and apply lockout ladder.
  const nextAttempts = state.attempts + 1;
  const ladderIdx = Math.min(nextAttempts - 1, LOCKOUT_LADDER_MS.length - 1);
  const backoffMs = LOCKOUT_LADDER_MS[ladderIdx] ?? 0;
  const lockedUntilMs = backoffMs > 0 ? Date.now() + backoffMs : null;

  await writeAttemptState({
    attempts: nextAttempts,
    lockedUntilMs,
    updatedAtMs: Date.now(),
  });

  return {
    ok: false,
    lockoutSecondsRemaining: lockedUntilMs
      ? Math.ceil((lockedUntilMs - Date.now()) / 1000)
      : 0,
    attempts: nextAttempts,
  };
}

export async function isPinSet(): Promise<boolean> {
  const keys = getUserKeys();
  const hash = await getSecureItem(keys.PIN_HASH);
  return hash !== null && hash.length > 0;
}

/**
 * If the stored PIN was saved under a pre-scrypt version (v1 or v2), wipe it
 * and the app-lock state so the user re-sets their PIN next unlock. Returns
 * true iff a migration was performed.
 */
export async function migratePinIfNeeded(): Promise<boolean> {
  const keys = getUserKeys();
  const storedVersion = await getSecureItem(keys.PIN_VERSION);
  if (storedVersion === CURRENT_PIN_VERSION) {
    return false;
  }

  const hasPin = await isPinSet();
  if (!hasPin) {
    // No PIN stored at all → nothing to migrate. Stamp the version so we
    // don't re-enter this branch on every boot.
    await setSecureItem(keys.PIN_VERSION, CURRENT_PIN_VERSION);
    return false;
  }

  await deleteSecureItem(keys.PIN_HASH);
  await deleteSecureItem(keys.PIN_SALT);
  await deleteSecureItem(keys.APP_LOCK_ENABLED);
  await deleteSecureItem(keys.BIOMETRIC_ENABLED);
  await deleteSecureItem(keys.AUTO_LOCK_TIMEOUT);
  await deleteSecureItem(keys.ATTEMPT_STATE);
  await setSecureItem(keys.PIN_VERSION, CURRENT_PIN_VERSION);
  return true;
}

export async function clearAllAppLockData(): Promise<void> {
  const keys = getUserKeys();
  await deleteSecureItem(keys.PIN_HASH);
  await deleteSecureItem(keys.PIN_SALT);
  await deleteSecureItem(keys.BIOMETRIC_ENABLED);
  await deleteSecureItem(keys.APP_LOCK_ENABLED);
  await deleteSecureItem(keys.AUTO_LOCK_TIMEOUT);
  await deleteSecureItem(keys.PIN_VERSION);
  await deleteSecureItem(keys.ATTEMPT_STATE);
}
