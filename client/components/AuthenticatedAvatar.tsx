/**
 * `<AuthenticatedAvatar>` — an `<Image>` that sends the current JWT as an
 * `Authorization: Bearer` header when fetching the source URL. The server's
 * `/uploads/avatars/*` route requires a valid token, so plain `<Image uri />`
 * would 401; this component wires the token into the native image loader.
 *
 * Used for rendering surgeon profile avatars. For unauthenticated URLs (or
 * before the auth token loads), falls back to rendering nothing — callers
 * should show a placeholder icon when `profilePictureUrl` is missing rather
 * than relying on this component to render one.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { authenticatedImageSource } from "@/lib/auth";

interface AuthenticatedAvatarProps {
  url: string;
  size: number;
  style?: StyleProp<ImageStyle>;
}

export function AuthenticatedAvatar({
  url,
  size,
  style,
}: AuthenticatedAvatarProps) {
  const [source, setSource] = useState<{
    uri: string;
    headers?: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    authenticatedImageSource(url).then((src) => {
      if (!cancelled) setSource(src);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const imageStyle = useMemo(
    () => [{ width: size, height: size, borderRadius: size / 2 }, style],
    [size, style],
  );

  if (!source) return null;
  return <Image source={source} style={imageStyle} />;
}
