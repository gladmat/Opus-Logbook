import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ActionSheetIOS,
  Modal,
  Linking,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import * as MailComposer from "expo-mail-composer";
import Constants from "expo-constants";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { clearAllData, getCaseCount } from "@/lib/storage";
import { exportCases, ExportFormat, EXPORT_FORMAT_LABELS } from "@/lib/export";
import { requestOnboardingRestart } from "@/lib/onboarding";
import { getCodingSystemForProfile } from "@/lib/snomedCt";
import { getAuthToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useAppLock } from "@/contexts/AppLockContext";
import { isBiometricPreferenceEnabled } from "@/lib/appLockStorage";
import {
  getStoredSelectedSpecialties,
  getVisibleSpecialties,
} from "@/lib/personalization";
import { getApiUrl } from "@/lib/query-client";
import { getProfessionalRegistrationEntries } from "@shared/professionalRegistrations";

const APP_VERSION = Constants.expoConfig?.version || "1.0.0";
const BUILD_NUMBER =
  Constants.expoConfig?.ios?.buildNumber ||
  Constants.expoConfig?.android?.versionCode ||
  "1";

const getLegalUrls = () => {
  const baseUrl = getApiUrl().replace(/\/$/, "");
  return {
    privacyPolicy: `${baseUrl}/privacy`,
    termsOfService: `${baseUrl}/terms`,
    openSourceLicenses: `${baseUrl}/licenses`,
  };
};

const SUPPORT_EMAIL = "support@drgladysz.com";

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  subtitle?: string;
  value?: string;
  testID?: string;
}

function SettingsItem({
  icon,
  label,
  onPress,
  destructive = false,
  subtitle,
  value,
  testID,
}: SettingsItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsItem,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: destructive
              ? theme.error + "15"
              : theme.link + "15",
          },
        ]}
      >
        <Feather
          name={icon}
          size={20}
          color={destructive ? theme.error : theme.link}
        />
      </View>
      <View style={styles.itemContent}>
        <ThemedText
          style={[
            styles.itemLabel,
            { color: destructive ? theme.error : theme.text },
          ]}
        >
          {label}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            style={[styles.itemSubtitle, { color: theme.textSecondary }]}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {value ? (
        <ThemedText style={[styles.itemValue, { color: theme.textSecondary }]}>
          {value}
        </ThemedText>
      ) : null}
      <Feather name="chevron-right" size={20} color={theme.textTertiary} />
    </Pressable>
  );
}

const CAREER_STAGE_LABELS: Record<string, string> = {
  junior_house_officer: "Junior House Officer",
  registrar_non_training: "Registrar (Non-Training)",
  set_trainee: "SET Trainee",
  fellow: "Fellow",
  consultant_specialist: "Consultant / Specialist",
  moss: "Medical Officer Special Scale",
};

const COUNTRY_OF_PRACTICE_LABELS: Record<string, string> = {
  new_zealand: "New Zealand",
  australia: "Australia",
  united_kingdom: "United Kingdom",
  united_states: "United States",
  poland: "Poland",
  other: "Other",
};

export default function SettingsScreen() {
  const { theme, preference, setColorScheme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAppLockConfigured } = useAppLock();
  const { user, profile, facilities, logout, deleteAccount, updateProfile } =
    useAuth();

  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [appLockIcon, setAppLockIcon] =
    useState<keyof typeof Feather.glyphMap>("shield");

  useEffect(() => {
    if (!isAppLockConfigured) {
      setAppLockIcon("shield");
      return;
    }
    (async () => {
      const bioPref = await isBiometricPreferenceEnabled();
      if (!bioPref) {
        setAppLockIcon("lock");
        return;
      }
      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (
        types.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
        )
      ) {
        setAppLockIcon("smile");
      } else if (
        types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ) {
        setAppLockIcon("smartphone");
      } else {
        setAppLockIcon("lock");
      }
    })();
  }, [isAppLockConfigured]);

  const storedSelectedSpecialties = useMemo(
    () => getStoredSelectedSpecialties(profile),
    [profile],
  );
  const visibleSpecialties = useMemo(
    () => getVisibleSpecialties(profile),
    [profile],
  );
  const personalisationSubtitle = storedSelectedSpecialties
    ? `${visibleSpecialties.length} ${visibleSpecialties.length === 1 ? "category" : "categories"} shown in Dashboard and Add Case`
    : "All categories shown in Dashboard and Add Case";
  const professionalRegistrationEntries = useMemo(
    () =>
      getProfessionalRegistrationEntries(
        profile?.professionalRegistrations,
        profile?.medicalCouncilNumber,
        profile?.countryOfPractice,
      ),
    [
      profile?.countryOfPractice,
      profile?.medicalCouncilNumber,
      profile?.professionalRegistrations,
    ],
  );

  useEffect(() => {
    getCaseCount().then(setCaseCount);
  }, []);

  const handleExport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const formats: ExportFormat[] = ["csv", "json", "fhir", "pdf"];
    const labels = formats.map((f) => EXPORT_FORMAT_LABELS[f]);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...labels, "Cancel"],
        cancelButtonIndex: labels.length,
        title: "Export Format",
      },
      async (buttonIndex) => {
        if (buttonIndex >= formats.length) return;
        const format = formats[buttonIndex] as ExportFormat;
        try {
          await exportCases({ format, includePatientId: true });
        } catch (error: any) {
          console.error("Export error:", error);
          Alert.alert(
            "Export Error",
            error?.message || "Failed to export cases",
          );
        }
      },
    );
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all your cases, timeline events, and settings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Data Cleared", "All data has been deleted");
            setCaseCount(0);
          },
        },
      ],
    );
  };

  const handleRestartOnboarding = () => {
    if (!user?.id) {
      return;
    }

    Alert.alert(
      "Preview Onboarding From Start",
      "This will replay the welcome and feature pages, then reopen the onboarding flow with your current answers prefilled so you can review the full experience.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Preview",
          onPress: async () => {
            try {
              await requestOnboardingRestart(user.id, "full");
              await updateProfile({ onboardingComplete: false });
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch (error: any) {
              Alert.alert(
                "Could Not Restart",
                error?.message || "Failed to restart onboarding.",
              );
            }
          },
        },
      ],
    );
  };


  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account?",
      "This will permanently delete your account, all server data, and all local data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            setDeleteAccountPassword("");
            setShowDeleteAccountModal(true);
          },
        },
      ],
    );
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deleteAccountPassword) {
      Alert.alert(
        "Password Required",
        "Please enter your password to confirm account deletion.",
      );
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteAccount(deleteAccountPassword);
      setShowDeleteAccountModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert(
        "Deletion Failed",
        error?.message || "Failed to delete account. Please try again.",
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleOpenUrl = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open the link");
    }
  };

  const handleSendFeedback = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isAvailable = await MailComposer.isAvailableAsync();
    if (isAvailable) {
      await MailComposer.composeAsync({
        recipients: [SUPPORT_EMAIL],
        subject: `Opus Feedback — v${APP_VERSION} (${BUILD_NUMBER})`,
        body: `\n\n---\nApp Version: ${APP_VERSION}\nBuild: ${BUILD_NUMBER}\nDevice: ${Constants.deviceName || "Unknown"}`,
      });
    } else {
      Alert.alert(
        "Email Not Available",
        `Please send feedback to ${SUPPORT_EMAIL}`,
        [
          {
            text: "Copy Email",
            onPress: () => {
              // Can't use Clipboard directly, but user can manually copy
            },
          },
          { text: "OK" },
        ],
      );
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing Fields", "Please fill in all password fields");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(
        "Weak Password",
        "New password must be at least 8 characters",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Passwords Don't Match",
        "New password and confirmation must match",
      );
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const responseText = await response.text();
      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(
          "Change password response was not JSON:",
          responseText.substring(0, 200),
        );
        throw new Error(
          "Server returned an unexpected response. Please try again.",
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your password has been changed");
      setShowChangePasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <KeyboardAwareScrollViewCompat
        testID="screen-settings"
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            ACCOUNT
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Pressable
              style={styles.profileHeader}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("EditProfile");
              }}
              testID="settings.row-editProfile"
            >
              <View
                style={[
                  styles.avatarContainer,
                  { backgroundColor: theme.link + "15", overflow: "hidden" },
                ]}
              >
                {profile?.profilePictureUrl ? (
                  <Image
                    source={{
                      uri: `${getApiUrl()}${profile.profilePictureUrl}`,
                    }}
                    style={{ width: 56, height: 56, borderRadius: 28 }}
                  />
                ) : (
                  <Feather name="user" size={28} color={theme.link} />
                )}
              </View>
              <View style={styles.profileInfo}>
                <ThemedText style={styles.profileName}>
                  {profile?.firstName && profile?.lastName
                    ? `${profile.firstName} ${profile.lastName}`
                    : profile?.fullName || "Surgeon"}
                </ThemedText>
                <ThemedText
                  style={[styles.profileEmail, { color: theme.textSecondary }]}
                >
                  {user?.email}
                </ThemedText>
                {profile?.careerStage ? (
                  <ThemedText
                    style={[
                      styles.profileDetail,
                      { color: theme.textTertiary },
                    ]}
                  >
                    {CAREER_STAGE_LABELS[profile.careerStage] ||
                      profile.careerStage}
                  </ThemedText>
                ) : null}
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.textTertiary}
              />
            </Pressable>
            <View
              style={[
                styles.profileDetailsRow,
                { borderTopColor: theme.border },
              ]}
            >
              <View style={styles.profileDetailItem}>
                <ThemedText
                  style={[
                    styles.profileDetailLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Country
                </ThemedText>
                <ThemedText style={styles.profileDetailValue}>
                  {profile?.countryOfPractice
                    ? COUNTRY_OF_PRACTICE_LABELS[profile.countryOfPractice] ||
                      profile.countryOfPractice
                    : "Not set"}
                </ThemedText>
              </View>
              <View style={styles.profileDetailItem}>
                <ThemedText
                  style={[
                    styles.profileDetailLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Coding System
                </ThemedText>
                <ThemedText style={styles.profileDetailValue} numberOfLines={1}>
                  {
                    getCodingSystemForProfile(profile?.countryOfPractice).split(
                      " (",
                    )[0]
                  }
                </ThemedText>
              </View>
            </View>
            {professionalRegistrationEntries.map((entry) => (
              <View
                key={entry.jurisdiction}
                style={[
                  styles.profileDetailsRow,
                  { borderTopColor: theme.border },
                ]}
              >
                <View style={styles.profileDetailItem}>
                  <ThemedText
                    style={[
                      styles.profileDetailLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {entry.authority === "Other"
                      ? entry.label
                      : `${entry.authority} (${entry.label})`}
                  </ThemedText>
                  <ThemedText style={styles.profileDetailValue}>
                    {entry.number}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            SECURITY
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <SettingsItem
              icon={appLockIcon}
              label="App Lock"
              subtitle="PIN and biometric protection"
              value={isAppLockConfigured ? "On" : "Off"}
              onPress={() => navigation.navigate("SetupAppLock")}
              testID="settings.row-appLock"
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="lock"
              label="Change Password"
              subtitle="Update your account password"
              onPress={() => setShowChangePasswordModal(true)}
              testID="settings.row-changePassword"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            APPEARANCE
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault, padding: Spacing.md },
            ]}
          >
            <View
              style={[
                styles.themeSegmented,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundDefault,
                },
              ]}
            >
              {[
                {
                  value: "light" as const,
                  label: "Light",
                  icon: "sun" as const,
                },
                {
                  value: "dark" as const,
                  label: "Dark",
                  icon: "moon" as const,
                },
                {
                  value: "system" as const,
                  label: "System",
                  icon: "smartphone" as const,
                },
              ].map((opt) => {
                const isSelected = preference === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.themeSegmentedButton,
                      isSelected ? { backgroundColor: theme.link } : undefined,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setColorScheme(opt.value);
                    }}
                  >
                    <Feather
                      name={opt.icon}
                      size={14}
                      color={isSelected ? "#FFFFFF" : theme.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <ThemedText
                      style={[
                        styles.themeSegmentedText,
                        { color: isSelected ? "#FFFFFF" : theme.textSecondary },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            FACILITIES
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <SettingsItem
              icon="home"
              label="My Facilities"
              subtitle={`${facilities.length} ${facilities.length === 1 ? "hospital" : "hospitals"}`}
              onPress={() => navigation.navigate("ManageFacilities")}
              testID="settings.row-facilities"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            CLINICAL
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <SettingsItem
              icon="grid"
              label="Personalisation"
              subtitle={personalisationSubtitle}
              onPress={() => navigation.navigate("Personalisation")}
              testID="settings.row-personalisation"
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="sliders"
              label="Surgical Preferences"
              subtitle="Anticoagulation & monitoring defaults"
              onPress={() => navigation.navigate("SurgicalPreferences")}
              testID="settings.row-surgicalPreferences"
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="refresh-cw"
              label="Preview Onboarding From Start"
              subtitle="Replay welcome, feature slides, and onboarding steps"
              onPress={handleRestartOnboarding}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            DATA
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <SettingsItem
              icon="download"
              label="Export Cases"
              subtitle={caseCount !== null ? `${caseCount} cases` : undefined}
              onPress={handleExport}
              testID="settings.row-export"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            PRIVACY
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.privacyInfo}>
              <View
                style={[
                  styles.privacyBadge,
                  { backgroundColor: theme.success + "15" },
                ]}
              >
                <Feather name="shield" size={20} color={theme.success} />
              </View>
              <View style={styles.privacyText}>
                <ThemedText style={styles.privacyTitle}>
                  Local-First Privacy
                </ThemedText>
                <ThemedText
                  style={[
                    styles.privacyDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  All your case data is stored locally on this device. Photos
                  are processed on-device and never uploaded. Sensitive
                  information like NHI numbers are automatically redacted before
                  AI analysis.
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            ABOUT
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.aboutItem}>
              <ThemedText style={styles.aboutLabel}>Version</ThemedText>
              <ThemedText
                style={[styles.aboutValue, { color: theme.textSecondary }]}
              >
                v{APP_VERSION} (Build {BUILD_NUMBER})
              </ThemedText>
            </View>
            <View style={styles.aboutItem}>
              <ThemedText style={styles.aboutLabel}>Developed by</ThemedText>
              <ThemedText
                style={[styles.aboutValue, { color: theme.textSecondary }]}
              >
                Dr. Mateusz Gladysz
              </ThemedText>
            </View>
            <View style={styles.aboutItem}>
              <ThemedText style={styles.aboutLabel}>Location</ThemedText>
              <ThemedText
                style={[styles.aboutValue, { color: theme.textSecondary }]}
              >
                New Zealand
              </ThemedText>
            </View>
            <View style={[styles.aboutItem, { borderBottomWidth: 0 }]}>
              <ThemedText style={styles.aboutLabel}>
                Procedure Coding
              </ThemedText>
              <ThemedText
                style={[styles.aboutValue, { color: theme.textSecondary }]}
              >
                SNOMED CT
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            LEGAL
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <SettingsItem
              icon="shield"
              label="Privacy Policy"
              subtitle="How we protect your data"
              onPress={() => handleOpenUrl(getLegalUrls().privacyPolicy)}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="file-text"
              label="Terms of Service"
              subtitle="Usage terms and conditions"
              onPress={() => handleOpenUrl(getLegalUrls().termsOfService)}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="code"
              label="Open Source Licenses"
              subtitle="Third-party libraries"
              onPress={() => handleOpenUrl(getLegalUrls().openSourceLicenses)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            SUPPORT
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <SettingsItem
              icon="mail"
              label="Send Feedback"
              subtitle="Report bugs or suggest features"
              onPress={handleSendFeedback}
              testID="settings.row-feedback"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            ACCOUNT
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <SettingsItem
              icon="log-out"
              label="Sign Out"
              onPress={handleLogout}
              destructive
              testID="settings.btn-signOut"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            DANGER ZONE
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <SettingsItem
              icon="trash-2"
              label="Clear All Data"
              onPress={handleClearData}
              destructive
              testID="settings.row-clearData"
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="user-x"
              label="Delete Account"
              subtitle="Permanently delete your account and all data"
              onPress={handleDeleteAccount}
              destructive
              testID="settings.row-deleteAccount"
            />
          </View>
        </View>

        <View style={styles.disclaimerContainer}>
          <ThemedText
            style={[styles.disclaimerText, { color: theme.textTertiary }]}
          >
            Opus is a documentation tool. The treating surgeon remains solely
            responsible for patient care and clinical records. This app does not
            provide medical advice.
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>

      <Modal
        visible={showChangePasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowChangePasswordModal(false)}
        >
          <View
            style={[
              styles.passwordModalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.facilitiesModalHeader}>
              <ThemedText style={styles.modalTitle}>Change Password</ThemedText>
              <Pressable onPress={() => setShowChangePasswordModal(false)}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText
              style={[styles.modalSubtitle, { color: theme.textSecondary }]}
            >
              Enter your current password and choose a new one.
            </ThemedText>

            <View style={styles.passwordInputContainer}>
              <ThemedText
                style={[styles.inputLabel, { color: theme.textSecondary }]}
              >
                Current Password
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Enter current password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
                testID="settings.security.input-currentPassword"
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <ThemedText
                style={[styles.inputLabel, { color: theme.textSecondary }]}
              >
                New Password
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Enter new password (min 8 characters)"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                testID="settings.security.input-newPassword"
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <ThemedText
                style={[styles.inputLabel, { color: theme.textSecondary }]}
              >
                Confirm New Password
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Confirm new password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                testID="settings.security.input-confirmPassword"
              />
            </View>

            <Pressable
              style={[
                styles.changePasswordButton,
                { backgroundColor: theme.link },
                isChangingPassword && { opacity: 0.7 },
              ]}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
              testID="settings.security.btn-changePassword"
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <ThemedText style={styles.changePasswordButtonText}>
                  Change Password
                </ThemedText>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showDeleteAccountModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isDeletingAccount) {
            setShowDeleteAccountModal(false);
          }
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!isDeletingAccount) {
              setShowDeleteAccountModal(false);
            }
          }}
        >
          <View
            style={[
              styles.passwordModalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.facilitiesModalHeader}>
              <ThemedText style={styles.modalTitle}>Delete Account</ThemedText>
              <Pressable
                onPress={() => {
                  if (!isDeletingAccount) {
                    setShowDeleteAccountModal(false);
                  }
                }}
              >
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText
              style={[styles.modalSubtitle, { color: theme.textSecondary }]}
            >
              Enter your password to permanently delete your account. All server
              data and local data will be erased. This cannot be undone.
            </ThemedText>

            <View style={styles.passwordInputContainer}>
              <ThemedText
                style={[styles.inputLabel, { color: theme.textSecondary }]}
              >
                Password
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Enter your password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                value={deleteAccountPassword}
                onChangeText={setDeleteAccountPassword}
                autoCapitalize="none"
                editable={!isDeletingAccount}
              />
            </View>

            <Pressable
              style={[
                styles.changePasswordButton,
                { backgroundColor: theme.error },
                isDeletingAccount && { opacity: 0.7 },
              ]}
              onPress={handleConfirmDeleteAccount}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <ThemedText style={styles.changePasswordButtonText}>
                  Delete My Account
                </ThemedText>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  themeSegmented: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  themeSegmentedButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  themeSegmentedText: {
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  sectionHint: {
    fontSize: 12,
    marginTop: Spacing.sm,
    marginLeft: Spacing.sm,
    lineHeight: 16,
  },
  sectionCard: {
    borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  itemValue: {
    fontSize: 14,
  },
  privacyInfo: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  privacyBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  privacyText: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  privacyDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  aboutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  aboutLabel: {
    fontSize: 15,
  },
  aboutValue: {
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.modal,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  countryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: "500",
  },
  countrySystem: {
    fontSize: 12,
    marginTop: 2,
  },
  profileHeader: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
    alignItems: "center",
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  profileDetail: {
    fontSize: 12,
    marginTop: 4,
  },
  profileDetailsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  profileDetailItem: {
    flex: 1,
  },
  profileDetailLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileDetailValue: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  facilitiesModalContent: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.modal,
  },
  addFacilityRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  facilityInput: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  addFacilityButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  facilityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  facilityItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  facilityItemName: {
    fontSize: 15,
    flex: 1,
  },
  primaryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emptyFacilities: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyFacilitiesText: {
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  emptyFacilitiesHint: {
    fontSize: 12,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  facilitiesModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  addFromListButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  addFromListButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  facilityItemTextContainer: {
    flex: 1,
  },
  facilityItemId: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  disclaimerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    marginTop: -Spacing.md,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  passwordModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.modal,
  },
  passwordInputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  passwordInput: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  changePasswordButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  changePasswordButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
