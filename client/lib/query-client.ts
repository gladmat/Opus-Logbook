import Constants from "expo-constants";

function getExpoDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.experienceUrl ??
    Constants.linkingUri;

  if (!hostUri) {
    return null;
  }

  const normalized = hostUri.includes("://") ? hostUri : `http://${hostUri}`;

  try {
    return new URL(normalized).hostname;
  } catch {
    return null;
  }
}

function resolveDevApiUrl(url: string): string {
  if (
    typeof __DEV__ === "undefined" ||
    !__DEV__ ||
    !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)
  ) {
    return url;
  }

  const expoHost = getExpoDevHost();
  if (!expoHost) {
    return url;
  }

  try {
    const parsed = new URL(url);
    parsed.hostname = expoHost;
    return parsed.href.replace(/\/$/, "");
  } catch {
    return url;
  }
}

/**
 * Gets the base URL for the Express API server.
 * Uses EXPO_PUBLIC_API_URL env var if set (for local dev), otherwise defaults to production.
 */
const PRODUCTION_API_URL = "https://logbook-api.drgladysz.com";

export function getApiUrl(): string {
  // Allow override via env var for local development
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) {
    const url = resolveDevApiUrl(override.replace(/\/$/, ""));
    // Block HTTP in production builds
    if (
      typeof __DEV__ !== "undefined" &&
      !__DEV__ &&
      url.startsWith("http://")
    ) {
      console.error(
        "HTTP URLs are not allowed in production builds, falling back to production URL",
      );
      return PRODUCTION_API_URL;
    }
    return url;
  }

  // Legacy support: EXPO_PUBLIC_DOMAIN (used by Replit/Expo dev builds)
  const host = process.env.EXPO_PUBLIC_DOMAIN;
  if (host) {
    return new URL(`https://${host}`).href.replace(/\/$/, "");
  }

  return PRODUCTION_API_URL;
}
