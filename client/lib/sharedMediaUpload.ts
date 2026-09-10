/**
 * sharedMediaUpload — owner side of encrypted photo sharing (2.25.0).
 *
 * After a share POST/PUT succeeds, reconcile what the server holds for the
 * case against the case's current photos: upload every missing
 * (mediaId, variant) ciphertext straight from the owner's `opus-media`
 * store, and delete server copies of photos no longer on the case. The
 * server list is the source of truth (survives reinstall); a local
 * uploaded-set is kept as the offline fallback so a flaky list call
 * doesn't force re-uploading everything.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SharedMediaDescriptor } from "@/types/sharing";
import { userScopedAsyncKey } from "./activeUser";
import { getMediaPaths } from "./mediaFileStorage";
import {
  deleteSharedMedia,
  listUploadedSharedMedia,
  uploadSharedMediaVariant,
  type SharedMediaVariant,
} from "./sharedMediaApi";

export interface SharedMediaUploadFailure {
  mediaId: string;
  variant: SharedMediaVariant;
  message: string;
}

export interface UploadCaseMediaResult {
  uploaded: number;
  /** (mediaId, variant) pairs already on the server — skipped. */
  alreadyPresent: number;
  failed: SharedMediaUploadFailure[];
  /** Server photos removed because they are no longer on the case. */
  deleted: number;
}

const UPLOAD_CONCURRENCY = 2;

function uploadedSetKey(caseId: string): string {
  return userScopedAsyncKey(`@opus_shared_media_uploaded_${caseId}`);
}

function pairKey(mediaId: string, variant: SharedMediaVariant): string {
  return `${mediaId}:${variant}`;
}

async function readUploadedSet(caseId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(uploadedSetKey(caseId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    return new Set();
  }
}

async function writeUploadedSet(
  caseId: string,
  set: Set<string>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      uploadedSetKey(caseId),
      JSON.stringify([...set]),
    );
  } catch {
    // Best-effort cache.
  }
}

/** Every (mediaId, variant) the descriptors say should exist server-side. */
export function planSharedMediaUploads(
  descriptors: SharedMediaDescriptor[],
  present: Set<string>,
): { mediaId: string; variant: SharedMediaVariant; authTag: string }[] {
  const tasks: {
    mediaId: string;
    variant: SharedMediaVariant;
    authTag: string;
  }[] = [];
  for (const d of descriptors) {
    if (d.thumb && !present.has(pairKey(d.mediaId, "thumb"))) {
      tasks.push({
        mediaId: d.mediaId,
        variant: "thumb",
        authTag: d.thumb.tag,
      });
    }
    if (!present.has(pairKey(d.mediaId, "image"))) {
      tasks.push({
        mediaId: d.mediaId,
        variant: "image",
        authTag: d.image.tag,
      });
    }
  }
  return tasks;
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next++]!;
        await worker(item);
      }
    },
  );
  await Promise.all(runners);
}

export async function uploadCaseMediaForShare(params: {
  caseId: string;
  descriptors: SharedMediaDescriptor[];
}): Promise<UploadCaseMediaResult> {
  const { caseId, descriptors } = params;
  const result: UploadCaseMediaResult = {
    uploaded: 0,
    alreadyPresent: 0,
    failed: [],
    deleted: 0,
  };

  // What is already there: server truth, local set as the offline fallback.
  const localSet = await readUploadedSet(caseId);
  let present: Set<string>;
  let serverMediaIds: Set<string> | null = null;
  try {
    const server = await listUploadedSharedMedia(caseId);
    present = new Set(server.map((e) => pairKey(e.mediaId, e.variant)));
    serverMediaIds = new Set(server.map((e) => e.mediaId));
  } catch {
    present = localSet;
  }

  const tasks = planSharedMediaUploads(descriptors, present);
  result.alreadyPresent =
    descriptors.reduce((n, d) => n + (d.thumb ? 2 : 1), 0) - tasks.length;

  await runWithConcurrency(tasks, UPLOAD_CONCURRENCY, async (task) => {
    const paths = getMediaPaths(task.mediaId);
    const file = task.variant === "thumb" ? paths.thumb : paths.image;
    try {
      if (!file.exists) {
        throw new Error("Encrypted photo file is missing on this device");
      }
      await uploadSharedMediaVariant(
        caseId,
        task.mediaId,
        task.variant,
        file.uri,
        task.authTag,
      );
      result.uploaded += 1;
      localSet.add(pairKey(task.mediaId, task.variant));
    } catch (error) {
      result.failed.push({
        mediaId: task.mediaId,
        variant: task.variant,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Photos removed from the case lose their server copy.
  if (serverMediaIds) {
    const current = new Set(descriptors.map((d) => d.mediaId));
    for (const mediaId of serverMediaIds) {
      if (current.has(mediaId)) continue;
      try {
        await deleteSharedMedia(caseId, mediaId);
        result.deleted += 1;
        localSet.delete(pairKey(mediaId, "thumb"));
        localSet.delete(pairKey(mediaId, "image"));
      } catch {
        // Best-effort; the next save retries.
      }
    }
  }

  await writeUploadedSet(caseId, localSet);
  return result;
}
