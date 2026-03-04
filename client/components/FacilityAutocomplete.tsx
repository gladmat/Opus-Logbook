import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  Keyboard,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { MasterFacility, searchFacilities } from "@/data/facilities";

interface FacilityAutocompleteProps {
  countryCode: string;
  onSelect: (facility: MasterFacility) => void;
  selectedFacilityIds?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function FacilityAutocomplete({
  countryCode,
  onSelect,
  selectedFacilityIds = [],
  placeholder = "Start typing hospital name...",
  disabled = false,
}: FacilityAutocompleteProps) {
  const { theme: colors } = useTheme();
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const results = useMemo(() => {
    if (query.trim().length < 1) return [];
    return searchFacilities(query, countryCode)
      .filter((f) => !selectedFacilityIds.includes(f.id))
      .slice(0, 8);
  }, [query, countryCode, selectedFacilityIds]);

  const handleSelect = useCallback(
    (facility: MasterFacility) => {
      onSelect(facility);
      setQuery("");
      setShowDropdown(false);
      Keyboard.dismiss();
    },
    [onSelect],
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => setShowDropdown(false), 200);
  }, []);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Feather name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          editable={!disabled}
          autoCorrect={false}
          returnKeyType="done"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery("");
              setShowDropdown(false);
            }}
            hitSlop={8}
          >
            <Feather name="x-circle" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {showDropdown && results.length > 0 && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.backgroundElevated,
              borderColor: colors.border,
            },
          ]}
        >
          {results.map((facility, index) => (
            <Pressable
              key={facility.id}
              onPress={() => handleSelect(facility)}
              style={({ pressed }) => [
                styles.dropdownItem,
                { borderBottomColor: colors.border },
                index === results.length - 1 && { borderBottomWidth: 0 },
                pressed && { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <View style={styles.facilityRow}>
                <Text
                  style={[styles.facilityName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {facility.name}
                </Text>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        facility.type === "public"
                          ? colors.success + "20"
                          : colors.info + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      {
                        color:
                          facility.type === "public"
                            ? colors.success
                            : colors.info,
                      },
                    ]}
                  >
                    {facility.type}
                  </Text>
                </View>
              </View>
              <Text style={[styles.regionText, { color: colors.textTertiary }]}>
                {facility.region}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {showDropdown && query.length >= 2 && results.length === 0 && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.backgroundElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.noResultsContainer}>
            <Text
              style={[styles.noResultsText, { color: colors.textTertiary }]}
            >
              No matching hospitals found
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    height: "100%",
  },
  dropdown: {
    position: "absolute",
    top: Spacing.inputHeight + 4,
    left: 0,
    right: 0,
    maxHeight: 240,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    ...Shadows.floating,
  },
  dropdownItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  facilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  facilityName: {
    ...Typography.body,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  typeBadgeText: {
    ...Typography.caption,
  },
  regionText: {
    ...Typography.caption,
    marginTop: 2,
  },
  noResultsContainer: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
  },
  noResultsText: {
    ...Typography.small,
  },
});
