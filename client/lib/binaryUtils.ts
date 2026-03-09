/**
 * Shared binary ↔ base64 conversion utilities.
 *
 * Uses the runtime's globalThis.atob/btoa — available in Hermes (React Native)
 * and all modern JS environments. These are used throughout the v2 encrypted
 * media pipeline for transient base64 conversions (never stored as base64).
 */

/** Decode a base64 string to Uint8Array */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = globalThis.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encode a Uint8Array to base64 string */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return globalThis.btoa(binary);
}
