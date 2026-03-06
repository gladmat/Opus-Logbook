import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { palette, Colors } from "@/constants/theme";
import { copy } from "@/constants/onboardingCopy";
import { HOSPITALS, type Hospital } from "@/constants/hospitals";

const dark = Colors.dark;
const SIDE_PADDING = 24;
const MAX_VISIBLE_RESULTS = 5;
const RESULT_ROW_HEIGHT = 48;

// ── Country mapping from training programme ─────────────────────────────────

const PROGRAMME_COUNTRY_MAP: Record<string, string[]> = {
  iscp: ["UK"],
  racs: ["NZ", "AU"],
  acgme: ["US"],
  febopras: ["UK", "CH", "DE", "AT"],
};

// ── Hospital Screen ─────────────────────────────────────────────────────────

interface Props {
  onComplete: (hospital: string | null) => void;
  trainingProgramme?: string | null;
}

export function HospitalScreen({ onComplete, trainingProgramme }: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownOpacity = useSharedValue(0);

  // Filter hospitals by query and optionally by country
  const filteredHospitals = useMemo(() => {
    if (query.trim().length < 1) return [];

    const q = query.toLowerCase();

    // Get country filter from training programme
    const countryFilter =
      trainingProgramme && PROGRAMME_COUNTRY_MAP[trainingProgramme];

    return HOSPITALS.filter((h) => {
      const matchesQuery =
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.country.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      // If we have a country filter, prioritise those countries
      // but still show all results (filtered hospitals come first via sort)
      return true;
    }).sort((a, b) => {
      if (!countryFilter) return 0;
      const aMatch = countryFilter.includes(a.country) ? 0 : 1;
      const bMatch = countryFilter.includes(b.country) ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [query, trainingProgramme]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setSelectedHospital(null);
    setShowDropdown(true);
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (query.trim().length > 0) {
      setShowDropdown(true);
    }
  }, [query]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Delay hiding dropdown so tap on result can register
    setTimeout(() => setShowDropdown(false), 200);
  }, []);

  const handleSelectHospital = useCallback((hospital: Hospital) => {
    setSelectedHospital(hospital.name);
    setQuery(hospital.name);
    setShowDropdown(false);
    Keyboard.dismiss();
  }, []);

  React.useEffect(() => {
    dropdownOpacity.value = withTiming(
      showDropdown && filteredHospitals.length > 0 ? 1 : 0,
      { duration: 150, easing: Easing.out(Easing.ease) },
    );
  }, [showDropdown, filteredHospitals.length]);

  const dropdownStyle = useAnimatedStyle(() => ({
    opacity: dropdownOpacity.value,
    pointerEvents: dropdownOpacity.value > 0.5 ? "auto" : "none",
  }));

  // Can continue if a hospital is selected or free-text is entered
  const canContinue =
    selectedHospital !== null || query.trim().length > 0;

  const handleContinue = () => {
    onComplete(selectedHospital ?? (query.trim() || null));
  };

  const handleSkip = () => {
    onComplete(null);
  };

  const c = copy.hospital;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <View style={[styles.root, { paddingBottom: insets.bottom + 20 }]}>
      {/* Step indicator */}
      <View style={styles.stepArea}>
        <StepIndicator currentStep={3} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Headline */}
        <Text style={styles.headline}>{c.headline}</Text>

        {/* Subhead */}
        <Text style={styles.subhead}>{c.subhead}</Text>

        {/* Search field */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchField,
              isFocused && styles.searchFieldFocused,
            ]}
          >
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder={c.searchPlaceholder}
              placeholderTextColor="#636366"
              value={query}
              onChangeText={handleQueryChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              accessibilityLabel="Search hospitals"
              accessibilityHint="Type to search for your hospital"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => {
                  setQuery("");
                  setSelectedHospital(null);
                  inputRef.current?.focus();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Text style={styles.clearButton}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Results dropdown */}
          <Animated.View style={[styles.dropdown, dropdownStyle]}>
            <ScrollView
              style={{
                maxHeight: MAX_VISIBLE_RESULTS * RESULT_ROW_HEIGHT,
              }}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {filteredHospitals.map((hospital, index) => (
                <Pressable
                  key={`${hospital.name}-${hospital.city}`}
                  style={[
                    styles.resultRow,
                    index < filteredHospitals.length - 1 &&
                      styles.resultSeparator,
                  ]}
                  onPress={() => handleSelectHospital(hospital)}
                >
                  <Text style={styles.resultName} numberOfLines={1}>
                    {hospital.name}
                  </Text>
                  <Text style={styles.resultLocation} numberOfLines={1}>
                    {hospital.city}, {hospital.country}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Empty state — no results */}
          {showDropdown &&
            filteredHospitals.length === 0 &&
            query.trim().length > 0 && (
              <Text style={styles.emptyState}>
                No results found. Type your hospital name to add it.
              </Text>
            )}
        </View>

        {/* Selected hospital display */}
        {selectedHospital && !showDropdown && (
          <View
            style={styles.selectedBadge}
            accessible
            accessibilityLabel={`Selected hospital: ${selectedHospital}`}
            accessibilityRole="text"
          >
            <Text style={styles.selectedText}>{selectedHospital}</Text>
            <Pressable
              onPress={() => {
                setSelectedHospital(null);
                setQuery("");
                inputRef.current?.focus();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Remove selected hospital"
              accessibilityRole="button"
            >
              <Text style={styles.selectedRemove}>✕</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Bottom actions */}
      <View style={styles.bottomArea}>
        {/* Continue button */}
        <Pressable
          style={[styles.ctaButton, !canContinue && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          accessibilityLabel={c.cta}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
        >
          <Text style={styles.ctaText}>{c.cta}</Text>
        </Pressable>

        {/* Skip link */}
        <Pressable
          style={styles.skipButton}
          onPress={handleSkip}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={c.skip}
          accessibilityRole="link"
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
  stepArea: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: SIDE_PADDING,
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
  searchContainer: {
    marginTop: 28,
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
    fontSize: 14,
    fontWeight: "400",
    color: "#636366",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 160, 13, 0.08)",
    borderWidth: 1,
    borderColor: palette.amber[600],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
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
    color: "#636366",
  },
  spacer: {
    flex: 1,
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
