import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import { v4 as uuidv4 } from "uuid";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { encryptData, decryptData, getMasterKeyBytes } from "./encryption";
import {
  isOpusMediaUri,
  opusMediaIdFromUri,
  OPUS_MEDIA_PREFIX,
  saveMediaV2,
  loadDecryptedImageV2,
  loadDecryptedThumbV2,
  deleteMediaV2,
  deleteMultipleMediaV2,
  hasMediaV2,
  clearAllMediaV2,
} from "./mediaFileStorage";
import {
  prepareImageForEncryption,
  generateThumbnailFile,
} from "./thumbnailGenerator";
import {
  migrateV1ToV2,
  hasLegacyMedia,
  forgetMigratedMedia,
} from "./mediaMigration";
import { bytesToBase64 } from "./binaryUtils";

const MEDIA_KEY_PREFIX = "@surgical_logbook_media_";
const THUMB_KEY_PREFIX = "@surgical_logbook_thumb_";
const ENCRYPTED_MEDIA_PREFIX = "encrypted-media:";
const THUMB_SIZE = 128;
const THUMB_COMPRESS = 0.5;

export { isOpusMediaUri, OPUS_MEDIA_PREFIX };

export interface MediaImportAsset {
  uri: string;
  mimeType?: string | null;
}

export interface ImportedMediaAsset {
  localUri: string;
  mimeType: string;
  sourceUri: string;
}

export type ResolvedMediaStorageKind = "plain" | "v1" | "v2" | "missing";

export interface ResolvedMediaStorage {
  kind: ResolvedMediaStorageKind;
  mediaId?: string;
  canonicalUri: string;
  hasLegacyBlob: boolean;
  hasV2Files: boolean;
}

export function isEncryptedMediaUri(uri: string): boolean {
  return uri.startsWith(ENCRYPTED_MEDIA_PREFIX);
}

function mediaIdFromUri(uri: string): string {
  return uri.slice(ENCRYPTED_MEDIA_PREFIX.length);
}

function getLegacyMediaKey(mediaId: string): string {
  return `${MEDIA_KEY_PREFIX}${mediaId}`;
}

function getLegacyThumbKey(mediaId: string): string {
  return `${THUMB_KEY_PREFIX}${mediaId}`;
}

async function deleteFileIfExists(uri?: string | null): Promise<void> {
  if (!uri) return;

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignore best-effort temp-file cleanup failures.
  }
}

async function loadV2AsDataUri(
  mediaId: string,
  variant: "image" | "thumb",
): Promise<string | null> {
  try {
    const masterKey = await getMasterKeyBytes();
    const payload =
      variant === "thumb"
        ? await loadDecryptedThumbV2(mediaId, masterKey)
        : await loadDecryptedImageV2(mediaId, masterKey);

    return `data:${payload.mimeType};base64,${bytesToBase64(payload.bytes)}`;
  } catch (error) {
    console.error(`v2 ${variant} load failed:`, error);
    return null;
  }
}

export async function resolveMediaStorage(
  mediaUri: string,
  options: { migrateLegacy?: boolean } = {},
): Promise<ResolvedMediaStorage> {
  if (!isEncryptedMediaUri(mediaUri) && !isOpusMediaUri(mediaUri)) {
    return {
      kind: "plain",
      canonicalUri: mediaUri,
      hasLegacyBlob: false,
      hasV2Files: false,
    };
  }

  const mediaId = isOpusMediaUri(mediaUri)
    ? opusMediaIdFromUri(mediaUri)
    : mediaIdFromUri(mediaUri);
  const hasV2Files = await hasMediaV2(mediaId);
  const hasLegacyBlob = await hasLegacyMedia(mediaId);

  if (hasV2Files) {
    return {
      kind: "v2",
      mediaId,
      canonicalUri: `${OPUS_MEDIA_PREFIX}${mediaId}`,
      hasLegacyBlob,
      hasV2Files: true,
    };
  }

  if (hasLegacyBlob && options.migrateLegacy) {
    const migratedUri = await migrateV1ToV2(mediaId);
    if (migratedUri && (await hasMediaV2(mediaId))) {
      return {
        kind: "v2",
        mediaId,
        canonicalUri: migratedUri,
        hasLegacyBlob: true,
        hasV2Files: true,
      };
    }
  }

  if (hasLegacyBlob) {
    return {
      kind: "v1",
      mediaId,
      canonicalUri: `${ENCRYPTED_MEDIA_PREFIX}${mediaId}`,
      hasLegacyBlob: true,
      hasV2Files: false,
    };
  }

  return {
    kind: "missing",
    mediaId,
    canonicalUri: mediaUri,
    hasLegacyBlob: false,
    hasV2Files: false,
  };
}

export async function canonicalizeMediaUri(mediaUri: string): Promise<string> {
  const resolved = await resolveMediaStorage(mediaUri);
  return resolved.canonicalUri;
}

export async function canonicalizePersistedMediaUris<T>(value: T): Promise<T> {
  const resolvedUriCache = new Map<string, Promise<string>>();

  const resolveString = (uri: string): Promise<string> => {
    let pending = resolvedUriCache.get(uri);
    if (!pending) {
      pending = canonicalizeMediaUri(uri);
      resolvedUriCache.set(uri, pending);
    }
    return pending;
  };

  const visit = async (input: unknown): Promise<unknown> => {
    if (typeof input === "string") {
      if (isEncryptedMediaUri(input) || isOpusMediaUri(input)) {
        return resolveString(input);
      }
      return input;
    }

    if (Array.isArray(input)) {
      let changed = false;
      const next = await Promise.all(
        input.map(async (item) => {
          const visited = await visit(item);
          changed ||= visited !== item;
          return visited;
        }),
      );

      return changed ? next : input;
    }

    if (!input || typeof input !== "object") {
      return input;
    }

    let changed = false;
    const entries = await Promise.all(
      Object.entries(input).map(async ([key, item]) => {
        const visited = await visit(item);
        changed ||= visited !== item;
        return [key, visited] as const;
      }),
    );

    if (!changed) {
      return input;
    }

    return Object.fromEntries(entries);
  };

  return (await visit(value)) as T;
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
  } catch (error) {
    console.warn("Thumbnail generation failed:", error);
    return null;
  }
}

export async function saveEncryptedMediaFromUri(
  sourceUri: string,
  mimeType: string = "image/jpeg",
): Promise<{ localUri: string; mimeType: string }> {
  const preparedImage = await prepareImageForEncryption(sourceUri, mimeType);
  const preparedThumb = await generateThumbnailFile(preparedImage.uri);

  try {
    const masterKey = await getMasterKeyBytes();
    const localUri = await saveMediaV2(
      preparedImage.uri,
      preparedThumb?.uri ?? null,
      preparedImage.mimeType,
      masterKey,
      preparedImage.width,
      preparedImage.height,
    );

    return { localUri, mimeType: preparedImage.mimeType };
  } finally {
    await deleteFileIfExists(preparedImage.uri);
    await deleteFileIfExists(preparedThumb?.uri);
  }
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
  await AsyncStorage.setItem(getLegacyMediaKey(id), encrypted);

  if (sourceUri) {
    const thumbBase64 = await generateThumbnailBase64(sourceUri);
    if (thumbBase64) {
      await AsyncStorage.setItem(getLegacyThumbKey(id), thumbBase64);
    }
  }

  return `${ENCRYPTED_MEDIA_PREFIX}${id}`;
}

export async function loadThumbnail(uri: string): Promise<string | null> {
  const resolved = await resolveMediaStorage(uri, { migrateLegacy: true });

  if (resolved.kind === "v2" && resolved.mediaId) {
    return loadV2AsDataUri(resolved.mediaId, "thumb");
  }

  if (resolved.kind !== "v1" || !resolved.mediaId) {
    return null;
  }

  const thumbBase64 = await AsyncStorage.getItem(
    getLegacyThumbKey(resolved.mediaId),
  );
  if (!thumbBase64) return null;
  return `data:image/jpeg;base64,${thumbBase64}`;
}

export async function generateAndSaveThumbnail(
  uri: string,
  dataUri: string,
): Promise<void> {
  if (isOpusMediaUri(uri) || !isEncryptedMediaUri(uri)) return;

  const id = mediaIdFromUri(uri);
  const thumbBase64 = await generateThumbnailBase64(dataUri);
  if (thumbBase64) {
    await AsyncStorage.setItem(getLegacyThumbKey(id), thumbBase64);
  }
}

export async function loadEncryptedMedia(uri: string): Promise<string | null> {
  const resolved = await resolveMediaStorage(uri, { migrateLegacy: true });

  if (resolved.kind === "v2" && resolved.mediaId) {
    return loadV2AsDataUri(resolved.mediaId, "image");
  }

  if (resolved.kind !== "v1" || !resolved.mediaId) {
    return null;
  }

  const encrypted = await AsyncStorage.getItem(
    getLegacyMediaKey(resolved.mediaId),
  );
  if (!encrypted) return null;

  const decrypted = await decryptData(encrypted);
  try {
    const parsed = JSON.parse(decrypted);
    return `data:${parsed.m || "image/jpeg"};base64,${parsed.d}`;
  } catch {
    return `data:image/jpeg;base64,${decrypted}`;
  }
}

async function deleteMediaById(mediaId: string): Promise<void> {
  await deleteMediaV2(mediaId);
  await AsyncStorage.multiRemove([
    getLegacyMediaKey(mediaId),
    getLegacyThumbKey(mediaId),
  ]);
  await forgetMigratedMedia(mediaId);
}

export async function deleteEncryptedMedia(uri: string): Promise<void> {
  if (!isEncryptedMediaUri(uri) && !isOpusMediaUri(uri)) return;

  const mediaId = isOpusMediaUri(uri)
    ? opusMediaIdFromUri(uri)
    : mediaIdFromUri(uri);
  await deleteMediaById(mediaId);
}

export async function deleteMultipleEncryptedMedia(
  uris: string[],
): Promise<void> {
  const mediaIds = Array.from(
    new Set(
      uris
        .filter((uri) => isEncryptedMediaUri(uri) || isOpusMediaUri(uri))
        .map((uri) =>
          isOpusMediaUri(uri) ? opusMediaIdFromUri(uri) : mediaIdFromUri(uri),
        ),
    ),
  );

  if (mediaIds.length === 0) return;

  await deleteMultipleMediaV2(mediaIds);
  const legacyKeys = mediaIds.flatMap((mediaId) => [
    getLegacyMediaKey(mediaId),
    getLegacyThumbKey(mediaId),
  ]);
  await AsyncStorage.multiRemove(legacyKeys);
  for (const mediaId of mediaIds) {
    await forgetMigratedMedia(mediaId);
  }
}

export async function clearAllMediaStorage(): Promise<void> {
  await clearAllMediaV2();

  const keys = await AsyncStorage.getAllKeys();
  const mediaKeys = keys.filter(
    (key) =>
      key.startsWith(MEDIA_KEY_PREFIX) ||
      key.startsWith(THUMB_KEY_PREFIX) ||
      key === "@opus_media_migrated",
  );
  if (mediaKeys.length > 0) {
    await AsyncStorage.multiRemove(mediaKeys);
  }
}
