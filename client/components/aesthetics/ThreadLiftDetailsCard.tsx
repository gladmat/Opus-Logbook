import React, { useCallback, useMemo } from "react";
import { View, TextInput, Pressable, Switch, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { ProductPicker } from "./ProductPicker";
import { getProductById } from "@/lib/aestheticProducts";
import type { ThreadLiftDetails, AestheticProduct } from "@/types/aesthetics";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ThreadLiftDetailsCardProps {
  details?: ThreadLiftDetails;
  onChange: (details: ThreadLiftDetails) => void;
}

const THREAD_TYPE_OPTIONS: {
  value: ThreadLiftDetails["threadType"];
  label: string;
}[] = [
  { value: "mono", label: "Mono" },
  { value: "screw", label: "Screw" },
  { value: "cog_unidirectional", label: "Cog (uni)" },
  { value: "cog_bidirectional", label: "Cog (bi)" },
  { value: "mesh", label: "Mesh" },
  { value: "cone", label: "Cone" },
];

const NEEDLE_GAUGE_OPTIONS = ["18G", "19G", "21G", "23G"];
const AREA_OPTIONS = [
  "Midface",
  "Lower face",
  "Jawline",
  "Neck",
  "Brow",
  "Other",
];

/** Map product ID to material */
const PRODUCT_MATERIAL: Record<string, ThreadLiftDetails["material"]> = {
  thread_mint_pdo: "pdo",
  thread_novathreads: "pdo",
  thread_silhouette_instalift: "plla",
  thread_silhouette_soft: "plla",
  thread_tesslift: "pdo",
};

const DEFAULT: ThreadLiftDetails = {
  productId: "",
  material: "pdo",
  threadType: "cog_bidirectional",
  totalThreads: 0,
  treatmentArea: "",
};

export const ThreadLiftDetailsCard = React.memo(function ThreadLiftDetailsCard({
  details,
  onChange,
}: ThreadLiftDetailsCardProps) {
  const { theme } = useTheme();
  const d = details ?? DEFAULT;

  const update = useCallback(
    (partial: Partial<ThreadLiftDetails>) => {
      const next = { ...d, ...partial };
      // Auto-calc total
      if ("threadsPerSide" in partial || "bilateral" in partial) {
        const perSide = partial.threadsPerSide ?? d.threadsPerSide ?? 0;
        const bilat = partial.bilateral ?? d.bilateral ?? false;
        next.totalThreads = bilat ? perSide * 2 : perSide;
      }
      onChange(next);
    },
    [d, onChange],
  );

  const handleProductSelect = useCallback(
    (product: AestheticProduct) => {
      const material = PRODUCT_MATERIAL[product.id] ?? "pdo";
      update({ productId: product.id || "", material });
    },
    [update],
  );

  const chipStyle = (selected: boolean) => [
    styles.chip,
    {
      backgroundColor: selected ? theme.link : theme.backgroundElevated,
      borderColor: selected ? theme.link : theme.border,
    },
  ];
  const chipTextStyle = (selected: boolean) => [
    styles.chipText,
    { color: selected ? theme.buttonText : theme.text },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Product
        </ThemedText>
        <ProductPicker
          category="thread_lift"
          selectedProductId={d.productId || undefined}
          onSelect={handleProductSelect}
        />
      </View>

      {/* Material badge (auto-derived) */}
      {d.productId ? (
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.link + "1A", borderColor: theme.link },
          ]}
        >
          <ThemedText style={[styles.badgeText, { color: theme.link }]}>
            Material: {d.material.toUpperCase()}
          </ThemedText>
        </View>
      ) : null}

      {/* Thread type */}
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Thread type
        </ThemedText>
        <View style={styles.chipRow}>
          {THREAD_TYPE_OPTIONS.map((t) => {
            const sel = d.threadType === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ threadType: t.value });
                }}
                style={chipStyle(sel)}
              >
                <ThemedText style={chipTextStyle(sel)}>{t.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Gauge & length */}
      <View style={styles.row}>
        <View style={[styles.section, { flex: 1 }]}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Thread gauge
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={d.threadGauge ?? ""}
            onChangeText={(t) => update({ threadGauge: t || undefined })}
            placeholder="e.g. 21G"
            placeholderTextColor={theme.textTertiary}
          />
        </View>
        <View style={[styles.section, { flex: 1 }]}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Length (cm)
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            keyboardType="decimal-pad"
            value={d.threadLengthCm != null ? String(d.threadLengthCm) : ""}
            onChangeText={(t) => {
              const n = parseFloat(t);
              update({ threadLengthCm: isNaN(n) ? undefined : n });
            }}
            placeholder="—"
            placeholderTextColor={theme.textTertiary}
          />
        </View>
      </View>

      {/* Insertion needle gauge */}
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Insertion needle gauge
        </ThemedText>
        <View style={styles.chipRow}>
          {NEEDLE_GAUGE_OPTIONS.map((g) => {
            const sel = d.insertionNeedleGauge === g;
            return (
              <Pressable
                key={g}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ insertionNeedleGauge: sel ? undefined : g });
                }}
                style={chipStyle(sel)}
              >
                <ThemedText style={chipTextStyle(sel)}>{g}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Threads per side + bilateral */}
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Threads per side
        </ThemedText>
        <View style={styles.stepperRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              update({
                threadsPerSide: Math.max(0, (d.threadsPerSide ?? 0) - 1),
              });
            }}
            style={[styles.stepperBtn, { borderColor: theme.border }]}
          >
            <Feather name="minus" size={16} color={theme.text} />
          </Pressable>
          <ThemedText style={[styles.stepperValue, { color: theme.text }]}>
            {d.threadsPerSide ?? 0}
          </ThemedText>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              update({ threadsPerSide: (d.threadsPerSide ?? 0) + 1 });
            }}
            style={[styles.stepperBtn, { borderColor: theme.border }]}
          >
            <Feather name="plus" size={16} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.switchRow}>
        <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
          Bilateral
        </ThemedText>
        <Switch
          value={d.bilateral ?? false}
          onValueChange={(v) => update({ bilateral: v })}
          trackColor={{ true: theme.link }}
        />
      </View>

      {/* Total badge */}
      <View
        style={[
          styles.badge,
          { backgroundColor: theme.link + "1A", borderColor: theme.link },
        ]}
      >
        <ThemedText style={[styles.badgeText, { color: theme.link }]}>
          Total threads: {d.totalThreads}
        </ThemedText>
      </View>

      {/* Treatment area */}
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Treatment area
        </ThemedText>
        <View style={styles.chipRow}>
          {AREA_OPTIONS.map((a) => {
            const sel = d.treatmentArea === a;
            return (
              <Pressable
                key={a}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ treatmentArea: sel ? "" : a });
                }}
                style={chipStyle(sel)}
              >
                <ThemedText style={chipTextStyle(sel)}>{a}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Anchoring technique */}
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Anchoring technique (optional)
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundSecondary,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          value={d.anchoringTechnique ?? ""}
          onChangeText={(t) => update({ anchoringTechnique: t || undefined })}
          placeholder="e.g. Deep temporal fascia"
          placeholderTextColor={theme.textTertiary}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  section: { gap: Spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: { fontSize: 13, fontWeight: "500" },
  row: { flexDirection: "row", gap: Spacing.sm },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  badge: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  badgeText: { fontSize: 13, fontWeight: "600" },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  stepperBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 32,
    textAlign: "center",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: { fontSize: 14, fontWeight: "500" },
});
