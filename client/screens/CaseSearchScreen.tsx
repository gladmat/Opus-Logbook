import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ThemedText } from "@/components/ThemedText";
import { DashboardCaseCard } from "@/components/dashboard/CaseCard";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { getCaseSummaries } from "@/lib/storage";
import type { CaseSummary } from "@/types/caseSummary";
import { Spacing, BorderRadius } from "@/constants/theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CaseSearchScreen() {
  const navigation = useNavigation<Nav>();
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text), 250);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    getCaseSummaries()
      .then(setCases)
      .finally(() => setLoading(false));
  }, []);

  const MAX_RESULTS = 50;

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return cases.slice(0, MAX_RESULTS);

    const results: CaseSummary[] = [];
    for (const c of cases) {
      if (c.searchableText.includes(q)) {
        results.push(c);
        if (results.length >= MAX_RESULTS) break;
      }
    }
    return results;
  }, [cases, debouncedQuery]);

  const handleCasePress = useCallback(
    (c: CaseSummary) => {
      navigation.navigate("CaseDetail", { caseId: c.id });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: CaseSummary }) => (
      <DashboardCaseCard
        caseData={item}
        onPress={() => handleCasePress(item)}
      />
    ),
    [handleCasePress],
  );

  const keyExtractor = useCallback((item: CaseSummary) => item.id, []);

  return (
    <View testID="screen-caseSearch" style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather name="search" size={16} color={theme.textTertiary} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          accessibilityLabel="Search cases"
          accessibilityHint="Search by patient identifier, diagnosis, procedure, or hospital"
          placeholder="Search by patient, diagnosis, procedure..."
          placeholderTextColor={theme.textTertiary}
          value={query}
          onChangeText={handleQueryChange}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          testID="caseSearch.input-search"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => { setQuery(""); setDebouncedQuery(""); if (debounceRef.current) clearTimeout(debounceRef.current); }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="caseSearch.btn-clear"
          >
            <Feather name="x-circle" size={16} color={theme.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.link} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <ThemedText
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            {query.trim()
              ? "No cases match your search"
              : "No cases logged yet"}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => (
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  divider: {
    height: 1,
    marginLeft: 80,
    marginRight: Spacing.lg,
  },
});
