import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import CaseDetailScreen from "@/screens/CaseDetailScreen";
import CaseFormScreen from "@/screens/CaseFormScreen";
import AddCaseScreen from "@/screens/AddCaseScreen";
import AddTimelineEventScreen from "@/screens/AddTimelineEventScreen";
import MediaManagementScreen from "@/screens/MediaManagementScreen";
import AddOperativeMediaScreen from "@/screens/AddOperativeMediaScreen";
import AuthScreen from "@/screens/AuthScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import LockScreen from "@/screens/LockScreen";
import SetupAppLockScreen from "@/screens/SetupAppLockScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useAppLock } from "@/contexts/AppLockContext";
import {
  Specialty,
  TimelineEventType,
  MediaAttachment,
  Case,
} from "@/types/case";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  CaseDetail: { caseId: string; showComplicationForm?: boolean };
  CaseForm: { specialty?: Specialty; caseId?: string; duplicateFrom?: Case };
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
  SetupAppLock: undefined;
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, onboardingComplete, isLoading } = useAuth();
  const { isLocked, isAppLockConfigured } = useAppLock();
  const { theme: colors } = useTheme();

  if (isLoading) {
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
      {!isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
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
