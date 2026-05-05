/**
 * LVAOperativeDetails — Per-anastomosis LVA operative log.
 *
 * Renders inline within LymphaticAssessment for LVA procedures.
 * Two zones: general microsurgery fields + per-anastomosis card list (add/remove).
 */

import React, { useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { v4 as uuidv4 } from "uuid";
import type {
  LVAOperativeDetails as LVAOperativeDetailsData,
  LVAAnastomosis,
  LVAAnastomosisRegion,
  NECSTGrade,
  LVATechnique,
  SutureMaterial,
  PatencyConfirmation,
  RoboticAssistance,
} from "@/types/lymphatic";
import {
  LVA_TECHNIQUE_LABELS,
  LVA_REGION_LABELS,
  NECST_LABELS,
  SUTURE_MATERIAL_LABELS,
  PATENCY_CONFIRMATION_LABELS,
  ROBOTIC_ASSISTANCE_LABELS,
} from "@/types/lymphatic";

// ─── Props ──────────────────────────────────────────────────────────────────

interface LVAOperativeDetailsProps {
  value: LVAOperativeDetailsData;
  onChange: (d: LVAOperativeDetailsData) => void;
  procedureName?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ANAESTHESIA_OPTIONS = [
  "general",
  "regional",
  "local_sedation",
  "local",
] as const;

const ANAESTHESIA_LABELS: Record<string, string> = {
  general: "General",
  regional: "Regional",
  local_sedation: "Local + sedation",
  local: "Local",
};

const ROBOTIC_OPTIONS: RoboticAssistance[] = [
  "none",
  "symani",
  "musa",
  "other",
];
const REGIONS: LVAAnastomosisRegion[] = [
  "wrist",
  "forearm",
  "elbow",
  "arm",
  "ankle",
  "calf",
  "knee",
  "thigh",
  "cervical",
  "other",
];
const NECST_GRADES: NECSTGrade[] = [
  "normal",
  "ectasis",
  "contraction",
  "sclerosis",
];
const SUTURE_OPTIONS: SutureMaterial[] = [
  "11-0_nylon",
  "12-0_nylon",
  "12-0s_nylon",
];
const PATENCY_OPTIONS: PatencyConfirmation[] = [
  "icg_transit",
  "milking_test",
  "blue_dye",
  "none",
];

// Short labels for technique chips (long descriptions are unwieldy in chip format)
const TECHNIQUE_SHORT_LABELS: Record<LVATechnique, string> = {
  end_to_end: "E-E",
  end_to_side: "E-S",
  side_to_end: "S-E",
  side_to_side: "S-S",
  intussusception: "Intussusception",
  octopus: "Octopus",
  lambda: "Lambda (λ)",
  pi: "Pi (π)",
  parachute: "Parachute",
  ola: "OLA",
  ivas: "IVaS",
  sequential: "Sequential",
  other: "Other",
};
const TECHNIQUES: LVATechnique[] = Object.keys(
  LVA_TECHNIQUE_LABELS,
) as LVATechnique[];

// ─── Chip helper ────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options,
  labels,
  selected,
  onSelect,
  accentColor,
  theme,
}: {
  options: T[];
  labels: Record<T, string>;
  selected?: T;
  onSelect: (v: T) => void;
  accentColor: string;
  theme: any;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? accentColor + "20"
                  : theme.backgroundSecondary,
                borderColor: isSelected ? accentColor : theme.border,
              },
            ]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[
                styles.chipText,
                { color: isSelected ? accentColor : theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {labels[opt]}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── NECST colour chip ──────────────────────────────────────────────────────

const NECST_COLORS: Record<NECSTGrade, string> = {
  normal: "#2EA043",
  ectasis: "#E5A00D",
  contraction: "#D29922",
  sclerosis: "#F85149",
};

function NECSTChipRow({
  selected,
  onSelect,
  theme,
}: {
  selected?: NECSTGrade;
  onSelect: (v: NECSTGrade) => void;
  theme: any;
}) {
  return (
    <View style={styles.chipRow}>
      {NECST_GRADES.map((grade) => {
        const isSelected = selected === grade;
        const color = NECST_COLORS[grade];
        return (
          <TouchableOpacity
            key={grade}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? color + "20"
                  : theme.backgroundSecondary,
                borderColor: isSelected ? color : theme.border,
              },
            ]}
            onPress={() => onSelect(grade)}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[
                styles.chipText,
                {
                  color: isSelected ? color : theme.textSecondary,
                  fontSize: 12,
                },
              ]}
              numberOfLines={2}
            >
              {NECST_LABELS[grade].split(" — ")[0]}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Anastomosis Card ───────────────────────────────────────────────────────

const AnastomosisCard = React.memo(function AnastomosisCard({
  anastomosis,
  index,
  onChange,
  onRemove,
  theme,
  accentColor,
}: {
  anastomosis: LVAAnastomosis;
  index: number;
  onChange: (updated: LVAAnastomosis) => void;
  onRemove: () => void;
  theme: any;
  accentColor: string;
}) {
  const update = useCallback(
    (patch: Partial<LVAAnastomosis>) => onChange({ ...anastomosis, ...patch }),
    [anastomosis, onChange],
  );

  return (
    <View
      style={[
        styles.anastomosisCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <ThemedText style={[styles.cardTitle, { color: theme.text }]}>
          Anastomosis {index + 1}
        </ThemedText>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <ThemedText style={{ color: theme.error, fontSize: 13 }}>
            Remove
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Site + Region */}
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        Region
      </ThemedText>
      <ChipRow
        options={REGIONS}
        labels={LVA_REGION_LABELS}
        selected={anastomosis.region}
        onSelect={(v) => update({ region: v })}
        accentColor={accentColor}
        theme={theme}
      />

      <ThemedText
        style={[
          styles.fieldLabel,
          { color: theme.textSecondary, marginTop: Spacing.sm },
        ]}
      >
        Site description
      </ThemedText>
      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: theme.backgroundElevated,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        placeholder="e.g. volar wrist, 3cm proximal to crease"
        placeholderTextColor={theme.textTertiary}
        value={anastomosis.site ?? ""}
        onChangeText={(v) => update({ site: v })}
      />

      {/* NECST Quality */}
      <ThemedText
        style={[
          styles.fieldLabel,
          { color: theme.textSecondary, marginTop: Spacing.sm },
        ]}
      >
        Lymphatic quality (NECST)
      </ThemedText>
      <NECSTChipRow
        selected={anastomosis.lymphaticQuality}
        onSelect={(v) => update({ lymphaticQuality: v })}
        theme={theme}
      />

      {/* Diameters */}
      <View style={[styles.fieldRow, { marginTop: Spacing.sm }]}>
        <View style={styles.fieldHalf}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Lymphatic (mm)
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundElevated,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            keyboardType="decimal-pad"
            placeholder="0.3"
            placeholderTextColor={theme.textTertiary}
            value={
              anastomosis.lymphaticDiameterMm != null
                ? String(anastomosis.lymphaticDiameterMm)
                : ""
            }
            onChangeText={(v) => {
              const n = parseFloat(v);
              update({ lymphaticDiameterMm: isNaN(n) ? undefined : n });
            }}
          />
        </View>
        <View style={styles.fieldHalf}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Venule (mm)
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundElevated,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            keyboardType="decimal-pad"
            placeholder="0.5"
            placeholderTextColor={theme.textTertiary}
            value={
              anastomosis.venuleDiameterMm != null
                ? String(anastomosis.venuleDiameterMm)
                : ""
            }
            onChangeText={(v) => {
              const n = parseFloat(v);
              update({ venuleDiameterMm: isNaN(n) ? undefined : n });
            }}
          />
        </View>
      </View>

      {/* Technique (scrollable chip row for 13 options) */}
      <ThemedText
        style={[
          styles.fieldLabel,
          { color: theme.textSecondary, marginTop: Spacing.sm },
        ]}
      >
        Technique
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollChipContainer}
      >
        <View style={styles.chipRow}>
          {TECHNIQUES.map((tech) => {
            const isSelected = anastomosis.technique === tech;
            return (
              <TouchableOpacity
                key={tech}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? accentColor + "20"
                      : theme.backgroundElevated,
                    borderColor: isSelected ? accentColor : theme.border,
                  },
                ]}
                onPress={() => update({ technique: tech })}
                activeOpacity={0.7}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? accentColor : theme.textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {TECHNIQUE_SHORT_LABELS[tech]}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Suture */}
      <View style={[styles.fieldRow, { marginTop: Spacing.sm }]}>
        <View style={{ flex: 2 }}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Suture
          </ThemedText>
          <ChipRow
            options={SUTURE_OPTIONS}
            labels={SUTURE_MATERIAL_LABELS}
            selected={anastomosis.sutureMaterial}
            onSelect={(v) => update({ sutureMaterial: v })}
            accentColor={accentColor}
            theme={theme}
          />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Count
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundElevated,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            keyboardType="number-pad"
            placeholder="4"
            placeholderTextColor={theme.textTertiary}
            value={
              anastomosis.sutureCount != null
                ? String(anastomosis.sutureCount)
                : ""
            }
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              update({ sutureCount: isNaN(n) ? undefined : n });
            }}
          />
        </View>
      </View>

      {/* Patency confirmation */}
      <ThemedText
        style={[
          styles.fieldLabel,
          { color: theme.textSecondary, marginTop: Spacing.sm },
        ]}
      >
        Patency confirmation
      </ThemedText>
      <ChipRow
        options={PATENCY_OPTIONS}
        labels={PATENCY_CONFIRMATION_LABELS}
        selected={anastomosis.patencyConfirmation}
        onSelect={(v) => update({ patencyConfirmation: v })}
        accentColor={accentColor}
        theme={theme}
      />
    </View>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────────

export const LVAOperativeDetailsComponent = React.memo(
  function LVAOperativeDetailsComponent({
    value,
    onChange,
    procedureName,
  }: LVAOperativeDetailsProps) {
    const { theme } = useTheme();
    const accentColor = theme.accent;

    const update = useCallback(
      (patch: Partial<LVAOperativeDetailsData>) => {
        onChange({ ...value, ...patch });
      },
      [value, onChange],
    );

    const anastomoses = value.anastomoses ?? [];

    const addAnastomosis = useCallback(() => {
      const newA: LVAAnastomosis = {
        id: uuidv4(),
        site: "",
        region: "wrist",
      };
      const updated = [...anastomoses, newA];
      update({
        anastomoses: updated,
        totalAnastomosisCount: updated.length,
      });
    }, [anastomoses, update]);

    const updateAnastomosis = useCallback(
      (index: number, updated: LVAAnastomosis) => {
        const arr = [...anastomoses];
        arr[index] = updated;
        update({ anastomoses: arr, totalAnastomosisCount: arr.length });
      },
      [anastomoses, update],
    );

    const removeAnastomosis = useCallback(
      (index: number) => {
        const arr = anastomoses.filter((_, i) => i !== index);
        update({ anastomoses: arr, totalAnastomosisCount: arr.length });
      },
      [anastomoses, update],
    );

    const sectionTitle = procedureName
      ? `LVA Operative Details — ${procedureName}`
      : "LVA Operative Details";

    return (
      <SectionWrapper
        title={sectionTitle}
        icon="crosshair"
        collapsible
        defaultCollapsed={false}
      >
        {/* Anastomosis count badge */}
        {anastomoses.length > 0 && (
          <View
            style={[
              styles.countBadge,
              { backgroundColor: accentColor + "15", borderColor: accentColor },
            ]}
          >
            <ThemedText
              style={{ color: accentColor, fontWeight: "600", fontSize: 13 }}
            >
              {anastomoses.length} anastomos
              {anastomoses.length === 1 ? "is" : "es"}
            </ThemedText>
          </View>
        )}

        {/* ── General fields ── */}
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Anaesthesia
        </ThemedText>
        <ChipRow
          options={[...ANAESTHESIA_OPTIONS]}
          labels={ANAESTHESIA_LABELS as Record<string, string>}
          selected={value.anaesthesiaType}
          onSelect={(v) =>
            update({
              anaesthesiaType: v as LVAOperativeDetailsData["anaesthesiaType"],
            })
          }
          accentColor={accentColor}
          theme={theme}
        />

        <View style={[styles.fieldRow, { marginTop: Spacing.sm }]}>
          <View style={styles.fieldHalf}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Microscope
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="e.g. Zeiss KINEVO"
              placeholderTextColor={theme.textTertiary}
              value={value.microscopeModel ?? ""}
              onChangeText={(v) => update({ microscopeModel: v || undefined })}
            />
          </View>
          <View style={styles.fieldHalf}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Magnification
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="e.g. 12-30x"
              placeholderTextColor={theme.textTertiary}
              value={value.magnificationRange ?? ""}
              onChangeText={(v) =>
                update({ magnificationRange: v || undefined })
              }
            />
          </View>
        </View>

        <View style={[styles.fieldRow, { marginTop: Spacing.sm }]}>
          <View style={styles.fieldHalf}>
            <View style={styles.toggleRow}>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                ICG intraop
              </ThemedText>
              <Switch
                value={value.icgIntraoperativeUse ?? false}
                onValueChange={(v) => update({ icgIntraoperativeUse: v })}
                trackColor={{
                  false: theme.backgroundSecondary,
                  true: accentColor + "60",
                }}
                thumbColor={
                  value.icgIntraoperativeUse ? accentColor : theme.textTertiary
                }
              />
            </View>
          </View>
          <View style={styles.fieldHalf}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Op time (min)
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              keyboardType="number-pad"
              placeholder="180"
              placeholderTextColor={theme.textTertiary}
              value={
                value.operativeTimeMinutes != null
                  ? String(value.operativeTimeMinutes)
                  : ""
              }
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                update({ operativeTimeMinutes: isNaN(n) ? undefined : n });
              }}
            />
          </View>
        </View>

        <ThemedText
          style={[
            styles.fieldLabel,
            { color: theme.textSecondary, marginTop: Spacing.sm },
          ]}
        >
          Robotic assistance
        </ThemedText>
        <ChipRow
          options={ROBOTIC_OPTIONS}
          labels={ROBOTIC_ASSISTANCE_LABELS}
          selected={value.roboticAssistance}
          onSelect={(v) => update({ roboticAssistance: v })}
          accentColor={accentColor}
          theme={theme}
        />

        {/* ── Per-anastomosis cards ── */}
        <View
          style={[
            styles.divider,
            { borderBottomColor: theme.border, marginVertical: Spacing.md },
          ]}
        />

        {anastomoses.map((a, i) => (
          <AnastomosisCard
            key={a.id}
            anastomosis={a}
            index={i}
            onChange={(updated) => updateAnastomosis(i, updated)}
            onRemove={() => removeAnastomosis(i)}
            theme={theme}
            accentColor={accentColor}
          />
        ))}

        <TouchableOpacity
          style={[styles.addButton, { borderColor: accentColor }]}
          onPress={addAnastomosis}
          activeOpacity={0.7}
        >
          <ThemedText
            style={{ color: accentColor, fontWeight: "600", fontSize: 14 }}
          >
            + Add Anastomosis
          </ThemedText>
        </TouchableOpacity>
      </SectionWrapper>
    );
  },
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  fieldHalf: {
    flex: 1,
  },
  textInput: {
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  countBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  anastomosisCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  scrollChipContainer: {
    marginHorizontal: -Spacing.xs,
  },
  divider: {
    borderBottomWidth: 1,
  },
  addButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    borderStyle: "dashed",
    paddingVertical: Spacing.sm,
    alignItems: "center",
    marginTop: Spacing.xs,
  },
});
