import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import type { DigitId, AmputationLevel, DigitAmputation } from "@/types/case";

export interface AmputationState {
  digitAmputations: DigitAmputation[];
  /** @deprecated legacy — kept for backward compat writes */
  amputationLevel?: AmputationLevel;
  amputationType?: "complete" | "subtotal";
  isReplantable?: boolean;
}

interface AmputationSectionProps {
  value: AmputationState;
  onChange: (value: AmputationState) => void;
  selectedDigits: DigitId[];
}

const AMPUTATION_LEVELS: {
  key: AmputationLevel;
  label: string;
}[] = [
  { key: "fingertip", label: "Fingertip" },
  { key: "distal_phalanx", label: "Distal phalanx" },
  { key: "middle_phalanx", label: "Middle phalanx" },
  { key: "proximal_phalanx", label: "Proximal phalanx" },
  { key: "mcp", label: "MCP level" },
  { key: "ray", label: "Ray amputation" },
  { key: "hand_wrist", label: "Hand / wrist" },
];

/* -------- Single-digit / no-digit UI -------- */

function SingleAmputationUI({
  entry,
  onChange,
  theme,
}: {
  entry: DigitAmputation | undefined;
  onChange: (e: DigitAmputation | undefined) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const setLevel = (level: AmputationLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (entry?.level === level) {
      onChange(undefined);
      return;
    }
    onChange({
      ...(entry ?? { digit: "D1" as DigitId, type: "complete" }),
      level,
    });
  };

  return (
    <>
      <View style={styles.subSection}>
        <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
          Amputation level
        </ThemedText>
        <View style={styles.pillRow}>
          {AMPUTATION_LEVELS.map(({ key, label }) => {
            const isSelected = entry?.level === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => setLevel(key)}
              >
                <ThemedText
                  style={[
                    styles.pillText,
                    { color: isSelected ? theme.buttonText : theme.text },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {entry?.level ? (
        <>
          <TypePicker
            value={entry.type}
            onChange={(t) => onChange({ ...entry, type: t })}
            theme={theme}
          />
          <ReplantPicker
            value={entry.isReplantable}
            onChange={(r) => onChange({ ...entry, isReplantable: r })}
            theme={theme}
          />
        </>
      ) : null}
    </>
  );
}

/* -------- Multi-digit UI -------- */

function MultiAmputationUI({
  value,
  onChange,
  selectedDigits,
  theme,
}: {
  value: AmputationState;
  onChange: (v: AmputationState) => void;
  selectedDigits: DigitId[];
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const [sameForAll, setSameForAll] = useState(false);

  const getEntry = (digit: DigitId) =>
    value.digitAmputations.find((e) => e.digit === digit);

  const updateDigit = (digit: DigitId, entry: DigitAmputation | undefined) => {
    const filtered = value.digitAmputations.filter((e) => e.digit !== digit);
    const next = entry ? [...filtered, entry] : filtered;
    // Also update legacy fields from first entry
    const first = next[0];
    onChange({
      ...value,
      digitAmputations: next,
      amputationLevel: first?.level,
      amputationType: first?.type,
      isReplantable: first?.isReplantable,
    });
  };

  const applySameForAll = (level: AmputationLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSameForAll(true);
    const entries: DigitAmputation[] = selectedDigits.map((digit) => ({
      digit,
      level,
      type: "complete" as const,
    }));
    onChange({
      ...value,
      digitAmputations: entries,
      amputationLevel: level,
      amputationType: "complete",
      isReplantable: undefined,
    });
  };

  return (
    <>
      {/* Same for all shortcut */}
      <View style={styles.subSection}>
        <Pressable
          style={styles.sameForAllRow}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSameForAll(!sameForAll);
          }}
        >
          <Feather
            name={sameForAll ? "check-square" : "square"}
            size={18}
            color={sameForAll ? theme.link : theme.textTertiary}
          />
          <ThemedText style={[styles.sameForAllText, { color: theme.text }]}>
            Same level for all digits
          </ThemedText>
        </Pressable>

        {sameForAll ? (
          <View style={styles.pillRow}>
            {AMPUTATION_LEVELS.map(({ key, label }) => {
              const allSame =
                value.digitAmputations.length > 0 &&
                value.digitAmputations.every((e) => e.level === key);
              return (
                <Pressable
                  key={key}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: allSame
                        ? theme.link
                        : theme.backgroundTertiary,
                      borderColor: allSame ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => applySameForAll(key)}
                >
                  <ThemedText
                    style={[
                      styles.pillText,
                      { color: allSame ? theme.buttonText : theme.text },
                    ]}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Per-digit cards */}
      {!sameForAll
        ? selectedDigits.map((digit) => {
            const entry = getEntry(digit);
            return (
              <PerDigitCard
                key={digit}
                digit={digit}
                entry={entry}
                onChange={(e) => updateDigit(digit, e)}
                theme={theme}
              />
            );
          })
        : null}
    </>
  );
}

function PerDigitCard({
  digit,
  entry,
  onChange,
  theme,
}: {
  digit: DigitId;
  entry: DigitAmputation | undefined;
  onChange: (e: DigitAmputation | undefined) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const hasAmputation = entry !== undefined;

  const toggleAmputation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (hasAmputation) {
      onChange(undefined);
    } else {
      onChange({ digit, level: "fingertip", type: "complete" });
    }
  };

  return (
    <View
      style={[
        styles.digitCard,
        {
          borderColor: hasAmputation ? theme.link + "60" : theme.border,
          backgroundColor: hasAmputation
            ? theme.link + "08"
            : theme.backgroundTertiary,
        },
      ]}
    >
      <Pressable style={styles.digitCardHeader} onPress={toggleAmputation}>
        <Feather
          name={hasAmputation ? "check-square" : "square"}
          size={18}
          color={hasAmputation ? theme.link : theme.textTertiary}
        />
        <ThemedText style={[styles.digitLabel, { color: theme.text }]}>
          {digit}
        </ThemedText>
        {hasAmputation && entry ? (
          <ThemedText
            style={[styles.digitSummary, { color: theme.textSecondary }]}
          >
            {AMPUTATION_LEVELS.find((l) => l.key === entry.level)?.label ??
              entry.level}{" "}
            · {entry.type}
          </ThemedText>
        ) : (
          <ThemedText
            style={[styles.digitSummary, { color: theme.textTertiary }]}
          >
            Not amputated
          </ThemedText>
        )}
      </Pressable>

      {hasAmputation && entry ? (
        <View style={styles.digitCardBody}>
          <View style={styles.pillRow}>
            {AMPUTATION_LEVELS.map(({ key, label }) => {
              const isSelected = entry.level === key;
              return (
                <Pressable
                  key={key}
                  style={[
                    styles.smallPill,
                    {
                      backgroundColor: isSelected
                        ? theme.link
                        : theme.backgroundDefault,
                      borderColor: isSelected ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onChange({ ...entry, level: key });
                  }}
                >
                  <ThemedText
                    style={[
                      styles.smallPillText,
                      { color: isSelected ? theme.buttonText : theme.text },
                    ]}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <TypePicker
            value={entry.type}
            onChange={(t) => onChange({ ...entry, type: t })}
            theme={theme}
            small
          />
          <ReplantPicker
            value={entry.isReplantable}
            onChange={(r) => onChange({ ...entry, isReplantable: r })}
            theme={theme}
            small
          />
        </View>
      ) : null}
    </View>
  );
}

/* -------- Shared sub-pickers -------- */

function TypePicker({
  value,
  onChange,
  theme,
  small,
}: {
  value?: "complete" | "subtotal";
  onChange: (v: "complete" | "subtotal") => void;
  theme: ReturnType<typeof useTheme>["theme"];
  small?: boolean;
}) {
  return (
    <View style={styles.subSection}>
      <ThemedText
        style={[
          small ? styles.smallLabel : styles.subSectionTitle,
          { color: theme.text },
        ]}
      >
        Type
      </ThemedText>
      <View style={styles.pillRow}>
        {(["complete", "subtotal"] as const).map((key) => {
          const isSelected = value === key;
          const pillStyle = small ? styles.smallPill : styles.pill;
          const textStyle = small ? styles.smallPillText : styles.pillText;
          return (
            <Pressable
              key={key}
              style={[
                pillStyle,
                {
                  backgroundColor: isSelected
                    ? theme.link
                    : small
                      ? theme.backgroundDefault
                      : theme.backgroundTertiary,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(key);
              }}
            >
              <ThemedText
                style={[
                  textStyle,
                  { color: isSelected ? theme.buttonText : theme.text },
                ]}
              >
                {key === "complete" ? "Complete" : "Subtotal"}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ReplantPicker({
  value,
  onChange,
  theme,
  small,
}: {
  value?: boolean;
  onChange: (v: boolean) => void;
  theme: ReturnType<typeof useTheme>["theme"];
  small?: boolean;
}) {
  return (
    <View style={styles.subSection}>
      <ThemedText
        style={[
          small ? styles.smallLabel : styles.subSectionTitle,
          { color: theme.text },
        ]}
      >
        Replantability
      </ThemedText>
      <View style={styles.pillRow}>
        {[
          { key: true, label: "Replantable", icon: "check-circle" },
          { key: false, label: "Non-replantable", icon: "x-circle" },
        ].map(({ key, label, icon }) => {
          const isSelected = value === key;
          const pillStyle = small
            ? styles.smallReplantPill
            : styles.replantPill;
          const textStyle = small ? styles.smallPillText : styles.pillText;
          return (
            <Pressable
              key={String(key)}
              style={[
                pillStyle,
                {
                  backgroundColor: isSelected
                    ? key
                      ? theme.success + "20"
                      : theme.error + "20"
                    : small
                      ? theme.backgroundDefault
                      : theme.backgroundTertiary,
                  borderColor: isSelected
                    ? key
                      ? theme.success
                      : theme.error
                    : theme.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(key);
              }}
            >
              <Feather
                name={icon as any}
                size={small ? 14 : 16}
                color={
                  isSelected
                    ? key
                      ? theme.success
                      : theme.error
                    : theme.textSecondary
                }
              />
              <ThemedText
                style={[
                  textStyle,
                  {
                    color: isSelected
                      ? key
                        ? theme.success
                        : theme.error
                      : theme.text,
                  },
                ]}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* -------- Main export -------- */

export function AmputationSection({
  value,
  onChange,
  selectedDigits,
}: AmputationSectionProps) {
  const { theme } = useTheme();

  if (selectedDigits.length >= 2) {
    return (
      <View style={styles.container}>
        <MultiAmputationUI
          value={value}
          onChange={onChange}
          selectedDigits={selectedDigits}
          theme={theme}
        />
      </View>
    );
  }

  // 0 or 1 digit — simple single UI
  const singleDigit = selectedDigits[0];
  const entry = value.digitAmputations[0];

  return (
    <View style={styles.container}>
      <SingleAmputationUI
        entry={entry}
        onChange={(e) => {
          const next = e
            ? [{ ...e, digit: singleDigit ?? ("D1" as DigitId) }]
            : [];
          onChange({
            ...value,
            digitAmputations: next,
            amputationLevel: e?.level,
            amputationType: e?.type,
            isReplantable: e?.isReplantable,
          });
        }}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  subSection: {
    gap: Spacing.sm,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
  },
  sameForAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  sameForAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  smallPill: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  replantPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 40,
    gap: 6,
  },
  smallReplantPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 32,
    gap: 4,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  digitCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
  },
  digitCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  digitLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  digitSummary: {
    fontSize: 13,
    flex: 1,
    textAlign: "right",
  },
  digitCardBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
});
