import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./query-client";

const AUTH_TOKEN_KEY = "surgical_logbook_auth_token";

export interface AuthUser {
  id: string;
  email: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string | null;
  countryOfPractice: string | null;
  medicalCouncilNumber: string | null;
  verificationStatus: string;
  careerStage: string | null;
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

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiUrl();
  const token = await getAuthToken();
  
  return fetch(new URL(path, baseUrl).href, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  const res = await authFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create account");
  }
  
  const data: AuthResponse = await res.json();
  await setAuthToken(data.token);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Invalid email or password");
  }
  
  const data: AuthResponse = await res.json();
  await setAuthToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<AuthResponse | null> {
  const token = await getAuthToken();
  if (!token) return null;
  
  const res = await authFetch("/api/auth/me");
  if (!res.ok) {
    await clearAuthToken();
    return null;
  }
  
  return res.json();
}

export async function logout(): Promise<void> {
  await clearAuthToken();
}

export async function updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
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

export async function createFacility(facilityName: string, isPrimary: boolean = false, facilityId?: string): Promise<UserFacility> {
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

export async function updateFacility(id: string, data: { isPrimary?: boolean }): Promise<UserFacility> {
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

export async function registerDeviceKey(
  deviceId: string,
  publicKey: string,
  label?: string
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
