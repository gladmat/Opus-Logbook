import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

const ENCRYPTION_KEY_ALIAS = "surgical_logbook_encryption_key";
const ENVELOPE_PREFIX = "enc:v1";
const KEY_BYTES = 32;
const NONCE_BYTES = 24;

function isHex(value: string): boolean {
  return /^[0-9a-f]+$/i.test(value) && value.length % 2 === 0;
}

let _cachedKeyHex: string | null = null;
let _cachedKeyBytes: Uint8Array | null = null;

async function getKeyHex(): Promise<string> {
  if (_cachedKeyHex) return _cachedKeyHex;

  if (Platform.OS === "web") {
    const stored = await AsyncStorage.getItem(`@${ENCRYPTION_KEY_ALIAS}`);
    if (stored && isHex(stored)) {
      _cachedKeyHex = stored;
      return stored;
    }

    const newKey = bytesToHex(await Crypto.getRandomBytesAsync(KEY_BYTES));
    await AsyncStorage.setItem(`@${ENCRYPTION_KEY_ALIAS}`, newKey);
    _cachedKeyHex = newKey;
    return newKey;
  }

  const stored = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
  if (stored && isHex(stored)) {
    _cachedKeyHex = stored;
    return stored;
  }

  const newKey = bytesToHex(await Crypto.getRandomBytesAsync(KEY_BYTES));
  await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, newKey);
  _cachedKeyHex = newKey;
  return newKey;
}

async function getKeyBytes(): Promise<Uint8Array> {
  if (_cachedKeyBytes) return _cachedKeyBytes;
  const keyHex = await getKeyHex();
  _cachedKeyBytes = hexToBytes(keyHex);
  return _cachedKeyBytes;
}

function legacyXorDecrypt(encrypted: string, key: string): string {
  const atobFn = globalThis.atob;
  if (!atobFn) {
    throw new Error("atob is not available for legacy decryption");
  }

  const encryptedBytes = Uint8Array.from(atobFn(encrypted), (c) =>
    c.charCodeAt(0),
  );
  const keyBytes = utf8ToBytes(key);
  const result = new Uint8Array(encryptedBytes.length);

  for (let i = 0; i < encryptedBytes.length; i++) {
    result[i] = encryptedBytes[i]! ^ keyBytes[i % keyBytes.length]!;
  }

  return bytesToUtf8(result);
}

function looksLikeJson(data: string): boolean {
  try {
    JSON.parse(data);
    return true;
  } catch {
    return false;
  }
}

export async function generateKeyHex(): Promise<string> {
  return bytesToHex(await Crypto.getRandomBytesAsync(KEY_BYTES));
}

export async function encryptWithKey(
  plaintext: string,
  keyHex: string,
): Promise<string> {
  const key = hexToBytes(keyHex);
  const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
  const cipher = xchacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(utf8ToBytes(plaintext));

  return `${ENVELOPE_PREFIX}:${bytesToHex(nonce)}:${bytesToHex(ciphertext)}`;
}

export async function decryptWithKey(
  envelope: string,
  keyHex: string,
): Promise<string> {
  if (!envelope.startsWith(`${ENVELOPE_PREFIX}:`)) {
    return envelope;
  }

  const parts = envelope.split(":");
  if (parts.length !== 4) return envelope;

  const nonceHex = parts[2];
  const cipherHex = parts[3];
  if (!nonceHex || !cipherHex) return envelope;

  const key = hexToBytes(keyHex);
  const nonce = hexToBytes(nonceHex);
  const ciphertext = hexToBytes(cipherHex);

  const cipher = xchacha20poly1305(key, nonce);
  const plaintextBytes = cipher.decrypt(ciphertext);
  return bytesToUtf8(plaintextBytes);
}

export async function encryptData(data: string): Promise<string> {
  try {
    const key = await getKeyBytes();
    const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
    const cipher = xchacha20poly1305(key, nonce);
    const ciphertext = cipher.encrypt(utf8ToBytes(data));

    return `${ENVELOPE_PREFIX}:${bytesToHex(nonce)}:${bytesToHex(ciphertext)}`;
  } catch (error) {
    throw new Error(
      "Encryption failed. Data was not saved to protect your privacy.",
    );
  }
}

export async function decryptData(encryptedData: string): Promise<string> {
  try {
    if (!encryptedData.startsWith(`${ENVELOPE_PREFIX}:`)) {
      if (looksLikeJson(encryptedData)) return encryptedData;

      try {
        const legacyKey = await getKeyHex();
        const legacyPlain = legacyXorDecrypt(encryptedData, legacyKey);
        return legacyPlain;
      } catch {
        return encryptedData;
      }
    }

    const parts = encryptedData.split(":");
    if (parts.length !== 4) return encryptedData;

    const nonceHex = parts[2];
    const cipherHex = parts[3];
    if (!nonceHex || !cipherHex) return encryptedData;

    const key = await getKeyBytes();
    const nonce = hexToBytes(nonceHex);
    const ciphertext = hexToBytes(cipherHex);

    const cipher = xchacha20poly1305(key, nonce);
    const plaintextBytes = cipher.decrypt(ciphertext);
    return bytesToUtf8(plaintextBytes);
  } catch (error) {
    console.error("Decryption failed, returning as-is:", error);
    return encryptedData;
  }
}

export async function isEncrypted(data: string): Promise<boolean> {
  return data.startsWith(`${ENVELOPE_PREFIX}:`);
}
