/**
 * Commit-reveal helpers for blinded assessments.
 *
 * Phase 1 (commit): the client sends ONLY `sha256(domain:nonce:shareableJson)`
 * to the server. No assessment content — plaintext or ciphertext — leaves
 * the device until both parties have committed.
 *
 * Phase 2 (reveal): the client uploads the E2EE blob, which carries the
 * exact `shareableJson` string that was hashed plus the nonce. The
 * COUNTERPART (not the server — it can't see plaintext, that's the point)
 * recomputes the commitment after decrypting and flags any mismatch: a
 * party that changed its assessment after committing is caught on-device.
 *
 * Hashing the exact serialized string (rather than re-serializing an object
 * at verify time) removes JSON canonicalization pitfalls entirely.
 */

import * as Crypto from "expo-crypto";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

const DOMAIN = "opus-assessment-commit-v1";

export async function generateCommitmentNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(24);
  return bytesToHex(bytes);
}

export function computeCommitment(
  shareableJson: string,
  nonceHex: string,
): string {
  return bytesToHex(
    sha256(utf8ToBytes(`${DOMAIN}:${nonceHex}:${shareableJson}`)),
  );
}

export function verifyCommitment(
  shareableJson: string,
  nonceHex: string,
  commitment: string,
): boolean {
  return computeCommitment(shareableJson, nonceHex) === commitment;
}

/** Wire shape carried INSIDE the E2EE blob at reveal time. */
export interface RevealPayloadV2 {
  v: 2;
  /** The exact JSON string the commitment was computed over. */
  shareableJson: string;
  commitmentNonce: string;
}

export function buildRevealPayload(
  shareableJson: string,
  nonceHex: string,
): string {
  const payload: RevealPayloadV2 = {
    v: 2,
    shareableJson,
    commitmentNonce: nonceHex,
  };
  return JSON.stringify(payload);
}

/**
 * Parse a decrypted assessment payload. Handles both the v2 commit-reveal
 * wrapper and legacy plain-assessment JSON (older clients). Returns the
 * assessment JSON string plus the nonce when present.
 */
export function parseRevealPayload(plaintext: string): {
  shareableJson: string;
  commitmentNonce: string | null;
} {
  try {
    const parsed = JSON.parse(plaintext) as Partial<RevealPayloadV2>;
    if (
      parsed &&
      parsed.v === 2 &&
      typeof parsed.shareableJson === "string" &&
      typeof parsed.commitmentNonce === "string"
    ) {
      return {
        shareableJson: parsed.shareableJson,
        commitmentNonce: parsed.commitmentNonce,
      };
    }
  } catch {
    // Fall through — treat as legacy.
  }
  return { shareableJson: plaintext, commitmentNonce: null };
}
