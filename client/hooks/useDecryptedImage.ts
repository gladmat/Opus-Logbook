/**
 * Decrypt-on-demand hook for encrypted media.
 *
 * For opus-media: URIs: check cache → decrypt to temp file → cache → return file:/// URI
 * For plain URIs: pass through (returns null)
 */

import { useState, useEffect, useRef } from "react";
import {
  isOpusMediaUri,
  opusMediaIdFromUri,
  decryptMediaVariantToFile,
  readMeta,
} from "@/lib/mediaFileStorage";
import { getMasterKeyBytes } from "@/lib/encryption";
import { decryptCache } from "@/lib/mediaDecryptCache";

// ═══════════════════════════════════════════════════════════
// Concurrency queue (max 3 parallel decryptions)
// ═══════════════════════════════════════════════════════════

const MAX_CONCURRENT = 2;
let active = 0;
const queue: { run: () => void }[] = [];

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active++;
      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          active--;
          const next = queue.shift();
          if (next) next.run();
        });
    };

    if (active < MAX_CONCURRENT) {
      run();
    } else {
      queue.push({ run });
    }
  });
}

// ═══════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════

export interface DecryptedImageResult {
  uri: string | null;
  loading: boolean;
  error: boolean;
}

export function useDecryptedImage(
  mediaUri: string,
  thumbnail: boolean = false,
): DecryptedImageResult {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Not a v2 URI — signal caller to handle differently
    if (!isOpusMediaUri(mediaUri)) {
      setUri(null);
      setLoading(false);
      setError(false);
      return;
    }

    const mediaId = opusMediaIdFromUri(mediaUri);
    const variant = thumbnail ? ("thumb" as const) : ("full" as const);

    // Pin the entry for the life of this hook instance. Without this,
    // fast-scrolling a large gallery can trigger the LRU eviction path
    // mid-render — the decrypted file gets deleted while expo-image is
    // still loading it. The pin balances to unpin in the cleanup below
    // regardless of success, failure, or unmount-mid-decrypt.
    decryptCache.pin(mediaId, variant);
    let unpinned = false;
    const doUnpin = () => {
      if (unpinned) return;
      unpinned = true;
      decryptCache.unpin(mediaId, variant);
    };

    // Check cache first (synchronous)
    const cached = decryptCache.getCached(mediaId, variant);
    if (cached) {
      setUri(cached);
      setLoading(false);
      setError(false);
      return doUnpin;
    }

    // Need to decrypt
    setLoading(true);
    setUri(null);
    setError(false);

    enqueue(async () => {
      const masterKey = await getMasterKeyBytes();
      const meta = await readMeta(mediaId);
      const mimeType = meta?.mimeType ?? "image/jpeg";
      return decryptCache.materialize(
        mediaId,
        variant,
        mimeType,
        async (destPath) => {
          await decryptMediaVariantToFile(
            mediaId,
            masterKey,
            variant,
            destPath,
          );
        },
      );
    })
      .then((fileUri) => {
        if (!mountedRef.current) {
          doUnpin();
          return;
        }
        setUri(fileUri);
        setLoading(false);
      })
      .catch((e) => {
        console.error("useDecryptedImage failed:", e);
        if (!mountedRef.current) {
          doUnpin();
          return;
        }
        setError(true);
        setLoading(false);
      });

    return doUnpin;
  }, [mediaUri, thumbnail]);

  return { uri, loading, error };
}
