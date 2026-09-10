/**
 * sharedMediaDescriptors — turn the owner's on-device encrypted media into
 * the key-bearing descriptors that ride inside the E2EE share blob.
 *
 * For every `opus-media:` item on the case: read its plaintext meta.json,
 * unwrap the per-image DEK under the owner's master key, and emit the DEK
 * as hex alongside the nonce/tag/size for each variant. The ciphertext
 * files themselves are uploaded verbatim by `sharedMediaUpload`; recipients
 * re-wrap the DEK under THEIR master key on import, so nothing is ever
 * decrypted to plaintext on either side or on the server.
 */

import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import type { OperativeMediaItem } from "@/types/case";
import type { SharedMediaDescriptor } from "@/types/sharing";
import {
  isOpusMediaUri,
  opusMediaIdFromUri,
  readMeta,
} from "./mediaFileStorage";
import { unwrapDek } from "./mediaEncryption";

export interface BuildSharedMediaDescriptorsResult {
  descriptors: SharedMediaDescriptor[];
  /** Items still on a plain `file://` URI (pre-v2 storage) — not shareable. */
  skippedUnencrypted: number;
  /** Items whose meta.json was missing/invalid or whose DEK failed to unwrap. */
  skippedUnreadable: number;
}

export async function buildSharedMediaDescriptors(
  operativeMedia: OperativeMediaItem[] | undefined,
  masterKey: Uint8Array,
): Promise<BuildSharedMediaDescriptorsResult> {
  const result: BuildSharedMediaDescriptorsResult = {
    descriptors: [],
    skippedUnencrypted: 0,
    skippedUnreadable: 0,
  };
  if (!operativeMedia?.length) return result;

  for (const item of operativeMedia) {
    if (!isOpusMediaUri(item.localUri)) {
      result.skippedUnencrypted += 1;
      continue;
    }
    const mediaId = opusMediaIdFromUri(item.localUri);
    const meta = await readMeta(mediaId);
    if (!meta) {
      result.skippedUnreadable += 1;
      continue;
    }

    let dek: Uint8Array | null = null;
    try {
      dek = await unwrapDek(hexToBytes(meta.wrappedDEK), masterKey);
      result.descriptors.push({
        mediaId,
        dekHex: bytesToHex(dek),
        mimeType: meta.mimeType,
        width: meta.width,
        height: meta.height,
        image: {
          nonce: meta.originalNonce,
          tag: meta.originalTag,
          size: meta.originalSize,
          ciphertextSize: meta.originalCiphertextSize,
        },
        thumb:
          meta.hasThumb &&
          meta.thumbNonce &&
          meta.thumbTag &&
          meta.thumbSize != null &&
          meta.thumbCiphertextSize != null
            ? {
                nonce: meta.thumbNonce,
                tag: meta.thumbTag,
                size: meta.thumbSize,
                ciphertextSize: meta.thumbCiphertextSize,
              }
            : null,
        ...(item.tag ? { tag: item.tag } : {}),
        ...(item.caption ? { caption: item.caption } : {}),
        ...(item.timestamp ? { timestamp: item.timestamp } : {}),
        createdAt: meta.createdAt,
        ...(item.enhanced ? { enhanced: true } : {}),
      });
    } catch {
      result.skippedUnreadable += 1;
    } finally {
      dek?.fill(0);
    }
  }

  return result;
}
