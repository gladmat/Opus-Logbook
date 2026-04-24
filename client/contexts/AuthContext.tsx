import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AuthUser,
  UserProfile,
  UserFacility,
  getCurrentUser,
  getAuthToken,
  login as authLogin,
  signup as authSignup,
  appleSignIn as authAppleSignIn,
  logout as authLogout,
  deleteAccount as authDeleteAccount,
  updateProfile as authUpdateProfile,
  uploadProfilePicture as authUploadProfilePicture,
  deleteProfilePicture as authDeleteProfilePicture,
  createFacility as authCreateFacility,
  deleteFacility as authDeleteFacility,
  updateFacility as authUpdateFacility,
  registerDeviceKey,
  refreshToken as authRefreshToken,
  subscribeSessionExpired,
} from "@/lib/auth";
import { clearAllData, clearUserCaches } from "@/lib/storage";
import { getOrCreateDeviceIdentity, deleteDeviceIdentity } from "@/lib/e2ee";
import { clearAllAppLockData } from "@/lib/appLockStorage";
import { normalizeUserFacility } from "@/lib/facilities";
import {
  getSecureItem,
  setSecureItem,
  deleteSecureItem,
} from "@/lib/secureStorage";
import {
  decryptData,
  encryptData,
  clearEncryptionKeyCache,
  deleteUserEncryptionKey,
} from "@/lib/encryption";
import { clearDecryptedCache } from "@/components/EncryptedImage";
import {
  setActiveUserId,
  getActiveUserIdOrNull,
  userScopedAsyncKey,
} from "@/lib/activeUser";
import { migrateUnscopedStorage } from "@/lib/storageMigration";
import { initializeInboxStorage } from "@/lib/inboxStorage";
import { clearAllEpisodes } from "@/lib/episodeStorage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushTokenOnServer } from "@/lib/sharingApi";
import {
  discoverUnlinkedContacts,
  clearDiscoveryState,
} from "@/lib/discoveryService";

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  facilities: UserFacility[];
  isLoading: boolean;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  appleLogin: (
    identityToken: string,
    fullName?: { givenName?: string; familyName?: string } | null,
    email?: string | null,
  ) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (
    credential: { password: string } | { appleIdentityToken: string },
  ) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  uploadProfilePicture: (imageUri: string) => Promise<void>;
  deleteProfilePicture: () => Promise<void>;
  addFacility: (
    name: string,
    isPrimary?: boolean,
    facilityId?: string,
  ) => Promise<UserFacility>;
  removeFacility: (id: string) => Promise<void>;
  setFacilityPrimary: (id: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PROFILE_CACHE_BASE_KEY = "@auth_profile_cache_v1";
// Stored in SecureStore (WHEN_UNLOCKED_THIS_DEVICE_ONLY) rather than
// AsyncStorage. Knowing which Opus user last used this device is a weak
// correlation signal — keeping it out of plaintext on-disk AsyncStorage
// means a forensic dump cannot link the device to a user ID without first
// unlocking the Keychain.
const LAST_ACTIVE_USER_KEY = "opus_last_active_user_id";

function profileCacheKey(): string {
  return userScopedAsyncKey(PROFILE_CACHE_BASE_KEY);
}

function mergeDefinedFields<T>(base: T, patch: Partial<T>): T {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

function parseCachedProfile(raw: string): UserProfile | null {
  const parsed = JSON.parse(raw);
  if (
    parsed &&
    typeof parsed === "object" &&
    typeof parsed.id === "string" &&
    typeof parsed.userId === "string"
  ) {
    return parsed as UserProfile;
  }

  return null;
}

async function cacheProfile(profile: UserProfile | null): Promise<void> {
  try {
    if (profile) {
      const encrypted = await encryptData(JSON.stringify(profile));
      await AsyncStorage.setItem(profileCacheKey(), encrypted);
    } else {
      await AsyncStorage.removeItem(profileCacheKey());
    }
  } catch (error) {
    console.warn("Failed to cache profile locally:", error);
  }
}

async function loadCachedProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(profileCacheKey());
    if (!raw) {
      return null;
    }

    // The cached profile is always an `enc:v1` envelope written by
    // `cacheProfile`. Plaintext fallback removed — accepting plaintext would
    // let an attacker who can write to AsyncStorage (forensic / jailbreak)
    // inject arbitrary profile data that the app would treat as authentic.
    // If decryption fails, wipe the corrupt entry and fall back to the
    // server fetch path.
    try {
      const decrypted = await decryptData(raw);
      const parsed = parseCachedProfile(decrypted);
      if (parsed) return parsed;
    } catch {
      // Corrupt / legacy / tampered — wipe and fall through.
      await AsyncStorage.removeItem(profileCacheKey()).catch(() => {});
    }
  } catch {
    // AsyncStorage read failure — continue with server state.
  }

  return null;
}

async function registerDeviceAndPushToken(): Promise<void> {
  const { deviceId, publicKey } = await getOrCreateDeviceIdentity();
  await registerDeviceKey(deviceId, publicKey, Platform.OS);

  // Register push token if permissions already granted (non-blocking)
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? undefined;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      await registerPushTokenOnServer(tokenData.data, deviceId);
    }
  } catch (pushError) {
    console.warn("Push token registration failed:", pushError);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [facilities, setFacilities] = useState<UserFacility[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      if (data) {
        // Ensure active user is set (may differ from bootstrap if token was stale)
        if (getActiveUserIdOrNull() !== data.user.id) {
          setActiveUserId(data.user.id);
          await setSecureItem(LAST_ACTIVE_USER_KEY, data.user.id);
          await migrateUnscopedStorage(data.user.id);
          await initializeInboxStorage();
        }

        setUser(data.user);
        if (data.profile) {
          setProfile(data.profile);
          void cacheProfile(data.profile);
        } else {
          setProfile((prev) => (prev?.userId === data.user.id ? prev : null));
        }
        setFacilities((data.facilities || []).map(normalizeUserFacility));

        try {
          await registerDeviceAndPushToken();
        } catch (error) {
          console.warn("Device key registration failed:", error);
        }

        // Proactively roll the JWT forward so active users don't trip the
        // 7-day expiry mid-session. Cheap — the server re-issues on the same
        // tokenVersion and the new token is persisted to SecureStore.
        void authRefreshToken();

        // Background discovery: check if unlinked contacts have joined Opus
        void discoverUnlinkedContacts();
      } else {
        // getCurrentUser returned null — could be offline or token cleared
        // Only clear state if token was actually cleared (auth failure)
        const token = await getAuthToken();
        if (!token) {
          setActiveUserId(null);
          await deleteSecureItem(LAST_ACTIVE_USER_KEY);
          setUser(null);
          setProfile(null);
          setFacilities([]);
        }
        // If token still exists, user is offline — keep cached state
      }
    } catch {
      // Network error — don't clear auth state
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // Bootstrap: restore active user from device-scoped key so we can
      // read user-scoped profile cache and encryption key before server call
      const lastUserId = await getSecureItem(LAST_ACTIVE_USER_KEY);
      if (lastUserId) {
        setActiveUserId(lastUserId);
        const cachedProfile = await loadCachedProfile();
        if (cachedProfile) {
          setProfile(cachedProfile);
        }
      }

      await refreshUser();
      setIsLoading(false);
    };
    init();
  }, [refreshUser]);

  // Session-expired handler — fired by authFetch when a 401/403 can't be
  // recovered via refresh. Clear state and surface a friendlier alert than
  // the server's raw "Invalid or expired token" message.
  useEffect(() => {
    const unsubscribe = subscribeSessionExpired(() => {
      setActiveUserId(null);
      void AsyncStorage.removeItem(LAST_ACTIVE_USER_KEY);
      setUser(null);
      setProfile(null);
      setFacilities([]);
      Alert.alert(
        "Session expired",
        "You've been signed out. Please log in again to continue.",
      );
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authLogin(email, password);

    // Set active user BEFORE any storage access
    setActiveUserId(data.user.id);
    await setSecureItem(LAST_ACTIVE_USER_KEY, data.user.id);
    await migrateUnscopedStorage(data.user.id);
    await initializeInboxStorage();

    setUser(data.user);
    if (data.profile) {
      setProfile(data.profile);
      void cacheProfile(data.profile);
    } else {
      const cachedProfile = await loadCachedProfile();
      if (cachedProfile?.userId === data.user.id) {
        setProfile(cachedProfile);
      } else {
        setProfile(null);
        void cacheProfile(null);
      }
    }
    setFacilities((data.facilities || []).map(normalizeUserFacility));

    try {
      await registerDeviceAndPushToken();
    } catch (error) {
      console.warn("Device key registration failed:", error);
    }
  };

  const signup = async (email: string, password: string) => {
    const data = await authSignup(email, password);

    // Set active user BEFORE any storage access
    setActiveUserId(data.user.id);
    await setSecureItem(LAST_ACTIVE_USER_KEY, data.user.id);
    await initializeInboxStorage();

    setUser(data.user);
    if (data.profile) {
      setProfile(data.profile);
      void cacheProfile(data.profile);
    } else {
      setProfile(null);
      void cacheProfile(null);
    }
    setFacilities([]);

    try {
      await registerDeviceAndPushToken();
    } catch (error) {
      console.warn("Device key registration failed:", error);
    }
  };

  const appleLogin = async (
    identityToken: string,
    fullName?: { givenName?: string; familyName?: string } | null,
    email?: string | null,
  ) => {
    const data = await authAppleSignIn(identityToken, fullName, email);

    // Set active user BEFORE any storage access
    setActiveUserId(data.user.id);
    await setSecureItem(LAST_ACTIVE_USER_KEY, data.user.id);
    await migrateUnscopedStorage(data.user.id);
    await initializeInboxStorage();

    setUser(data.user);
    if (data.profile) {
      setProfile(data.profile);
      void cacheProfile(data.profile);
    } else {
      const cachedProfile = await loadCachedProfile();
      if (cachedProfile?.userId === data.user.id) {
        setProfile(cachedProfile);
      } else {
        setProfile(null);
        void cacheProfile(null);
      }
    }
    setFacilities((data.facilities || []).map(normalizeUserFacility));

    try {
      await registerDeviceAndPushToken();
    } catch (error) {
      console.warn("Device key registration failed:", error);
    }
  };

  const logout = async () => {
    // Clear sensitive data from RAM
    clearEncryptionKeyCache();
    clearDecryptedCache();
    clearUserCaches();

    // Clear user-scoped AsyncStorage caches BEFORE tearing down the active
    // user — the scoped-key helpers throw once the active user is null.
    await clearDiscoveryState().catch(() => {});

    // Tear down user-scoped state (fires onActiveUserChange listeners)
    setActiveUserId(null);
    await deleteSecureItem(LAST_ACTIVE_USER_KEY);

    // Clear auth token
    await authLogout();

    // DO NOT call clearAllAppLockData — user's PIN persists for next login
    // DO NOT delete user data — it stays for when they log back in

    setUser(null);
    setProfile(null);
    setFacilities([]);
  };

  const deleteAccount = async (
    credential: { password: string } | { appleIdentityToken: string },
  ) => {
    await authDeleteAccount(credential);

    // Delete all user-scoped data
    await clearAllData();
    await clearAllEpisodes();
    await clearAllAppLockData();
    await clearDiscoveryState().catch(() => {});

    // Zeroise in-memory key caches
    clearEncryptionKeyCache();
    clearDecryptedCache();
    clearUserCaches();

    // Wipe keychain-resident secrets for this user so a device seized after
    // deletion cannot be used to recover anything the user had typed into
    // the app. Best-effort — swallow per-key errors so a single failing
    // delete doesn't leave the rest behind.
    await deleteUserEncryptionKey().catch(() => {});
    await deleteDeviceIdentity().catch(() => {});

    await deleteSecureItem(LAST_ACTIVE_USER_KEY);
    setActiveUserId(null);

    setUser(null);
    setProfile(null);
    setFacilities([]);
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    const updated = await authUpdateProfile(profileData);
    setProfile((prev) => {
      let nextProfile: UserProfile | null = null;

      if (updated?.id && updated?.userId) {
        nextProfile = prev
          ? mergeDefinedFields(prev, updated)
          : (updated as UserProfile);
      } else if (prev) {
        nextProfile = mergeDefinedFields(prev, profileData);
      } else if (user?.id) {
        nextProfile = mergeDefinedFields(
          {
            id: `local-${user.id}`,
            userId: user.id,
            fullName: null,
            firstName: null,
            lastName: null,
            dateOfBirth: null,
            sex: null,
            profilePictureUrl: null,
            countryOfPractice: null,
            medicalCouncilNumber: null,
            verificationStatus: "unverified",
            careerStage: null,
            onboardingComplete: false,
          },
          profileData,
        );
      }

      if (nextProfile) {
        void cacheProfile(nextProfile);
      }

      return nextProfile ?? prev;
    });
  };

  const uploadProfilePicture = async (imageUri: string) => {
    const updated = await authUploadProfilePicture(imageUri);
    setProfile((prev) => {
      const nextProfile = prev
        ? mergeDefinedFields(prev, updated)
        : (updated as UserProfile);

      if (nextProfile?.id && nextProfile?.userId) {
        void cacheProfile(nextProfile);
      }

      return nextProfile;
    });
  };

  const deleteProfilePicture = async () => {
    const updated = await authDeleteProfilePicture();
    setProfile((prev) => {
      const nextProfile = prev
        ? mergeDefinedFields(prev, updated)
        : (updated as UserProfile);

      if (nextProfile?.id && nextProfile?.userId) {
        void cacheProfile(nextProfile);
      }

      return nextProfile;
    });
  };

  const addFacility = async (
    name: string,
    isPrimary: boolean = false,
    facilityId?: string,
  ) => {
    const facility = normalizeUserFacility(
      await authCreateFacility(name, isPrimary, facilityId),
    );
    setFacilities((prev) => [...prev, facility]);
    return facility;
  };

  const removeFacility = async (id: string) => {
    await authDeleteFacility(id);
    setFacilities((prev) => prev.filter((f) => f.id !== id));
  };

  const setFacilityPrimary = async (id: string) => {
    await authUpdateFacility(id, { isPrimary: true });
    setFacilities((prev) =>
      prev.map((f) => ({ ...f, isPrimary: f.id === id })),
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        facilities,
        isLoading,
        isAuthenticated: !!user,
        onboardingComplete: profile?.onboardingComplete ?? false,
        login,
        signup,
        appleLogin,
        logout,
        deleteAccount,
        updateProfile,
        uploadProfilePicture,
        deleteProfilePicture,
        addFacility,
        removeFacility,
        setFacilityPrimary,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
