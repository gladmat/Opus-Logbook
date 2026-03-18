import React, { useCallback, useMemo, useState } from "react";
import { View, TextInput, Pressable, Switch, StyleSheet, LayoutAnimation } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import type {
  AestheticAssessment,
  BariatricProcedureType,
  TimeSinceBariatricSurgery,
  PittsburghRegion,
  PittsburghScore,
  PittsburghRatingScale,
} from "@/types/aesthetics";
import { Spacing, BorderRadius } from "@/constants/theme";

interface PostBariatricContextProps {
  assessment: AestheticAssessment;
  onAssessmentChange: (assessment: AestheticAssessment) => void;
}

const BARIATRIC_PROCEDURES: { value: BariatricProcedureType; label: string }[] = [
  { value: "gastric_bypass_rygb", label: "Gastric bypass (RYGB)" },
  { value: "sleeve_gastrectomy", label: "Sleeve gastrectomy" },
  { value: "gastric_band", label: "Gastric band" },
  { value: "duodenal_switch", label: "Duodenal switch" },
  { value: "bpd", label: "BPD" },
  { value: "sadi_s", label: "SADI-S" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

const TIME_SINCE_OPTIONS: { value: TimeSinceBariatricSurgery; label: string }[] = [
  { value: "less_than_6m", label: "<6 months" },
  { value: "6_to_12m", label: "6–12 months" },
  { value: "1_to_2y", label: "1–2 years" },
  { value: "2_to_5y", label: "2–5 years" },
  { value: "over_5y", label: ">5 years" },
];

const PITTSBURGH_REGIONS: { value: PittsburghRegion; label: string }[] = [
  { value: "chin_neck", label: "Chin / Neck" },
  { value: "chest", label: "Chest" },
  { value: "arms", label: "Arms" },
  { value: "abdomen", label: "Abdomen" },
  { value: "flanks_back", label: "Flanks / Back" },
  { value: "buttock", label: "Buttock" },
  { value: "inner_thighs", label: "Inner thighs" },
  { value: "outer_thighs", label: "Outer thighs" },
  { value: "breasts", label: "Breasts" },
  { value: "mons_pubis", label: "Mons pubis" },
];

const SCORE_OPTIONS: PittsburghScore[] = [0, 1, 2, 3];

export const PostBariatricContext = React.memo(function PostBariatricContext({
  assessment,
  onAssessmentChange,
}: PostBariatricContextProps) {
  const { theme } = useTheme();
  const [pittsburghExpanded, setPittsburghExpanded] = useState(false);

  const update = useCallback(
    (partial: Partial<AestheticAssessment>) => {
      onAssessmentChange({ ...assessment, ...partial });
    },
    [assessment, onAssessmentChange],
  );

  // Auto-calc derived values
  const weightLoss = useMemo(() => {
    if (assessment.preBariatricWeightKg != null && assessment.currentWeightKg != null) {
      return assessment.preBariatricWeightKg - assessment.currentWeightKg;
    }
    return undefined;
  }, [assessment.preBariatricWeightKg, assessment.currentWeightKg]);

  const bmi = useMemo(() => {
    if (assessment.currentWeightKg != null && assessment.heightCm != null && assessment.heightCm > 0) {
      const heightM = assessment.heightCm / 100;
      return Math.round((assessment.currentWeightKg / (heightM * heightM)) * 10) / 10;
    }
    return undefined;
  }, [assessment.currentWeightKg, assessment.heightCm]);

  const twlPercent = useMemo(() => {
    if (weightLoss != null && assessment.preBariatricWeightKg != null && assessment.preBariatricWeightKg > 0) {
      return Math.round((weightLoss / assessment.preBariatricWeightKg) * 100);
    }
    return undefined;
  }, [weightLoss, assessment.preBariatricWeightKg]);

  const pittsburghTotal = useMemo(() => {
    if (!assessment.pittsburghRatingScale?.scores) return undefined;
    const scores = Object.values(assessment.pittsburghRatingScale.scores) as (PittsburghScore | undefined)[];
    if (scores.length === 0) return undefined;
    return scores.reduce<number>((sum, s) => sum + (s ?? 0), 0);
  }, [assessment.pittsburghRatingScale]);

  const handlePittsburghScore = useCallback(
    (region: PittsburghRegion, score: PittsburghScore) => {
      const current = assessment.pittsburghRatingScale ?? { scores: {} };
      const scores = { ...current.scores, [region]: score };
      const total = (Object.values(scores) as (PittsburghScore | undefined)[]).reduce<number>((sum, s) => sum + (s ?? 0), 0);
      update({ pittsburghRatingScale: { scores, total } });
    },
    [assessment.pittsburghRatingScale, update],
  );

  const chipStyle = (selected: boolean) => [
    styles.chip,
    { backgroundColor: selected ? theme.link : theme.backgroundElevated, borderColor: selected ? theme.link : theme.border },
  ];
  const chipTextStyle = (selected: boolean) => [
    styles.chipText, { color: selected ? theme.buttonText : theme.text },
  ];

  return (
    <View style={[styles.container, { borderColor: theme.info + "40" }]}>
      <ThemedText style={[styles.title, { color: theme.info }]}>
        Post-Bariatric Context
      </ThemedText>

      {/* Weight fields */}
      <View style={styles.row}>
        <NumField label="Pre-bariatric (kg)" value={assessment.preBariatricWeightKg} onChange={(v) => update({ preBariatricWeightKg: v })} theme={theme} />
        <NumField label="Current (kg)" value={assessment.currentWeightKg} onChange={(v) => update({ currentWeightKg: v })} theme={theme} />
        <NumField label="Height (cm)" value={assessment.heightCm} onChange={(v) => update({ heightCm: v })} theme={theme} integer />
      </View>

      {/* Auto-calc badges */}
      {(weightLoss != null || bmi != null) && (
        <View style={styles.badgeRow}>
          {weightLoss != null && (
            <View style={[styles.badge, { backgroundColor: theme.link + "1A", borderColor: theme.link }]}>
              <ThemedText style={[styles.badgeText, { color: theme.link }]}>
                Weight loss: {weightLoss} kg
                {twlPercent != null ? ` (${twlPercent}% TWL)` : ""}
              </ThemedText>
            </View>
          )}
          {bmi != null && (
            <View style={[styles.badge, { backgroundColor: theme.link + "1A", borderColor: theme.link }]}>
              <ThemedText style={[styles.badgeText, { color: theme.link }]}>
                BMI: {bmi}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Bariatric procedure type */}
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Bariatric procedure</ThemedText>
        <View style={styles.chipRow}>
          {BARIATRIC_PROCEDURES.map((p) => {
            const sel = assessment.bariatricProcedureType === p.value;
            return <Pressable key={p.value} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); update({ bariatricProcedureType: sel ? undefined : p.value }); }} style={chipStyle(sel)}><ThemedText style={chipTextStyle(sel)}>{p.label}</ThemedText></Pressable>;
          })}
        </View>
      </View>

      {/* Time since */}
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Time since bariatric surgery</ThemedText>
        <View style={styles.chipRow}>
          {TIME_SINCE_OPTIONS.map((t) => {
            const sel = assessment.timeSinceBariatricSurgery === t.value;
            return <Pressable key={t.value} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); update({ timeSinceBariatricSurgery: sel ? undefined : t.value }); }} style={chipStyle(sel)}><ThemedText style={chipTextStyle(sel)}>{t.label}</ThemedText></Pressable>;
          })}
        </View>
      </View>

      {/* Weight stable */}
      <View style={styles.switchRow}>
        <ThemedText style={[styles.switchLabel, { color: theme.text }]}>Weight stable (&gt;3 months)</ThemedText>
        <Switch value={assessment.weightStable ?? false} onValueChange={(v) => update({ weightStable: v })} trackColor={{ true: theme.link }} />
      </View>

      {/* Pittsburgh Rating Scale (collapsible) */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setPittsburghExpanded((p) => !p);
        }}
        style={[styles.pittsburghHeader, { borderColor: theme.border }]}
      >
        <View style={styles.pittsburghHeaderLeft}>
          <ThemedText style={[styles.pittsburghTitle, { color: theme.text }]}>Pittsburgh Rating Scale</ThemedText>
          {pittsburghTotal != null && (
            <View style={[styles.scoreBadge, { backgroundColor: theme.link + "1A" }]}>
              <ThemedText style={[styles.scoreBadgeText, { color: theme.link }]}>
                {pittsburghTotal}/30
              </ThemedText>
            </View>
          )}
        </View>
        <Feather name={pittsburghExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
      </Pressable>

      {pittsburghExpanded && (
        <View style={styles.pittsburghGrid}>
          {PITTSBURGH_REGIONS.map(({ value: region, label }) => {
            const currentScore = assessment.pittsburghRatingScale?.scores?.[region];
            return (
              <View key={region} style={styles.pittsburghRow}>
                <ThemedText style={[styles.pittsburghRegionLabel, { color: theme.text }]} numberOfLines={1}>{label}</ThemedText>
                <View style={styles.scoreChipRow}>
                  {SCORE_OPTIONS.map((score) => {
                    const sel = currentScore === score;
                    return (
                      <Pressable
                        key={score}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          handlePittsburghScore(region, score);
                        }}
                        style={[styles.scoreChip, { backgroundColor: sel ? theme.link : theme.backgroundElevated, borderColor: sel ? theme.link : theme.border }]}
                      >
                        <ThemedText style={[styles.scoreChipText, { color: sel ? theme.buttonText : theme.text }]}>{score}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
});

function NumField({ label, value, onChange, theme, integer }: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void;
  theme: { text: string; textSecondary: string; backgroundSecondary: string; border: string; textTertiary: string };
  integer?: boolean;
}) {
  return (
    <View style={styles.numField}>
      <ThemedText style={[styles.numFieldLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <TextInput
        style={[styles.numFieldInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
        value={value != null ? String(value) : ""}
        onChangeText={(t) => { if (!t) { onChange(undefined); return; } const n = integer ? parseInt(t, 10) : parseFloat(t); if (!isNaN(n)) onChange(n); }}
        placeholder="—"
        placeholderTextColor={theme.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md },
  title: { fontSize: 14, fontWeight: "600" },
  row: { flexDirection: "row", gap: Spacing.sm },
  section: { gap: Spacing.xs },
  label: { fontSize: 12, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  chip: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, minHeight: 36, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "500" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  badge: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { fontSize: 14, fontWeight: "500" },
  pittsburghHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  pittsburghHeaderLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  pittsburghTitle: { fontSize: 14, fontWeight: "500" },
  scoreBadge: { borderRadius: BorderRadius.xs, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  scoreBadgeText: { fontSize: 12, fontWeight: "700" },
  pittsburghGrid: { gap: Spacing.sm },
  pittsburghRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  pittsburghRegionLabel: { fontSize: 13, fontWeight: "500", flex: 1 },
  scoreChipRow: { flexDirection: "row", gap: 4 },
  scoreChip: { borderWidth: 1, borderRadius: BorderRadius.xs, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  scoreChipText: { fontSize: 14, fontWeight: "600" },
  numField: { flex: 1, gap: 4 },
  numFieldLabel: { fontSize: 11, fontWeight: "500" },
  numFieldInput: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, height: 36, fontSize: 14, textAlign: "center" },
});
