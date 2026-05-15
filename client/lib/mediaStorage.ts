import { File } from "expo-file-system";

import { getMasterKeyBytes } from "./encryption";
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
import { bytesToBase64 } from "./binaryUtils";

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

export interface ResolvedMediaStorage {
  kind: "plain" | "v2" | "missing";
  mediaId?: string;
  canonicalUri: string;
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
): Promise<ResolvedMediaStorage> {
  if (!isOpusMediaUri(mediaUri)) {
    return {
      kind: "plain",
      canonicalUri: mediaUri,
    };
  }

  const mediaId = opusMediaIdFromUri(mediaUri);
  const hasV2Files = await hasMediaV2(mediaId);

  if (hasV2Files) {
    return {
      kind: "v2",
      mediaId,
      canonicalUri: `${OPUS_MEDIA_PREFIX}${mediaId}`,
    };
  }

  return {
    kind: "missing",
    mediaId,
    canonicalUri: mediaUri,
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
      if (isOpusMediaUri(input)) {
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

export async function loadThumbnail(uri: string): Promise<string | null> {
  if (!isOpusMediaUri(uri)) return null;

  const mediaId = opusMediaIdFromUri(uri);
  return loadV2AsDataUri(mediaId, "thumb");
}

export async function loadEncryptedMedia(uri: string): Promise<string | null> {
  if (!isOpusMediaUri(uri)) return null;

  const mediaId = opusMediaIdFromUri(uri);
  return loadV2AsDataUri(mediaId, "image");
}

async function deleteMediaById(mediaId: string): Promise<void> {
  await deleteMediaV2(mediaId);
}

export async function deleteEncryptedMedia(uri: string): Promise<void> {
  if (!isOpusMediaUri(uri)) return;

  const mediaId = opusMediaIdFromUri(uri);
  await deleteMediaById(mediaId);
}

export async function deleteMultipleEncryptedMedia(
  uris: string[],
): Promise<void> {
  const mediaIds = Array.from(
    new Set(
      uris
        .filter((uri) => isOpusMediaUri(uri))
        .map((uri) => opusMediaIdFromUri(uri)),
    ),
  );

  if (mediaIds.length === 0) return;

  await deleteMultipleMediaV2(mediaIds);
}

export async function clearAllMediaStorage(): Promise<void> {
  await clearAllMediaV2();
}
