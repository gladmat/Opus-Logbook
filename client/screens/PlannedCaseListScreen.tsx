import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  InteractionManager,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { CaseSummary } from "@/types/caseSummary";
import { getCaseSummaries } from "@/lib/storage";
import { isPlannedCaseSummary } from "@/types/caseSummary";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function PlannedCaseRow({
  caseData,
  onComplete,
  onCamera,
  theme,
}: {
  caseData: CaseSummary;
  onComplete: (c: CaseSummary) => void;
  onCamera: (c: CaseSummary) => void;
  theme: any;
}) {
  const photoCount = caseData.operativeMediaCount;
  const dateLabel = caseData.plannedDate ?? "Not scheduled";

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.backgroundDefault, ...Shadows.card },
      ]}
    >
      <View style={styles.rowContent}>
        <ThemedText style={styles.patientId} numberOfLines={1}>
          {caseData.patientIdentifier}
        </ThemedText>
        <View style={styles.rowMeta}>
          <ThemedText
            style={[styles.rowMetaText, { color: theme.textSecondary }]}
          >
            {dateLabel}
          </ThemedText>
          <SpecialtyBadge specialty={caseData.specialty} />
          {photoCount > 0 ? (
            <ThemedText
              style={[styles.rowMetaText, { color: theme.textTertiary }]}
            >
              {photoCount} photo{photoCount !== 1 ? "s" : ""}
            </ThemedText>
          ) : null}
        </View>
        {caseData.plannedNote ? (
          <ThemedText
            style={[styles.notePreview, { color: theme.textTertiary }]}
            numberOfLines={1}
          >
            {caseData.plannedNote}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.rowActions}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCamera(caseData);
          }}
          style={[
            styles.iconButton,
            { backgroundColor: theme.backgroundRaised },
          ]}
          hitSlop={8}
        >
          <Feather name="camera" size={16} color={theme.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onComplete(caseData);
          }}
          style={[styles.completeButton, { backgroundColor: theme.accent }]}
        >
          <ThemedText
            style={[styles.completeButtonText, { color: theme.accentContrast }]}
          >
            Complete
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const MemoRow = React.memo(PlannedCaseRow);

export default function PlannedCaseListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          const all = await getCaseSummaries();
          setCases(all);
        } catch (error) {
          console.error("[PlannedCaseListScreen] Load failed:", error);
        } finally {
          setLoading(false);
        }
      });
      return () => task.cancel();
    }, []),
  );

  const planned = useMemo(
    () =>
      cases.filter(isPlannedCaseSummary).sort((a, b) => {
        if (a.plannedDate && b.plannedDate) {
          return a.plannedDate.localeCompare(b.plannedDate);
        }
        if (a.plannedDate && !b.plannedDate) return -1;
        if (!a.plannedDate && b.plannedDate) return 1;
        return a.createdAt.localeCompare(b.createdAt);
      }),
    [cases],
  );

  const handleComplete = useCallback(
    (c: CaseSummary) => {
      navigation.navigate("CaseForm", {
        caseId: c.id,
        specialty: c.specialty,
      });
    },
    [navigation],
  );

  const handleCamera = useCallback(
    (c: CaseSummary) => {
      navigation.navigate("OpusCamera", {
        templateId: c.plannedTemplateId,
        patientIdentifier: c.patientIdentifier,
        procedureDate: c.procedureDate,
        targetMode: "case",
        targetCaseId: c.id,
      });
    },
    [navigation],
  );

  if (!loading && planned.length === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <Feather name="calendar" size={48} color={theme.textTertiary} />
        <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
          No Planned Cases
        </ThemedText>
        <ThemedText
          style={[styles.emptySubtitle, { color: theme.textTertiary }]}
        >
          Plan a case from the dashboard to see it here.
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      testID="screen-plannedCaseList"
      data={planned}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <MemoRow
          caseData={item}
          onComplete={handleComplete}
          onCamera={handleCamera}
          theme={theme}
        />
      )}
      style={{ backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.list,
        { paddingBottom: insets.bottom + Spacing.lg },
      ]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  separator: { height: Spacing.sm },
  row: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  patientId: {
    fontSize: 16,
    fontWeight: "600",
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  rowMetaText: {
    fontSize: 13,
  },
  notePreview: {
    fontSize: 12,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  completeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
