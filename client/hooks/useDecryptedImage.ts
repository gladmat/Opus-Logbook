/**
 * Decrypt-on-demand hook for v2 encrypted media.
 *
 * For opus-media: URIs: check cache → decrypt to temp file → cache → return file:/// URI
 * For encrypted-media: URIs: returns null (signals EncryptedImage to use v1 path)
 * For plain URIs: pass through
 */

import { useState, useEffect, useRef } from "react";
import {
  isOpusMediaUri,
  opusMediaIdFromUri,
  loadDecryptedImageV2,
  loadDecryptedThumbV2,
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

    // Check cache first (synchronous)
    const cached = decryptCache.getCached(mediaId, variant);
    if (cached) {
      setUri(cached);
      setLoading(false);
      setError(false);
      return;
    }

    // Need to decrypt
    setLoading(true);
    setUri(null);
    setError(false);

    enqueue(async () => {
      const masterKey = await getMasterKeyBytes();
      const meta = readMeta(mediaId);
      const mimeType = meta?.mimeType ?? "image/jpeg";

      const bytes = thumbnail
        ? loadDecryptedThumbV2(mediaId, masterKey)
        : loadDecryptedImageV2(mediaId, masterKey);

      const fileUri = decryptCache.put(mediaId, variant, bytes, mimeType);
      return fileUri;
    })
      .then((fileUri) => {
        if (!mountedRef.current) return;
        setUri(fileUri);
        setLoading(false);
      })
      .catch((e) => {
        console.error("useDecryptedImage failed:", e);
        if (!mountedRef.current) return;
        setError(true);
        setLoading(false);
      });
  }, [mediaUri, thumbnail]);

  return { uri, loading, error };
}
