/**
 * Trust-On-First-Use (TOFU) pinning for recipient device public keys.
 *
 * Problem this closes: `sharingApi.getUserDeviceKeys(userId)` and
 * `searchUserByEmail(email)` both fetch `{deviceId, publicKey}[]` from the
 * Opus server. Without TOFU pinning, the sender's app blindly trusts each
 * response and wraps the per-case key to whatever public key the server
 * returned. A server compromise or MITM on the HTTPS fetch can swap the
 * recipient's public key for an attacker-controlled one; every subsequent
 * shared case gets wrapped to the attacker, silently, with no signal to
 * either party. The "verificationStatus" on shared cases is about case
 * *content* (verified / disputed by the recipient), NOT about device key
 * authenticity.
 *
 * Pinning model (mirrors Signal's safety numbers / WhatsApp's security
 * codes, stripped to what Opus needs):
 *   - First time we observe a (userId, deviceId) pair, we pin its public
 *     key into encrypted local storage.
 *   - On every subsequent share, we look up the expected pin before
 *     wrapping. If the server's response matches → proceed. If it
 *     doesn't → refuse encrypt and surface an error the caller can show.
 *   - Users can manually "trust this new device" via
 *     `acceptKeyRotation()` to overwrite the pin (after out-of-band
 *     verification with the recipient).
 *
 * Storage: AsyncStorage, scoped per active user, encrypted with the
 * master key (so a device dump alone doesn't leak the pin table).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { userScopedAsyncKey } from "./activeUser";
import { encryptData, decryptData } from "./encryption";

const PIN_STORE_BASE_KEY = "@opus_key_pins_v1";

function pinStoreKey(): string {
  return userScopedAsyncKey(PIN_STORE_BASE_KEY);
}

export interface KeyPin {
  userId: string;
  deviceId: string;
  publicKey: string;
  /** ISO timestamp of first observation. */
  firstSeenAt: string;
  /** ISO timestamp of most recent "still matches" sighting. */
  lastVerifiedAt: string;
}

interface PinStore {
  version: 1;
  /** Composite key `${userId}:::${deviceId}` → pin record. */
  pins: Record<string, KeyPin>;
}

function emptyStore(): PinStore {
  return { version: 1, pins: {} };
}

function pinMapKey(userId: string, deviceId: string): string {
  return `${userId}:::${deviceId}`;
}

async function readStore(): Promise<PinStore> {
  try {
    const raw = await AsyncStorage.getItem(pinStoreKey());
    if (!raw) return emptyStore();
    const plain = await decryptData(raw);
    const parsed = JSON.parse(plain) as PinStore;
    if (parsed?.version !== 1 || !parsed.pins) return emptyStore();
    return parsed;
  } catch {
    // Corrupt / legacy — start fresh. Treating failures as "no pins yet"
    // degrades to pre-TOFU behaviour (anyone can be pinned next time)
    // rather than hard-blocking the app.
    return emptyStore();
  }
}

async function writeStore(store: PinStore): Promise<void> {
  const encrypted = await encryptData(JSON.stringify(store));
  await AsyncStorage.setItem(pinStoreKey(), encrypted);
}

export interface RecipientKey {
  deviceId: string;
  publicKey: string;
}

export type VerifiedKeys =
  | { kind: "ok"; keys: RecipientKey[]; pinnedNew: number }
  | {
      kind: "mismatch";
      mismatches: {
        deviceId: string;
        storedPublicKey: string;
        receivedPublicKey: string;
      }[];
    };

/**
 * Verify the device keys fetched from the server for a given Opus user
 * against the local pin store, and optionally pin any newly-observed
 * (deviceId, publicKey) pairs.
 *
 *   - If the store has no pin for a `deviceId` → pin it (TOFU). Counts
 *     these in the returned `pinnedNew`.
 *   - If a pin exists and matches → refresh `lastVerifiedAt`, accept.
 *   - If a pin exists and the public key doesn't match → return a
 *     mismatch result; caller must refuse to encrypt to this user until
 *     the user explicitly accepts the rotation.
 *
 * Returns the approved `RecipientKey[]` (all keys the caller may use)
 * when OK, or a `mismatch` descriptor listing every offending deviceId
 * so the UI can surface a clear warning.
 */
export async function verifyAndPinRecipientKeys(
  userId: string,
  received: RecipientKey[],
): Promise<VerifiedKeys> {
  const store = await readStore();
  const now = new Date().toISOString();
  const mismatches: {
    deviceId: string;
    storedPublicKey: string;
    receivedPublicKey: string;
  }[] = [];
  const approved: RecipientKey[] = [];
  let pinnedNew = 0;

  for (const key of received) {
    const pKey = pinMapKey(userId, key.deviceId);
    const existing = store.pins[pKey];
    if (!existing) {
      // First observation — pin.
      store.pins[pKey] = {
        userId,
        deviceId: key.deviceId,
        publicKey: key.publicKey,
        firstSeenAt: now,
        lastVerifiedAt: now,
      };
      pinnedNew += 1;
      approved.push(key);
    } else if (existing.publicKey === key.publicKey) {
      existing.lastVerifiedAt = now;
      approved.push(key);
    } else {
      mismatches.push({
        deviceId: key.deviceId,
        storedPublicKey: existing.publicKey,
        receivedPublicKey: key.publicKey,
      });
    }
  }

  if (mismatches.length > 0) {
    // Don't write any of the refreshed `lastVerifiedAt` timestamps — a
    // mismatch should not silently refresh other entries' trust state.
    return { kind: "mismatch", mismatches };
  }

  await writeStore(store);
  return { kind: "ok", keys: approved, pinnedNew };
}

/**
 * After an out-of-band verification ("Dr. X is indeed using a new device"),
 * overwrite the pin for a (userId, deviceId) with the newly-observed key.
 * No-op if the existing pin already matches.
 */
export async function acceptKeyRotation(
  userId: string,
  deviceId: string,
  newPublicKey: string,
): Promise<void> {
  const store = await readStore();
  const now = new Date().toISOString();
  store.pins[pinMapKey(userId, deviceId)] = {
    userId,
    deviceId,
    publicKey: newPublicKey,
    firstSeenAt: store.pins[pinMapKey(userId, deviceId)]?.firstSeenAt ?? now,
    lastVerifiedAt: now,
  };
  await writeStore(store);
}

/** For UI/debugging — list every pin currently stored. */
export async function getAllPins(): Promise<KeyPin[]> {
  const store = await readStore();
  return Object.values(store.pins);
}

/** Remove a single pin (e.g. contact deleted). */
export async function forgetPin(
  userId: string,
  deviceId: string,
): Promise<void> {
  const store = await readStore();
  delete store.pins[pinMapKey(userId, deviceId)];
  await writeStore(store);
}

/** Wipe the whole pin store — used on logout / account deletion. */
export async function clearAllPins(): Promise<void> {
  try {
    await AsyncStorage.removeItem(pinStoreKey());
  } catch {
    // Best-effort.
  }
}
