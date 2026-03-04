import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SnomedSearchResult,
  searchSnomedProcedures,
  searchSnomedDiagnoses,
} from "@/lib/snomedApi";
import type { Specialty } from "@/types/case";

interface SnomedSearchPickerProps {
  label: string;
  value?: { conceptId: string; term: string };
  onSelect: (result: { conceptId: string; term: string } | null) => void;
  searchType: "procedure" | "diagnosis";
  specialty?: Specialty;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function SnomedSearchPicker({
  label,
  value,
  onSelect,
  searchType,
  specialty,
  placeholder = "Search...",
  required = false,
  error,
}: SnomedSearchPickerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SnomedSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const performSearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchFn =
          searchType === "procedure"
            ? searchSnomedProcedures
            : searchSnomedDiagnoses;
        const searchResults = await searchFn(query, specialty, 25);
        setResults(searchResults);
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchType, specialty],
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(() => {
        performSearch(text);
      }, 300);

      setDebounceTimer(timer);
    },
    [debounceTimer, performSearch],
  );

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const handleSelect = (result: SnomedSearchResult) => {
    onSelect({ conceptId: result.conceptId, term: result.term });
    setModalVisible(false);
    setSearchQuery("");
    setResults([]);
  };

  const handleClear = () => {
    onSelect(null);
  };

  const openModal = () => {
    setModalVisible(true);
    setSearchQuery("");
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
        {required ? (
          <ThemedText style={[styles.required, { color: theme.error }]}>
            *
          </ThemedText>
        ) : null}
      </View>

      <Pressable
        style={[
          styles.pickerButton,
          {
            backgroundColor: theme.backgroundRoot,
            borderColor: error ? theme.error : theme.border,
          },
        ]}
        onPress={openModal}
      >
        {value ? (
          <View style={styles.selectedValueRow}>
            <View style={styles.selectedValueText}>
              <ThemedText
                style={[styles.selectedTerm, { color: theme.text }]}
                numberOfLines={2}
              >
                {value.term}
              </ThemedText>
              <ThemedText
                style={[styles.snomedCode, { color: theme.textTertiary }]}
              >
                SNOMED CT: {value.conceptId}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ThemedText
              style={[styles.placeholder, { color: theme.textTertiary }]}
            >
              {placeholder}
            </ThemedText>
            <Feather name="search" size={20} color={theme.textSecondary} />
          </>
        )}
      </Pressable>

      {error ? (
        <ThemedText style={[styles.error, { color: theme.error }]}>
          {error}
        </ThemedText>
      ) : null}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: theme.border, paddingTop: insets.top },
            ]}
          >
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={[styles.cancelText, { color: theme.link }]}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
              {label}
            </ThemedText>
            <View style={styles.cancelButton} />
          </View>

          <View
            style={[
              styles.searchContainer,
              { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <Feather name="search" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder={`Search ${searchType === "procedure" ? "procedures" : "diagnoses"}...`}
              placeholderTextColor={theme.textTertiary}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.link} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {searchQuery.length > 0 && searchQuery.length < 2 ? (
            <View style={styles.hintContainer}>
              <ThemedText
                style={[styles.hintText, { color: theme.textSecondary }]}
              >
                Type at least 2 characters to search
              </ThemedText>
            </View>
          ) : null}

          <FlatList
            data={results}
            keyExtractor={(item, index) => `${item.conceptId}-${index}`}
            contentContainerStyle={[
              styles.resultsList,
              { paddingBottom: insets.bottom + Spacing.lg },
            ]}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              searchQuery.length >= 2 && !isLoading ? (
                <View style={styles.emptyContainer}>
                  <Feather name="inbox" size={48} color={theme.textTertiary} />
                  <ThemedText
                    style={[styles.emptyText, { color: theme.textSecondary }]}
                  >
                    {`No results found for "${searchQuery}"`}
                  </ThemedText>
                  <ThemedText
                    style={[styles.emptyHint, { color: theme.textTertiary }]}
                  >
                    Try a different search term
                  </ThemedText>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.resultItem, { borderBottomColor: theme.border }]}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.resultContent}>
                  <ThemedText
                    style={[styles.resultTerm, { color: theme.text }]}
                  >
                    {item.term}
                  </ThemedText>
                  <View style={styles.resultMeta}>
                    <ThemedText
                      style={[styles.resultCode, { color: theme.textTertiary }]}
                    >
                      {item.conceptId}
                    </ThemedText>
                    {item.semanticTag ? (
                      <View
                        style={[
                          styles.semanticTag,
                          { backgroundColor: theme.link + "20" },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.semanticTagText,
                            { color: theme.link },
                          ]}
                        >
                          {item.semanticTag}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.textTertiary}
                />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  required: {
    marginLeft: Spacing.xs,
    fontSize: 14,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    minHeight: Spacing.inputHeight,
    paddingVertical: Spacing.sm,
  },
  selectedValueRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedValueText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  selectedTerm: {
    fontSize: 15,
    fontWeight: "500",
  },
  snomedCode: {
    fontSize: 12,
    marginTop: 2,
  },
  placeholder: {
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  cancelButton: {
    width: 70,
  },
  cancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.sm,
  },
  hintContainer: {
    padding: Spacing.md,
    alignItems: "center",
  },
  hintText: {
    fontSize: 14,
  },
  resultsList: {
    flexGrow: 1,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultContent: {
    flex: 1,
  },
  resultTerm: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultCode: {
    fontSize: 12,
  },
  semanticTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  semanticTagText: {
    fontSize: 11,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 14,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
