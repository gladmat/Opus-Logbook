import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { encryptData, decryptData } from "./encryption";

const MEDIA_KEY_PREFIX = "@surgical_logbook_media_";
const THUMB_KEY_PREFIX = "@surgical_logbook_thumb_";
const ENCRYPTED_MEDIA_PREFIX = "encrypted-media:";

const THUMB_SIZE = 128;
const THUMB_COMPRESS = 0.5;

let _pendingBase64: string | null = null;
let _pendingMimeType: string = "image/jpeg";

export function setPendingBase64(data: string, mimeType?: string) {
  _pendingBase64 = data;
  _pendingMimeType = mimeType || "image/jpeg";
}

export function consumePendingBase64(): { base64: string; mimeType: string } | null {
  if (!_pendingBase64) return null;
  const result = { base64: _pendingBase64, mimeType: _pendingMimeType };
  _pendingBase64 = null;
  _pendingMimeType = "image/jpeg";
  return result;
}

export function hasPendingBase64(): boolean {
  return _pendingBase64 !== null;
}

export function isEncryptedMediaUri(uri: string): boolean {
  return uri.startsWith(ENCRYPTED_MEDIA_PREFIX);
}

function mediaIdFromUri(uri: string): string {
  return uri.slice(ENCRYPTED_MEDIA_PREFIX.length);
}

async function generateThumbnailBase64(sourceUri: string): Promise<string | null> {
  try {
    const context = ImageManipulator.manipulate(sourceUri);
    context.resize({ width: THUMB_SIZE, height: THUMB_SIZE });
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: THUMB_COMPRESS,
      base64: true,
    });
    return result.base64 ?? null;
  } catch (e) {
    console.warn("Thumbnail generation failed:", e);
    return null;
  }
}

export async function saveEncryptedMedia(
  base64Data: string,
  mimeType: string = "image/jpeg",
  sourceUri?: string
): Promise<string> {
  const id = uuidv4();
  const payload = JSON.stringify({ m: mimeType, d: base64Data });
  const encrypted = await encryptData(payload);
  await AsyncStorage.setItem(`${MEDIA_KEY_PREFIX}${id}`, encrypted);

  // Generate and save unencrypted thumbnail for fast dashboard loading
  if (sourceUri) {
    const thumbBase64 = await generateThumbnailBase64(sourceUri);
    if (thumbBase64) {
      await AsyncStorage.setItem(`${THUMB_KEY_PREFIX}${id}`, thumbBase64);
    }
  }

  return `${ENCRYPTED_MEDIA_PREFIX}${id}`;
}

export async function loadThumbnail(uri: string): Promise<string | null> {
  if (!isEncryptedMediaUri(uri)) return null;
  const id = mediaIdFromUri(uri);
  const thumbBase64 = await AsyncStorage.getItem(`${THUMB_KEY_PREFIX}${id}`);
  if (!thumbBase64) return null;
  return `data:image/jpeg;base64,${thumbBase64}`;
}

export async function generateAndSaveThumbnail(
  uri: string,
  dataUri: string
): Promise<void> {
  if (!isEncryptedMediaUri(uri)) return;
  const id = mediaIdFromUri(uri);
  const thumbBase64 = await generateThumbnailBase64(dataUri);
  if (thumbBase64) {
    await AsyncStorage.setItem(`${THUMB_KEY_PREFIX}${id}`, thumbBase64);
  }
}

export async function loadEncryptedMedia(uri: string): Promise<string | null> {
  if (!isEncryptedMediaUri(uri)) return null;
  const id = mediaIdFromUri(uri);
  const encrypted = await AsyncStorage.getItem(`${MEDIA_KEY_PREFIX}${id}`);
  if (!encrypted) return null;
  const decrypted = await decryptData(encrypted);
  try {
    const parsed = JSON.parse(decrypted);
    const mime = parsed.m || "image/jpeg";
    const base64 = parsed.d;
    return `data:${mime};base64,${base64}`;
  } catch {
    return `data:image/jpeg;base64,${decrypted}`;
  }
}

export async function deleteEncryptedMedia(uri: string): Promise<void> {
  if (!isEncryptedMediaUri(uri)) return;
  const id = mediaIdFromUri(uri);
  await AsyncStorage.multiRemove([
    `${MEDIA_KEY_PREFIX}${id}`,
    `${THUMB_KEY_PREFIX}${id}`,
  ]);
}

export async function deleteMultipleEncryptedMedia(uris: string[]): Promise<void> {
  const keys = uris
    .filter(isEncryptedMediaUri)
    .flatMap((uri) => {
      const id = mediaIdFromUri(uri);
      return [`${MEDIA_KEY_PREFIX}${id}`, `${THUMB_KEY_PREFIX}${id}`];
    });
  if (keys.length > 0) {
    await AsyncStorage.multiRemove(keys);
  }
}
