import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  FormField,
  PickerField,
  DatePickerField,
} from "@/components/FormField";
import {
  WoundAssessment,
  WoundBedTissue,
  ExudateAmount,
  ExudateType,
  WoundEdgeStatus,
  WoundSurroundingSkin,
  InfectionSign,
  HealingTrend,
  DressingCategory,
  WoundDressingEntry,
  WOUND_BED_TISSUE_LABELS,
  EXUDATE_AMOUNT_LABELS,
  EXUDATE_TYPE_LABELS,
  WOUND_EDGE_STATUS_LABELS,
  SURROUNDING_SKIN_LABELS,
  INFECTION_SIGN_LABELS,
  HEALING_TREND_LABELS,
  DRESSING_CATEGORY_LABELS,
  getDressingsByCategory,
  getDressingCategories,
} from "@/types/wound";

interface WoundAssessmentFormProps {
  value: WoundAssessment;
  onChange: (data: WoundAssessment) => void;
}

interface AccordionSectionProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: AccordionSectionProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        accordionStyles.container,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
      ]}
    >
      <Pressable
        style={accordionStyles.header}
        onPress={onToggle}
        testID={`caseForm.wound.section-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <View style={accordionStyles.headerLeft}>
          <Feather name={icon} size={18} color={theme.link} />
          <ThemedText
            style={[accordionStyles.headerTitle, { color: theme.text }]}
          >
            {title}
          </ThemedText>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>
      {expanded ? (
        <View style={accordionStyles.content}>{children}</View>
      ) : null}
    </View>
  );
}

const accordionStyles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: Spacing.touchTarget,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});

function toPickerOptions<T extends string>(
  labels: Record<T, string>,
): { value: string; label: string }[] {
  return Object.entries(labels).map(([value, label]) => ({
    value,
    label: label as string,
  }));
}

export function WoundAssessmentForm({
  value,
  onChange,
}: WoundAssessmentFormProps) {
  const { theme } = useTheme();
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    dimensions: true,
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const update = useCallback(
    (partial: Partial<WoundAssessment>) => {
      const updated = { ...value, ...partial };
      if (partial.lengthCm !== undefined || partial.widthCm !== undefined) {
        const l = partial.lengthCm ?? value.lengthCm;
        const w = partial.widthCm ?? value.widthCm;
        if (l !== undefined && w !== undefined) {
          updated.areaCm2 = Math.round(l * w * 100) / 100;
        } else {
          updated.areaCm2 = undefined;
        }
      }
      onChange(updated);
    },
    [value, onChange],
  );

  const toggleInfectionSign = useCallback(
    (sign: InfectionSign) => {
      const current = value.infectionSigns ?? [];
      const updated = current.includes(sign)
        ? current.filter((s) => s !== sign)
        : [...current, sign];
      update({ infectionSigns: updated });
    },
    [value.infectionSigns, update],
  );

  const addDressing = useCallback(
    (productId: string, productName: string, category: DressingCategory) => {
      const existing = value.dressings.find((d) => d.productId === productId);
      if (existing) return;
      const entry: WoundDressingEntry = {
        productId,
        productName,
        category,
        quantity: 1,
      };
      update({ dressings: [...value.dressings, entry] });
    },
    [value.dressings, update],
  );

  const removeDressing = useCallback(
    (productId: string) => {
      update({
        dressings: value.dressings.filter((d) => d.productId !== productId),
      });
    },
    [value.dressings, update],
  );

  const updateDressing = useCallback(
    (productId: string, partial: Partial<WoundDressingEntry>) => {
      update({
        dressings: value.dressings.map((d) =>
          d.productId === productId ? { ...d, ...partial } : d,
        ),
      });
    },
    [value.dressings, update],
  );

  const parseNum = (text: string): number | undefined => {
    if (!text) return undefined;
    const n = parseFloat(text);
    return isNaN(n) ? undefined : n;
  };

  const numStr = (n?: number): string => (n !== undefined ? String(n) : "");

  return (
    <View style={styles.container}>
      <AccordionSection
        title="Dimensions"
        icon="maximize-2"
        expanded={!!expandedSections.dimensions}
        onToggle={() => toggleSection("dimensions")}
      >
        <View style={styles.row}>
          <View style={styles.thirdCol}>
            <FormField
              label="Length"
              value={numStr(value.lengthCm)}
              onChangeText={(t) => update({ lengthCm: parseNum(t) })}
              keyboardType="decimal-pad"
              unit="cm"
              placeholder="0.0"
            />
          </View>
          <View style={styles.thirdCol}>
            <FormField
              label="Width"
              value={numStr(value.widthCm)}
              onChangeText={(t) => update({ widthCm: parseNum(t) })}
              keyboardType="decimal-pad"
              unit="cm"
              placeholder="0.0"
            />
          </View>
          <View style={styles.thirdCol}>
            <FormField
              label="Depth"
              value={numStr(value.depthCm)}
              onChangeText={(t) => update({ depthCm: parseNum(t) })}
              keyboardType="decimal-pad"
              unit="cm"
              placeholder="0.0"
            />
          </View>
        </View>
        {value.areaCm2 !== undefined ? (
          <View
            style={[
              styles.areaDisplay,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="grid" size={16} color={theme.link} />
            <ThemedText style={[styles.areaText, { color: theme.text }]}>
              Area: {value.areaCm2} cm{"\u00B2"}
            </ThemedText>
          </View>
        ) : null}
      </AccordionSection>

      <AccordionSection
        title="Wound Bed (TIME - T)"
        icon="layers"
        expanded={!!expandedSections.tissue}
        onToggle={() => toggleSection("tissue")}
      >
        <PickerField
          label="Tissue Type"
          value={value.tissueType ?? ""}
          options={toPickerOptions(WOUND_BED_TISSUE_LABELS)}
          onSelect={(v) => update({ tissueType: v as WoundBedTissue })}
          placeholder="Select tissue type..."
        />
      </AccordionSection>

      <AccordionSection
        title="Exudate (TIME - M)"
        icon="droplet"
        expanded={!!expandedSections.exudate}
        onToggle={() => toggleSection("exudate")}
      >
        <PickerField
          label="Amount"
          value={value.exudateAmount ?? ""}
          options={toPickerOptions(EXUDATE_AMOUNT_LABELS)}
          onSelect={(v) => update({ exudateAmount: v as ExudateAmount })}
          placeholder="Select amount..."
        />
        <PickerField
          label="Type"
          value={value.exudateType ?? ""}
          options={toPickerOptions(EXUDATE_TYPE_LABELS)}
          onSelect={(v) => update({ exudateType: v as ExudateType })}
          placeholder="Select type..."
        />
      </AccordionSection>

      <AccordionSection
        title="Wound Edge (TIME - E)"
        icon="minus-circle"
        expanded={!!expandedSections.edge}
        onToggle={() => toggleSection("edge")}
      >
        <PickerField
          label="Edge Status"
          value={value.edgeStatus ?? ""}
          options={toPickerOptions(WOUND_EDGE_STATUS_LABELS)}
          onSelect={(v) => update({ edgeStatus: v as WoundEdgeStatus })}
          placeholder="Select edge status..."
        />
      </AccordionSection>

      <AccordionSection
        title="Surrounding Skin"
        icon="circle"
        expanded={!!expandedSections.skin}
        onToggle={() => toggleSection("skin")}
      >
        <PickerField
          label="Skin Status"
          value={value.surroundingSkin ?? ""}
          options={toPickerOptions(SURROUNDING_SKIN_LABELS)}
          onSelect={(v) =>
            update({ surroundingSkin: v as WoundSurroundingSkin })
          }
          placeholder="Select skin status..."
        />
      </AccordionSection>

      <AccordionSection
        title="Infection Signs (TIME - I)"
        icon="alert-triangle"
        expanded={!!expandedSections.infection}
        onToggle={() => toggleSection("infection")}
      >
        <View style={styles.checkboxGrid}>
          {(
            Object.entries(INFECTION_SIGN_LABELS) as [InfectionSign, string][]
          ).map(([sign, label]) => {
            const checked = (value.infectionSigns ?? []).includes(sign);
            return (
              <Pressable
                key={sign}
                style={[
                  styles.checkboxItem,
                  {
                    backgroundColor: checked
                      ? theme.error + "15"
                      : theme.backgroundRoot,
                    borderColor: checked ? theme.error : theme.border,
                  },
                ]}
                onPress={() => toggleInfectionSign(sign)}
                testID={`caseForm.wound.toggle-infection-${sign}`}
              >
                <Feather
                  name={checked ? "check-square" : "square"}
                  size={18}
                  color={checked ? theme.error : theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.checkboxLabel,
                    { color: checked ? theme.error : theme.text },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </AccordionSection>

      <AccordionSection
        title="Dressings Applied"
        icon="package"
        expanded={!!expandedSections.dressings}
        onToggle={() => toggleSection("dressings")}
      >
        {value.dressings.length > 0 ? (
          <View style={styles.dressingsList}>
            {value.dressings.map((entry) => (
              <View
                key={entry.productId}
                style={[
                  styles.dressingEntry,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.dressingEntryHeader}>
                  <View style={styles.dressingEntryInfo}>
                    <ThemedText
                      style={[styles.dressingName, { color: theme.text }]}
                    >
                      {entry.productName}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.dressingCategory,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {DRESSING_CATEGORY_LABELS[entry.category]}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => removeDressing(entry.productId)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    testID={`caseForm.wound.btn-removeDressing-${entry.productId}`}
                  >
                    <Feather name="x-circle" size={20} color={theme.error} />
                  </Pressable>
                </View>
                <View style={styles.dressingFields}>
                  <View style={styles.dressingQty}>
                    <ThemedText
                      style={[
                        styles.fieldLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Qty
                    </ThemedText>
                    <TextInput
                      value={
                        entry.quantity !== undefined
                          ? String(entry.quantity)
                          : ""
                      }
                      onChangeText={(t) => {
                        const q = parseInt(t, 10);
                        updateDressing(entry.productId, {
                          quantity: isNaN(q) ? undefined : q,
                        });
                      }}
                      keyboardType="numeric"
                      style={[
                        styles.qtyInput,
                        {
                          color: theme.text,
                          backgroundColor: theme.backgroundRoot,
                          borderColor: theme.border,
                        },
                      ]}
                      placeholder="1"
                      placeholderTextColor={theme.textTertiary}
                    />
                  </View>
                  <View style={styles.dressingNotes}>
                    <ThemedText
                      style={[
                        styles.fieldLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Notes
                    </ThemedText>
                    <TextInput
                      value={entry.notes ?? ""}
                      onChangeText={(t) =>
                        updateDressing(entry.productId, {
                          notes: t || undefined,
                        })
                      }
                      style={[
                        styles.notesInput,
                        {
                          color: theme.text,
                          backgroundColor: theme.backgroundRoot,
                          borderColor: theme.border,
                        },
                      ]}
                      placeholder="Optional notes..."
                      placeholderTextColor={theme.textTertiary}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <ThemedText
          style={[styles.dressingPrompt, { color: theme.textSecondary }]}
        >
          Select dressings by category:
        </ThemedText>
        {getDressingCategories().map((cat) => (
          <DressingCategorySection
            key={cat}
            category={cat}
            selectedIds={value.dressings.map((d) => d.productId)}
            onAdd={addDressing}
          />
        ))}
      </AccordionSection>

      <AccordionSection
        title="Healing Trend"
        icon="trending-up"
        expanded={!!expandedSections.healing}
        onToggle={() => toggleSection("healing")}
      >
        <View style={styles.trendRow}>
          {(
            Object.entries(HEALING_TREND_LABELS) as [HealingTrend, string][]
          ).map(([trend, label]) => {
            const selected = value.healingTrend === trend;
            const trendColor =
              trend === "improving"
                ? theme.success
                : trend === "deteriorating"
                  ? theme.error
                  : theme.warning;
            return (
              <Pressable
                key={trend}
                style={[
                  styles.trendButton,
                  {
                    backgroundColor: selected
                      ? trendColor + "15"
                      : theme.backgroundRoot,
                    borderColor: selected ? trendColor : theme.border,
                  },
                ]}
                onPress={() => update({ healingTrend: trend })}
                testID={`caseForm.wound.chip-trend-${trend}`}
              >
                <Feather
                  name={
                    trend === "improving"
                      ? "trending-up"
                      : trend === "deteriorating"
                        ? "trending-down"
                        : "minus"
                  }
                  size={18}
                  color={selected ? trendColor : theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.trendLabel,
                    {
                      color: selected ? trendColor : theme.text,
                      fontWeight: selected ? "600" : "400",
                    },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </AccordionSection>

      <AccordionSection
        title="Intervention Notes"
        icon="edit-3"
        expanded={!!expandedSections.intervention}
        onToggle={() => toggleSection("intervention")}
      >
        <FormField
          label="Intervention Notes"
          value={value.interventionNotes ?? ""}
          onChangeText={(t) => update({ interventionNotes: t || undefined })}
          placeholder="Describe any interventions performed..."
          multiline
        />
      </AccordionSection>

      <AccordionSection
        title="Clinician Note"
        icon="file-text"
        expanded={!!expandedSections.clinician}
        onToggle={() => toggleSection("clinician")}
      >
        <FormField
          label="Clinician Note"
          value={value.clinicianNote ?? ""}
          onChangeText={(t) => update({ clinicianNote: t || undefined })}
          placeholder="Additional clinical observations..."
          multiline
        />
      </AccordionSection>

      <AccordionSection
        title="Next Review Date"
        icon="calendar"
        expanded={!!expandedSections.review}
        onToggle={() => toggleSection("review")}
      >
        <DatePickerField
          label="Next Review Date"
          value={value.nextReviewDate ?? ""}
          onChange={(d) => update({ nextReviewDate: d })}
          placeholder="Select next review date..."
        />
      </AccordionSection>
    </View>
  );
}

interface DressingCategorySectionProps {
  category: DressingCategory;
  selectedIds: string[];
  onAdd: (
    productId: string,
    productName: string,
    category: DressingCategory,
  ) => void;
}

function DressingCategorySection({
  category,
  selectedIds,
  onAdd,
}: DressingCategorySectionProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const products = getDressingsByCategory(category);

  return (
    <View style={[styles.dressingCatContainer, { borderColor: theme.border }]}>
      <Pressable
        style={styles.dressingCatHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <ThemedText style={[styles.dressingCatTitle, { color: theme.text }]}>
          {DRESSING_CATEGORY_LABELS[category]}
        </ThemedText>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.textSecondary}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.dressingCatProducts}>
          {products.map((product) => {
            const isSelected = selectedIds.includes(product.id);
            return (
              <Pressable
                key={product.id}
                style={[
                  styles.productItem,
                  {
                    backgroundColor: isSelected
                      ? theme.link + "10"
                      : theme.backgroundRoot,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  if (!isSelected) {
                    onAdd(product.id, product.name, product.category);
                  }
                }}
                disabled={isSelected}
                testID={`caseForm.wound.chip-dressing-${product.id}`}
              >
                <View style={styles.productInfo}>
                  <ThemedText
                    style={[
                      styles.productName,
                      { color: isSelected ? theme.link : theme.text },
                    ]}
                  >
                    {product.name}
                  </ThemedText>
                  {product.manufacturer ? (
                    <ThemedText
                      style={[
                        styles.productManufacturer,
                        { color: theme.textTertiary },
                      ]}
                    >
                      {product.manufacturer}
                    </ThemedText>
                  ) : null}
                </View>
                {isSelected ? (
                  <Feather name="check" size={16} color={theme.link} />
                ) : (
                  <Feather name="plus" size={16} color={theme.textSecondary} />
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  thirdCol: {
    flex: 1,
  },
  areaDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  areaText: {
    fontSize: 14,
    fontWeight: "600",
  },
  checkboxGrid: {
    gap: Spacing.sm,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  trendRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  trendButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: Spacing.touchTarget,
  },
  trendLabel: {
    fontSize: 13,
  },
  dressingsList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dressingEntry: {
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    padding: Spacing.md,
  },
  dressingEntryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dressingEntryInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  dressingName: {
    fontSize: 14,
    fontWeight: "600",
  },
  dressingCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  dressingFields: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  dressingQty: {
    width: 70,
  },
  dressingNotes: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  qtyInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    textAlign: "center",
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 14,
  },
  dressingPrompt: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  dressingCatContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xs,
  },
  dressingCatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  dressingCatTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  dressingCatProducts: {
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  productInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  productName: {
    fontSize: 14,
  },
  productManufacturer: {
    fontSize: 11,
    marginTop: 1,
  },
});
