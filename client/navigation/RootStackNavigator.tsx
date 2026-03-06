import React, { useState, useEffect, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import CaseDetailScreen from "@/screens/CaseDetailScreen";
import CaseFormScreen from "@/screens/CaseFormScreen";
import AddCaseScreen from "@/screens/AddCaseScreen";
import AddTimelineEventScreen from "@/screens/AddTimelineEventScreen";
import MediaManagementScreen from "@/screens/MediaManagementScreen";
import AddOperativeMediaScreen from "@/screens/AddOperativeMediaScreen";
import AuthScreen from "@/screens/AuthScreen";
import { OnboardingAuthScreen } from "@/screens/onboarding/AuthScreen";
import { EmailSignupScreen } from "@/screens/onboarding/EmailSignupScreen";
import { CategoriesScreen } from "@/screens/onboarding/CategoriesScreen";
import { TrainingScreen } from "@/screens/onboarding/TrainingScreen";
import { HospitalScreen } from "@/screens/onboarding/HospitalScreen";
import { PrivacyScreen } from "@/screens/onboarding/PrivacyScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import LockScreen from "@/screens/LockScreen";
import SetupAppLockScreen from "@/screens/SetupAppLockScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import EpisodeDetailScreen from "@/screens/EpisodeDetailScreen";
import EpisodeListScreen from "@/screens/EpisodeListScreen";
import SurgicalPreferencesScreen from "@/screens/SurgicalPreferencesScreen";
import { WelcomeScreen } from "@/screens/onboarding/WelcomeScreen";
import { FeaturePager } from "@/screens/onboarding/FeaturePager";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useAppLock } from "@/contexts/AppLockContext";
import {
  Specialty,
  TimelineEventType,
  MediaAttachment,
  Case,
} from "@/types/case";
import type { EpisodePrefillData } from "@/types/episode";
import { useTheme } from "@/hooks/useTheme";
import { palette } from "@/constants/theme";

const WELCOME_SEEN_KEY = "@opus_has_seen_welcome";
const FEATURES_SEEN_KEY = "@opus_has_seen_features";
const CATEGORIES_SEEN_KEY = "@opus_has_seen_categories";
const TRAINING_SEEN_KEY = "@opus_has_seen_training";
const HOSPITAL_SEEN_KEY = "@opus_has_seen_hospital";
const PRIVACY_SEEN_KEY = "@opus_has_seen_privacy";
const TRAINING_PROGRAMME_KEY = "@opus_training_programme";

export type RootStackParamList = {
  Welcome: undefined;
  Features: undefined;
  Auth: undefined;
  EmailSignup: undefined;
  Categories: undefined;
  Training: undefined;
  Hospital: undefined;
  Privacy: undefined;
  Onboarding: undefined;
  Main: undefined;
  CaseDetail: { caseId: string; showComplicationForm?: boolean };
  CaseForm: {
    specialty?: Specialty;
    caseId?: string;
    duplicateFrom?: Case;
    episodeId?: string;
    episodePrefill?: EpisodePrefillData;
  };
  AddCase: undefined;
  AddTimelineEvent: {
    caseId: string;
    initialEventType?: TimelineEventType;
    isSkinLesion?: boolean;
    caseDischargeDate?: string;
    editEventId?: string;
  };
  MediaManagement: {
    existingAttachments?: MediaAttachment[];
    callbackId?: string;
    maxAttachments?: number;
    context?: "case" | "timeline";
    eventType?: TimelineEventType;
  };
  AddOperativeMedia: {
    imageUri: string;
    mimeType?: string;
    callbackId?: string;
    editMode?: boolean;
    existingMediaId?: string;
    existingMediaType?: string;
    existingCaption?: string;
    existingTimestamp?: string;
  };
  EpisodeDetail: { episodeId: string };
  EpisodeList: undefined;
  SetupAppLock: undefined;
  EditProfile: undefined;
  SurgicalPreferences: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, onboardingComplete, isLoading } = useAuth();
  const { isLocked, isAppLockConfigured } = useAppLock();
  const { theme: colors } = useTheme();

  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);
  const [hasSeenFeatures, setHasSeenFeatures] = useState<boolean | null>(null);
  const [hasSeenCategories, setHasSeenCategories] = useState<boolean | null>(
    null,
  );
  const [hasSeenTraining, setHasSeenTraining] = useState<boolean | null>(null);
  const [hasSeenHospital, setHasSeenHospital] = useState<boolean | null>(null);
  const [hasSeenPrivacy, setHasSeenPrivacy] = useState<boolean | null>(null);
  const [trainingProgramme, setTrainingProgramme] = useState<string | null>(
    null,
  );

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(WELCOME_SEEN_KEY),
      AsyncStorage.getItem(FEATURES_SEEN_KEY),
      AsyncStorage.getItem(CATEGORIES_SEEN_KEY),
      AsyncStorage.getItem(TRAINING_SEEN_KEY),
      AsyncStorage.getItem(HOSPITAL_SEEN_KEY),
      AsyncStorage.getItem(PRIVACY_SEEN_KEY),
      AsyncStorage.getItem(TRAINING_PROGRAMME_KEY),
    ]).then(
      ([
        welcomeVal,
        featuresVal,
        categoriesVal,
        trainingVal,
        hospitalVal,
        privacyVal,
        programmeVal,
      ]) => {
        setHasSeenWelcome(welcomeVal === "true");
        setHasSeenFeatures(featuresVal === "true");
        setHasSeenCategories(categoriesVal === "true");
        setHasSeenTraining(trainingVal === "true");
        setHasSeenHospital(hospitalVal === "true");
        setHasSeenPrivacy(privacyVal === "true");
        setTrainingProgramme(programmeVal);
      },
    );
  }, []);

  const handleWelcomeComplete = useCallback(async () => {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, "true");
    setHasSeenWelcome(true);
  }, []);

  const handleFeaturesComplete = useCallback(async () => {
    await AsyncStorage.setItem(FEATURES_SEEN_KEY, "true");
    setHasSeenFeatures(true);
  }, []);

  const handleCategoriesComplete = useCallback(
    async (selectedCategories: Specialty[]) => {
      // TODO: persist selectedCategories to profile/preferences
      await AsyncStorage.setItem(CATEGORIES_SEEN_KEY, "true");
      setHasSeenCategories(true);
    },
    [],
  );

  const handleTrainingComplete = useCallback(
    async (programme: string | null) => {
      if (programme) {
        await AsyncStorage.setItem(TRAINING_PROGRAMME_KEY, programme);
        setTrainingProgramme(programme);
      }
      await AsyncStorage.setItem(TRAINING_SEEN_KEY, "true");
      setHasSeenTraining(true);
    },
    [],
  );

  const handleHospitalComplete = useCallback(
    async (hospital: string | null) => {
      // TODO: persist hospital to profile/preferences
      await AsyncStorage.setItem(HOSPITAL_SEEN_KEY, "true");
      setHasSeenHospital(true);
    },
    [],
  );

  const handlePrivacyComplete = useCallback(async () => {
    await AsyncStorage.setItem(PRIVACY_SEEN_KEY, "true");
    setHasSeenPrivacy(true);
  }, []);

  if (
    isLoading ||
    hasSeenWelcome === null ||
    hasSeenFeatures === null ||
    hasSeenCategories === null ||
    hasSeenTraining === null ||
    hasSeenHospital === null ||
    hasSeenPrivacy === null
  ) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={colors.link} />
      </View>
    );
  }

  // Show lock screen when authenticated, app lock is configured, and currently locked
  if (isAuthenticated && isAppLockConfigured && isLocked) {
    return <LockScreen />;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!hasSeenWelcome && !isAuthenticated ? (
        <Stack.Screen name="Welcome" options={{ headerShown: false }}>
          {() => <WelcomeScreen onComplete={handleWelcomeComplete} />}
        </Stack.Screen>
      ) : !hasSeenFeatures && !isAuthenticated ? (
        <Stack.Screen name="Features" options={{ headerShown: false }}>
          {() => <FeaturePager onComplete={handleFeaturesComplete} />}
        </Stack.Screen>
      ) : !isAuthenticated ? (
        <>
          <Stack.Screen
            name="Auth"
            component={OnboardingAuthScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="EmailSignup"
            component={EmailSignupScreen}
            options={{
              headerTitle: "",
              headerBackTitle: "Back",
              headerStyle: { backgroundColor: palette.charcoal[950] },
              headerTintColor: palette.amber[600],
              headerShadowVisible: false,
            }}
          />
        </>
      ) : !onboardingComplete && !hasSeenCategories ? (
        <Stack.Screen name="Categories" options={{ headerShown: false }}>
          {() => (
            <CategoriesScreen onComplete={handleCategoriesComplete} />
          )}
        </Stack.Screen>
      ) : !onboardingComplete && !hasSeenTraining ? (
        <Stack.Screen name="Training" options={{ headerShown: false }}>
          {() => <TrainingScreen onComplete={handleTrainingComplete} />}
        </Stack.Screen>
      ) : !onboardingComplete && !hasSeenHospital ? (
        <Stack.Screen name="Hospital" options={{ headerShown: false }}>
          {() => (
            <HospitalScreen
              onComplete={handleHospitalComplete}
              trainingProgramme={trainingProgramme}
            />
          )}
        </Stack.Screen>
      ) : !onboardingComplete && !hasSeenPrivacy ? (
        <Stack.Screen name="Privacy" options={{ headerShown: false }}>
          {() => <PrivacyScreen onComplete={handlePrivacyComplete} />}
        </Stack.Screen>
      ) : !onboardingComplete ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CaseDetail"
            component={CaseDetailScreen}
            options={{
              headerTitle: "Case Details",
            }}
          />
          <Stack.Screen
            name="CaseForm"
            component={CaseFormScreen}
            options={{
              headerTitle: "New Case",
            }}
          />
          <Stack.Screen
            name="AddCase"
            component={AddCaseScreen}
            options={{
              headerTitle: "Add Case",
            }}
          />
          <Stack.Screen
            name="AddTimelineEvent"
            component={AddTimelineEventScreen}
            options={{
              headerTitle: "Add Event",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="MediaManagement"
            component={MediaManagementScreen}
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
          <Stack.Screen
            name="AddOperativeMedia"
            component={AddOperativeMediaScreen}
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
          <Stack.Screen
            name="EpisodeDetail"
            component={EpisodeDetailScreen}
            options={{
              headerTitle: "Episode",
            }}
          />
          <Stack.Screen
            name="EpisodeList"
            component={EpisodeListScreen}
            options={{
              headerTitle: "All Episodes",
            }}
          />
          <Stack.Screen
            name="SetupAppLock"
            component={SetupAppLockScreen}
            options={{
              headerTitle: "App Lock",
            }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{
              headerTitle: "Edit Profile",
            }}
          />
          <Stack.Screen
            name="SurgicalPreferences"
            component={SurgicalPreferencesScreen}
            options={{
              headerTitle: "Surgical Preferences",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
