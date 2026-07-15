import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { LoadingState } from "@/components/LoadingState";
import { DatePickerField } from "@/components/FormField";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { getCases } from "@/lib/storage";
import {
  getUniqueFacilities,
  TIME_PERIOD_LABELS,
  type TimePeriod,
  filterCases,
} from "@/lib/statistics";
import { countReportRows } from "@/lib/reports/engine";
import {
  getReportDefinition,
  getReportsByCategory,
  REPORT_CATEGORY_LABELS,
  suggestReportForProfile,
} from "@/lib/reports/registry";
import { generateAndShareReport } from "@/lib/reports/generateReport";
import type {
  ReportCategory,
  ReportDefinition,
  ReportFilters,
  ReportOutputFormat,
} from "@/lib/reports/types";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { SPECIALTY_LABELS, type Case, type Specialty } from "@/types/case";

type ReportsRoute = RouteProp<RootStackParamList, "Reports">;

const CATEGORY_ORDER: ReportCategory[] = ["training-body", "registry", "audit"];

const TIME_PERIODS: TimePeriod[] = [
  "all_time",
  "this_year",
  "last_6_months",
  "last_12_months",
  "custom",
];

const SUPPORTED_FORMATS: { format: ReportOutputFormat; label: string }[] = [
  { format: "csv", label: "CSV" },
  { format: "xlsx", label: "Excel" },
  { format: "pdf", label: "PDF Summary" },
];

function Chip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? theme.accent : theme.border,
          backgroundColor: selected
            ? theme.accentSurface
            : theme.backgroundElevated,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      testID={testID}
    >
      <ThemedText
        style={[
          styles.chipLabel,
          { color: selected ? theme.text : theme.textSecondary },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ReportTypeCard({
  definition,
  selected,
  suggested,
  onPress,
}: {
  definition: ReportDefinition;
  selected: boolean;
  suggested: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={definition.title}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.typeCard,
        Shadows.card,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: selected ? theme.accent : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      testID={`reports.type-${definition.id}`}
    >
      <View style={styles.typeCardHeader}>
        <ThemedText style={styles.typeCardTitle} numberOfLines={1}>
          {definition.title}
        </ThemedText>
        {suggested ? (
          <View
            style={[
              styles.suggestedPill,
              { backgroundColor: theme.accentSurface },
            ]}
          >
            <ThemedText
              style={[styles.suggestedPillText, { color: theme.link }]}
            >
              Suggested
            </ThemedText>
          </View>
        ) : null}
        {selected ? (
          <Feather name="check-circle" size={18} color={theme.accent} />
        ) : null}
      </View>
      <ThemedText
        style={[styles.typeCardDescription, { color: theme.textSecondary }]}
        numberOfLines={3}
      >
        {definition.description}
      </ThemedText>
    </Pressable>
  );
}

export default function ReportsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<ReportsRoute>();
  const { profile } = useAuth();

  const [cases, setCases] = useState<Case[] | null>(null);
  const [generating, setGenerating] = useState(false);

  const suggestedDefinition = useMemo(
    () => suggestReportForProfile(profile),
    [profile],
  );
  const [definitionId, setDefinitionId] = useState<string>(
    route.params?.definitionId ?? suggestedDefinition.id,
  );
  const definition = getReportDefinition(definitionId) ?? suggestedDefinition;

  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all_time");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [specialty, setSpecialty] = useState<Specialty | "all">("all");
  const [facility, setFacility] = useState<string>("all");
  const [format, setFormat] = useState<ReportOutputFormat>("csv");
  const [includePatientId, setIncludePatientId] = useState<boolean>(
    definition.defaultIncludePatientId,
  );

  // Reset the PHI toggle to the report's default whenever the report changes.
  useEffect(() => {
    setIncludePatientId(definition.defaultIncludePatientId);
  }, [definition.id, definition.defaultIncludePatientId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        getCases()
          .then((loaded) => {
            if (!cancelled) setCases(loaded);
          })
          .catch(() => {
            if (!cancelled) setCases([]);
          });
      });
      return () => {
        cancelled = true;
        task.cancel();
      };
    }, []),
  );

  const filters: ReportFilters = useMemo(
    () => ({
      specialty,
      timePeriod,
      customStartDate: customStartDate || undefined,
      customEndDate: customEndDate || undefined,
      facility,
      role: "all",
    }),
    [specialty, timePeriod, customStartDate, customEndDate, facility],
  );

  const filteredCases = useMemo(
    () => (cases ? filterCases(cases, filters) : []),
    [cases, filters],
  );

  const counts = useMemo(
    () => countReportRows(definition, filteredCases),
    [definition, filteredCases],
  );

  const facilities = useMemo(
    () => (cases ? getUniqueFacilities(cases) : []),
    [cases],
  );

  const specialtiesInUse = useMemo(() => {
    if (!cases) return [];
    const used = new Set<Specialty>();
    for (const c of cases) {
      used.add(c.specialty);
      for (const group of c.diagnosisGroups ?? []) used.add(group.specialty);
    }
    return (Object.keys(SPECIALTY_LABELS) as Specialty[]).filter((s) =>
      used.has(s),
    );
  }, [cases]);

  const filtersLabel = useMemo(() => {
    const parts = [
      TIME_PERIOD_LABELS[timePeriod],
      specialty === "all" ? "All specialties" : SPECIALTY_LABELS[specialty],
      facility === "all" ? "All facilities" : facility,
    ];
    return parts.join(" · ");
  }, [timePeriod, specialty, facility]);

  const handleGenerate = useCallback(async () => {
    if (!cases) return;
    try {
      setGenerating(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await generateAndShareReport({
        definitionId: definition.id,
        filters,
        format,
        includePatientId,
        cases,
        profile,
        filtersLabel,
      });
    } catch (error) {
      Alert.alert(
        "Report Error",
        error instanceof Error ? error.message : "Failed to generate report.",
      );
    } finally {
      setGenerating(false);
    }
  }, [
    cases,
    definition.id,
    filters,
    format,
    includePatientId,
    profile,
    filtersLabel,
  ]);

  if (cases === null) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        testID="screen-reports"
      >
        <LoadingState message="Loading cases..." />
      </View>
    );
  }

  if (cases.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.emptyContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
        testID="screen-reports"
      >
        <Feather name="file-text" size={48} color={theme.textTertiary} />
        <ThemedText style={styles.emptyTitle}>No cases yet</ThemedText>
        <ThemedText
          style={[styles.emptyMessage, { color: theme.textSecondary }]}
        >
          Reports are generated from your logged cases. Log your first case to
          get started.
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      testID="screen-reports"
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl * 2 },
        ]}
        testID="reports.scroll"
      >
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          REPORT TYPE
        </ThemedText>
        {CATEGORY_ORDER.map((category) => {
          const definitions = getReportsByCategory(category);
          if (definitions.length === 0) return null;
          return (
            <View key={category} style={styles.categoryBlock}>
              <ThemedText
                style={[styles.categoryLabel, { color: theme.textTertiary }]}
              >
                {REPORT_CATEGORY_LABELS[category]}
              </ThemedText>
              {definitions.map((def) => (
                <ReportTypeCard
                  key={def.id}
                  definition={def}
                  selected={def.id === definition.id}
                  suggested={def.id === suggestedDefinition.id}
                  onPress={() => setDefinitionId(def.id)}
                />
              ))}
            </View>
          );
        })}

        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          FILTERS
        </ThemedText>
        <ThemedText style={[styles.filterLabel, { color: theme.textTertiary }]}>
          Period
        </ThemedText>
        <View style={styles.chipRow}>
          {TIME_PERIODS.map((period) => (
            <Chip
              key={period}
              label={TIME_PERIOD_LABELS[period]}
              selected={timePeriod === period}
              onPress={() => setTimePeriod(period)}
              testID={`reports.period-${period}`}
            />
          ))}
        </View>
        {timePeriod === "custom" ? (
          <View style={styles.customDates}>
            <View style={styles.customDateField}>
              <DatePickerField
                label="From"
                value={customStartDate}
                onChange={setCustomStartDate}
                testID="reports.date-from"
              />
            </View>
            <View style={styles.customDateField}>
              <DatePickerField
                label="To"
                value={customEndDate}
                onChange={setCustomEndDate}
                testID="reports.date-to"
              />
            </View>
          </View>
        ) : null}

        <ThemedText style={[styles.filterLabel, { color: theme.textTertiary }]}>
          Specialty
        </ThemedText>
        <View style={styles.chipRow}>
          <Chip
            label="All"
            selected={specialty === "all"}
            onPress={() => setSpecialty("all")}
            testID="reports.specialty-all"
          />
          {specialtiesInUse.map((s) => (
            <Chip
              key={s}
              label={SPECIALTY_LABELS[s]}
              selected={specialty === s}
              onPress={() => setSpecialty(s)}
              testID={`reports.specialty-${s}`}
            />
          ))}
        </View>

        {facilities.length > 1 ? (
          <>
            <ThemedText
              style={[styles.filterLabel, { color: theme.textTertiary }]}
            >
              Facility
            </ThemedText>
            <View style={styles.chipRow}>
              <Chip
                label="All facilities"
                selected={facility === "all"}
                onPress={() => setFacility("all")}
                testID="reports.facility-all"
              />
              {facilities.map((f) => (
                <Chip
                  key={f}
                  label={f}
                  selected={facility === f}
                  onPress={() => setFacility(f)}
                  testID={`reports.facility-${f}`}
                />
              ))}
            </View>
          </>
        ) : null}

        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="bar-chart-2" size={16} color={theme.link} />
          <View style={styles.previewTextBlock}>
            <ThemedText
              style={styles.previewCount}
              testID="reports.preview-count"
            >
              {definition.granularity === "procedure"
                ? `${counts.caseCount} cases → ${counts.rowCount} procedure rows`
                : `${counts.rowCount} cases`}
            </ThemedText>
            {definition.eligibilityHint ? (
              <ThemedText
                style={[styles.previewHint, { color: theme.textSecondary }]}
              >
                {definition.eligibilityHint}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          OUTPUT
        </ThemedText>
        <View style={styles.chipRow}>
          {SUPPORTED_FORMATS.map((entry) => (
            <Chip
              key={entry.format}
              label={entry.label}
              selected={format === entry.format}
              onPress={() => setFormat(entry.format)}
              testID={`reports.format-${entry.format}`}
            />
          ))}
        </View>

        <View style={styles.phiRow}>
          <View style={styles.phiTextBlock}>
            <ThemedText style={styles.phiLabel}>
              Include patient identifiers
            </ThemedText>
            <ThemedText
              style={[styles.phiHint, { color: theme.textSecondary }]}
            >
              Name, DOB, NHI and identifier columns
            </ThemedText>
          </View>
          <Switch
            value={includePatientId}
            onValueChange={setIncludePatientId}
            trackColor={{ true: theme.accent, false: theme.border }}
            accessibilityLabel="Include patient identifiers"
            testID="reports.toggle-phi"
          />
        </View>

        <Button
          onPress={handleGenerate}
          disabled={counts.rowCount === 0 || generating}
          loading={generating}
          testID="reports.button-generate"
        >
          {counts.rowCount === 0
            ? "No matching cases"
            : `Generate ${SUPPORTED_FORMATS.find((f) => f.format === format)?.label ?? "Report"}`}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  categoryBlock: {
    marginBottom: Spacing.md,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  typeCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  typeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  typeCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  typeCardDescription: {
    fontSize: 13,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  suggestedPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  suggestedPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    justifyContent: "center",
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  customDates: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  customDateField: {
    flex: 1,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  previewTextBlock: {
    flex: 1,
  },
  previewCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  previewHint: {
    fontSize: 12,
    marginTop: 2,
  },
  phiRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    minHeight: 48,
  },
  phiTextBlock: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  phiLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  phiHint: {
    fontSize: 12,
    marginTop: 2,
  },
});
