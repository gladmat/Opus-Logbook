/**
 * File-system CRUD for v2 encrypted media.
 *
 * Storage layout:
 *   {Paths.document}/opus-media/{uuid}/
 *     image.enc    — AES-256-GCM encrypted full image
 *     thumb.enc    — AES-256-GCM encrypted thumbnail (300px, JPEG 0.6)
 *     meta.json    — plaintext JSON with wrappedDEK + metadata
 *
 * URI scheme: opus-media:{uuid}
 */

import { File, Directory, Paths } from "expo-file-system";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { v4 as uuidv4 } from "uuid";

import {
  generateDEK,
  encryptMediaBytes,
  decryptMediaBytes,
  wrapDEK,
  unwrapDEK,
} from "./mediaEncryption";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface MediaMeta {
  version: 2;
  mediaId: string;
  wrappedDEK: string; // hex-encoded wrapped DEK bytes
  mimeType: string;
  width: number;
  height: number;
  hasThumb: boolean;
  createdAt: string; // ISO 8601
}

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const MEDIA_DIR_NAME = "opus-media";
export const OPUS_MEDIA_PREFIX = "opus-media:";

// ═══════════════════════════════════════════════════════════
// URI helpers
// ═══════════════════════════════════════════════════════════

export function isOpusMediaUri(uri: string): boolean {
  return uri.startsWith(OPUS_MEDIA_PREFIX);
}

export function opusMediaIdFromUri(uri: string): string {
  return uri.slice(OPUS_MEDIA_PREFIX.length);
}

// ═══════════════════════════════════════════════════════════
// Path helpers
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// Directory initialization
// ═══════════════════════════════════════════════════════════

/** Ensure the opus-media root directory exists */
export function ensureMediaRoot(): void {
  const root = getMediaRoot();
  if (!root.exists) {
    root.create({ intermediates: true });
  }
}

// ═══════════════════════════════════════════════════════════
// Save pipeline
// ═══════════════════════════════════════════════════════════

/**
 * Encrypt and save image + thumbnail to the filesystem.
 *
 * Pipeline:
 * 1. Generate UUID (or use provided)
 * 2. Generate random 256-bit DEK
 * 3. Encrypt image bytes with DEK (AES-256-GCM)
 * 4. Encrypt thumbnail bytes with DEK (AES-256-GCM, separate nonce)
 * 5. Wrap DEK with master key (AES-256-GCM)
 * 6. Write image.enc, thumb.enc, meta.json
 * 7. Zero DEK in memory
 * 8. Return opus-media:{uuid}
 */
export function saveMediaV2(
  imageBytes: Uint8Array,
  thumbBytes: Uint8Array | null,
  mimeType: string,
  masterKey: Uint8Array,
  width: number,
  height: number,
  mediaId?: string,
): string {
  const id = mediaId ?? uuidv4();

  ensureMediaRoot();
  const paths = getMediaPaths(id);

  // Create media directory
  if (!paths.dir.exists) {
    paths.dir.create({ intermediates: true });
  }

  // Generate per-image DEK
  const dek = generateDEK();

  // Encrypt image
  const encryptedImage = encryptMediaBytes(imageBytes, dek);
  paths.image.write(encryptedImage);

  // Encrypt thumbnail (if provided)
  const hasThumb = thumbBytes !== null && thumbBytes.length > 0;
  if (hasThumb) {
    const encryptedThumb = encryptMediaBytes(thumbBytes, dek);
    paths.thumb.write(encryptedThumb);
  }

  // Wrap DEK with master key
  const wrappedDEK = wrapDEK(dek, masterKey);

  // Zero DEK
  dek.fill(0);

  // Write metadata
  const meta: MediaMeta = {
    version: 2,
    mediaId: id,
    wrappedDEK: bytesToHex(wrappedDEK),
    mimeType,
    width,
    height,
    hasThumb,
    createdAt: new Date().toISOString(),
  };
  paths.meta.write(JSON.stringify(meta));

  return `${OPUS_MEDIA_PREFIX}${id}`;
}

// ═══════════════════════════════════════════════════════════
// Load pipeline
// ═══════════════════════════════════════════════════════════

/** Read and parse meta.json for a media item, with schema validation */
export function readMeta(mediaId: string): MediaMeta | null {
  const paths = getMediaPaths(mediaId);
  if (!paths.meta.exists) return null;
  try {
    const text = paths.meta.textSync();
    const parsed = JSON.parse(text);
    // Validate required fields to guard against corrupted or partial writes
    if (
      parsed?.version !== 2 ||
      typeof parsed?.wrappedDEK !== "string" ||
      typeof parsed?.mediaId !== "string" ||
      typeof parsed?.mimeType !== "string"
    ) {
      return null;
    }
    return parsed as MediaMeta;
  } catch {
    return null;
  }
}

/** Decrypt and return the full image bytes */
export function loadDecryptedImageV2(
  mediaId: string,
  masterKey: Uint8Array,
): Uint8Array {
  const meta = readMeta(mediaId);
  if (!meta) throw new Error(`No metadata for media ${mediaId}`);

  const paths = getMediaPaths(mediaId);
  if (!paths.image.exists) throw new Error(`No image file for media ${mediaId}`);

  const wrappedDEK = hexToBytes(meta.wrappedDEK);
  const dek = unwrapDEK(wrappedDEK, masterKey);
  const encryptedBytes = paths.image.bytesSync();
  const decrypted = decryptMediaBytes(encryptedBytes, dek);
  dek.fill(0);
  return decrypted;
}

/** Decrypt and return the thumbnail bytes */
export function loadDecryptedThumbV2(
  mediaId: string,
  masterKey: Uint8Array,
): Uint8Array {
  const meta = readMeta(mediaId);
  if (!meta) throw new Error(`No metadata for media ${mediaId}`);

  const paths = getMediaPaths(mediaId);
  if (!meta.hasThumb || !paths.thumb.exists) {
    // Fall back to full image if no thumbnail
    return loadDecryptedImageV2(mediaId, masterKey);
  }

  const wrappedDEK = hexToBytes(meta.wrappedDEK);
  const dek = unwrapDEK(wrappedDEK, masterKey);
  const encryptedBytes = paths.thumb.bytesSync();
  const decrypted = decryptMediaBytes(encryptedBytes, dek);
  dek.fill(0);
  return decrypted;
}

// ═══════════════════════════════════════════════════════════
// Delete
// ═══════════════════════════════════════════════════════════

/** Delete all files for a media item */
export function deleteMediaV2(mediaId: string): void {
  const dir = getMediaDir(mediaId);
  if (dir.exists) {
    try {
      dir.delete();
    } catch {
      // Already deleted or inaccessible — ignore
    }
  }
}

/** Delete multiple media items */
export function deleteMultipleMediaV2(mediaIds: string[]): void {
  for (const id of mediaIds) {
    deleteMediaV2(id);
  }
}

// ═══════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════

/** List all v2 media IDs on disk */
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

/** Get aggregate storage stats for v2 encrypted media */
export function getStorageStats(): { count: number; totalBytes: number } {
  const root = getMediaRoot();
  if (!root.exists) return { count: 0, totalBytes: 0 };

  const totalBytes = root.size ?? 0;
  const count = listAllMediaIds().length;
  return { count, totalBytes };
}
