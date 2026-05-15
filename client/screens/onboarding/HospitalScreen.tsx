import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StepHeader } from "@/components/onboarding/StepHeader";
import {
  getFacilityById,
  searchFacilities,
  SUPPORTED_COUNTRIES,
  type MasterFacility,
  type SupportedCountryCode,
} from "@/data/facilities";
import { copy } from "@/constants/onboardingCopy";
import { Colors, palette } from "@/constants/theme";

const dark = Colors.dark;
const SIDE_PADDING = 24;
const MAX_VISIBLE_RESULTS = 5;
const RESULT_ROW_HEIGHT = 48;

const PROGRAMME_COUNTRY_MAP: Record<string, string[]> = {
  iscp: ["UK"],
  racs: ["NZ", "AU"],
  acgme: ["US"],
  febopras: ["UK", "CH", "DE", "AT"],
};

export interface HospitalSelection {
  name: string;
  facilityId?: string;
}

interface Props {
  initialHospitals?: HospitalSelection[];
  onBack?: () => void;
  onComplete: (hospitals: HospitalSelection[]) => Promise<void> | void;
  trainingProgramme?: string | null;
}

function normalizeHospitalName(name: string) {
  return name.trim().toLowerCase();
}

function isSameHospitalSelection(
  left: HospitalSelection,
  right: HospitalSelection,
) {
  if (left.facilityId && right.facilityId) {
    return left.facilityId === right.facilityId;
  }

  return normalizeHospitalName(left.name) === normalizeHospitalName(right.name);
}

function dedupeHospitals(hospitals: HospitalSelection[]) {
  return hospitals.reduce<HospitalSelection[]>((acc, hospital) => {
    if (acc.some((item) => isSameHospitalSelection(item, hospital))) {
      return acc;
    }

    return [...acc, hospital];
  }, []);
}

function getInitialCountryCode(
  initialHospitals: HospitalSelection[],
  trainingProgramme: string | null | undefined,
): SupportedCountryCode | null {
  const supportedCountryCodes = new Set(
    SUPPORTED_COUNTRIES.map((country) => country.code),
  );

  for (const hospital of initialHospitals) {
    if (!hospital.facilityId) {
      continue;
    }

    const facilityCountryCode = getFacilityById(hospital.facilityId)?.country;
    if (
      facilityCountryCode &&
      supportedCountryCodes.has(facilityCountryCode as SupportedCountryCode)
    ) {
      return facilityCountryCode as SupportedCountryCode;
    }
  }

  const suggestedCountryCodes = trainingProgramme
    ? (PROGRAMME_COUNTRY_MAP[trainingProgramme] ?? [])
    : [];
  const supportedSuggestedCountryCode = suggestedCountryCodes.find((country) =>
    supportedCountryCodes.has(country as SupportedCountryCode),
  );
  if (supportedSuggestedCountryCode) {
    return supportedSuggestedCountryCode as SupportedCountryCode;
  }

  if (SUPPORTED_COUNTRIES.length === 1) {
    return SUPPORTED_COUNTRIES[0]?.code ?? null;
  }

  return null;
}

export function HospitalScreen({
  initialHospitals = [],
  onBack,
  onComplete,
  trainingProgramme,
}: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [selectedHospitals, setSelectedHospitals] = useState<
    HospitalSelection[]
  >(() => dedupeHospitals(initialHospitals));
  const [selectedCountryCode, setSelectedCountryCode] =
    useState<SupportedCountryCode | null>(() =>
      getInitialCountryCode(initialHospitals, trainingProgramme),
    );
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownOpacity = useSharedValue(0);

  const filteredHospitals = useMemo(() => {
    if (!selectedCountryCode || query.trim().length < 1) {
      return [];
    }

    return searchFacilities(query, selectedCountryCode).filter(
      (hospital) =>
        !selectedHospitals.some((selectedHospital) =>
          isSameHospitalSelection(selectedHospital, {
            name: hospital.name,
            facilityId: hospital.id,
          }),
        ),
    );
  }, [query, selectedCountryCode, selectedHospitals]);

  const addHospitalSelection = useCallback((hospital: HospitalSelection) => {
    setSelectedHospitals((prev) => dedupeHospitals([...prev, hospital]));
  }, []);

  const removeHospitalSelection = useCallback((hospital: HospitalSelection) => {
    setSelectedHospitals((prev) =>
      prev.filter((item) => !isSameHospitalSelection(item, hospital)),
    );
  }, []);

  const handleQueryChange = useCallback(
    (text: string) => {
      if (!selectedCountryCode) {
        return;
      }

      setQuery(text);
      setShowDropdown(true);
    },
    [selectedCountryCode],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (selectedCountryCode && query.trim().length > 0) {
      setShowDropdown(true);
    }
  }, [query, selectedCountryCode]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setTimeout(() => setShowDropdown(false), 200);
  }, []);

  const handleSelectHospital = useCallback(
    (hospital: MasterFacility) => {
      addHospitalSelection({
        name: hospital.name,
        facilityId: hospital.id,
      });
      setQuery("");
      setShowDropdown(false);
      inputRef.current?.focus();
    },
    [addHospitalSelection],
  );

  React.useEffect(() => {
    dropdownOpacity.value = withTiming(
      showDropdown && filteredHospitals.length > 0 ? 1 : 0,
      { duration: 150, easing: Easing.out(Easing.ease) },
    );
  }, [dropdownOpacity, filteredHospitals.length, showDropdown]);

  const dropdownStyle = useAnimatedStyle(() => ({
    opacity: dropdownOpacity.value,
  }));

  const canContinue = !isSubmitting && selectedHospitals.length > 0;

  const handleContinue = async () => {
    if (selectedHospitals.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete(selectedHospitals);
      setQuery("");
    } catch (error: any) {
      Alert.alert(
        "Unable to save hospitals",
        error?.message || "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await onComplete([]);
    } catch (error: any) {
      Alert.alert(
        "Unable to save hospitals",
        error?.message || "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const c = copy.hospital;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        testID="screen-onboardingHospital"
        style={[styles.root, { paddingBottom: insets.bottom + 20 }]}
      >
        <StepHeader currentStep={3} onBack={onBack} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={styles.headline}>{c.headline}</Text>
          <Text style={styles.subhead}>{c.subhead}</Text>
          <Text style={styles.countryLabel}>Country</Text>
          <View style={styles.countryRow}>
            {SUPPORTED_COUNTRIES.map((country) => {
              const isSelected = selectedCountryCode === country.code;
              return (
                <Pressable
                  key={country.code}
                  style={[
                    styles.countryChip,
                    isSelected && styles.countryChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedCountryCode(country.code);
                    setQuery("");
                    setShowDropdown(false);
                    inputRef.current?.focus();
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={country.name}
                  accessibilityState={{ selected: isSelected }}
                  testID={`onboarding.hospital.chip-country-${country.code}`}
                >
                  <Text
                    style={[
                      styles.countryChipText,
                      isSelected && styles.countryChipTextSelected,
                    ]}
                  >
                    {country.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.countryHelp}>
            Curated hospital lists are currently available for New Zealand only.
          </Text>

          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchField,
                !selectedCountryCode && styles.searchFieldDisabled,
                isFocused && styles.searchFieldFocused,
              ]}
            >
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder={
                  selectedCountryCode
                    ? c.searchPlaceholder
                    : "Select a country first"
                }
                placeholderTextColor="#636366"
                value={query}
                onChangeText={handleQueryChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onSubmitEditing={() => Keyboard.dismiss()}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                editable={!!selectedCountryCode}
                accessibilityLabel="Search hospitals"
                accessibilityHint="Type to search the curated hospital list"
                testID="onboarding.hospital.input-search"
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  testID="onboarding.hospital.btn-clearSearch"
                >
                  <Text style={styles.clearButton}>✕</Text>
                </Pressable>
              ) : null}
            </View>

            <Animated.View
              style={[styles.dropdown, dropdownStyle]}
              pointerEvents={
                showDropdown && filteredHospitals.length > 0 ? "auto" : "none"
              }
            >
              <ScrollView
                style={{ maxHeight: MAX_VISIBLE_RESULTS * RESULT_ROW_HEIGHT }}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                {filteredHospitals.map((hospital, index) => (
                  <Pressable
                    key={hospital.id}
                    style={[
                      styles.resultRow,
                      index < filteredHospitals.length - 1 &&
                        styles.resultSeparator,
                    ]}
                    onPress={() => handleSelectHospital(hospital)}
                    accessibilityRole="button"
                    accessibilityLabel={`${hospital.name}, ${hospital.region}, ${hospital.type === "public" ? "Public" : "Private"}`}
                    testID={`onboarding.hospital.row-result-${hospital.id}`}
                  >
                    <Text style={styles.resultName} numberOfLines={1}>
                      {hospital.name}
                    </Text>
                    <Text style={styles.resultLocation} numberOfLines={1}>
                      {hospital.region} •{" "}
                      {hospital.type === "public" ? "Public" : "Private"}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>

            {showDropdown &&
            filteredHospitals.length === 0 &&
            !!selectedCountryCode &&
            query.trim().length > 0 ? (
              <Text style={styles.emptyState}>No curated hospitals found.</Text>
            ) : null}
          </View>

          {selectedHospitals.length > 0 ? (
            <View style={styles.selectedList}>
              {selectedHospitals.map((hospital) => (
                <View
                  key={hospital.facilityId ?? hospital.name}
                  style={styles.selectedBadge}
                  accessible
                  accessibilityLabel={`Selected hospital: ${hospital.name}`}
                  accessibilityRole="text"
                  testID={`onboarding.hospital.badge-selected-${hospital.facilityId ?? hospital.name}`}
                >
                  <Text style={styles.selectedText}>{hospital.name}</Text>
                  <Pressable
                    onPress={() => removeHospitalSelection(hospital)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Remove ${hospital.name}`}
                    accessibilityRole="button"
                    testID={`onboarding.hospital.btn-remove-${hospital.facilityId ?? hospital.name}`}
                  >
                    <Text style={styles.selectedRemove}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottomArea}>
          <Pressable
            style={[styles.ctaButton, !canContinue && styles.ctaDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}
            accessibilityLabel={c.cta}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canContinue, busy: isSubmitting }}
            testID="onboarding.hospital.btn-continue"
          >
            <Text style={styles.ctaText}>
              {isSubmitting ? "Saving..." : c.cta}
            </Text>
          </Pressable>

          <Pressable
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isSubmitting}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={c.skip}
            accessibilityRole="link"
            accessibilityState={{ disabled: isSubmitting }}
            testID="onboarding.hospital.btn-skip"
          >
            <Text style={styles.skipText}>{c.skip}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: palette.charcoal[950],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 24,
  },
  headline: {
    fontSize: 28,
    fontWeight: "600",
    color: dark.text,
  },
  subhead: {
    fontSize: 15,
    fontWeight: "400",
    color: "#AEAEB2",
    marginTop: 8,
    lineHeight: 22,
  },
  countryLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#AEAEB2",
    marginTop: 28,
  },
  countryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  countryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#38383A",
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countryChipSelected: {
    borderColor: palette.amber[600],
    backgroundColor: "rgba(229, 160, 13, 0.08)",
  },
  countryChipText: {
    fontSize: 15,
    fontWeight: "500",
    color: dark.text,
  },
  countryChipTextSelected: {
    color: palette.amber[600],
  },
  countryHelp: {
    fontSize: 13,
    lineHeight: 20,
    color: "#636366",
    marginTop: 10,
  },
  searchContainer: {
    marginTop: 24,
    zIndex: 10,
  },
  searchField: {
    height: 56,
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38383A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  searchFieldFocused: {
    borderColor: palette.amber[600],
  },
  searchFieldDisabled: {
    opacity: 0.6,
  },
  searchIcon: {
    fontSize: 16,
    color: "#636366",
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: dark.text,
  },
  clearButton: {
    fontSize: 14,
    color: "#636366",
    padding: 4,
  },
  dropdown: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38383A",
    marginTop: 4,
    overflow: "hidden",
  },
  resultRow: {
    height: RESULT_ROW_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  resultSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: "#38383A",
  },
  resultName: {
    fontSize: 15,
    fontWeight: "400",
    color: dark.text,
  },
  resultLocation: {
    fontSize: 13,
    fontWeight: "400",
    color: "#AEAEB2",
    marginTop: 1,
  },
  emptyState: {
    fontSize: 13,
    color: "#636366",
    marginTop: 12,
  },
  selectedList: {
    marginTop: 20,
    gap: 12,
  },
  selectedBadge: {
    backgroundColor: "rgba(229, 160, 13, 0.08)",
    borderWidth: 1,
    borderColor: "#E5A00D",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectedText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: dark.text,
  },
  selectedRemove: {
    fontSize: 14,
    color: palette.amber[600],
    padding: 4,
  },
  bottomArea: {
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 16,
    gap: 12,
    alignItems: "center",
  },
  ctaButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: palette.amber[600],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "600",
    color: dark.buttonText,
  },
  skipButton: {
    padding: 4,
  },
  skipText: {
    fontSize: 15,
    color: "#636366",
  },
});
