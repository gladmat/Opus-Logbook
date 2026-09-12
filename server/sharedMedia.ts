/**
 * sharedMedia — DB-free helpers for the encrypted shared-case media store.
 *
 * Owners upload the SAME AES-256-GCM ciphertext files that sit in their
 * on-device `opus-media` store (`image.enc` / `thumb.enc`); the per-image
 * key rides inside the end-to-end-encrypted share blob, so the server only
 * ever handles opaque bytes. This module owns path safety, size-capped
 * streaming to disk, and cleanup — kept free of Express/DB so it can be
 * unit-tested directly.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes } from "node:crypto";
import type { Readable } from "node:stream";

export const SHARED_MEDIA_VARIANTS = ["thumb", "image"] as const;
export type SharedMediaVariant = (typeof SHARED_MEDIA_VARIANTS)[number];

/** Case ids and media ids are client-minted uuids; user ids are server
 *  uuids. One conservative alphabet covers all three and rules out every
 *  path-traversal character. */
export const SHARED_MEDIA_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
/** Lowercase-hex AES-GCM auth tag (16 bytes). */
export const AUTH_TAG_RE = /^[0-9a-f]{32}$/;

export const SHARED_MEDIA_MAX_BYTES: Record<SharedMediaVariant, number> = {
  thumb: 512 * 1024,
  image: 12 * 1024 * 1024,
};

export function isSharedMediaVariant(
  value: unknown,
): value is SharedMediaVariant {
  return (
    typeof value === "string" &&
    (SHARED_MEDIA_VARIANTS as readonly string[]).includes(value)
  );
}

function isSafeId(value: string): boolean {
  return SHARED_MEDIA_ID_RE.test(value);
}

function assertInside(root: string, candidate: string): string | null {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (
    resolved !== resolvedRoot &&
    !resolved.startsWith(resolvedRoot + path.sep)
  ) {
    return null;
  }
  return resolved;
}

export function sharedMediaOwnerDir(
  root: string,
  ownerUserId: string,
): string | null {
  if (!isSafeId(ownerUserId)) return null;
  return assertInside(root, path.join(root, ownerUserId));
}

export function sharedMediaCaseDir(
  root: string,
  ownerUserId: string,
  caseId: string,
): string | null {
  if (!isSafeId(ownerUserId) || !isSafeId(caseId)) return null;
  return assertInside(root, path.join(root, ownerUserId, caseId));
}

/**
 * Absolute on-disk path for one ciphertext variant, or null when any
 * segment fails validation or the resolved path escapes `root`.
 */
export function sharedMediaPath(
  root: string,
  ownerUserId: string,
  caseId: string,
  mediaId: string,
  variant: SharedMediaVariant,
): string | null {
  if (!isSafeId(ownerUserId) || !isSafeId(caseId) || !isSafeId(mediaId)) {
    return null;
  }
  if (!isSharedMediaVariant(variant)) return null;
  return assertInside(
    root,
    path.join(root, ownerUserId, caseId, `${mediaId}.${variant}.enc`),
  );
}

export class BodyTooLargeError extends Error {
  readonly maxBytes: number;
  constructor(maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes`);
    this.name = "BodyTooLargeError";
    this.maxBytes = maxBytes;
  }
}

/**
 * Stream a request body straight to `destPath`, never buffering the whole
 * payload in memory. Writes to a sibling temp file and renames on success
 * so a partially uploaded ciphertext can never be served. Past `maxBytes`
 * the source is destroyed, the temp file removed, and the promise rejects
 * with `BodyTooLargeError` (→ 413).
 */
export function streamBodyToFile(
  source: Readable,
  destPath: string,
  maxBytes: number,
): Promise<number> {
  const tempPath = `${destPath}.part-${randomBytes(6).toString("hex")}`;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  return new Promise<number>((resolve, reject) => {
    let received = 0;
    let settled = false;
    const out = fs.createWriteStream(tempPath, { flags: "wx" });

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      source.unpipe(out);
      out.destroy();
      // Reject only once the partial file is gone: callers (and the tests)
      // treat rejection as "nothing was left on disk", and a fire-and-forget
      // unlink raced that expectation under load.
      fs.promises
        .unlink(tempPath)
        .catch(() => {})
        .finally(() => reject(error));
    };

    source.on("data", (chunk: Buffer | string) => {
      received +=
        typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
      if (received > maxBytes) {
        const error = new BodyTooLargeError(maxBytes);
        // Stop reading — the client keeps sending, so tear the socket down.
        source.destroy(error);
        fail(error);
      }
    });
    source.on("error", fail);
    out.on("error", fail);
    out.on("finish", () => {
      if (settled) return;
      settled = true;
      fs.promises
        .rename(tempPath, destPath)
        .then(() => resolve(received))
        .catch((error: Error) => {
          fs.promises
            .unlink(tempPath)
            .catch(() => {})
            .finally(() => reject(error));
        });
    });

    source.pipe(out);
  });
}

export async function removeCaseMediaDir(
  root: string,
  ownerUserId: string,
  caseId: string,
): Promise<void> {
  const dir = sharedMediaCaseDir(root, ownerUserId, caseId);
  if (!dir) return;
  await fs.promises.rm(dir, { recursive: true, force: true });
}

export async function removeOwnerMediaDir(
  root: string,
  ownerUserId: string,
): Promise<void> {
  const dir = sharedMediaOwnerDir(root, ownerUserId);
  if (!dir) return;
  await fs.promises.rm(dir, { recursive: true, force: true });
}

export async function removeMediaFiles(
  root: string,
  ownerUserId: string,
  caseId: string,
  mediaId: string,
): Promise<void> {
  for (const variant of SHARED_MEDIA_VARIANTS) {
    const file = sharedMediaPath(root, ownerUserId, caseId, mediaId, variant);
    if (!file) continue;
    await fs.promises.rm(file, { force: true });
  }
}

/**
 * Who the requester is on a share row. Owners and the named recipient may
 * download; nobody else. Pure so the authZ matrix is unit-testable without
 * a database.
 */
export function resolveSharedMediaAccess(
  row: { ownerUserId: string; recipientUserId: string },
  requesterId: string,
): "owner" | "recipient" | null {
  if (row.ownerUserId === requesterId) return "owner";
  if (row.recipientUserId === requesterId) return "recipient";
  return null;
}
