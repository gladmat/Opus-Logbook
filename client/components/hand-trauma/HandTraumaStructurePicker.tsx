import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { v4 as uuidv4 } from "uuid";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  DigitId,
  HandTraumaDetails,
  HandTraumaStructure,
  CaseProcedure,
} from "@/types/case";
import type { DiagnosisPicklistEntry } from "@/lib/diagnosisPicklists";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import {
  STRUCTURE_PROCEDURE_MAP,
  SMART_DEFAULTS,
  type StructureCategory,
} from "./structureConfig";
import { DigitSelector } from "./DigitSelector";
import { FlexorTendonSection } from "./FlexorTendonSection";
import { ExtensorTendonSection } from "./ExtensorTendonSection";
import { NerveSection } from "./NerveSection";
import { ArterySection } from "./ArterySection";
import { LigamentSection } from "./LigamentSection";
import { OtherStructuresSection } from "./OtherStructuresSection";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HandTraumaStructurePickerProps {
  value: HandTraumaDetails;
  onChange: (details: HandTraumaDetails) => void;
  selectedDiagnosis?: DiagnosisPicklistEntry;
  procedures: CaseProcedure[];
  onProceduresChange: (
    updater: (prev: CaseProcedure[]) => CaseProcedure[],
  ) => void;
}

type AccordionSection =
  | "flexor"
  | "extensor"
  | "nerve"
  | "artery"
  | "ligament"
  | "other";

const SECTION_CONFIG: {
  key: AccordionSection;
  label: string;
  icon: string;
  category: StructureCategory;
}[] = [
  {
    key: "flexor",
    label: "Flexor Tendons",
    icon: "trending-down",
    category: "flexor_tendon",
  },
  {
    key: "extensor",
    label: "Extensor Tendons",
    icon: "trending-up",
    category: "extensor_tendon",
  },
  { key: "nerve", label: "Nerves", icon: "zap", category: "nerve" },
  { key: "artery", label: "Arteries", icon: "activity", category: "artery" },
  { key: "ligament", label: "Ligaments", icon: "link", category: "ligament" },
  {
    key: "other",
    label: "Other Structures",
    icon: "layers",
    category: "other",
  },
];

function lookupProcedureMap(structureId: string): string | undefined {
  if (STRUCTURE_PROCEDURE_MAP[structureId])
    return STRUCTURE_PROCEDURE_MAP[structureId];
  if (structureId.startsWith("pip_collateral_"))
    return STRUCTURE_PROCEDURE_MAP["pip_collateral"];
  if (structureId.startsWith("volar_plate_"))
    return STRUCTURE_PROCEDURE_MAP["volar_plate"];
  return undefined;
}

export function HandTraumaStructurePicker({
  value,
  onChange,
  selectedDiagnosis,
  procedures,
  onProceduresChange,
}: HandTraumaStructurePickerProps) {
  const { theme } = useTheme();
  const [openSections, setOpenSections] = useState<Set<AccordionSection>>(
    new Set(),
  );
  const [flexorZone, setFlexorZone] = useState("");
  const [extensorZone, setExtensorZone] = useState("");
  const initializedRef = useRef(false);

  const selectedDigits = value.affectedDigits ?? [];
  const injuredStructures = value.injuredStructures ?? [];

  useEffect(() => {
    if (initializedRef.current || !selectedDiagnosis) return;
    initializedRef.current = true;
    const defaults = SMART_DEFAULTS[selectedDiagnosis.id];
    if (defaults) {
      const sections = new Set<AccordionSection>();
      for (const cat of defaults) {
        const match = SECTION_CONFIG.find((s) => s.category === cat);
        if (match) sections.add(match.key);
      }
      if (sections.size > 0) setOpenSections(sections);
    }
  }, [selectedDiagnosis]);

  const toggleSection = (section: AccordionSection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleDigitsChange = useCallback(
    (digits: DigitId[]) => {
      const removedDigits = selectedDigits.filter((d) => !digits.includes(d));

      if (removedDigits.length > 0) {
        const structuresToRemove = injuredStructures.filter(
          (s) => s.digit && removedDigits.includes(s.digit),
        );
        const procIdsToRemove = structuresToRemove
          .map((s) => s.generatedProcedureId)
          .filter(Boolean) as string[];

        if (procIdsToRemove.length > 0) {
          onProceduresChange((prev) =>
            prev.filter((p) => !procIdsToRemove.includes(p.id)),
          );
        }

        const remainingStructures = injuredStructures.filter(
          (s) => !s.digit || !removedDigits.includes(s.digit),
        );
        onChange({
          ...value,
          affectedDigits: digits,
          injuredStructures: remainingStructures,
        });
      } else {
        onChange({ ...value, affectedDigits: digits });
      }
    },
    [value, injuredStructures, selectedDigits, onChange, onProceduresChange],
  );

  const createProcedure = useCallback(
    (structure: HandTraumaStructure): string | undefined => {
      const picklistId = lookupProcedureMap(structure.structureId);
      if (!picklistId) return undefined;

      const entry = findPicklistEntry(picklistId);
      if (!entry) return undefined;

      const procId = uuidv4();
      const notesParts: string[] = [structure.displayName];
      if (structure.zone) notesParts.push(`Zone ${structure.zone}`);
      if (structure.digit) notesParts.push(`Digit ${structure.digit}`);

      const newProc: CaseProcedure = {
        id: procId,
        sequenceOrder: 0,
        procedureName: entry.displayName,
        specialty: "hand_surgery",
        subcategory: entry.subcategory,
        picklistEntryId: entry.id,
        tags: entry.tags as CaseProcedure["tags"],
        snomedCtCode: entry.snomedCtCode,
        snomedCtDisplay: entry.snomedCtDisplay,
        surgeonRole: "PS",
        notes: notesParts.join(" | "),
      };

      onProceduresChange((prev) => {
        const maxSeq = prev.reduce((m, p) => Math.max(m, p.sequenceOrder), 0);
        return [...prev, { ...newProc, sequenceOrder: maxSeq + 1 }];
      });

      return procId;
    },
    [onProceduresChange],
  );

  const removeProcedure = useCallback(
    (generatedProcedureId: string) => {
      onProceduresChange((prev) =>
        prev.filter((p) => p.id !== generatedProcedureId),
      );
    },
    [onProceduresChange],
  );

  const handleToggleTendonStructure = useCallback(
    (structure: HandTraumaStructure) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const existing = injuredStructures.find(
        (s) =>
          s.category === structure.category &&
          s.structureId === structure.structureId &&
          s.digit === structure.digit,
      );

      if (existing) {
        if (existing.generatedProcedureId) {
          removeProcedure(existing.generatedProcedureId);
        }
        const updated = injuredStructures.filter((s) => s !== existing);
        onChange({ ...value, injuredStructures: updated });
      } else {
        const procId = createProcedure(structure);
        const newStructure: HandTraumaStructure = {
          ...structure,
          generatedProcedurePicklistId: lookupProcedureMap(
            structure.structureId,
          ),
          generatedProcedureId: procId,
        };
        onChange({
          ...value,
          injuredStructures: [...injuredStructures, newStructure],
        });
      }
    },
    [value, injuredStructures, onChange, createProcedure, removeProcedure],
  );

  const handleToggleParamStructure = useCallback(
    (
      structureId: string,
      category: StructureCategory,
      displayName: string,
      digit?: DigitId,
      side?: "radial" | "ulnar",
    ) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const existing = injuredStructures.find(
        (s) => s.category === category && s.structureId === structureId,
      );

      if (existing) {
        if (existing.generatedProcedureId) {
          removeProcedure(existing.generatedProcedureId);
        }
        const updated = injuredStructures.filter((s) => s !== existing);
        onChange({ ...value, injuredStructures: updated });
      } else {
        const structure: HandTraumaStructure = {
          category,
          structureId,
          displayName,
          digit,
          side,
        };
        const procId = createProcedure(structure);
        const newStructure: HandTraumaStructure = {
          ...structure,
          generatedProcedurePicklistId: lookupProcedureMap(structureId),
          generatedProcedureId: procId,
        };
        onChange({
          ...value,
          injuredStructures: [...injuredStructures, newStructure],
        });
      }
    },
    [value, injuredStructures, onChange, createProcedure, removeProcedure],
  );

  const structureCount = injuredStructures.length;
  const procedureCount = injuredStructures.filter(
    (s) => s.generatedProcedureId,
  ).length;

  const getCategoryCount = (category: StructureCategory) =>
    injuredStructures.filter((s) => s.category === category).length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Feather name="clipboard" size={18} color={theme.link} />
        <ThemedText
          style={{
            color: theme.text,
            marginLeft: Spacing.sm,
            fontWeight: "600",
          }}
        >
          Injured Structures
        </ThemedText>
      </View>

      <DigitSelector
        selectedDigits={selectedDigits}
        onChange={handleDigitsChange}
      />

      <View style={styles.sections}>
        {SECTION_CONFIG.map(({ key, label, icon, category }) => {
          const isOpen = openSections.has(key);
          const count = getCategoryCount(category);
          return (
            <View
              key={key}
              style={[styles.sectionWrapper, { borderColor: theme.border }]}
            >
              <Pressable
                testID={`section-${key}`}
                style={styles.sectionHeader}
                onPress={() => toggleSection(key)}
              >
                <Feather
                  name={icon as any}
                  size={16}
                  color={theme.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={[styles.sectionLabel, { color: theme.text }]}
                >
                  {label}
                </ThemedText>
                {count > 0 ? (
                  <View style={[styles.badge, { backgroundColor: theme.link }]}>
                    <ThemedText type="small" style={styles.badgeText}>
                      {count}
                    </ThemedText>
                  </View>
                ) : null}
                <Feather
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={theme.textTertiary}
                />
              </Pressable>
              {isOpen ? (
                <View style={styles.sectionContent}>
                  {key === "flexor" ? (
                    <FlexorTendonSection
                      selectedDigits={selectedDigits}
                      checkedStructures={injuredStructures}
                      zone={flexorZone}
                      onZoneChange={setFlexorZone}
                      onToggleStructure={handleToggleTendonStructure}
                    />
                  ) : null}
                  {key === "extensor" ? (
                    <ExtensorTendonSection
                      selectedDigits={selectedDigits}
                      checkedStructures={injuredStructures}
                      zone={extensorZone}
                      onZoneChange={setExtensorZone}
                      onToggleStructure={handleToggleTendonStructure}
                    />
                  ) : null}
                  {key === "nerve" ? (
                    <NerveSection
                      selectedDigits={selectedDigits}
                      checkedStructures={injuredStructures}
                      onToggleStructure={handleToggleParamStructure}
                    />
                  ) : null}
                  {key === "artery" ? (
                    <ArterySection
                      selectedDigits={selectedDigits}
                      checkedStructures={injuredStructures}
                      onToggleStructure={handleToggleParamStructure}
                    />
                  ) : null}
                  {key === "ligament" ? (
                    <LigamentSection
                      selectedDigits={selectedDigits}
                      checkedStructures={injuredStructures}
                      onToggleStructure={handleToggleParamStructure}
                    />
                  ) : null}
                  {key === "other" ? (
                    <OtherStructuresSection
                      selectedDigits={selectedDigits}
                      checkedStructures={injuredStructures}
                      onToggleStructure={handleToggleParamStructure}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {structureCount > 0 ? (
        <View
          style={[
            styles.summary,
            {
              backgroundColor: theme.link + "10",
              borderColor: theme.link + "30",
            },
          ]}
        >
          <Feather name="info" size={14} color={theme.link} />
          <ThemedText
            type="small"
            style={{ color: theme.link, marginLeft: Spacing.sm }}
          >
            {structureCount} structure{structureCount !== 1 ? "s" : ""} selected
            {procedureCount > 0
              ? ` \u2192 ${procedureCount} procedure${procedureCount !== 1 ? "s" : ""} generated`
              : ""}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sections: {
    gap: Spacing.xs,
  },
  sectionWrapper: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  sectionLabel: {
    flex: 1,
    fontWeight: "600",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
});
