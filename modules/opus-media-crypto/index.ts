import { requireOptionalNativeModule } from "expo-modules-core";

export interface NativeEncryptFileResult {
  /** 12-byte AES-GCM nonce, lowercase hex. */
  nonceHex: string;
  /** 16-byte AES-GCM auth tag, lowercase hex. */
  tagHex: string;
  sourceSize: number;
  ciphertextSize: number;
}

export interface OpusMediaCryptoNative {
  /**
   * One-shot AES-256-GCM: reads src, writes RAW ciphertext (tag NOT appended)
   * to dst. Accepts `file://` URIs or plain paths.
   */
  encryptFile(
    srcPath: string,
    dstPath: string,
    dek: Uint8Array,
  ): Promise<NativeEncryptFileResult>;
  /**
   * Reads RAW ciphertext from src, authenticates with nonce+tag, writes
   * plaintext to dst. Throws on auth failure (wrong key / tampered data).
   */
  decryptFile(
    srcPath: string,
    dstPath: string,
    dek: Uint8Array,
    nonceHex: string,
    tagHex: string,
  ): Promise<void>;
}

/**
 * Null where the native module is absent (Expo Go, vitest) — callers fall
 * back to the pure-JS @noble path. Native: CryptoKit (iOS), javax.crypto
 * (Android).
 */
export const nativeMediaCrypto =
  requireOptionalNativeModule<OpusMediaCryptoNative>("OpusMediaCrypto");
