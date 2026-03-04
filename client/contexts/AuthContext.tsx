import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Platform } from "react-native";
import { 
  AuthUser, 
  UserProfile, 
  UserFacility,
  getCurrentUser, 
  login as authLogin, 
  signup as authSignup,
  logout as authLogout,
  updateProfile as authUpdateProfile,
  getUserFacilities,
  createFacility as authCreateFacility,
  deleteFacility as authDeleteFacility,
  updateFacility as authUpdateFacility,
  registerDeviceKey,
} from "@/lib/auth";
import { getOrCreateDeviceIdentity } from "@/lib/e2ee";
import { clearAllAppLockData } from "@/lib/appLockStorage";

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
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  addFacility: (name: string, isPrimary?: boolean, facilityId?: string) => Promise<void>;
  removeFacility: (id: string) => Promise<void>;
  setFacilityPrimary: (id: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        setProfile(data.profile || null);
        setFacilities(data.facilities || []);
        
        try {
          const { deviceId, publicKey } = await getOrCreateDeviceIdentity();
          await registerDeviceKey(deviceId, publicKey, Platform.OS);
        } catch (error) {
          console.warn("Device key registration failed:", error);
        }
      } else {
        setUser(null);
        setProfile(null);
        setFacilities([]);
      }
    } catch {
      setUser(null);
      setProfile(null);
      setFacilities([]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await refreshUser();
      setIsLoading(false);
    };
    init();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await authLogin(email, password);
    setUser(data.user);
    setProfile(data.profile || null);
    setFacilities(data.facilities || []);
    
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
    setProfile(data.profile || null);
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
    setUser(null);
    setProfile(null);
    setFacilities([]);
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    const updated = await authUpdateProfile(profileData);
    setProfile(updated);
  };

  const addFacility = async (name: string, isPrimary: boolean = false, facilityId?: string) => {
    const facility = await authCreateFacility(name, isPrimary, facilityId);
    setFacilities(prev => [...prev, facility]);
  };

  const removeFacility = async (id: string) => {
    await authDeleteFacility(id);
    setFacilities(prev => prev.filter(f => f.id !== id));
  };

  const setFacilityPrimary = async (id: string) => {
    await authUpdateFacility(id, { isPrimary: true });
    setFacilities(prev =>
      prev.map(f => ({ ...f, isPrimary: f.id === id }))
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
        updateProfile,
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
