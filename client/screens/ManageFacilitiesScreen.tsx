import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { FacilitySelector } from "@/components/FacilitySelector";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  type MasterFacility,
  getFacilityById,
  SUPPORTED_COUNTRIES,
} from "@/data/facilities";
import {
  getDefaultFacilityCountryCode,
  resolveFacilityName,
} from "@/lib/facilities";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";

export default function ManageFacilitiesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    facilities,
    profile,
    addFacility,
    removeFacility,
    setFacilityPrimary,
  } = useAuth();

  const [showFacilitySelector, setShowFacilitySelector] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    () => getDefaultFacilityCountryCode(profile?.countryOfPractice) ?? "NZ",
  );
  const [isUpdatingPrimaryId, setIsUpdatingPrimaryId] = useState<string | null>(
    null,
  );

  const selectedFacilityIds = useMemo(
    () =>
      facilities
        .map((facility) => facility.facilityId)
        .filter(Boolean) as string[],
    [facilities],
  );

  const resolvedFacilities = useMemo(
    () =>
      facilities.map((facility) => ({
        facility,
        displayName: resolveFacilityName(facility),
        masterFacility: facility.facilityId
          ? getFacilityById(facility.facilityId)
          : undefined,
      })),
    [facilities],
  );

  const curatedCountryNotice =
    SUPPORTED_COUNTRIES.length === 1
      ? `Curated hospital lists are currently available for ${SUPPORTED_COUNTRIES[0]?.name} only.`
      : "Curated hospital lists are limited to the supported countries below.";

  const handleSelectFacility = async (facility: MasterFacility) => {
    if (selectedFacilityIds.includes(facility.id)) {
      const existingFacility = facilities.find(
        (currentFacility) => currentFacility.facilityId === facility.id,
      );
      if (!existingFacility) {
        return;
      }

      await removeFacility(existingFacility.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    try {
      await addFacility(facility.name, facilities.length === 0, facility.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to add hospital");
    }
  };

  const handleRemoveFacility = (id: string, name: string) => {
    Alert.alert("Remove Hospital", `Remove "${name}" from your hospitals?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeFacility(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      },
    ]);
  };

  const handleMakePrimary = async (id: string) => {
    setIsUpdatingPrimaryId(id);
    try {
      await setFacilityPrimary(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to set primary hospital");
    } finally {
      setIsUpdatingPrimaryId(null);
    }
  };

  return (
    <>
      <KeyboardAwareScrollViewCompat
        testID="screen-manageFacilities"
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing["3xl"],
          },
        ]}
      >
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            MY HOSPITALS
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText style={styles.title}>
              Choose the hospitals where you operate
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              Only these will appear when logging cases.
            </ThemedText>
            <ThemedText style={[styles.notice, { color: theme.textTertiary }]}>
              {curatedCountryNotice}
            </ThemedText>

            <View style={styles.countryRow}>
              {SUPPORTED_COUNTRIES.map((country) => {
                const isSelected = selectedCountryCode === country.code;
                return (
                  <Pressable
                    key={country.code}
                    style={[
                      styles.countryChip,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        borderColor: theme.border,
                      },
                      isSelected && {
                        backgroundColor: theme.link + "15",
                        borderColor: theme.link,
                      },
                    ]}
                    onPress={() => setSelectedCountryCode(country.code)}
                  >
                    <ThemedText
                      style={[
                        styles.countryChipText,
                        { color: theme.text },
                        isSelected && { color: theme.link },
                      ]}
                    >
                      {country.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.addButton, { backgroundColor: theme.link }]}
              onPress={() => setShowFacilitySelector(true)}
            >
              <Feather name="plus" size={18} color="#FFF" />
              <ThemedText style={styles.addButtonText}>
                Add from curated list
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
          >
            SELECTED
          </ThemedText>
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            {resolvedFacilities.length > 0 ? (
              resolvedFacilities.map(
                ({ facility, displayName, masterFacility }) => (
                  <View
                    key={facility.id}
                    style={[
                      styles.facilityItem,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <View style={styles.facilityTextContainer}>
                      <ThemedText style={styles.facilityName}>
                        {displayName}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.facilityMeta,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {masterFacility
                          ? `${masterFacility.region} • ${masterFacility.type === "public" ? "Public" : "Private"}`
                          : facility.facilityId
                            ? "Verified hospital"
                            : "Custom hospital"}
                      </ThemedText>
                    </View>

                    <View style={styles.facilityActions}>
                      {facility.isPrimary ? (
                        <View
                          style={[
                            styles.primaryBadge,
                            { backgroundColor: theme.link + "20" },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.primaryBadgeText,
                              { color: theme.link },
                            ]}
                          >
                            Primary
                          </ThemedText>
                        </View>
                      ) : (
                        <Pressable
                          style={[
                            styles.secondaryAction,
                            { borderColor: theme.border },
                          ]}
                          onPress={() => handleMakePrimary(facility.id)}
                          disabled={isUpdatingPrimaryId === facility.id}
                        >
                          {isUpdatingPrimaryId === facility.id ? (
                            <ActivityIndicator
                              size="small"
                              color={theme.link}
                            />
                          ) : (
                            <ThemedText
                              style={[
                                styles.secondaryActionText,
                                { color: theme.link },
                              ]}
                            >
                              Make primary
                            </ThemedText>
                          )}
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() =>
                          handleRemoveFacility(facility.id, displayName)
                        }
                        hitSlop={8}
                      >
                        <Feather name="x" size={18} color={theme.error} />
                      </Pressable>
                    </View>
                  </View>
                ),
              )
            ) : (
              <View style={styles.emptyState}>
                <Feather name="home" size={32} color={theme.textTertiary} />
                <ThemedText
                  style={[styles.emptyTitle, { color: theme.textSecondary }]}
                >
                  No hospitals selected yet
                </ThemedText>
                <ThemedText
                  style={[styles.emptyHint, { color: theme.textTertiary }]}
                >
                  Use the curated list above to add your first hospital.
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>

      <FacilitySelector
        visible={showFacilitySelector}
        onClose={() => setShowFacilitySelector(false)}
        onSelect={handleSelectFacility}
        countryCode={selectedCountryCode}
        selectedFacilityIds={selectedFacilityIds}
        title="Add Hospital"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  sectionCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 15,
    marginTop: Spacing.xs,
    lineHeight: 22,
  },
  notice: {
    fontSize: 13,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  countryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  countryChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  countryChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  addButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  facilityItem: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  facilityTextContainer: {
    flex: 1,
  },
  facilityName: {
    fontSize: 16,
    fontWeight: "600",
  },
  facilityMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  facilityActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  primaryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  primaryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  secondaryAction: {
    minWidth: 96,
    minHeight: 36,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
});
