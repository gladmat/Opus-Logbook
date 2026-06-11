/**
 * Signal-style safety numbers for TOFU device-key verification.
 *
 * A safety number is a short, human-comparable representation of BOTH
 * parties' device public keys. Two users compare the number out-of-band
 * (in person, over a call) — if their apps show the same digits, no
 * man-in-the-middle has substituted either side's keys. This is the
 * verification surface backing `keyPinningStore.acceptKeyRotation()`:
 * when a pin mismatch fires, the safety number is what the two surgeons
 * actually compare before accepting the new key.
 *
 * Derivation: both parties' `(userId, sorted device keys)` descriptors are
 * canonically ordered (so A↔B and B↔A render identically), concatenated,
 * and run through an iterated SHA-256. The digest is expanded and encoded
 * as 12 groups of 5 decimal digits — same shape as Signal's, familiar to
 * anyone who has verified a Signal contact.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { concatBytes, utf8ToBytes } from "@noble/hashes/utils.js";

const VERSION = "opus-safety-number-v1";
const ITERATIONS = 1024;

export interface PartyKeys {
  userId: string;
  devices: { deviceId: string; publicKey: string }[];
}

function partyDescriptor(party: PartyKeys): string {
  const devices = [...party.devices]
    .sort((a, b) => a.deviceId.localeCompare(b.deviceId))
    .map((d) => `${d.deviceId}=${d.publicKey}`)
    .join(",");
  return `${party.userId}|${devices}`;
}

function iteratedHash(input: string): Uint8Array {
  let digest = sha256(utf8ToBytes(`${VERSION}:${input}`));
  for (let i = 1; i < ITERATIONS; i++) {
    digest = sha256(digest);
  }
  return digest;
}

/**
 * Derive the 60-digit safety number for a pair of users. Symmetric:
 * `deriveSafetyNumber(a, b) === deriveSafetyNumber(b, a)`. Changes to ANY
 * device key on either side produce a completely different number.
 *
 * Returns 12 space-separated groups of 5 digits.
 */
export function deriveSafetyNumber(a: PartyKeys, b: PartyKeys): string {
  const combined = [partyDescriptor(a), partyDescriptor(b)].sort().join("||");
  const digest = iteratedHash(combined);
  // Expand to 64 bytes so 12 independent 5-byte chunks are available.
  const extended = concatBytes(
    sha256(concatBytes(digest, Uint8Array.of(1))),
    sha256(concatBytes(digest, Uint8Array.of(2))),
  );

  const groups: string[] = [];
  for (let g = 0; g < 12; g++) {
    const chunk = extended.slice(g * 5, g * 5 + 5);
    let n = 0;
    for (const byte of chunk) {
      n = (n * 256 + byte) % 100000;
    }
    groups.push(String(n).padStart(5, "0"));
  }
  return groups.join(" ");
}

/**
 * Short per-device fingerprint (16 hex chars in 4 groups) for showing a
 * single public key — used in the device list and in key-rotation
 * old-vs-new comparisons.
 */
export function deviceFingerprint(publicKey: string): string {
  const digest = sha256(utf8ToBytes(`${VERSION}:device:${publicKey}`));
  const hex = Array.from(digest.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return hex.replace(/(.{4})(?=.)/g, "$1 ");
}

/** Format a 12-group safety number into 3 display lines of 4 groups. */
export function safetyNumberLines(safetyNumber: string): string[] {
  const groups = safetyNumber.split(" ");
  const lines: string[] = [];
  for (let i = 0; i < groups.length; i += 4) {
    lines.push(groups.slice(i, i + 4).join("  "));
  }
  return lines;
}
