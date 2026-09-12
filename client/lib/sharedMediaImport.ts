/**
 * sharedMediaImport — recipient side of encrypted photo sharing (2.25.0).
 *
 * Download the owner's ciphertext for one variant into a cache temp file,
 * then hand it to `importEncryptedMediaV2`, which moves it into the local
 * `opus-media` store and re-wraps the per-image key (from the decrypted
 * share blob) under THIS user's master key. From then on the photo is an
 * ordinary `opus-media:{id}` that `EncryptedImage` renders unchanged.
 *
 * Thumbnails are imported eagerly during sync; the full-resolution variant
 * is fetched the first time the full-screen viewer opens.
 */

import { Directory, File, Paths } from "expo-file-system";
import type { SharedMediaDescriptor } from "@/types/sharing";
import { getMasterKeyBytes } from "./encryption";
import { registerUserCache } from "./userCacheRegistry";

import {
  canUnwrapMediaKey,
  deleteMultipleMediaV2,
  hasMediaVariantV2,
  importEncryptedMediaV2,
} from "./mediaFileStorage";
import {
  downloadSharedMediaVariant,
  type SharedMediaVariant,
} from "./sharedMediaApi";

// mediaIds whose thumbnail ciphertext is imported AND unwrappable under the
// current master key. Only POSITIVE results are cached: a missing thumb may
// be imported a moment later, but a present + unwrappable one stays so
// until it is deleted here. Every dashboard focus used to re-run a
// sequential DEK unwrap + file stat per shared photo.
const localThumbPresence = new Set<string>();

/** Drop the thumb-presence cache (tests + purge registry). */
export function clearLocalSharedThumbCache(): void {
  localThumbPresence.clear();
}

registerUserCache(clearLocalSharedThumbCache);

const DOWNLOAD_DIR_NAME = "opus-shared-dl";
const IMPORT_CONCURRENCY = 2;

function downloadDir(): Directory {
  const dir = new Directory(Paths.cache, DOWNLOAD_DIR_NAME);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

/**
 * Ensure one variant of a shared photo is present locally. Returns true when
 * a download + import happened, false when it was already there (or the
 * descriptor has no thumbnail to fetch).
 */
export async function ensureSharedMediaVariant(
  sharedCaseId: string,
  descriptor: SharedMediaDescriptor,
  variant: SharedMediaVariant,
): Promise<boolean> {
  if (variant === "thumb" && !descriptor.thumb) return false;
  const local = variant === "thumb" ? "thumb" : "full";
  const masterKey = await getMasterKeyBytes();
  // Present AND readable under our key → nothing to do. Present but keyed
  // to another account (shared device) or a stale partial import → fall
  // through; the import decides whether re-keying is safe.
  if (
    (await hasMediaVariantV2(descriptor.mediaId, local)) &&
    (await canUnwrapMediaKey(descriptor.mediaId, masterKey))
  ) {
    return false;
  }

  const temp = new File(downloadDir(), `${descriptor.mediaId}.${variant}.enc`);
  if (temp.exists) temp.delete();
  // `File.move` (used by the import) rewrites the SAME object's `uri` to
  // the destination, so cleanup must go by the original temp path — not
  // via `temp.exists`, which would then point at the imported file.
  const tempUri = temp.uri;

  try {
    const downloaded = await downloadSharedMediaVariant(
      sharedCaseId,
      descriptor.mediaId,
      variant,
      temp,
    );
    const expected =
      variant === "thumb"
        ? descriptor.thumb!.ciphertextSize
        : descriptor.image.ciphertextSize;
    if (downloaded.size !== expected) {
      throw new Error(
        `Shared photo size mismatch (${downloaded.size} vs ${expected})`,
      );
    }
    await importEncryptedMediaV2({
      mediaId: descriptor.mediaId,
      masterKey,
      dekHex: descriptor.dekHex,
      mimeType: descriptor.mimeType,
      width: descriptor.width,
      height: descriptor.height,
      image: descriptor.image,
      thumb: descriptor.thumb,
      createdAt: descriptor.createdAt,
      sources:
        variant === "thumb" ? { thumb: downloaded } : { image: downloaded },
    });
    return true;
  } finally {
    const leftover = new File(tempUri);
    if (leftover.exists) {
      try {
        leftover.delete();
      } catch {
        // Best-effort temp cleanup.
      }
    }
  }
}

export interface ImportSharedThumbsResult {
  imported: number;
  failed: { mediaId: string; message: string }[];
}

/** Eager thumbnail import for a whole case (sync path). */
export async function importSharedThumbs(
  sharedCaseId: string,
  descriptors: SharedMediaDescriptor[],
): Promise<ImportSharedThumbsResult> {
  const result: ImportSharedThumbsResult = { imported: 0, failed: [] };
  let next = 0;
  const runners = Array.from(
    { length: Math.min(IMPORT_CONCURRENCY, descriptors.length) },
    async () => {
      while (next < descriptors.length) {
        const d = descriptors[next++]!;
        try {
          if (await ensureSharedMediaVariant(sharedCaseId, d, "thumb")) {
            result.imported += 1;
          }
        } catch (error) {
          result.failed.push({
            mediaId: d.mediaId,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    },
  );
  await Promise.all(runners);
  return result;
}

/**
 * Which of a case's shared photos already have a local thumbnail THAT THIS
 * ACCOUNT CAN OPEN. On a device shared by owner and recipient the owner's
 * copy exists but is keyed to them — offering it as a card thumbnail would
 * render an error tile, so it is excluded.
 */
export async function listLocalSharedThumbIds(
  descriptors: SharedMediaDescriptor[] | undefined,
): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!descriptors?.length) return ids;
  const unknown = descriptors.filter((d) => {
    if (localThumbPresence.has(d.mediaId)) {
      ids.add(d.mediaId);
      return false;
    }
    return true;
  });
  if (unknown.length === 0) return ids;
  const masterKey = await getMasterKeyBytes();
  for (const d of unknown) {
    if (
      (await hasMediaVariantV2(d.mediaId, "thumb")) &&
      (await canUnwrapMediaKey(d.mediaId, masterKey))
    ) {
      ids.add(d.mediaId);
      localThumbPresence.add(d.mediaId);
    }
  }
  return ids;
}

/** Drop imported ciphertext for a share that went away (revoked / gone). */
export async function deleteImportedSharedMedia(
  descriptors: SharedMediaDescriptor[] | undefined,
): Promise<void> {
  if (!descriptors?.length) return;
  for (const d of descriptors) localThumbPresence.delete(d.mediaId);
  await deleteMultipleMediaV2(descriptors.map((d) => d.mediaId));
}
