import React, { useState, useEffect, useRef } from "react";
import {
  Image,
  View,
  ActivityIndicator,
  StyleProp,
  ImageStyle,
  ViewStyle,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import {
  loadEncryptedMedia,
  loadThumbnail,
  generateAndSaveThumbnail,
  isEncryptedMediaUri,
  isOpusMediaUri,
} from "@/lib/mediaStorage";
import { useDecryptedImage } from "@/hooks/useDecryptedImage";
import { decryptCache } from "@/lib/mediaDecryptCache";
import { useTheme } from "@/hooks/useTheme";

const MAX_CACHE_ENTRIES = 80;
const decryptedCache = new Map<string, string>();
const cacheOrder: string[] = [];

function cacheSet(key: string, value: string) {
  if (decryptedCache.has(key)) {
    const idx = cacheOrder.indexOf(key);
    if (idx !== -1) cacheOrder.splice(idx, 1);
  }
  decryptedCache.set(key, value);
  cacheOrder.push(key);
  while (cacheOrder.length > MAX_CACHE_ENTRIES) {
    const oldest = cacheOrder.shift();
    if (oldest) decryptedCache.delete(oldest);
  }
}

// Concurrency-limited decryption queue to avoid saturating the JS thread
const MAX_CONCURRENT = 2;
let activeDecryptions = 0;
const decryptionQueue: {
  uri: string;
  resolve: (result: string | null) => void;
}[] = [];

function processQueue() {
  while (activeDecryptions < MAX_CONCURRENT && decryptionQueue.length > 0) {
    const job = decryptionQueue.shift()!;
    activeDecryptions++;
    loadEncryptedMedia(job.uri)
      .then((result) => job.resolve(result))
      .catch(() => job.resolve(null))
      .finally(() => {
        activeDecryptions--;
        processQueue();
      });
  }
}

function queueDecryption(uri: string): Promise<string | null> {
  return new Promise((resolve) => {
    decryptionQueue.push({ uri, resolve });
    processQueue();
  });
}

// ═══════════════════════════════════════════════════════════
// contentFit mapping for expo-image
// ═══════════════════════════════════════════════════════════

const CONTENT_FIT_MAP = {
  cover: "cover",
  contain: "contain",
  stretch: "fill",
  center: "none",
} as const;

// ═══════════════════════════════════════════════════════════
// v2 renderer (expo-image + file:// URIs)
// ═══════════════════════════════════════════════════════════

function EncryptedImageV2({
  uri,
  style,
  placeholderStyle,
  resizeMode = "cover",
  thumbnail = false,
  onError,
  onLoad,
}: EncryptedImageProps) {
  const { theme } = useTheme();
  const { uri: fileUri, loading, error } = useDecryptedImage(uri, thumbnail);

  useEffect(() => {
    if (error) onError?.();
  }, [error, onError]);

  if (loading) {
    return (
      <View
        style={[
          style,
          placeholderStyle,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.backgroundDefault,
          },
        ]}
      >
        <ActivityIndicator size="small" color={theme.textSecondary} />
      </View>
    );
  }

  if (!fileUri) return null;

  return (
    <ExpoImage
      source={{ uri: fileUri }}
      style={style}
      contentFit={CONTENT_FIT_MAP[resizeMode]}
      transition={150}
      onError={() => onError?.()}
      onLoad={() => onLoad?.()}
    />
  );
}

// ═══════════════════════════════════════════════════════════
// Props + main component
// ═══════════════════════════════════════════════════════════

interface EncryptedImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  thumbnail?: boolean;
  onError?: () => void;
  onLoad?: () => void;
}

export function EncryptedImage({
  uri,
  style,
  placeholderStyle,
  resizeMode = "cover",
  thumbnail = false,
  onError,
  onLoad,
}: EncryptedImageProps) {
  // v2: opus-media:{uuid} — file-based AES-256-GCM
  if (isOpusMediaUri(uri)) {
    return (
      <EncryptedImageV2
        uri={uri}
        style={style}
        placeholderStyle={placeholderStyle}
        resizeMode={resizeMode}
        thumbnail={thumbnail}
        onError={onError}
        onLoad={onLoad}
      />
    );
  }

  // v1 path below (unchanged)
  return (
    <EncryptedImageV1
      uri={uri}
      style={style}
      placeholderStyle={placeholderStyle}
      resizeMode={resizeMode}
      thumbnail={thumbnail}
      onError={onError}
      onLoad={onLoad}
    />
  );
}

function EncryptedImageV1({
  uri,
  style,
  placeholderStyle,
  resizeMode = "cover",
  thumbnail = false,
  onError,
  onLoad,
}: EncryptedImageProps) {
  const { theme } = useTheme();
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isEncryptedMediaUri(uri)) {
      setDataUri(uri);
      setLoading(false);
      return;
    }

    // Check in-memory cache first (works for both thumbnail and full mode)
    const cacheKey = thumbnail ? `thumb:${uri}` : uri;
    const cached = decryptedCache.get(cacheKey);
    if (cached) {
      setDataUri(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setDataUri(null);

    if (thumbnail) {
      // Thumbnail mode: try unencrypted thumbnail first (instant)
      loadThumbnail(uri)
        .then((thumbDataUri) => {
          if (!mountedRef.current) return;
          if (thumbDataUri) {
            cacheSet(cacheKey, thumbDataUri);
            setDataUri(thumbDataUri);
            setLoading(false);
            return;
          }
          // No thumbnail yet — fall back to full decrypt, then lazily generate thumbnail
          return queueDecryption(uri).then((result) => {
            if (!mountedRef.current) return;
            if (result) {
              cacheSet(cacheKey, result);
              setDataUri(result);
              // Lazily generate thumbnail for next time
              generateAndSaveThumbnail(uri, result).catch(() => {});
            } else {
              onError?.();
            }
          });
        })
        .catch(() => {
          if (mountedRef.current) onError?.();
        })
        .finally(() => {
          if (mountedRef.current) setLoading(false);
        });
    } else {
      // Full image mode: decrypt as before
      queueDecryption(uri)
        .then((result) => {
          if (!mountedRef.current) return;
          if (result) {
            cacheSet(cacheKey, result);
            setDataUri(result);
          } else {
            onError?.();
          }
        })
        .catch(() => {
          if (mountedRef.current) onError?.();
        })
        .finally(() => {
          if (mountedRef.current) setLoading(false);
        });
    }
  }, [uri, thumbnail, onError]);

  if (loading) {
    return (
      <View
        style={[
          style,
          placeholderStyle,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.backgroundDefault,
          },
        ]}
      >
        <ActivityIndicator size="small" color={theme.textSecondary} />
      </View>
    );
  }

  if (!dataUri) return null;

  return (
    <Image
      source={{ uri: dataUri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => onError?.()}
      onLoad={() => onLoad?.()}
    />
  );
}

export function clearDecryptedCache() {
  // v1 in-memory cache
  decryptedCache.clear();
  cacheOrder.length = 0;
  // v2 temp-file cache
  decryptCache.clearAll();
}
