import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "./env";

/**
 * Single source of truth for where the server keeps files on disk.
 *
 * Before 2.25.0 avatars were written to `process.cwd()/uploads`, which on
 * Railway is the ephemeral container filesystem — every redeploy silently
 * dropped them. `UPLOADS_DIR` lets the deploy point all file storage at a
 * persistent volume mount; the default keeps local dev unchanged.
 */
export const resolvedUploadsDir = path.resolve(
  process.cwd(),
  env.UPLOADS_DIR ?? "uploads",
);

/** Surgeon headshots — `POST /api/profile/picture`. */
export const avatarsDir = path.join(resolvedUploadsDir, "avatars");

/**
 * Encrypted shared-case media ciphertext:
 * `{sharedMediaRoot}/{ownerUserId}/{caseId}/{mediaId}.{thumb|image}.enc`.
 * The server never holds the key — it lives inside the E2EE share blob.
 */
export const sharedMediaRoot = path.join(resolvedUploadsDir, "shared-media");

for (const dir of [resolvedUploadsDir, avatarsDir, sharedMediaRoot]) {
  fs.mkdirSync(dir, { recursive: true });
}
