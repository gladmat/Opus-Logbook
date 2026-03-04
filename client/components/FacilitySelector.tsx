import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  MasterFacility,
  searchFacilities,
  FACILITY_REGIONS_NZ,
} from "@/data/facilities";

interface FacilitySelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (facility: MasterFacility) => void;
  countryCode: string;
  selectedFacilityIds?: string[];
  title?: string;
}

export function FacilitySelector({
  visible,
  onClose,
  onSelect,
  countryCode,
  selectedFacilityIds = [],
  title = "Select Facility",
}: FacilitySelectorProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>();
  const [selectedType, setSelectedType] = useState<
    "public" | "private" | undefined
  >();

  const filteredFacilities = useMemo(() => {
    return searchFacilities(searchQuery, countryCode, {
      region: selectedRegion,
      type: selectedType,
    });
  }, [searchQuery, countryCode, selectedRegion, selectedType]);

  const groupedFacilities = useMemo(() => {
    const groups: { [region: string]: MasterFacility[] } = {};
    filteredFacilities.forEach((facility) => {
      if (!groups[facility.region]) {
        groups[facility.region] = [];
      }
      groups[facility.region]!.push(facility);
    });
    return groups;
  }, [filteredFacilities]);

  const regions = countryCode === "NZ" ? FACILITY_REGIONS_NZ : [];

  const handleSelect = (facility: MasterFacility) => {
    onSelect(facility);
    setSearchQuery("");
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedRegion(undefined);
    setSelectedType(undefined);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.backgroundElevated,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <ThemedText style={[styles.title, { color: theme.text }]}>
              {title}
            </ThemedText>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                },
              ]}
            >
              <Feather name="search" size={18} color={theme.textTertiary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search hospitals..."
                placeholderTextColor={theme.textTertiary}
                style={[styles.input, { color: theme.text }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Feather
                    name="x-circle"
                    size={18}
                    color={theme.textTertiary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.filtersContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                { label: "All Regions", value: undefined },
                ...regions.map((r) => ({ label: r, value: r })),
              ]}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedRegion(item.value)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        selectedRegion === item.value
                          ? theme.link + "20"
                          : theme.backgroundDefault,
                      borderColor:
                        selectedRegion === item.value
                          ? theme.link
                          : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          selectedRegion === item.value
                            ? theme.link
                            : theme.text,
                      },
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              )}
              contentContainerStyle={styles.filtersList}
            />

            <View style={styles.typeFilters}>
              <Pressable
                onPress={() => setSelectedType(undefined)}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor:
                      selectedType === undefined
                        ? theme.link + "20"
                        : theme.backgroundDefault,
                    borderColor:
                      selectedType === undefined ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.typeChipText,
                    {
                      color:
                        selectedType === undefined ? theme.link : theme.text,
                    },
                  ]}
                >
                  All
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setSelectedType("public")}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor:
                      selectedType === "public"
                        ? theme.link + "20"
                        : theme.backgroundDefault,
                    borderColor:
                      selectedType === "public" ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.typeChipText,
                    {
                      color:
                        selectedType === "public" ? theme.link : theme.text,
                    },
                  ]}
                >
                  Public
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setSelectedType("private")}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor:
                      selectedType === "private"
                        ? theme.link + "20"
                        : theme.backgroundDefault,
                    borderColor:
                      selectedType === "private" ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.typeChipText,
                    {
                      color:
                        selectedType === "private" ? theme.link : theme.text,
                    },
                  ]}
                >
                  Private
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <FlatList
            data={Object.entries(groupedFacilities)}
            keyExtractor={([region]) => region}
            renderItem={({ item: [region, facilities] }) => (
              <View style={styles.regionSection}>
                <ThemedText
                  style={[styles.regionHeader, { color: theme.textSecondary }]}
                >
                  {region}
                </ThemedText>
                {facilities.map((facility) => {
                  const isSelected = selectedFacilityIds.includes(facility.id);
                  return (
                    <TouchableOpacity
                      key={facility.id}
                      onPress={() => handleSelect(facility)}
                      style={[
                        styles.facilityItem,
                        {
                          backgroundColor: isSelected
                            ? theme.link + "10"
                            : theme.backgroundDefault,
                          borderColor: isSelected ? theme.link : theme.border,
                        },
                      ]}
                    >
                      <View style={styles.facilityInfo}>
                        <ThemedText
                          style={[styles.facilityName, { color: theme.text }]}
                        >
                          {facility.name}
                        </ThemedText>
                        <View style={styles.facilityMeta}>
                          <View
                            style={[
                              styles.typeBadge,
                              {
                                backgroundColor:
                                  facility.type === "public"
                                    ? theme.success + "20"
                                    : theme.link + "20",
                              },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.typeBadgeText,
                                {
                                  color:
                                    facility.type === "public"
                                      ? theme.success
                                      : theme.link,
                                },
                              ]}
                            >
                              {facility.type === "public"
                                ? "Public"
                                : "Private"}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                      {isSelected ? (
                        <Feather name="check" size={20} color={theme.link} />
                      ) : (
                        <Feather
                          name="plus"
                          size={20}
                          color={theme.textTertiary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="search" size={40} color={theme.textTertiary} />
                <ThemedText
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  No facilities found
                </ThemedText>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  filtersContainer: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  filtersList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  typeFilters: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  regionSection: {
    marginTop: Spacing.lg,
  },
  regionHeader: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  facilityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  facilityInfo: {
    flex: 1,
  },
  facilityName: {
    fontSize: 15,
    fontWeight: "500",
  },
  facilityMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 15,
  },
});
