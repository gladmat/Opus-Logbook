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
import {
  deleteMultipleMediaV2,
  hasMediaVariantV2,
  importEncryptedMediaV2,
} from "./mediaFileStorage";
import {
  downloadSharedMediaVariant,
  type SharedMediaVariant,
} from "./sharedMediaApi";

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
  if (await hasMediaVariantV2(descriptor.mediaId, local)) return false;

  const temp = new File(downloadDir(), `${descriptor.mediaId}.${variant}.enc`);
  if (temp.exists) temp.delete();

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
      masterKey: await getMasterKeyBytes(),
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
    if (temp.exists) {
      try {
        temp.delete();
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

/** Which of a case's shared photos already have a local thumbnail. */
export async function listLocalSharedThumbIds(
  descriptors: SharedMediaDescriptor[] | undefined,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const d of descriptors ?? []) {
    if (await hasMediaVariantV2(d.mediaId, "thumb")) ids.add(d.mediaId);
  }
  return ids;
}

/** Drop imported ciphertext for a share that went away (revoked / gone). */
export async function deleteImportedSharedMedia(
  descriptors: SharedMediaDescriptor[] | undefined,
): Promise<void> {
  if (!descriptors?.length) return;
  await deleteMultipleMediaV2(descriptors.map((d) => d.mediaId));
}
