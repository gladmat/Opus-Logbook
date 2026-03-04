import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { ThemedText } from "@/components/ThemedText";
import { FormField, SelectField } from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { InfectionEpisodeTimeline } from "@/components/InfectionEpisodeTimeline";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  InfectionOverlay,
  InfectionSyndrome,
  InfectionRegion,
  InfectionLaterality,
  InfectionExtent,
  InfectionSeverity,
  SourceControlStatus,
  InfectionTemplate,
  INFECTION_SYNDROME_LABELS,
  INFECTION_REGION_LABELS,
  INFECTION_LATERALITY_LABELS,
  INFECTION_EXTENT_LABELS,
  INFECTION_SEVERITY_LABELS,
  SOURCE_CONTROL_LABELS,
  INFECTION_TEMPLATE_LABELS,
  INFECTION_TEMPLATES,
  MicrobiologyData,
  CultureStatus,
  BloodCultureStatus,
  CULTURE_STATUS_LABELS,
  BLOOD_CULTURE_LABELS,
  ScoreEntry,
  ScoreType,
  SCORE_TYPE_LABELS,
  InfectionCaseStatus,
} from "@/types/infection";

interface InfectionOverlayFormProps {
  value?: InfectionOverlay;
  onChange: (overlay: InfectionOverlay | undefined) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SYNDROME_OPTIONS = Object.entries(INFECTION_SYNDROME_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const REGION_OPTIONS = Object.entries(INFECTION_REGION_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const LATERALITY_OPTIONS = Object.entries(INFECTION_LATERALITY_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const EXTENT_OPTIONS = Object.entries(INFECTION_EXTENT_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const SEVERITY_OPTIONS = Object.entries(INFECTION_SEVERITY_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const SOURCE_CONTROL_OPTIONS = Object.entries(SOURCE_CONTROL_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const TEMPLATE_OPTIONS = Object.entries(INFECTION_TEMPLATE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const CULTURE_STATUS_OPTIONS = Object.entries(CULTURE_STATUS_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const BLOOD_CULTURE_OPTIONS = Object.entries(BLOOD_CULTURE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const SCORE_TYPE_OPTIONS = Object.entries(SCORE_TYPE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

function createDefaultOverlay(): InfectionOverlay {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    syndromePrimary: "skin_soft_tissue",
    region: "hand",
    laterality: "left",
    extent: "localized",
    severity: "local",
    icu: false,
    vasopressors: false,
    episodes: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function InfectionOverlayForm({
  value,
  onChange,
  collapsed = false,
  onToggleCollapse,
}: InfectionOverlayFormProps) {
  const { theme } = useTheme();
  const [showMicrobiology, setShowMicrobiology] = useState(
    !!value?.microbiology,
  );
  const [showScores, setShowScores] = useState(!!value?.scores?.length);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const handleEnableInfection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(createDefaultOverlay());
  };

  const handleRemoveInfection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(undefined);
  };

  const handleApplyTemplate = (templateId: string) => {
    if (!templateId) return;
    const template = INFECTION_TEMPLATES[templateId as InfectionTemplate];
    if (!template) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const overlay = value || createDefaultOverlay();
    onChange({
      ...overlay,
      ...template,
      updatedAt: new Date().toISOString(),
    } as InfectionOverlay);
    setSelectedTemplate(templateId);
  };

  const updateOverlay = (updates: Partial<InfectionOverlay>) => {
    if (!value) return;
    onChange({
      ...value,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateMicrobiology = (updates: Partial<MicrobiologyData>) => {
    if (!value) return;
    onChange({
      ...value,
      microbiology: {
        ...value.microbiology,
        culturesTaken: value.microbiology?.culturesTaken ?? false,
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  if (!value) {
    return (
      <View style={styles.container}>
        <Pressable
          onPress={handleEnableInfection}
          style={[styles.addButton, { backgroundColor: theme.link }]}
        >
          <Feather name="plus-circle" size={20} color={theme.buttonText} />
          <ThemedText
            style={[styles.addButtonText, { color: theme.buttonText }]}
          >
            Add Infection Documentation
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onToggleCollapse}
        style={[styles.header, { backgroundColor: theme.warning + "20" }]}
      >
        <View style={styles.headerContent}>
          <Feather name="alert-triangle" size={18} color={theme.warning} />
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            Infection Documentation
          </ThemedText>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  value.status === "active" ? theme.error : theme.success,
              },
            ]}
          >
            <ThemedText style={styles.statusBadgeText}>
              {value.status === "active" ? "Active" : "Resolved"}
            </ThemedText>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={handleRemoveInfection} hitSlop={8}>
            <Feather name="trash-2" size={18} color={theme.error} />
          </Pressable>
          <Feather
            name={collapsed ? "chevron-down" : "chevron-up"}
            size={20}
            color={theme.textSecondary}
          />
        </View>
      </Pressable>

      {!collapsed ? (
        <View
          style={[styles.content, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={styles.templateRow}>
            <ThemedText
              style={[styles.templateLabel, { color: theme.textSecondary }]}
            >
              Quick Template:
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.templateScroll}
            >
              {TEMPLATE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleApplyTemplate(option.value)}
                  style={[
                    styles.templateChip,
                    {
                      backgroundColor:
                        selectedTemplate === option.value
                          ? theme.link
                          : theme.backgroundRoot,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.templateChipText,
                      {
                        color:
                          selectedTemplate === option.value
                            ? theme.buttonText
                            : theme.text,
                      },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <SelectField
            label="Primary Syndrome"
            value={value.syndromePrimary}
            options={SYNDROME_OPTIONS}
            onSelect={(v) =>
              updateOverlay({ syndromePrimary: v as InfectionSyndrome })
            }
            required
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <SelectField
                label="Region"
                value={value.region}
                options={REGION_OPTIONS}
                onSelect={(v) =>
                  updateOverlay({ region: v as InfectionRegion })
                }
                required
              />
            </View>
            <View style={styles.halfField}>
              <SelectField
                label="Laterality"
                value={value.laterality}
                options={LATERALITY_OPTIONS}
                onSelect={(v) =>
                  updateOverlay({ laterality: v as InfectionLaterality })
                }
              />
            </View>
          </View>

          <FormField
            label="Subregion"
            value={value.subregion || ""}
            onChangeText={(v) => updateOverlay({ subregion: v })}
            placeholder="e.g., thenar space, web space"
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <SelectField
                label="Extent"
                value={value.extent}
                options={EXTENT_OPTIONS}
                onSelect={(v) =>
                  updateOverlay({ extent: v as InfectionExtent })
                }
                required
              />
            </View>
            <View style={styles.halfField}>
              <SelectField
                label="Severity"
                value={value.severity}
                options={SEVERITY_OPTIONS}
                onSelect={(v) =>
                  updateOverlay({ severity: v as InfectionSeverity })
                }
                required
              />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleItem}>
              <ThemedText style={[styles.toggleLabel, { color: theme.text }]}>
                ICU Admission
              </ThemedText>
              <Switch
                value={value.icu}
                onValueChange={(v) => updateOverlay({ icu: v })}
                trackColor={{ false: theme.border, true: theme.link }}
              />
            </View>
            <View style={styles.toggleItem}>
              <ThemedText style={[styles.toggleLabel, { color: theme.text }]}>
                Vasopressors
              </ThemedText>
              <Switch
                value={value.vasopressors}
                onValueChange={(v) => updateOverlay({ vasopressors: v })}
                trackColor={{ false: theme.border, true: theme.link }}
              />
            </View>
          </View>

          <SelectField
            label="Source Control Achieved at Index Op"
            value={value.sourceControlAchievedIndexOp || ""}
            options={[
              { value: "", label: "Not recorded" },
              ...SOURCE_CONTROL_OPTIONS,
            ]}
            onSelect={(v) =>
              updateOverlay({
                sourceControlAchievedIndexOp:
                  (v as SourceControlStatus) || undefined,
              })
            }
          />

          <View style={styles.disclosureSection}>
            <Pressable
              onPress={() => setShowMicrobiology(!showMicrobiology)}
              style={[styles.disclosureHeader, { borderColor: theme.border }]}
            >
              <ThemedText
                style={[styles.disclosureTitle, { color: theme.text }]}
              >
                Microbiology
              </ThemedText>
              <Feather
                name={showMicrobiology ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.textSecondary}
              />
            </Pressable>
            {showMicrobiology ? (
              <View style={styles.disclosureContent}>
                <View style={styles.toggleRow}>
                  <ThemedText
                    style={[styles.toggleLabel, { color: theme.text }]}
                  >
                    Cultures Taken
                  </ThemedText>
                  <Switch
                    value={value.microbiology?.culturesTaken ?? false}
                    onValueChange={(v) =>
                      updateMicrobiology({ culturesTaken: v })
                    }
                    trackColor={{ false: theme.border, true: theme.link }}
                  />
                </View>
                {value.microbiology?.culturesTaken ? (
                  <>
                    <SelectField
                      label="Culture Status"
                      value={value.microbiology?.cultureStatus || ""}
                      options={[
                        { value: "", label: "Select..." },
                        ...CULTURE_STATUS_OPTIONS,
                      ]}
                      onSelect={(v) =>
                        updateMicrobiology({
                          cultureStatus: (v as CultureStatus) || undefined,
                        })
                      }
                    />
                    <SelectField
                      label="Blood Cultures"
                      value={value.microbiology?.bloodCultures || ""}
                      options={[
                        { value: "", label: "Select..." },
                        ...BLOOD_CULTURE_OPTIONS,
                      ]}
                      onSelect={(v) =>
                        updateMicrobiology({
                          bloodCultures: (v as BloodCultureStatus) || undefined,
                        })
                      }
                    />
                  </>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.disclosureSection}>
            <Pressable
              onPress={() => setShowScores(!showScores)}
              style={[styles.disclosureHeader, { borderColor: theme.border }]}
            >
              <ThemedText
                style={[styles.disclosureTitle, { color: theme.text }]}
              >
                Clinical Scores (LRINEC, qSOFA)
              </ThemedText>
              <Feather
                name={showScores ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.textSecondary}
              />
            </Pressable>
            {showScores ? (
              <View style={styles.disclosureContent}>
                <ThemedText
                  style={[styles.hint, { color: theme.textSecondary }]}
                >
                  Score tracking coming soon
                </ThemedText>
              </View>
            ) : null}
          </View>

          <InfectionEpisodeTimeline
            overlay={value}
            onOverlayChange={onChange}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  content: {
    padding: Spacing.md,
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  templateRow: {
    marginBottom: Spacing.sm,
  },
  templateLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  templateScroll: {
    flexGrow: 0,
  },
  templateChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    marginRight: Spacing.sm,
    borderWidth: 1,
  },
  templateChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  toggleLabel: {
    fontSize: 14,
  },
  disclosureSection: {
    marginTop: Spacing.sm,
  },
  disclosureHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  disclosureTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  disclosureContent: {
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  hint: {
    fontSize: 13,
    fontStyle: "italic",
  },
  episodesSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  episodesText: {
    fontSize: 13,
  },
});
