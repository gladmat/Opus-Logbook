import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./query-client";
import type { SurgicalPreferences } from "@/types/surgicalPreferences";
import type { ProfessionalRegistrations } from "@shared/professionalRegistrations";

const AUTH_TOKEN_KEY = "surgical_logbook_auth_token";

export interface AuthUser {
  id: string;
  email: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  sex: string | null;
  profilePictureUrl: string | null;
  countryOfPractice: string | null;
  medicalCouncilNumber: string | null;
  professionalRegistrations?: ProfessionalRegistrations;
  verificationStatus: string;
  careerStage: string | null;
  surgicalPreferences?: SurgicalPreferences;
  onboardingComplete: boolean;
}

export interface UserFacility {
  id: string;
  userId: string;
  facilityName: string;
  facilityId?: string; // Reference to master facility list (optional for backwards compatibility)
  isPrimary: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  profile?: UserProfile;
  facilities?: UserFacility[];
  onboardingComplete?: boolean;
}

// Use SecureStore for native platforms (encrypted), AsyncStorage fallback for web
export async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      // Web platform: use AsyncStorage (no SecureStore available)
      return await AsyncStorage.getItem(`@${AUTH_TOKEN_KEY}`);
    }
    // Native platforms: use SecureStore for encrypted storage
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    // Web platform: use AsyncStorage
    await AsyncStorage.setItem(`@${AUTH_TOKEN_KEY}`, token);
  } else {
    // Native platforms: use SecureStore for encrypted storage
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  }
}

export async function clearAuthToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(`@${AUTH_TOKEN_KEY}`);
  } else {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  }
}

// Session-expired event bus — AuthContext subscribes to clear user state
// when a JWT can no longer be refreshed.
type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function subscribeSessionExpired(
  listener: SessionExpiredListener,
): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

function emitSessionExpired(): void {
  for (const listener of sessionExpiredListeners) {
    try {
      listener();
    } catch (error) {
      console.warn("sessionExpired listener threw:", error);
    }
  }
}

interface AuthFetchOptions {
  // Auth endpoints (login/signup/refresh) must opt out so a stale token from
  // a previous session doesn't trigger a spurious "session expired" flow.
  autoRefresh?: boolean;
}

async function authFetch(
  path: string,
  options: RequestInit = {},
  authOpts: AuthFetchOptions = {},
): Promise<Response> {
  const autoRefresh = authOpts.autoRefresh !== false;
  const baseUrl = getApiUrl();
  const token = await getAuthToken();

  const res = await fetch(new URL(path, baseUrl).href, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (autoRefresh && token && (res.status === 401 || res.status === 403)) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return authFetch(path, options, { autoRefresh: false });
    }
    await clearAuthToken();
    emitSessionExpired();
    return new Response(
      JSON.stringify({
        error: "Your session has expired. Please log in again.",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return res;
}

export async function signup(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await authFetch(
    "/api/auth/signup",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    { autoRefresh: false },
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create account");
  }

  const data: AuthResponse = await res.json();
  await setAuthToken(data.token);
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await authFetch(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    { autoRefresh: false },
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Invalid email or password");
  }

  const data: AuthResponse = await res.json();
  await setAuthToken(data.token);
  return data;
}

export async function appleSignIn(
  identityToken: string,
  fullName?: { givenName?: string; familyName?: string } | null,
  email?: string | null,
): Promise<AuthResponse> {
  const res = await authFetch(
    "/api/auth/apple",
    {
      method: "POST",
      body: JSON.stringify({ identityToken, fullName, email }),
    },
    { autoRefresh: false },
  );

  if (!res.ok) {
    let message = "Apple Sign In failed";
    try {
      const error = await res.json();
      message = error.detail || error.error || message;
    } catch {
      // Server returned non-JSON (e.g. HTML 404) — use default message
    }
    throw new Error(message);
  }

  const data: AuthResponse = await res.json();
  await setAuthToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<AuthResponse | null> {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const res = await authFetch("/api/auth/me");
    if (res.status === 401 || res.status === 403) {
      // Token is invalid or revoked — clear it
      await clearAuthToken();
      return null;
    }
    if (!res.ok) {
      // Server error (5xx) or other — keep token, treat as offline
      return null;
    }
    return res.json();
  } catch {
    // Network error — keep token, treat as offline
    return null;
  }
}

export async function refreshToken(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) return false;

    const res = await authFetch(
      "/api/auth/refresh",
      { method: "POST" },
      { autoRefresh: false },
    );

    if (!res.ok) return false;

    const data = await res.json();
    if (data.token) {
      await setAuthToken(data.token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  await clearAuthToken();
}

export async function updateProfile(
  profile: Partial<UserProfile>,
): Promise<UserProfile> {
  const res = await authFetch("/api/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update profile");
  }

  return res.json();
}

export async function getUserFacilities(): Promise<UserFacility[]> {
  const res = await authFetch("/api/facilities");
  if (!res.ok) return [];
  return res.json();
}

export async function createFacility(
  facilityName: string,
  isPrimary: boolean = false,
  facilityId?: string,
): Promise<UserFacility> {
  const res = await authFetch("/api/facilities", {
    method: "POST",
    body: JSON.stringify({ facilityName, isPrimary, facilityId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to add facility");
  }

  return res.json();
}

export async function updateFacility(
  id: string,
  data: { isPrimary?: boolean },
): Promise<UserFacility> {
  const res = await authFetch(`/api/facilities/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update facility");
  }

  return res.json();
}

export async function deleteFacility(id: string): Promise<void> {
  const res = await authFetch(`/api/facilities/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete facility");
  }
}

export async function uploadProfilePicture(
  imageUri: string,
): Promise<UserProfile> {
  const baseUrl = getApiUrl();
  const token = await getAuthToken();

  const formData = new FormData();
  const filename = imageUri.split("/").pop() || "avatar.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";
  formData.append("picture", { uri: imageUri, name: filename, type } as any);

  const res = await fetch(new URL("/api/profile/picture", baseUrl).href, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to upload profile picture");
  }

  return res.json();
}

export async function deleteProfilePicture(): Promise<UserProfile> {
  const res = await authFetch("/api/profile/picture", { method: "DELETE" });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete profile picture");
  }

  return res.json();
}

export async function registerDeviceKey(
  deviceId: string,
  publicKey: string,
  label?: string,
): Promise<void> {
  const res = await authFetch("/api/keys/device", {
    method: "POST",
    body: JSON.stringify({ deviceId, publicKey, label }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to register device key");
  }
}

export async function deleteAccount(password: string): Promise<void> {
  const res = await authFetch("/api/auth/account", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete account");
  }
  await clearAuthToken();
}
