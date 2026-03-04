import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

const DEVICE_ID_KEY = "@surgical_logbook_device_id";
const DEVICE_PRIVATE_KEY = "@surgical_logbook_device_private_key";
const NONCE_BYTES = 24;
const KEY_BYTES = 32;
const CASE_KEY_CONTEXT = "surgical-logbook-case-key";

export interface PublicKeyBundle {
  version: 1;
  deviceId: string;
  publicKey: string;
  label?: string;
}

export interface CaseKeyEnvelope {
  version: 1;
  senderDeviceId: string;
  senderPublicKey: string;
  recipientPublicKey: string;
  nonce: string;
  cipher: string;
  createdAt: string;
}

async function getSecret(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setSecret(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getSecret(DEVICE_ID_KEY);
  if (existing) return existing;

  const id = bytesToHex(await Crypto.getRandomBytesAsync(16));
  await setSecret(DEVICE_ID_KEY, id);
  return id;
}

async function getOrCreateDevicePrivateKeyHex(): Promise<string> {
  const existing = await getSecret(DEVICE_PRIVATE_KEY);
  if (existing) return existing;

  const priv = bytesToHex(await Crypto.getRandomBytesAsync(KEY_BYTES));
  await setSecret(DEVICE_PRIVATE_KEY, priv);
  return priv;
}

async function getDeviceKeyPair(): Promise<{
  deviceId: string;
  privateKey: string;
  publicKey: string;
}> {
  const deviceId = await getOrCreateDeviceId();
  const privateKey = await getOrCreateDevicePrivateKeyHex();
  const publicKey = bytesToHex(x25519.getPublicKey(hexToBytes(privateKey)));

  return { deviceId, privateKey, publicKey };
}

function deriveSharedKey(
  privateKeyHex: string,
  publicKeyHex: string,
): Uint8Array {
  const sharedSecret = x25519.getSharedSecret(
    hexToBytes(privateKeyHex),
    hexToBytes(publicKeyHex),
  );
  return hkdf(
    sha256,
    sharedSecret,
    undefined,
    utf8ToBytes(CASE_KEY_CONTEXT),
    KEY_BYTES,
  );
}

export async function getOrCreateDeviceIdentity(): Promise<{
  deviceId: string;
  publicKey: string;
}> {
  const { deviceId, publicKey } = await getDeviceKeyPair();
  return { deviceId, publicKey };
}

export async function exportPublicKeyBundle(label?: string): Promise<string> {
  const { deviceId, publicKey } = await getDeviceKeyPair();
  const bundle: PublicKeyBundle = {
    version: 1,
    deviceId,
    publicKey,
    label,
  };
  return JSON.stringify(bundle);
}

export function parsePublicKeyBundle(raw: string): PublicKeyBundle | null {
  try {
    const parsed = JSON.parse(raw) as PublicKeyBundle;
    if (parsed.version !== 1) return null;
    if (!parsed.deviceId || !parsed.publicKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function generateCaseKeyHex(): Promise<string> {
  return bytesToHex(await Crypto.getRandomBytesAsync(KEY_BYTES));
}

export async function encryptPayloadWithCaseKey(
  plaintext: string,
  caseKeyHex: string,
): Promise<string> {
  const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
  const cipher = xchacha20poly1305(hexToBytes(caseKeyHex), nonce);
  const ciphertext = cipher.encrypt(utf8ToBytes(plaintext));

  return `case:v1:${bytesToHex(nonce)}:${bytesToHex(ciphertext)}`;
}

export function decryptPayloadWithCaseKey(
  envelope: string,
  caseKeyHex: string,
): string {
  if (!envelope.startsWith("case:v1:")) return envelope;

  const parts = envelope.split(":");
  if (parts.length !== 4) return envelope;

  const nonceHex = parts[2]!;
  const cipherHex = parts[3]!;

  const nonce = hexToBytes(nonceHex);
  const cipher = xchacha20poly1305(hexToBytes(caseKeyHex), nonce);
  const plaintextBytes = cipher.decrypt(hexToBytes(cipherHex));
  return bytesToUtf8(plaintextBytes);
}

export async function wrapCaseKeyForRecipient(
  caseKeyHex: string,
  recipientPublicKeyHex: string,
): Promise<CaseKeyEnvelope> {
  const { deviceId, privateKey, publicKey } = await getDeviceKeyPair();
  const sharedKey = deriveSharedKey(privateKey, recipientPublicKeyHex);
  const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
  const cipher = xchacha20poly1305(sharedKey, nonce);
  const ciphertext = cipher.encrypt(hexToBytes(caseKeyHex));

  return {
    version: 1,
    senderDeviceId: deviceId,
    senderPublicKey: publicKey,
    recipientPublicKey: recipientPublicKeyHex,
    nonce: bytesToHex(nonce),
    cipher: bytesToHex(ciphertext),
    createdAt: new Date().toISOString(),
  };
}

export async function unwrapCaseKeyEnvelope(
  envelope: CaseKeyEnvelope,
): Promise<string> {
  const { privateKey } = await getDeviceKeyPair();
  const sharedKey = deriveSharedKey(privateKey, envelope.senderPublicKey);

  const nonce = hexToBytes(envelope.nonce);
  const cipher = xchacha20poly1305(sharedKey, nonce);
  const caseKeyBytes = cipher.decrypt(hexToBytes(envelope.cipher));

  return bytesToHex(caseKeyBytes);
}
