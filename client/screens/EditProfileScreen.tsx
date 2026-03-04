import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, Typography } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

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

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { profile, updateProfile, uploadProfilePicture, deleteProfilePicture } =
    useAuth();

  const [firstName, setFirstName] = useState(profile?.firstName || "");
  const [lastName, setLastName] = useState(profile?.lastName || "");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    profile?.dateOfBirth ? new Date(profile.dateOfBirth) : null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sex, setSex] = useState<string | null>(profile?.sex || null);
  const [countryOfPractice, setCountryOfPractice] = useState(
    profile?.countryOfPractice || "",
  );
  const [careerStage, setCareerStage] = useState(profile?.careerStage || "");
  const [medicalCouncilNumber, setMedicalCouncilNumber] = useState(
    profile?.medicalCouncilNumber || "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);

  // Derive legacy fullName from first + last for backward compat
  const derivedFullName =
    [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null;

  const avatarUrl = profile?.profilePictureUrl
    ? `${getApiUrl()}${profile.profilePictureUrl}`
    : null;

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
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: derivedFullName,
        dateOfBirth: dateOfBirth
          ? dateOfBirth.toISOString().split("T")[0]
          : null,
        sex,
        countryOfPractice: countryOfPractice || null,
        careerStage: careerStage || null,
        medicalCouncilNumber: medicalCouncilNumber.trim() || null,
      });
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

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.lg,
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
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="words"
              testID="input-first-name"
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
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="words"
              testID="input-last-name"
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
            <Pressable
              style={[
                styles.fieldInput,
                styles.dateButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <ThemedText
                style={{ color: dateOfBirth ? theme.text : theme.textTertiary }}
              >
                {dateOfBirth ? formatDate(dateOfBirth) : "Select date"}
              </ThemedText>
              <Feather name="calendar" size={18} color={theme.textSecondary} />
            </Pressable>
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
                themeVariant="dark"
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
                      setCountryOfPractice(country.value);
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
                      setCareerStage(stage.value);
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
                      {stage.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Medical Council Number */}
          <View style={styles.fieldRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Registration Number
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
              value={medicalCouncilNumber}
              onChangeText={setMedicalCouncilNumber}
              placeholder="e.g. MCNZ 12345"
              placeholderTextColor={theme.textTertiary}
              testID="input-registration"
            />
          </View>
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
          testID="button-save-profile"
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
  datePickerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
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
