import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AuthUser,
  UserProfile,
  UserFacility,
  getCurrentUser,
  getAuthToken,
  login as authLogin,
  signup as authSignup,
  logout as authLogout,
  deleteAccount as authDeleteAccount,
  updateProfile as authUpdateProfile,
  uploadProfilePicture as authUploadProfilePicture,
  deleteProfilePicture as authDeleteProfilePicture,
  createFacility as authCreateFacility,
  deleteFacility as authDeleteFacility,
  updateFacility as authUpdateFacility,
  registerDeviceKey,
} from "@/lib/auth";
import { clearAllData } from "@/lib/storage";
import { getOrCreateDeviceIdentity } from "@/lib/e2ee";
import { clearAllAppLockData } from "@/lib/appLockStorage";
import { normalizeUserFacility } from "@/lib/facilities";
import { clearDecryptedCache } from "@/components/EncryptedImage";

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  facilities: UserFacility[];
  isLoading: boolean;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
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
const PROFILE_CACHE_KEY = "@auth_profile_cache_v1";

function mergeDefinedFields<T>(base: T, patch: Partial<T>): T {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

async function cacheProfile(profile: UserProfile | null): Promise<void> {
  if (profile) {
    await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } else {
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
  }
}

async function loadCachedProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.id === "string" &&
      typeof parsed.userId === "string"
    ) {
      return parsed as UserProfile;
    }
  } catch {
    // Ignore cache parse errors and continue with server state.
  }

  return null;
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
        setUser(data.user);
        if (data.profile) {
          setProfile(data.profile);
          void cacheProfile(data.profile);
        } else {
          setProfile((prev) => (prev?.userId === data.user.id ? prev : null));
        }
        setFacilities((data.facilities || []).map(normalizeUserFacility));

        try {
          const { deviceId, publicKey } = await getOrCreateDeviceIdentity();
          await registerDeviceKey(deviceId, publicKey, Platform.OS);
        } catch (error) {
          console.warn("Device key registration failed:", error);
        }
      } else {
        // getCurrentUser returned null — could be offline or token cleared
        // Only clear state if token was actually cleared (auth failure)
        const token = await getAuthToken();
        if (!token) {
          setUser(null);
          setProfile(null);
          setFacilities([]);
          void cacheProfile(null);
        }
        // If token still exists, user is offline — keep cached state
      }
    } catch {
      // Network error — don't clear auth state
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const cachedProfile = await loadCachedProfile();
      if (cachedProfile) {
        setProfile(cachedProfile);
      }
      await refreshUser();
      setIsLoading(false);
    };
    init();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await authLogin(email, password);
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
      const { deviceId, publicKey } = await getOrCreateDeviceIdentity();
      await registerDeviceKey(deviceId, publicKey, Platform.OS);
    } catch (error) {
      console.warn("Device key registration failed:", error);
    }
  };

  const signup = async (email: string, password: string) => {
    const data = await authSignup(email, password);
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
      const { deviceId, publicKey } = await getOrCreateDeviceIdentity();
      await registerDeviceKey(deviceId, publicKey, Platform.OS);
    } catch (error) {
      console.warn("Device key registration failed:", error);
    }
  };

  const logout = async () => {
    await authLogout();
    await clearAllAppLockData();
    clearDecryptedCache();
    setUser(null);
    setProfile(null);
    setFacilities([]);
    await cacheProfile(null);
  };

  const deleteAccount = async (password: string) => {
    await authDeleteAccount(password);
    await clearAllData();
    await clearAllAppLockData();
    clearDecryptedCache();
    setUser(null);
    setProfile(null);
    setFacilities([]);
    await cacheProfile(null);
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
