import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { FormField, SelectField } from "@/components/FormField";
import {
  PROMData,
  PROMQuestionnaire,
  PROM_QUESTIONNAIRE_LABELS,
} from "@/types/case";

interface PROMEntryFormProps {
  promData: PROMData;
  onPromDataChange: (data: PROMData) => void;
}

const PROM_OPTIONS: { value: PROMQuestionnaire; label: string }[] =
  Object.entries(PROM_QUESTIONNAIRE_LABELS).map(([value, label]) => ({
    value: value as PROMQuestionnaire,
    label,
  }));

export function PROMEntryForm({
  promData,
  onPromDataChange,
}: PROMEntryFormProps) {
  const { theme } = useTheme();

  const handleQuestionnaireChange = (value: string) => {
    onPromDataChange({
      ...promData,
      questionnaire: value as PROMQuestionnaire,
    });
  };

  const handleScoreChange = (text: string) => {
    const score = text ? parseFloat(text) : undefined;
    onPromDataChange({
      ...promData,
      score: isNaN(score as number) ? undefined : score,
    });
  };

  const getScoreRange = () => {
    switch (promData.questionnaire) {
      case "dash":
        return "0-100 (0 = no disability)";
      case "michigan_hand":
        return "0-100 (100 = best function)";
      case "sf36":
        return "0-100 per domain";
      case "eq5d":
        return "-0.59 to 1.0";
      case "breast_q":
        return "0-100 per scale";
      default:
        return "Enter calculated score";
    }
  };

  return (
    <View style={styles.container}>
      <SelectField
        label="Questionnaire"
        value={promData.questionnaire}
        options={PROM_OPTIONS}
        onSelect={handleQuestionnaireChange}
        required
      />

      <View
        style={[styles.scoreCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={styles.scoreHeader}>
          <ThemedText style={styles.scoreLabel}>Total Score</ThemedText>
          <ThemedText
            style={[styles.scoreRange, { color: theme.textSecondary }]}
          >
            {getScoreRange()}
          </ThemedText>
        </View>
        <FormField
          label=""
          value={promData.score?.toString() || ""}
          onChangeText={handleScoreChange}
          placeholder="Enter score"
          keyboardType="decimal-pad"
        />
      </View>

      {promData.questionnaire === "dash" ? (
        <View style={[styles.infoCard, { backgroundColor: theme.info + "15" }]}>
          <ThemedText style={[styles.infoText, { color: theme.info }]}>
            DASH measures disabilities of the arm, shoulder, and hand. Lower
            scores indicate less disability.
          </ThemedText>
        </View>
      ) : null}

      {promData.questionnaire === "michigan_hand" ? (
        <View style={[styles.infoCard, { backgroundColor: theme.info + "15" }]}>
          <ThemedText style={[styles.infoText, { color: theme.info }]}>
            Michigan Hand Questionnaire evaluates hand function, aesthetics,
            satisfaction, and pain. Higher scores indicate better outcomes.
          </ThemedText>
        </View>
      ) : null}

      {promData.questionnaire === "eq5d" ? (
        <View style={[styles.infoCard, { backgroundColor: theme.info + "15" }]}>
          <ThemedText style={[styles.infoText, { color: theme.info }]}>
            EQ-5D index value ranges from -0.59 (worse than death) to 1.0
            {"(perfect health). Use your country's value set for calculation."}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  scoreCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  scoreHeader: {
    marginBottom: Spacing.xs,
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  scoreRange: {
    fontSize: 12,
    marginTop: 2,
  },
  infoCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
