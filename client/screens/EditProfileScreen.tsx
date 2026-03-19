import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@/components/FeatherIcon";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import {
  PROFESSIONAL_REGISTRATION_OPTIONS,
  getLegacyMedicalCouncilNumber,
  getProfessionalRegistrations,
  getRegistrationJurisdictionForCountry,
  type ProfessionalRegistrationJurisdiction,
  type ProfessionalRegistrations,
  normalizeProfessionalRegistrations,
} from "@shared/professionalRegistrations";

const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const COUNTRIES = [
  { value: "new_zealand", label: "New Zealand" },
  { value: "australia", label: "Australia" },
  { value: "united_kingdom", label: "United Kingdom" },
  { value: "united_states", label: "United States" },
  { value: "poland", label: "Poland" },
  { value: "other", label: "Other" },
];

const CAREER_STAGES = [
  { value: "junior_house_officer", label: "Junior House Officer" },
  { value: "registrar_non_training", label: "Registrar (Non-Training)" },
  { value: "set_trainee", label: "SET Trainee" },
  { value: "fellow", label: "Fellow" },
  { value: "consultant_specialist", label: "Consultant / Specialist" },
  { value: "moss", label: "Medical Officer Special Scale" },
];

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function parseIsoDate(date: string | null | undefined): Date | null {
  if (!date) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = date.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFilledRegistrationJurisdictions(
  registrations: ProfessionalRegistrations | undefined,
) {
  return PROFESSIONAL_REGISTRATION_OPTIONS.flatMap((option) =>
    registrations?.[option.id]?.trim() ? [option.id] : [],
  );
}

export default function EditProfileScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { profile, updateProfile, uploadProfilePicture, deleteProfilePicture } =
    useAuth();

  const [firstName, setFirstName] = useState(profile?.firstName || "");
  const [lastName, setLastName] = useState(profile?.lastName || "");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    parseIsoDate(profile?.dateOfBirth),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sex, setSex] = useState<string | null>(profile?.sex || null);
  const [countryOfPractice, setCountryOfPractice] = useState(
    profile?.countryOfPractice || "",
  );
  const [careerStage, setCareerStage] = useState(profile?.careerStage || "");
  const [professionalRegistrations, setProfessionalRegistrations] =
    useState<ProfessionalRegistrations>(
      () =>
        getProfessionalRegistrations(
          profile?.professionalRegistrations,
          profile?.medicalCouncilNumber,
          profile?.countryOfPractice,
        ) ?? {},
    );
  const [activeRegistrationJurisdictions, setActiveRegistrationJurisdictions] =
    useState<ProfessionalRegistrationJurisdiction[]>(() =>
      getFilledRegistrationJurisdictions(
        getProfessionalRegistrations(
          profile?.professionalRegistrations,
          profile?.medicalCouncilNumber,
          profile?.countryOfPractice,
        ),
      ),
    );
  const [showRegistrations, setShowRegistrations] = useState(
    activeRegistrationJurisdictions.length > 0,
  );
  const [showRegistrationPicker, setShowRegistrationPicker] = useState(false);
  const [hasLocalEdits, setHasLocalEdits] = useState(false);

  const handleRegistrationChange = (
    jurisdiction: ProfessionalRegistrationJurisdiction,
    value: string,
  ) => {
    setHasLocalEdits(true);
    setProfessionalRegistrations((prev) => ({
      ...prev,
      [jurisdiction]: value,
    }));
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);

  const hydrateForm = useCallback(() => {
    if (!profile) {
      return;
    }

    const resolvedRegistrations =
      getProfessionalRegistrations(
        profile.professionalRegistrations,
        profile.medicalCouncilNumber,
        profile.countryOfPractice,
      ) ?? {};
    const filledRegistrationJurisdictions = getFilledRegistrationJurisdictions(
      resolvedRegistrations,
    );

    setFirstName(profile.firstName || "");
    setLastName(profile.lastName || "");
    setDateOfBirth(parseIsoDate(profile.dateOfBirth));
    setSex(profile.sex || null);
    setCountryOfPractice(profile.countryOfPractice || "");
    setCareerStage(profile.careerStage || "");
    setProfessionalRegistrations(resolvedRegistrations);
    setActiveRegistrationJurisdictions(filledRegistrationJurisdictions);
    setShowRegistrations(filledRegistrationJurisdictions.length > 0);
    setShowRegistrationPicker(false);
    setHasLocalEdits(false);
  }, [profile]);

  useEffect(() => {
    if (hasLocalEdits) {
      return;
    }
    hydrateForm();
  }, [hasLocalEdits, hydrateForm]);

  // Derive legacy fullName from first + last for backward compat
  const derivedFullName =
    [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null;

  const avatarUrl = profile?.profilePictureUrl
    ? `${getApiUrl()}${profile.profilePictureUrl}`
    : null;
  const suggestedRegistrationJurisdiction =
    getRegistrationJurisdictionForCountry(countryOfPractice || null);
  const availableRegistrationOptions = useMemo(
    () =>
      PROFESSIONAL_REGISTRATION_OPTIONS.filter(
        (option) => !activeRegistrationJurisdictions.includes(option.id),
      ),
    [activeRegistrationJurisdictions],
  );
  const activeRegistrationOptions = useMemo(
    () =>
      PROFESSIONAL_REGISTRATION_OPTIONS.filter((option) =>
        activeRegistrationJurisdictions.includes(option.id),
      ),
    [activeRegistrationJurisdictions],
  );

  const toggleRegistrations = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowRegistrations((prev) => !prev);
    if (showRegistrationPicker) {
      setShowRegistrationPicker(false);
    }
  };

  const addRegistrationJurisdiction = useCallback(
    (jurisdiction: ProfessionalRegistrationJurisdiction) => {
      setHasLocalEdits(true);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveRegistrationJurisdictions((prev) =>
        prev.includes(jurisdiction) ? prev : [...prev, jurisdiction],
      );
      setShowRegistrations(true);
      setShowRegistrationPicker(false);
    },
    [],
  );

  const removeRegistrationJurisdiction = useCallback(
    (jurisdiction: ProfessionalRegistrationJurisdiction) => {
      setHasLocalEdits(true);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveRegistrationJurisdictions((prev) =>
        prev.filter((value) => value !== jurisdiction),
      );
      setProfessionalRegistrations((prev) => {
        const next = { ...prev };
        delete next[jurisdiction];
        return next;
      });
    },
    [],
  );

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to set a profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setIsUploadingPicture(true);
    try {
      await uploadProfilePicture(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Upload Error", error.message || "Failed to upload picture");
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleRemovePicture = () => {
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove your profile photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProfilePicture();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to remove picture");
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert("Required", "First name is required");
      return;
    }
    if (!lastName.trim()) {
      Alert.alert("Required", "Last name is required");
      return;
    }

    setIsSaving(true);
    try {
      const normalizedProfessionalRegistrations =
        normalizeProfessionalRegistrations(professionalRegistrations);

      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: derivedFullName,
        dateOfBirth: dateOfBirth ? toIsoDate(dateOfBirth) : null,
        sex,
        countryOfPractice: countryOfPractice || null,
        careerStage: careerStage || null,
        professionalRegistrations: normalizedProfessionalRegistrations ?? {},
        medicalCouncilNumber: getLegacyMedicalCouncilNumber(
          normalizedProfessionalRegistrations,
          countryOfPractice || null,
        ),
      });
      setHasLocalEdits(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setHasLocalEdits(true);
      setDateOfBirth(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (!profile) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator color={theme.link} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      testID="screen-editProfile"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Spacing.lg,
          paddingBottom: insets.bottom + Spacing["3xl"],
        },
      ]}
    >
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <Pressable
          onPress={handlePickImage}
          style={[
            styles.avatarWrapper,
            { backgroundColor: theme.backgroundDefault },
          ]}
          testID="settings.profile.btn-pickAvatar"
        >
          {isUploadingPicture ? (
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.backgroundTertiary },
              ]}
            >
              <ActivityIndicator color={theme.link} size="large" />
            </View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View
              style={[styles.avatar, { backgroundColor: theme.link + "15" }]}
            >
              <Feather name="user" size={44} color={theme.link} />
            </View>
          )}
          <View style={[styles.cameraButton, { backgroundColor: theme.link }]}>
            <Feather name="camera" size={14} color="#FFF" />
          </View>
        </Pressable>
        <View style={styles.avatarActions}>
          <Pressable onPress={handlePickImage}>
            <ThemedText
              style={[styles.avatarActionText, { color: theme.link }]}
            >
              {avatarUrl ? "Change Photo" : "Add Photo"}
            </ThemedText>
          </Pressable>
          {avatarUrl ? (
            <Pressable onPress={handleRemovePicture}>
              <ThemedText
                style={[styles.avatarActionText, { color: theme.error }]}
              >
                Remove
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Name Section */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          PERSONAL DETAILS
        </ThemedText>
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={styles.fieldRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              First Name *
            </ThemedText>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              value={firstName}
              onChangeText={(value) => {
                setHasLocalEdits(true);
                setFirstName(value);
              }}
              placeholder="First name"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="words"
              testID="settings.profile.input-firstName"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.fieldRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Last Name *
            </ThemedText>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              value={lastName}
              onChangeText={(value) => {
                setHasLocalEdits(true);
                setLastName(value);
              }}
              placeholder="Last name"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="words"
              testID="settings.profile.input-lastName"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Date of Birth */}
          <View style={styles.fieldRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Date of Birth
            </ThemedText>
            <View style={styles.dateRow}>
              <Pressable
                style={[
                  styles.fieldInput,
                  styles.dateButton,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                    flex: 1,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText
                  style={{
                    color: dateOfBirth ? theme.text : theme.textTertiary,
                  }}
                >
                  {dateOfBirth ? formatDate(dateOfBirth) : "Select date"}
                </ThemedText>
                <Feather
                  name="calendar"
                  size={18}
                  color={theme.textSecondary}
                />
              </Pressable>
              {dateOfBirth ? (
                <Pressable
                  style={styles.clearDateButton}
                  onPress={() => {
                    setHasLocalEdits(true);
                    setDateOfBirth(null);
                    setShowDatePicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  hitSlop={8}
                >
                  <Feather
                    name="x-circle"
                    size={20}
                    color={theme.textTertiary}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={dateOfBirth || new Date(1990, 0, 1)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
                onChange={handleDateChange}
                themeVariant={isDark ? "dark" : "light"}
                style={styles.datePicker}
              />
              {Platform.OS === "ios" && (
                <Pressable
                  style={[
                    styles.datePickerDone,
                    { backgroundColor: theme.link },
                  ]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>
                    Done
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Sex */}
          <View style={styles.fieldRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Sex (Optional)
            </ThemedText>
            <View style={styles.optionPills}>
              {SEX_OPTIONS.map((option) => {
                const isSelected = sex === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.pill,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.backgroundSecondary,
                      },
                      isSelected && {
                        borderColor: theme.link,
                        backgroundColor: theme.link + "15",
                      },
                    ]}
                    onPress={() => {
                      setHasLocalEdits(true);
                      setSex(isSelected ? null : option.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.pillText,
                        { color: theme.text },
                        isSelected && { color: theme.link },
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Professional Details */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          PROFESSIONAL DETAILS
        </ThemedText>
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          {/* Country of Practice */}
          <View style={styles.fieldRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Country of Practice
            </ThemedText>
            <View style={styles.optionPills}>
              {COUNTRIES.map((country) => {
                const isSelected = countryOfPractice === country.value;
                return (
                  <Pressable
                    key={country.value}
                    style={[
                      styles.pill,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.backgroundSecondary,
                      },
                      isSelected && {
                        borderColor: theme.link,
                        backgroundColor: theme.link + "15",
                      },
                    ]}
                    onPress={() => {
                      setHasLocalEdits(true);
                      setCountryOfPractice(country.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    testID={`settings.profile.chip-country-${country.value}`}
                  >
                    <ThemedText
                      style={[
                        styles.pillText,
                        { color: theme.text },
                        isSelected && { color: theme.link },
                      ]}
                    >
                      {country.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Career Stage */}
          <View style={styles.fieldRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Career Stage
            </ThemedText>
            <View style={styles.optionPills}>
              {CAREER_STAGES.map((stage) => {
                const isSelected = careerStage === stage.value;
                return (
                  <Pressable
                    key={stage.value}
                    style={[
                      styles.pill,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.backgroundSecondary,
                      },
                      isSelected && {
                        borderColor: theme.link,
                        backgroundColor: theme.link + "15",
                      },
                    ]}
                    onPress={() => {
                      setHasLocalEdits(true);
                      setCareerStage(stage.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    testID={`settings.profile.option-careerStage-${stage.value}`}
                  >
                    <ThemedText
                      style={[
                        styles.pillText,
                        { color: theme.text },
                        isSelected && { color: theme.link },
                      ]}
                    >
                      {stage.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Professional registrations */}
          <Pressable style={styles.fieldRow} onPress={toggleRegistrations}>
            <View style={styles.registrationHeader}>
              <View style={styles.registrationHeaderCopy}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Professional Registrations
                </ThemedText>
                <ThemedText
                  style={[styles.fieldHelper, { color: theme.textSecondary }]}
                >
                  Add only the jurisdictions you actively hold.
                </ThemedText>
              </View>
              <View style={styles.registrationHeaderMeta}>
                <View
                  style={[
                    styles.registrationCountBadge,
                    { backgroundColor: theme.link + "15" },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.registrationCountText,
                      { color: theme.link },
                    ]}
                  >
                    {activeRegistrationJurisdictions.length === 0
                      ? "Optional"
                      : `${activeRegistrationJurisdictions.length} active`}
                  </ThemedText>
                </View>
                <Feather
                  name={showRegistrations ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={theme.textSecondary}
                />
              </View>
            </View>
          </Pressable>

          {showRegistrations ? (
            <>
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
              <View style={styles.registrationContent}>
                {suggestedRegistrationJurisdiction &&
                !activeRegistrationJurisdictions.includes(
                  suggestedRegistrationJurisdiction,
                ) ? (
                  <Pressable
                    style={[
                      styles.recommendedRegistrationButton,
                      {
                        backgroundColor: theme.link + "12",
                        borderColor: theme.link + "40",
                      },
                    ]}
                    onPress={() =>
                      addRegistrationJurisdiction(
                        suggestedRegistrationJurisdiction,
                      )
                    }
                  >
                    <Feather name="plus-circle" size={16} color={theme.link} />
                    <ThemedText
                      style={[
                        styles.recommendedRegistrationText,
                        { color: theme.link },
                      ]}
                    >
                      Add recommended registration for your country of practice
                    </ThemedText>
                  </Pressable>
                ) : null}

                {activeRegistrationOptions.length > 0 ? (
                  activeRegistrationOptions.map((option) => (
                    <View
                      key={option.id}
                      style={[
                        styles.registrationCard,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <View style={styles.registrationCardHeader}>
                        <View style={styles.registrationCardCopy}>
                          <ThemedText style={styles.registrationCardTitle}>
                            {option.authority === "Other"
                              ? option.label
                              : `${option.label} (${option.authority})`}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.registrationCardSubtitle,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Registration number
                          </ThemedText>
                        </View>
                        <Pressable
                          onPress={() =>
                            removeRegistrationJurisdiction(option.id)
                          }
                          hitSlop={8}
                        >
                          <Feather
                            name="x"
                            size={18}
                            color={theme.textTertiary}
                          />
                        </Pressable>
                      </View>
                      <TextInput
                        style={[
                          styles.fieldInput,
                          {
                            color: theme.text,
                            backgroundColor: theme.backgroundDefault,
                            borderColor: theme.border,
                          },
                        ]}
                        value={professionalRegistrations[option.id] ?? ""}
                        onChangeText={(value) =>
                          handleRegistrationChange(option.id, value)
                        }
                        placeholder={option.placeholder}
                        placeholderTextColor={theme.textTertiary}
                        testID={`settings.profile.input-registration-${option.id}`}
                      />
                    </View>
                  ))
                ) : (
                  <View style={styles.registrationEmptyState}>
                    <ThemedText
                      style={[
                        styles.registrationEmptyTitle,
                        { color: theme.textSecondary },
                      ]}
                    >
                      No registrations added yet
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.registrationEmptyText,
                        { color: theme.textTertiary },
                      ]}
                    >
                      Add the jurisdictions you currently hold and leave the
                      rest hidden.
                    </ThemedText>
                  </View>
                )}

                {availableRegistrationOptions.length > 0 ? (
                  <>
                    <Pressable
                      style={[
                        styles.addRegistrationButton,
                        {
                          backgroundColor: theme.backgroundDefault,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setShowRegistrationPicker((prev) => !prev)}
                    >
                      <Feather
                        name={showRegistrationPicker ? "minus" : "plus"}
                        size={16}
                        color={theme.link}
                      />
                      <ThemedText
                        style={[
                          styles.addRegistrationButtonText,
                          { color: theme.link },
                        ]}
                      >
                        Add jurisdiction
                      </ThemedText>
                    </Pressable>

                    {showRegistrationPicker ? (
                      <View style={styles.registrationPicker}>
                        {availableRegistrationOptions.map((option) => (
                          <Pressable
                            key={option.id}
                            style={[
                              styles.registrationPickerChip,
                              {
                                borderColor: theme.border,
                                backgroundColor: theme.backgroundDefault,
                              },
                            ]}
                            onPress={() =>
                              addRegistrationJurisdiction(option.id)
                            }
                          >
                            <ThemedText style={styles.registrationPickerText}>
                              {option.authority === "Other"
                                ? option.label
                                : `${option.label} (${option.authority})`}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.section}>
        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: theme.link },
            isSaving && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={isSaving}
          testID="settings.profile.btn-save"
        >
          {isSaving ? (
            <ActivityIndicator color={theme.buttonText} size="small" />
          ) : (
            <ThemedText
              style={[styles.saveButtonText, { color: theme.buttonText }]}
            >
              Save Changes
            </ThemedText>
          )}
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatarWrapper: {
    position: "relative",
    borderRadius: 60,
    ...Shadows.card,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  cameraButton: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  avatarActions: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  avatarActionText: {
    fontSize: 14,
    fontWeight: "600",
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
  sectionCard: {
    borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  fieldRow: {
    padding: Spacing.lg,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  fieldHelper: {
    fontSize: 13,
    lineHeight: 18,
  },
  registrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  registrationHeaderCopy: {
    flex: 1,
  },
  registrationHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  registrationCountBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  registrationCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
  registrationContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  recommendedRegistrationButton: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  recommendedRegistrationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  registrationCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  registrationCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  registrationCardCopy: {
    flex: 1,
  },
  registrationCardTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  registrationCardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  registrationEmptyState: {
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  registrationEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  registrationEmptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  addRegistrationButton: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  addRegistrationButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  registrationPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  registrationPickerChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  registrationPickerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  fieldInput: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  clearDateButton: {
    padding: Spacing.xs,
  },
  datePickerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    minHeight: 200,
  },
  datePicker: {
    height: 180,
  },
  datePickerDone: {
    alignSelf: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  optionPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  saveButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
