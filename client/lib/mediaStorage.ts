import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { encryptData, decryptData, getMasterKeyBytes } from "./encryption";
import {
  isOpusMediaUri,
  opusMediaIdFromUri,
  OPUS_MEDIA_PREFIX,
  saveMediaV2,
  readMeta,
  loadDecryptedImageV2,
  loadDecryptedThumbV2,
  deleteMediaV2,
  deleteMultipleMediaV2,
} from "./mediaFileStorage";
import {
  getImageBytesFromUri,
  generateThumbnailBytes,
} from "./thumbnailGenerator";
import { migrateV1ToV2 } from "./mediaMigration";
import { bytesToBase64 } from "./binaryUtils";

const MEDIA_KEY_PREFIX = "@surgical_logbook_media_";
const THUMB_KEY_PREFIX = "@surgical_logbook_thumb_";
const ENCRYPTED_MEDIA_PREFIX = "encrypted-media:";

export { isOpusMediaUri, OPUS_MEDIA_PREFIX };

const THUMB_SIZE = 128;
const THUMB_COMPRESS = 0.5;

export interface MediaImportAsset {
  uri: string;
  mimeType?: string | null;
}

export interface ImportedMediaAsset {
  localUri: string;
  mimeType: string;
  sourceUri: string;
}

export function isEncryptedMediaUri(uri: string): boolean {
  return uri.startsWith(ENCRYPTED_MEDIA_PREFIX);
}

function mediaIdFromUri(uri: string): string {
  return uri.slice(ENCRYPTED_MEDIA_PREFIX.length);
}

async function generateThumbnailBase64(
  sourceUri: string,
): Promise<string | null> {
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

export async function saveEncryptedMediaFromUri(
  sourceUri: string,
  mimeType: string = "image/jpeg",
): Promise<{ localUri: string; mimeType: string }> {
  // EXIF metadata (GPS, device info, timestamps) is inherently stripped by
  // getImageBytesFromUri — ImageManipulator re-encoding creates a fresh file
  // with no metadata containers. No separate strip step needed.
  const { bytes, normalizedMime, width, height } = await getImageBytesFromUri(
    sourceUri,
    mimeType,
  );
  const thumbBytes = await generateThumbnailBytes(sourceUri);
  const masterKey = await getMasterKeyBytes();
  const opusUri = saveMediaV2(
    bytes,
    thumbBytes,
    normalizedMime,
    masterKey,
    width,
    height,
  );
  return { localUri: opusUri, mimeType: normalizedMime };
}

export async function importMediaAssets(
  assets: MediaImportAsset[],
  onItemSaved: (item: ImportedMediaAsset, index: number) => void,
): Promise<void> {
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    if (!asset) continue;
    const saved = await saveEncryptedMediaFromUri(
      asset.uri,
      asset.mimeType || "image/jpeg",
    );
    onItemSaved(
      {
        localUri: saved.localUri,
        mimeType: saved.mimeType,
        sourceUri: asset.uri,
      },
      index,
    );
  }
}

export async function saveEncryptedMedia(
  base64Data: string,
  mimeType: string = "image/jpeg",
  sourceUri?: string,
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
  // v2: opus-media:{uuid}
  if (isOpusMediaUri(uri)) {
    try {
      const mediaId = opusMediaIdFromUri(uri);
      const masterKey = await getMasterKeyBytes();
      const bytes = loadDecryptedThumbV2(mediaId, masterKey);
      const base64 = bytesToBase64(bytes);
      return `data:image/jpeg;base64,${base64}`;
    } catch (e) {
      console.error("v2 thumbnail load failed:", e);
      return null;
    }
  }

  // v1: encrypted-media:{uuid} — attempt lazy migration
  if (!isEncryptedMediaUri(uri)) return null;
  const id = mediaIdFromUri(uri);

  // Try to migrate and load v2 thumbnail
  try {
    const v2Uri = await migrateV1ToV2(id);
    if (v2Uri) {
      const masterKey = await getMasterKeyBytes();
      const bytes = loadDecryptedThumbV2(id, masterKey);
      const base64 = bytesToBase64(bytes);
      return `data:image/jpeg;base64,${base64}`;
    }
  } catch {
    // Migration failed — fall through to v1 path
  }

  // Fallback: load v1 unencrypted thumbnail
  const thumbBase64 = await AsyncStorage.getItem(`${THUMB_KEY_PREFIX}${id}`);
  if (!thumbBase64) return null;
  return `data:image/jpeg;base64,${thumbBase64}`;
}

export async function generateAndSaveThumbnail(
  uri: string,
  dataUri: string,
): Promise<void> {
  // v2 media already has thumbnails generated at save time — no-op
  if (isOpusMediaUri(uri)) return;

  if (!isEncryptedMediaUri(uri)) return;
  const id = mediaIdFromUri(uri);
  const thumbBase64 = await generateThumbnailBase64(dataUri);
  if (thumbBase64) {
    await AsyncStorage.setItem(`${THUMB_KEY_PREFIX}${id}`, thumbBase64);
  }
}

export async function loadEncryptedMedia(uri: string): Promise<string | null> {
  // v2: opus-media:{uuid} — file-based AES-256-GCM
  if (isOpusMediaUri(uri)) {
    try {
      const mediaId = opusMediaIdFromUri(uri);
      const masterKey = await getMasterKeyBytes();
      const meta = readMeta(mediaId);
      const mime = meta?.mimeType ?? "image/jpeg";
      const bytes = loadDecryptedImageV2(mediaId, masterKey);
      const base64 = bytesToBase64(bytes);
      return `data:${mime};base64,${base64}`;
    } catch (e) {
      console.error("v2 media load failed:", e);
      return null;
    }
  }

  // v1: encrypted-media:{uuid} — attempt lazy migration to v2
  if (!isEncryptedMediaUri(uri)) return null;
  const id = mediaIdFromUri(uri);

  // Try to migrate to v2 first
  try {
    const v2Uri = await migrateV1ToV2(id);
    if (v2Uri) {
      const masterKey = await getMasterKeyBytes();
      const bytes = loadDecryptedImageV2(id, masterKey);
      const base64 = bytesToBase64(bytes);
      return `data:image/jpeg;base64,${base64}`;
    }
  } catch {
    // Migration failed — fall through to v1 path
  }

  // Fallback: load directly from v1
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
  // v2
  if (isOpusMediaUri(uri)) {
    deleteMediaV2(opusMediaIdFromUri(uri));
    return;
  }
  // v1
  if (!isEncryptedMediaUri(uri)) return;
  const id = mediaIdFromUri(uri);
  await AsyncStorage.multiRemove([
    `${MEDIA_KEY_PREFIX}${id}`,
    `${THUMB_KEY_PREFIX}${id}`,
  ]);
}

export async function deleteMultipleEncryptedMedia(
  uris: string[],
): Promise<void> {
  // v2
  const v2Ids = uris.filter(isOpusMediaUri).map(opusMediaIdFromUri);
  if (v2Ids.length > 0) {
    deleteMultipleMediaV2(v2Ids);
  }

  // v1
  const keys = uris
    .filter((u) => isEncryptedMediaUri(u) && !isOpusMediaUri(u))
    .flatMap((uri) => {
      const id = mediaIdFromUri(uri);
      return [`${MEDIA_KEY_PREFIX}${id}`, `${THUMB_KEY_PREFIX}${id}`];
    });
  if (keys.length > 0) {
    await AsyncStorage.multiRemove(keys);
  }
}
