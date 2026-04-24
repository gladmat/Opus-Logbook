/**
 * File-system CRUD for v2 encrypted media.
 *
 * Storage layout:
 *   {Paths.document}/opus-media/{uuid}/
 *     image.enc    — AES-256-GCM encrypted full image ciphertext
 *     thumb.enc    — AES-256-GCM encrypted thumbnail ciphertext
 *     meta.json    — plaintext JSON with wrapped DEK + cipher metadata
 */

import { File, Directory, Paths } from "expo-file-system";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { v4 as uuidv4 } from "uuid";

import { decryptCache, type DecryptVariant } from "./mediaDecryptCache";
import {
  decryptFile,
  decryptFileToBytes,
  encryptFile,
  generateDek,
  wrapDek,
  unwrapDek,
} from "./mediaEncryption";

export interface MediaMeta {
  version: 2;
  mediaId: string;
  wrappedDEK: string;
  mimeType: string;
  width: number;
  height: number;
  hasThumb: boolean;
  originalNonce: string;
  originalTag: string;
  originalSize: number;
  originalCiphertextSize: number;
  thumbNonce?: string;
  thumbTag?: string;
  thumbSize?: number;
  thumbCiphertextSize?: number;
  createdAt: string;
}

const MEDIA_DIR_NAME = "opus-media";
export const OPUS_MEDIA_PREFIX = "opus-media:";

function isValidMediaMeta(value: unknown): value is MediaMeta {
  if (!value || typeof value !== "object") return false;

  const meta = value as Partial<MediaMeta>;
  if (
    meta.version !== 2 ||
    typeof meta.mediaId !== "string" ||
    typeof meta.wrappedDEK !== "string" ||
    typeof meta.mimeType !== "string" ||
    typeof meta.width !== "number" ||
    typeof meta.height !== "number" ||
    typeof meta.hasThumb !== "boolean" ||
    typeof meta.originalNonce !== "string" ||
    typeof meta.originalTag !== "string" ||
    typeof meta.originalSize !== "number" ||
    typeof meta.originalCiphertextSize !== "number" ||
    typeof meta.createdAt !== "string"
  ) {
    return false;
  }

  if (!meta.hasThumb) {
    return true;
  }

  return (
    typeof meta.thumbNonce === "string" &&
    typeof meta.thumbTag === "string" &&
    typeof meta.thumbSize === "number" &&
    typeof meta.thumbCiphertextSize === "number"
  );
}

export function isOpusMediaUri(uri: string): boolean {
  return uri.startsWith(OPUS_MEDIA_PREFIX);
}

export function opusMediaIdFromUri(uri: string): string {
  return uri.slice(OPUS_MEDIA_PREFIX.length);
}

function getMediaRoot(): Directory {
  return new Directory(Paths.document, MEDIA_DIR_NAME);
}

function getMediaDir(mediaId: string): Directory {
  return new Directory(Paths.document, MEDIA_DIR_NAME, mediaId);
}

export function getMediaPaths(mediaId: string) {
  const dir = getMediaDir(mediaId);
  return {
    dir,
    image: new File(dir, "image.enc"),
    thumb: new File(dir, "thumb.enc"),
    meta: new File(dir, "meta.json"),
  };
}

function ensureMediaRoot(): void {
  const root = getMediaRoot();
  if (!root.exists) {
    root.create({ idempotent: true, intermediates: true });
  }
}

function ensureFileParent(file: File): void {
  const parent = file.parentDirectory;
  if (!parent.exists) {
    parent.create({ idempotent: true, intermediates: true });
  }
}

function writeTextFile(file: File, content: string): void {
  ensureFileParent(file);
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }
  file.write(content);
}

function selectVariantSource(
  mediaId: string,
  meta: MediaMeta,
  variant: DecryptVariant,
): { source: File; nonce: string; tag: string; mimeType: string } {
  const paths = getMediaPaths(mediaId);

  if (variant === "thumb" && meta.hasThumb && paths.thumb.exists) {
    return {
      source: paths.thumb,
      nonce: meta.thumbNonce!,
      tag: meta.thumbTag!,
      mimeType: "image/jpeg",
    };
  }

  return {
    source: paths.image,
    nonce: meta.originalNonce,
    tag: meta.originalTag,
    mimeType: meta.mimeType,
  };
}

export async function saveMediaV2(
  sourceFileUri: string,
  thumbFileUri: string | null,
  mimeType: string,
  masterKey: Uint8Array,
  width: number,
  height: number,
  mediaId?: string,
): Promise<string> {
  const id = mediaId ?? uuidv4();
  const paths = getMediaPaths(id);

  ensureMediaRoot();
  if (!paths.dir.exists) {
    paths.dir.create({ idempotent: true, intermediates: true });
  }

  const dek = await generateDek();
  try {
    const original = await encryptFile(sourceFileUri, paths.image.uri, dek);

    let thumb: {
      nonce: string;
      tag: string;
      sourceSize: number;
      ciphertextSize: number;
    } | null = null;

    if (thumbFileUri) {
      thumb = await encryptFile(thumbFileUri, paths.thumb.uri, dek);
    } else if (paths.thumb.exists) {
      paths.thumb.delete();
    }

    const wrappedDEK = await wrapDek(dek, masterKey);
    // Round `createdAt` to the local calendar day. The meta.json file is
    // stored plaintext alongside the ciphertext image, so a forensic
    // extraction without the master key leaves an attacker able to read
    // the metadata. The full ISO timestamp + width × height let them
    // correlate a capture with public OR booking lists / theatre logs at
    // sub-minute precision. Day-level granularity still lets the app sort
    // gallery thumbnails chronologically without leaking surgical times.
    const createdDay = new Date();
    createdDay.setHours(0, 0, 0, 0);
    const meta: MediaMeta = {
      version: 2,
      mediaId: id,
      wrappedDEK: bytesToHex(wrappedDEK),
      mimeType,
      width,
      height,
      hasThumb: thumb !== null,
      originalNonce: original.nonce,
      originalTag: original.tag,
      originalSize: original.sourceSize,
      originalCiphertextSize: original.ciphertextSize,
      thumbNonce: thumb?.nonce,
      thumbTag: thumb?.tag,
      thumbSize: thumb?.sourceSize,
      thumbCiphertextSize: thumb?.ciphertextSize,
      createdAt: createdDay.toISOString(),
    };

    writeTextFile(paths.meta, JSON.stringify(meta));
    return `${OPUS_MEDIA_PREFIX}${id}`;
  } catch (error) {
    for (const file of [paths.image, paths.thumb, paths.meta]) {
      if (!file.exists) continue;
      try {
        file.delete();
      } catch {
        // Ignore best-effort cleanup failures after a partial write.
      }
    }

    if (paths.dir.exists) {
      try {
        const contents = paths.dir.list();
        if (contents.length === 0) {
          paths.dir.delete();
        }
      } catch {
        // Ignore directory cleanup failures.
      }
    }

    throw error;
  } finally {
    dek.fill(0);
  }
}

export async function readMeta(mediaId: string): Promise<MediaMeta | null> {
  const paths = getMediaPaths(mediaId);
  if (!paths.meta.exists) return null;

  try {
    const text = await paths.meta.text();
    const parsed = JSON.parse(text);
    return isValidMediaMeta(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function hasMediaV2(mediaId: string): Promise<boolean> {
  const meta = await readMeta(mediaId);
  if (!meta) return false;

  const paths = getMediaPaths(mediaId);
  if (!paths.image.exists) return false;
  if (meta.hasThumb && !paths.thumb.exists) return false;
  return true;
}

async function unwrapMediaDek(
  meta: MediaMeta,
  masterKey: Uint8Array,
): Promise<Uint8Array> {
  return unwrapDek(hexToBytes(meta.wrappedDEK), masterKey);
}

async function loadVariantBytes(
  mediaId: string,
  masterKey: Uint8Array,
  variant: DecryptVariant,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const meta = await readMeta(mediaId);
  if (!meta) {
    throw new Error(`No metadata for media ${mediaId}`);
  }

  const { source, nonce, tag, mimeType } = selectVariantSource(
    mediaId,
    meta,
    variant,
  );
  if (!source.exists) {
    throw new Error(`Encrypted media payload is missing for ${mediaId}`);
  }

  const dek = await unwrapMediaDek(meta, masterKey);
  try {
    const bytes = await decryptFileToBytes(source.uri, dek, nonce, tag);
    return { bytes, mimeType };
  } finally {
    dek.fill(0);
  }
}

export async function loadDecryptedImageV2(
  mediaId: string,
  masterKey: Uint8Array,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  return loadVariantBytes(mediaId, masterKey, "full");
}

export async function loadDecryptedThumbV2(
  mediaId: string,
  masterKey: Uint8Array,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  return loadVariantBytes(mediaId, masterKey, "thumb");
}

export async function decryptMediaVariantToFile(
  mediaId: string,
  masterKey: Uint8Array,
  variant: DecryptVariant,
  destPath: string,
): Promise<{ mimeType: string }> {
  const meta = await readMeta(mediaId);
  if (!meta) {
    throw new Error(`No metadata for media ${mediaId}`);
  }

  const { source, nonce, tag, mimeType } = selectVariantSource(
    mediaId,
    meta,
    variant,
  );
  if (!source.exists) {
    throw new Error(`Encrypted media payload is missing for ${mediaId}`);
  }

  const dek = await unwrapMediaDek(meta, masterKey);
  try {
    await decryptFile(source.uri, destPath, dek, nonce, tag);
    return { mimeType };
  } finally {
    dek.fill(0);
  }
}

export async function deleteMediaV2(mediaId: string): Promise<void> {
  decryptCache.invalidate(mediaId);

  const dir = getMediaDir(mediaId);
  if (!dir.exists) return;

  try {
    dir.delete();
  } catch {
    // Ignore inaccessible or already-deleted directories.
  }
}

export async function deleteMultipleMediaV2(mediaIds: string[]): Promise<void> {
  for (const id of mediaIds) {
    await deleteMediaV2(id);
  }
}

export async function clearAllMediaV2(): Promise<void> {
  decryptCache.clearAll();

  const root = getMediaRoot();
  if (!root.exists) return;

  try {
    root.delete();
  } catch {
    // Ignore best-effort cleanup failures.
  }
}

export function listAllMediaIds(): string[] {
  const root = getMediaRoot();
  if (!root.exists) return [];

  try {
    return root
      .list()
      .filter((entry): entry is Directory => entry instanceof Directory)
      .map((dir) => dir.name);
  } catch {
    return [];
  }
}

export function getStorageStats(): { count: number; totalBytes: number } {
  const root = getMediaRoot();
  if (!root.exists) return { count: 0, totalBytes: 0 };

  return {
    count: listAllMediaIds().length,
    totalBytes: root.size ?? 0,
  };
}
