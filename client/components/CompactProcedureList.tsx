/**
 * CompactProcedureList — Compact procedure summary for specialty modules.
 *
 * Replaces the full ProcedureEntryCard rendering with a lightweight list
 * showing procedure name, SNOMED code, tags, and remove/reorder controls.
 * The legacy ProcedureEntryCard + subcategory picker is available as a
 * fallback via "Add custom procedure".
 *
 * Used by: breast module, head & neck module.
 */

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { CaseProcedure, ProcedureTag } from "@/types/case";
import { PROCEDURE_TAG_LABELS } from "@/types/case";

interface CompactProcedureListProps {
  procedures: CaseProcedure[];
  onRemove: (procedure: CaseProcedure) => void;
  onMoveUp: (procedureId: string) => void;
  onMoveDown: (procedureId: string) => void;
  hideSnomedCodes?: boolean;
  title?: string;
  testID?: string;
}

export const CompactProcedureList = React.memo(function CompactProcedureList({
  procedures,
  onRemove,
  onMoveUp,
  onMoveDown,
  hideSnomedCodes = false,
  title = "Selected Procedures",
  testID,
}: CompactProcedureListProps) {
  const { theme, isDark } = useTheme();

  if (procedures.length === 0) return null;

  return (
    <View testID={testID} style={styles.container}>
      <ThemedText type="h4" style={styles.header}>
        {title}
      </ThemedText>
      {procedures.map((proc, idx) => (
        <CompactProcedureRow
          key={proc.id}
          procedure={proc}
          index={idx}
          total={procedures.length}
          onRemove={onRemove}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          hideSnomedCodes={hideSnomedCodes}
          theme={theme}
          isDark={isDark}
        />
      ))}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────

interface RowProps {
  procedure: CaseProcedure;
  index: number;
  total: number;
  onRemove: (procedure: CaseProcedure) => void;
  onMoveUp: (procedureId: string) => void;
  onMoveDown: (procedureId: string) => void;
  hideSnomedCodes: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
  isDark: boolean;
}

const CompactProcedureRow = React.memo(function CompactProcedureRow({
  procedure,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
  hideSnomedCodes,
  theme,
  isDark,
}: RowProps) {
  const tags = (procedure.tags ?? []).filter(
    (t): t is ProcedureTag => t in PROCEDURE_TAG_LABELS,
  );

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.border,
          ...(isDark ? {} : Shadows.card),
        },
      ]}
    >
      <View style={styles.rowContent}>
        {/* Order badge + name */}
        <View style={styles.nameRow}>
          <View
            style={[styles.orderBadge, { backgroundColor: theme.link + "20" }]}
          >
            <ThemedText style={[styles.orderText, { color: theme.link }]}>
              {index + 1}
            </ThemedText>
          </View>
          <ThemedText
            type="small"
            style={[styles.procedureName, { color: theme.text }]}
            numberOfLines={2}
          >
            {procedure.procedureName}
          </ThemedText>
        </View>

        {/* SNOMED code + tags */}
        <View style={styles.metaRow}>
          {!hideSnomedCodes && procedure.snomedCtCode ? (
            <ThemedText
              type="small"
              style={{ color: theme.textTertiary }}
              numberOfLines={1}
            >
              {procedure.snomedCtCode}
            </ThemedText>
          ) : null}
          {tags.length > 0 ? (
            <View style={styles.tagRow}>
              {tags.slice(0, 3).map((tag) => (
                <View
                  key={tag}
                  style={[styles.tagPill, { backgroundColor: theme.link + "18" }]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: theme.link, fontSize: 10 }}
                  >
                    {PROCEDURE_TAG_LABELS[tag]}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {index > 0 ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onMoveUp(procedure.id);
            }}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Feather name="chevron-up" size={16} color={theme.textSecondary} />
          </Pressable>
        ) : null}
        {index < total - 1 ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onMoveDown(procedure.id);
            }}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Feather
              name="chevron-down"
              size={16}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onRemove(procedure);
          }}
          hitSlop={8}
          style={styles.iconBtn}
        >
          <Feather name="x" size={16} color={theme.error} />
        </Pressable>
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  orderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: {
    fontSize: 12,
    fontWeight: "700",
  },
  procedureName: {
    flex: 1,
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginLeft: 22 + Spacing.sm, // align with name past order badge
  },
  tagRow: {
    flexDirection: "row",
    gap: 4,
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: Spacing.sm,
  },
  iconBtn: {
    padding: 4,
  },
});
