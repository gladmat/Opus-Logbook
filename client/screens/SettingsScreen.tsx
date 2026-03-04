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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as MailComposer from "expo-mail-composer";
import Constants from "expo-constants";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { FacilitySelector } from "@/components/FacilitySelector";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { clearAllData, getCases, getSettings, AppSettings } from "@/lib/storage";
import { exportCases, ExportFormat, EXPORT_FORMAT_LABELS } from "@/lib/export";
import { validateMigrationCorpus } from "@/lib/migrationValidator";
import { getCodingSystemForProfile } from "@/lib/snomedCt";
import { useAuth } from "@/contexts/AuthContext";
import { useAppLock } from "@/contexts/AppLockContext";
import { MasterFacility, getFacilityById, SUPPORTED_COUNTRIES } from "@/data/facilities";
import { getApiUrl } from "@/lib/query-client";

const APP_VERSION = Constants.expoConfig?.version || "1.0.0";
const BUILD_NUMBER = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || "1";

const getLegalUrls = () => {
  const baseUrl = getApiUrl().replace(/\/$/, '');
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
}

function SettingsItem({
  icon,
  label,
  onPress,
  destructive = false,
  subtitle,
  value,
}: SettingsItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsItem,
        { opacity: pressed ? 0.7 : 1 },
      ]}
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
          <ThemedText style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
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
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAppLockConfigured } = useAppLock();
  const { user, profile, facilities, logout, addFacility, removeFacility } = useAuth();

  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showFacilitiesModal, setShowFacilitiesModal] = useState(false);
  const [showFacilitySelector, setShowFacilitySelector] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const countryCode = useMemo(() => {
    if (!profile?.countryOfPractice) return "NZ";
    const countryMap: Record<string, string> = {
      new_zealand: "NZ",
      australia: "AU",
      united_kingdom: "UK",
      united_states: "US",
      poland: "PL",
    };
    return countryMap[profile.countryOfPractice] || "NZ";
  }, [profile?.countryOfPractice]);

  const selectedFacilityIds = useMemo(() => {
    return facilities.map(f => f.facilityId).filter(Boolean) as string[];
  }, [facilities]);

  useEffect(() => {
    getCases().then((cases) => setCaseCount(cases.length));
    getSettings().then(setSettings);
  }, []);

  const handleExport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const formats: ExportFormat[] = ["csv", "json", "fhir"];
    const labels = formats.map((f) => EXPORT_FORMAT_LABELS[f]);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...labels, "Cancel"],
        cancelButtonIndex: labels.length,
        title: "Export Format",
      },
      async (buttonIndex) => {
        if (buttonIndex >= formats.length) return;
        const format = formats[buttonIndex];
        try {
          await exportCases({ format, includePatientId: true });
        } catch (error: any) {
          console.error("Export error:", error);
          Alert.alert("Export Error", error?.message || "Failed to export cases");
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
            getSettings().then(setSettings);
          },
        },
      ]
    );
  };

  const handleValidateMigration = async () => {
    try {
      const result = await validateMigrationCorpus();
      const warnings = result.warningCases.length;
      const summary = [
        `Total: ${result.totalCases}`,
        `Passed: ${result.successCount}`,
        `Failed: ${result.failedCases.length}`,
        `Warnings: ${warnings}`,
      ].join("\n");

      if (result.failedCases.length > 0) {
        const failDetails = result.failedCases
          .slice(0, 3)
          .map((f) => `${f.caseId.slice(0, 8)}: ${f.errors[0]}`)
          .join("\n");
        Alert.alert("Migration Issues", `${summary}\n\n${failDetails}`);
      } else {
        Alert.alert("Migration OK", summary);
      }
    } catch (error: any) {
      Alert.alert("Validation Error", error?.message || "Unknown error");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleSelectFacility = async (facility: MasterFacility) => {
    if (selectedFacilityIds.includes(facility.id)) {
      const existingFacility = facilities.find(f => f.facilityId === facility.id);
      if (existingFacility) {
        await removeFacility(existingFacility.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return;
    }
    try {
      await addFacility(facility.name, facilities.length === 0, facility.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add facility");
    }
  };

  const handleRemoveFacility = (id: string, name: string) => {
    Alert.alert(
      "Remove Facility",
      `Remove "${name}" from your facilities?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeFacility(id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  };

  const handleOpenUrl = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Linking.openURL(url);
    } catch (error) {
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
          { text: "Copy Email", onPress: () => {
            // Can't use Clipboard directly, but user can manually copy
          }},
          { text: "OK" },
        ]
      );
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing Fields", "Please fill in all password fields");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Weak Password", "New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords Don't Match", "New password and confirmation must match");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await getAuthToken()}`,
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
        console.error("Change password response was not JSON:", responseText.substring(0, 200));
        throw new Error("Server returned an unexpected response. Please try again.");
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

  const getAuthToken = async (): Promise<string> => {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    return await AsyncStorage.getItem("authToken") || "";
  };

  return (
    <>
      <KeyboardAwareScrollViewCompat
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            ACCOUNT
          </ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
            <Pressable
              style={styles.profileHeader}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("EditProfile");
              }}
            >
              <View style={[styles.avatarContainer, { backgroundColor: theme.link + "15", overflow: "hidden" }]}>
                {profile?.profilePictureUrl ? (
                  <Image
                    source={{ uri: `${getApiUrl()}${profile.profilePictureUrl}` }}
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
                <ThemedText style={[styles.profileEmail, { color: theme.textSecondary }]}>
                  {user?.email}
                </ThemedText>
                {profile?.careerStage ? (
                  <ThemedText style={[styles.profileDetail, { color: theme.textTertiary }]}>
                    {CAREER_STAGE_LABELS[profile.careerStage] || profile.careerStage}
                  </ThemedText>
                ) : null}
              </View>
              <Feather name="chevron-right" size={20} color={theme.textTertiary} />
            </Pressable>
            <View style={[styles.profileDetailsRow, { borderTopColor: theme.border }]}>
              <View style={styles.profileDetailItem}>
                <ThemedText style={[styles.profileDetailLabel, { color: theme.textSecondary }]}>
                  Country
                </ThemedText>
                <ThemedText style={styles.profileDetailValue}>
                  {profile?.countryOfPractice ? COUNTRY_OF_PRACTICE_LABELS[profile.countryOfPractice] || profile.countryOfPractice : "Not set"}
                </ThemedText>
              </View>
              <View style={styles.profileDetailItem}>
                <ThemedText style={[styles.profileDetailLabel, { color: theme.textSecondary }]}>
                  Coding System
                </ThemedText>
                <ThemedText style={styles.profileDetailValue} numberOfLines={1}>
                  {getCodingSystemForProfile(profile?.countryOfPractice).split(' (')[0]}
                </ThemedText>
              </View>
            </View>
            {profile?.medicalCouncilNumber ? (
              <View style={[styles.profileDetailsRow, { borderTopColor: theme.border }]}>
                <View style={styles.profileDetailItem}>
                  <ThemedText style={[styles.profileDetailLabel, { color: theme.textSecondary }]}>
                    Registration
                  </ThemedText>
                  <ThemedText style={styles.profileDetailValue}>
                    {profile.medicalCouncilNumber}
                  </ThemedText>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            SECURITY
          </ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
            <SettingsItem
              icon="shield"
              label="App Lock"
              subtitle="PIN and biometric protection"
              value={isAppLockConfigured ? "On" : "Off"}
              onPress={() => navigation.navigate("SetupAppLock")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="lock"
              label="Change Password"
              subtitle="Update your account password"
              onPress={() => setShowChangePasswordModal(true)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            APPEARANCE
          </ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault, padding: Spacing.md }]}>
            <View style={[styles.themeSegmented, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
              {([
                { value: "light" as const, label: "Light", icon: "sun" as const },
                { value: "dark" as const, label: "Dark", icon: "moon" as const },
                { value: "system" as const, label: "System", icon: "smartphone" as const },
              ]).map((opt) => {
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
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            FACILITIES
          </ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
            <SettingsItem
              icon="home"
              label="My Facilities"
              subtitle={`${facilities.length} ${facilities.length === 1 ? 'hospital' : 'hospitals'}`}
              onPress={() => setShowFacilitiesModal(true)}
            />
          </View>
        </View>


        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            DATA
          </ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
            <SettingsItem
              icon="download"
              label="Export Cases"
              subtitle={caseCount !== null ? `${caseCount} cases` : undefined}
              onPress={handleExport}
            />
            {__DEV__ ? (
              <SettingsItem
                icon="check-circle"
                label="Validate Migration"
                subtitle="DEV — checks all cases"
                onPress={handleValidateMigration}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            PRIVACY
          </ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.privacyInfo}>
              <View style={[styles.privacyBadge, { backgroundColor: theme.success + "15" }]}>
                <Feather name="shield" size={20} color={theme.success} />
              </View>
              <View style={styles.privacyText}>
                <ThemedText style={styles.privacyTitle}>Local-First Privacy</ThemedText>
                <ThemedText style={[styles.privacyDescription, { color: theme.textSecondary }]}>
                  All your case data is stored locally on this device. Photos are processed on-device and never uploaded. Sensitive information like NHI numbers are automatically redacted before AI analysis.
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            ABOUT
          </ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.aboutItem}>
              <ThemedText style={styles.aboutLabel}>Version</ThemedText>
              <ThemedText style={[styles.aboutValue, { color: theme.textSecondary }]}>
                v{APP_VERSION} (Build {BUILD_NUMBER})
              </ThemedText>
            </View>
            <View style={styles.aboutItem}>
              <ThemedText style={styles.aboutLabel}>Developed by</ThemedText>
              <ThemedText style={[styles.aboutValue, { color: theme.textSecondary }]}>
                Dr. Mateusz Gladysz
              </ThemedText>
            </View>
            <View style={styles.aboutItem}>
              <ThemedText style={styles.aboutLabel}>Location</ThemedText>
              <ThemedText style={[styles.aboutValue, { color: theme.textSecondary }]}>
                New Zealand
              </ThemedText>
            </View>
            <View style={[styles.aboutItem, { borderBottomWidth: 0 }]}>
              <ThemedText style={styles.aboutLabel}>Procedure Coding</ThemedText>
              <ThemedText style={[styles.aboutValue, { color: theme.textSecondary }]}>
                SNOMED CT
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            LEGAL
          </ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
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
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            SUPPORT
          </ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
            <SettingsItem
              icon="mail"
              label="Send Feedback"
              subtitle="Report bugs or suggest features"
              onPress={handleSendFeedback}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            ACCOUNT
          </ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
            <SettingsItem
              icon="log-out"
              label="Sign Out"
              onPress={handleLogout}
              destructive
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            DANGER ZONE
          </ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault }]}>
            <SettingsItem
              icon="trash-2"
              label="Clear All Data"
              onPress={handleClearData}
              destructive
            />
          </View>
        </View>

        <View style={styles.disclaimerContainer}>
          <ThemedText style={[styles.disclaimerText, { color: theme.textTertiary }]}>
            Opus is a documentation tool. The treating surgeon remains solely responsible for patient care and clinical records. This app does not provide medical advice.
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>

      <Modal
        visible={showFacilitiesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFacilitiesModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFacilitiesModal(false)}
        >
          <View 
            style={[styles.facilitiesModalContent, { backgroundColor: theme.backgroundDefault }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.facilitiesModalHeader}>
              <ThemedText style={styles.modalTitle}>My Hospitals</ThemedText>
              <Pressable onPress={() => setShowFacilitiesModal(false)}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Select the hospitals where you operate. Only these will appear when logging cases.
            </ThemedText>
            
            <Pressable
              style={[styles.addFromListButton, { backgroundColor: theme.link }]}
              onPress={() => {
                setShowFacilitiesModal(false);
                setShowFacilitySelector(true);
              }}
            >
              <Feather name="plus" size={18} color="#FFF" />
              <ThemedText style={styles.addFromListButtonText}>Add from Hospital List</ThemedText>
            </Pressable>

            {facilities.length > 0 ? (
              facilities.map((facility) => {
                const displayName = facility.facilityName || (facility as any).facility_name || "Unknown Facility";
                return (
                <View
                  key={facility.id}
                  style={[styles.facilityItem, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <View style={styles.facilityItemInfo}>
                    <Feather name="home" size={16} color={theme.textSecondary} />
                    <View style={styles.facilityItemTextContainer}>
                      <ThemedText style={styles.facilityItemName}>{displayName}</ThemedText>
                      {facility.facilityId || (facility as any).facility_id ? (
                        <ThemedText style={[styles.facilityItemId, { color: theme.textTertiary }]}>
                          Verified facility
                        </ThemedText>
                      ) : null}
                    </View>
                    {facility.isPrimary || (facility as any).is_primary ? (
                      <View style={[styles.primaryBadge, { backgroundColor: theme.link + "20" }]}>
                        <ThemedText style={[styles.primaryBadgeText, { color: theme.link }]}>Primary</ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <Pressable onPress={() => handleRemoveFacility(facility.id, displayName)}>
                    <Feather name="x" size={18} color={theme.error} />
                  </Pressable>
                </View>
              );
              })
            ) : (
              <View style={styles.emptyFacilities}>
                <Feather name="home" size={32} color={theme.textTertiary} />
                <ThemedText style={[styles.emptyFacilitiesText, { color: theme.textSecondary }]}>
                  No hospitals selected yet
                </ThemedText>
                <ThemedText style={[styles.emptyFacilitiesHint, { color: theme.textTertiary }]}>
                  Tap "Add from Hospital List" to get started
                </ThemedText>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>

      <FacilitySelector
        visible={showFacilitySelector}
        onClose={() => setShowFacilitySelector(false)}
        onSelect={handleSelectFacility}
        countryCode={countryCode}
        selectedFacilityIds={selectedFacilityIds}
        title="Add Hospital"
      />

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
            style={[styles.passwordModalContent, { backgroundColor: theme.backgroundDefault }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.facilitiesModalHeader}>
              <ThemedText style={styles.modalTitle}>Change Password</ThemedText>
              <Pressable onPress={() => setShowChangePasswordModal(false)}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Enter your current password and choose a new one.
            </ThemedText>

            <View style={styles.passwordInputContainer}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Current Password
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Enter current password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
                testID="input-current-password"
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                New Password
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Enter new password (min 8 characters)"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                testID="input-new-password"
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Confirm New Password
              </ThemedText>
              <TextInput
                style={[
                  styles.passwordInput,
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Confirm new password"
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                testID="input-confirm-password"
              />
            </View>

            <Pressable
              style={[
                styles.changePasswordButton,
                { backgroundColor: theme.link },
                isChangingPassword && { opacity: 0.7 }
              ]}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
              testID="button-change-password"
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
