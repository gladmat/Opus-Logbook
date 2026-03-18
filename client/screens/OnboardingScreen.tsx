import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/FeatherIcon";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { FacilitySelector } from "@/components/FacilitySelector";
import { FacilityAutocomplete } from "@/components/FacilityAutocomplete";
import { MasterFacility } from "@/data/facilities";
import {
  getRegistrationJurisdictionForCountry,
  normalizeProfessionalRegistrations,
} from "@shared/professionalRegistrations";

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

type Step = "agreement" | "country" | "career" | "facilities";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme: colors } = useTheme();
  const {
    updateProfile,
    addFacility,
    removeFacility,
    setFacilityPrimary,
    facilities,
  } = useAuth();

  const [step, setStep] = useState<Step>("agreement");
  const [isLoading, setIsLoading] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementError, setAgreementError] = useState(false);

  const [countryOfPractice, setCountryOfPractice] = useState<string | null>(
    null,
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [medicalCouncilNumber, setMedicalCouncilNumber] = useState("");
  const [careerStage, setCareerStage] = useState<string | null>(null);
  const [newFacility, setNewFacility] = useState("");
  const [facilitySelectorVisible, setFacilitySelectorVisible] = useState(false);

  const getCountryCode = (country: string | null): string => {
    const mapping: Record<string, string> = {
      new_zealand: "NZ",
      australia: "AU",
      united_kingdom: "UK",
      united_states: "US",
      poland: "PL",
    };
    return country ? mapping[country] || "" : "";
  };

  const handleNext = async () => {
    if (step === "agreement") {
      if (!agreementAccepted) {
        setAgreementError(true);
        return;
      }
      setAgreementError(false);
      setStep("country");
    } else if (step === "country") {
      if (!countryOfPractice) {
        Alert.alert("Required", "Please select your country of practice");
        return;
      }
      if (!firstName.trim()) {
        Alert.alert("Required", "Please enter your first name");
        return;
      }
      if (!lastName.trim()) {
        Alert.alert("Required", "Please enter your last name");
        return;
      }
      setStep("career");
    } else if (step === "career") {
      if (!careerStage) {
        Alert.alert("Required", "Please select your career stage");
        return;
      }
      setStep("facilities");
    } else if (step === "facilities") {
      if (facilities.length === 0) {
        Alert.alert(
          "Required",
          "Please add at least one facility where you operate",
        );
        return;
      }
      setIsLoading(true);
      try {
        const registrationJurisdiction =
          getRegistrationJurisdictionForCountry(countryOfPractice) ?? "other";
        const professionalRegistrations = normalizeProfessionalRegistrations({
          [registrationJurisdiction]: medicalCouncilNumber.trim() || null,
        });

        await updateProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          countryOfPractice,
          medicalCouncilNumber: medicalCouncilNumber.trim() || null,
          professionalRegistrations: professionalRegistrations ?? {},
          careerStage,
          onboardingComplete: true,
        });
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to complete setup");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step === "country") setStep("agreement");
    else if (step === "career") setStep("country");
    else if (step === "facilities") setStep("career");
  };

  const handleAddFacility = async () => {
    if (!newFacility.trim()) return;
    setIsLoading(true);
    try {
      await addFacility(newFacility.trim(), facilities.length === 0);
      setNewFacility("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add facility");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVerifiedFacility = async (facility: MasterFacility) => {
    setFacilitySelectorVisible(false);
    setIsLoading(true);
    try {
      await addFacility(facility.name, facilities.length === 0, facility.id);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add facility");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "agreement":
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Welcome to Opus
            </Text>
            <Text
              style={[styles.stepDescription, { color: colors.textSecondary }]}
            >
              Please review and accept the following agreement before
              continuing.
            </Text>

            <View
              style={[
                styles.agreementContainer,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <ScrollView style={styles.agreementScroll} nestedScrollEnabled>
                <Text
                  style={[styles.agreementSectionTitle, { color: colors.text }]}
                >
                  Using Opus
                </Text>
                <Text
                  style={[
                    styles.agreementText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Opus is designed to facilitate the following:
                </Text>
                <View style={styles.agreementList}>
                  <Text
                    style={[
                      styles.agreementListItem,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {"\u2022"} Support for training, education and assessment
                  </Text>
                  <Text
                    style={[
                      styles.agreementListItem,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {"\u2022"} Production of a personal case log
                  </Text>
                  <Text
                    style={[
                      styles.agreementListItem,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {"\u2022"} Undertaking self-audit
                  </Text>
                  <Text
                    style={[
                      styles.agreementListItem,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {"\u2022"} Undertaking peer-review audit
                  </Text>
                </View>
                <Text
                  style={[
                    styles.agreementText,
                    { color: colors.textSecondary },
                  ]}
                >
                  This application does not warrant that its use is appropriate
                  in all cases, nor does it determine whether the data you
                  submit is accurate or free from errors.
                </Text>

                <Text
                  style={[
                    styles.agreementSectionTitle,
                    { color: colors.text, marginTop: Spacing.lg },
                  ]}
                >
                  Privacy and Consent
                </Text>
                <Text
                  style={[
                    styles.agreementText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Responsibility to comply with Privacy/Health Record laws when
                  collecting and using patient data lies with each individual
                  user. For this reason, de-identified data should be routinely
                  collected.
                </Text>
                <Text
                  style={[
                    styles.agreementText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Certain Training Boards and Societies have nominated the
                  collection of patient identifiers to facilitate logbook
                  approval. Irrespective of this, users should ensure there is
                  prior patient consent obtained for the collection and use of
                  personal, sensitive and health information.
                </Text>
                <Text
                  style={[
                    styles.agreementText,
                    { color: colors.textSecondary },
                  ]}
                >
                  This application is not responsible for patient information
                  collected and used. Please refer to hospital and/or surgical
                  practice privacy statements or patient information collection
                  statement/admission documentation for more information.
                </Text>

                <Text
                  style={[
                    styles.agreementSectionTitle,
                    { color: colors.text, marginTop: Spacing.lg },
                  ]}
                >
                  Reports for Training, Assessment and Education
                </Text>
                <Text
                  style={[
                    styles.agreementText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Some Training Boards and Societies mandate the use of logbook
                  applications, whilst others accept reports from such
                  applications (while not mandating) or do not accept reports.
                  If reports are accepted by a Training Board or Society, the
                  logbook data (summary of procedure counts only) may be viewed
                  on an ongoing basis.
                </Text>

                <Text
                  style={[
                    styles.agreementSectionTitle,
                    { color: colors.text, marginTop: Spacing.lg },
                  ]}
                >
                  Data Security
                </Text>
                <Text
                  style={[
                    styles.agreementText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Patient data is stored locally on your device and is not
                  transmitted to external servers. However, no warranty is made
                  as to the inherent risk of data being subject to unauthorised
                  access.
                </Text>
              </ScrollView>
            </View>

            <Pressable
              style={styles.checkboxRow}
              onPress={() => {
                setAgreementAccepted(!agreementAccepted);
                setAgreementError(false);
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: agreementError ? colors.error : colors.border,
                    backgroundColor: colors.backgroundSecondary,
                  },
                  agreementAccepted && {
                    backgroundColor: colors.link,
                    borderColor: colors.link,
                  },
                ]}
              >
                {agreementAccepted ? (
                  <Feather name="check" size={16} color="#FFF" />
                ) : null}
              </View>
              <Text
                style={[
                  styles.checkboxLabel,
                  { color: agreementError ? colors.error : colors.text },
                ]}
              >
                I have read and accept the above agreement
              </Text>
            </Pressable>
            {agreementError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>
                Please accept the agreement to continue
              </Text>
            ) : null}
          </View>
        );

      case "country":
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Your Profile
            </Text>
            <Text
              style={[styles.stepDescription, { color: colors.textSecondary }]}
            >
              {"Let's set up your profile. First, tell us where you practice."}
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              First Name
            </Text>
            <TextInput
              testID="onboarding.profile.input-firstName"
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Jane"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />

            <Text
              style={[
                styles.label,
                { color: colors.textSecondary, marginTop: Spacing.lg },
              ]}
            >
              Last Name
            </Text>
            <TextInput
              testID="onboarding.profile.input-lastName"
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Smith"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />

            <Text
              style={[
                styles.label,
                { color: colors.textSecondary, marginTop: Spacing.lg },
              ]}
            >
              Country of Practice
            </Text>
            <View style={styles.optionsGrid}>
              {COUNTRIES.map((country) => (
                <Pressable
                  key={country.value}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                    countryOfPractice === country.value && {
                      borderColor: colors.link,
                      backgroundColor: colors.link + "15",
                    },
                  ]}
                  onPress={() => setCountryOfPractice(country.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      countryOfPractice === country.value && {
                        color: colors.link,
                      },
                    ]}
                  >
                    {country.label}
                  </Text>
                  {countryOfPractice === country.value && (
                    <Feather name="check" size={18} color={colors.link} />
                  )}
                </Pressable>
              ))}
            </View>

            <Text
              style={[
                styles.label,
                { color: colors.textSecondary, marginTop: Spacing.lg },
              ]}
            >
              Medical Council Registration (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={medicalCouncilNumber}
              onChangeText={setMedicalCouncilNumber}
              placeholder="e.g. MCNZ 12345"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        );

      case "career":
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Career Stage
            </Text>
            <Text
              style={[styles.stepDescription, { color: colors.textSecondary }]}
            >
              Select your current training or practice level.
            </Text>

            <View style={styles.optionsList}>
              {CAREER_STAGES.map((stage) => (
                <Pressable
                  key={stage.value}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                    careerStage === stage.value && {
                      borderColor: colors.link,
                      backgroundColor: colors.link + "15",
                    },
                  ]}
                  onPress={() => setCareerStage(stage.value)}
                >
                  <Text
                    style={[
                      styles.optionRowText,
                      { color: colors.text },
                      careerStage === stage.value && { color: colors.link },
                    ]}
                  >
                    {stage.label}
                  </Text>
                  {careerStage === stage.value && (
                    <Feather
                      name="check-circle"
                      size={20}
                      color={colors.link}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        );

      case "facilities":
        const countryCode = getCountryCode(countryOfPractice);
        const hasVerifiedList = countryCode === "NZ";

        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Your Facilities
            </Text>
            <Text
              style={[styles.stepDescription, { color: colors.textSecondary }]}
            >
              Add the hospitals or clinics where you perform surgery.
            </Text>

            {hasVerifiedList ? (
              <View style={styles.facilityOptions}>
                <Pressable
                  style={[
                    styles.selectFacilityButton,
                    { backgroundColor: colors.link },
                  ]}
                  onPress={() => setFacilitySelectorVisible(true)}
                  disabled={isLoading}
                >
                  <Feather name="search" size={18} color="#FFF" />
                  <Text style={styles.selectFacilityButtonText}>
                    Search NZ Hospitals
                  </Text>
                </Pressable>

                <Text
                  style={[styles.orDivider, { color: colors.textTertiary }]}
                >
                  or search by name
                </Text>

                <FacilityAutocomplete
                  countryCode={countryCode}
                  onSelect={handleSelectVerifiedFacility}
                  selectedFacilityIds={facilities
                    .filter((f) => f.facilityId)
                    .map((f) => f.facilityId!)}
                  placeholder="Start typing hospital name..."
                  disabled={isLoading}
                />
              </View>
            ) : (
              <View style={styles.addFacilityRow}>
                <TextInput
                  style={[
                    styles.facilityInput,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={newFacility}
                  onChangeText={setNewFacility}
                  placeholder="Hospital or clinic name"
                  placeholderTextColor={colors.textTertiary}
                  onSubmitEditing={handleAddFacility}
                  returnKeyType="done"
                />
                <Pressable
                  style={[
                    styles.addButton,
                    {
                      backgroundColor: colors.link,
                      opacity: newFacility.trim() ? 1 : 0.5,
                    },
                  ]}
                  onPress={handleAddFacility}
                  disabled={!newFacility.trim() || isLoading}
                >
                  <Feather name="plus" size={22} color="#FFF" />
                </Pressable>
              </View>
            )}

            {facilities.length > 0 ? (
              <View style={styles.facilitiesList}>
                {facilities.map((facility, index) => (
                  <View
                    key={facility.id}
                    style={[
                      styles.facilityItem,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Pressable
                      style={styles.facilityInfo}
                      onPress={async () => {
                        if (!facility.isPrimary) {
                          try {
                            await setFacilityPrimary(facility.id);
                          } catch (error: any) {
                            Alert.alert(
                              "Error",
                              error.message || "Failed to set primary facility",
                            );
                          }
                        }
                      }}
                    >
                      <Feather
                        name="home"
                        size={18}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[styles.facilityName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {facility.facilityName}
                      </Text>
                      {facility.isPrimary ? (
                        <View
                          style={[
                            styles.primaryBadge,
                            { backgroundColor: colors.link + "20" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.primaryBadgeText,
                              { color: colors.link },
                            ]}
                          >
                            Primary
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.primaryBadgeText,
                            { color: colors.textTertiary },
                          ]}
                        >
                          Tap to set primary
                        </Text>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        try {
                          await removeFacility(facility.id);
                        } catch (error: any) {
                          Alert.alert(
                            "Error",
                            error.message || "Failed to remove facility",
                          );
                        }
                      }}
                      hitSlop={8}
                    >
                      <Feather name="x" size={18} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View
                style={[
                  styles.emptyState,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Feather name="home" size={32} color={colors.textTertiary} />
                <Text
                  style={[styles.emptyText, { color: colors.textSecondary }]}
                >
                  No facilities added yet
                </Text>
              </View>
            )}
          </View>
        );
    }
  };

  const getStepIndex = () => {
    switch (step) {
      case "agreement":
        return 0;
      case "country":
        return 1;
      case "career":
        return 2;
      case "facilities":
        return 3;
    }
  };
  const canGoBack = step !== "agreement";
  const buttonLabel =
    step === "agreement"
      ? "I Accept"
      : step === "facilities"
        ? "Complete Setup"
        : "Continue";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.progressContainer}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    i <= getStepIndex()
                      ? colors.link
                      : colors.backgroundTertiary,
                },
              ]}
            />
          ))}
        </View>

        {renderStep()}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: colors.backgroundRoot,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.footerButtons}>
          {canGoBack ? (
            <Pressable
              style={[styles.backButton, { borderColor: colors.border }]}
              onPress={handleBack}
              disabled={isLoading}
            >
              <Feather name="arrow-left" size={20} color={colors.text} />
              <Text style={[styles.backButtonText, { color: colors.text }]}>
                Back
              </Text>
            </Pressable>
          ) : (
            <View />
          )}

          <Pressable
            testID="onboarding.profile.btn-continue"
            style={[
              styles.nextButton,
              { backgroundColor: colors.link, opacity: isLoading ? 0.7 : 1 },
            ]}
            onPress={handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>{buttonLabel}</Text>
                {step !== "facilities" && (
                  <Feather name="arrow-right" size={20} color="#FFF" />
                )}
              </>
            )}
          </Pressable>
        </View>
      </View>

      <FacilitySelector
        visible={facilitySelectorVisible}
        onClose={() => setFacilitySelectorVisible(false)}
        onSelect={handleSelectVerifiedFacility}
        countryCode={getCountryCode(countryOfPractice)}
        selectedFacilityIds={facilities
          .filter((f) => f.facilityId)
          .map((f) => f.facilityId!)}
        title="Add Hospital"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing["3xl"],
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...Typography.h1,
    marginBottom: Spacing.sm,
  },
  stepDescription: {
    ...Typography.body,
    marginBottom: Spacing["2xl"],
  },
  label: {
    ...Typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    minWidth: "48%",
    flex: 1,
  },
  optionText: {
    ...Typography.bodySemibold,
  },
  optionsList: {
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
  },
  optionRowText: {
    ...Typography.bodySemibold,
  },
  facilityOptions: {
    gap: Spacing.md,
  },
  selectFacilityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  selectFacilityButtonText: {
    ...Typography.bodySemibold,
    color: "#FFF",
  },
  orDivider: {
    ...Typography.caption,
    textAlign: "center",
    marginVertical: Spacing.sm,
  },
  addFacilityRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  facilityInput: {
    flex: 1,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  addButton: {
    width: Spacing.inputHeight,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  facilitiesList: {
    gap: Spacing.sm,
  },
  facilityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  facilityInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  facilityName: {
    ...Typography.body,
    flex: 1,
  },
  primaryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  primaryBadgeText: {
    ...Typography.caption,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    borderRadius: BorderRadius.md,
  },
  emptyText: {
    ...Typography.body,
    marginTop: Spacing.sm,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  backButtonText: {
    ...Typography.bodySemibold,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.sm,
    minWidth: 140,
    justifyContent: "center",
  },
  nextButtonText: {
    ...Typography.bodySemibold,
    color: "#FFF",
  },
  agreementContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    maxHeight: 380,
  },
  agreementScroll: {
    padding: Spacing.lg,
  },
  agreementSectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  agreementText: {
    ...Typography.body,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  agreementList: {
    marginBottom: Spacing.md,
    paddingLeft: Spacing.sm,
  },
  agreementListItem: {
    ...Typography.body,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    ...Typography.body,
    flex: 1,
  },
  errorText: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
});
