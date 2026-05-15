import React, { useEffect } from "react";
import {
  View,
  ActivityIndicator,
  StyleProp,
  ImageStyle,
  ViewStyle,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { isOpusMediaUri } from "@/lib/mediaStorage";
import { useDecryptedImage } from "@/hooks/useDecryptedImage";
import { decryptCache } from "@/lib/mediaDecryptCache";
import { useTheme } from "@/hooks/useTheme";

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

  // Plain URI passthrough (e.g. file://, https://)
  return (
    <ExpoImage
      source={{ uri }}
      style={style}
      contentFit={CONTENT_FIT_MAP[resizeMode]}
      transition={150}
      onError={() => onError?.()}
      onLoad={() => onLoad?.()}
    />
  );
}

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

export function clearDecryptedCache() {
  // v2 temp-file cache
  decryptCache.clearAll();
}
