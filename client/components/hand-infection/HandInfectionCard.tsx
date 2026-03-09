/**
 * HandInfectionCard — Inline infection assessment for acute hand cases.
 * Progressive disclosure: 4 layers from anatomy through to culture results.
 * Renders inline in DiagnosisGroupEditor (not a modal).
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Pressable,
  Switch,
  TextInput,
  LayoutAnimation,
  StyleSheet,
} from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  type HandInfectionDetails,
  type DigitKey,
  type HandSpace,
  type KanavelSigns,
  type HandAntibioticRegimen,
  type AntibioticRoute,
  type HandOrganism,
  type HandInfectionImaging,
  type HandInfectionSeverity,
  type SensitivityResult,
  DIGIT_LABELS,
  HAND_SPACE_LABELS,
  KANAVEL_SIGN_LABELS,
  HAND_ANTIBIOTIC_LABELS,
  ANTIBIOTIC_ROUTE_LABELS,
  HAND_ORGANISM_LABELS,
  SEVERITY_LABELS,
  IMAGING_LABELS,
  HAND_INFECTION_TYPE_LABELS,
  countKanavelSigns,
  createDefaultHandInfectionDetails,
  generateHandInfectionSummary,
  DIAGNOSIS_TO_INFECTION_TYPE,
  DIAGNOSIS_TO_EMPIRICAL_ANTIBIOTICS,
  DIAGNOSIS_TO_LIKELY_ORGANISMS,
} from "@/types/handInfection";
import {
  ORGANISM_SENSITIVITY_PANEL,
  GENERIC_SENSITIVITY_PANEL,
} from "@/data/handInfectionClinicalData";

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface HandInfectionCardProps {
  diagnosisId: string;
  value?: HandInfectionDetails;
  onChange: (details: HandInfectionDetails) => void;
  laterality?: string;
  /** Called when user taps "Open full infection module" to escalate to InfectionSheet */
  onEscalate?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DIGIT_KEYS: DigitKey[] = [
  "thumb",
  "index",
  "middle",
  "ring",
  "little",
];

const ALL_SPACES: HandSpace[] = Object.keys(
  HAND_SPACE_LABELS,
) as HandSpace[];

const ALL_ANTIBIOTICS: HandAntibioticRegimen[] = Object.keys(
  HAND_ANTIBIOTIC_LABELS,
) as HandAntibioticRegimen[];

const ALL_ORGANISMS: HandOrganism[] = Object.keys(
  HAND_ORGANISM_LABELS,
) as HandOrganism[];

const ALL_IMAGING: HandInfectionImaging[] = ["xray", "ultrasound", "mri", "ct"];

const SEVERITY_OPTIONS: HandInfectionSeverity[] = [
  "local",
  "spreading",
  "systemic",
];

const ROUTE_OPTIONS: AntibioticRoute[] = ["iv", "oral", "iv_then_oral"];

const SMOOTH_LAYOUT = LayoutAnimation.Presets.easeInEaseOut;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const HandInfectionCard = React.memo(function HandInfectionCard({
  diagnosisId,
  value,
  onChange,
  laterality,
  onEscalate,
}: HandInfectionCardProps) {
  const { theme } = useTheme();
  const [layer2Expanded, setLayer2Expanded] = useState(false);
  const [layer3Expanded, setLayer3Expanded] = useState(false);
  const [layer4Expanded, setLayer4Expanded] = useState(false);

  // Auto-create defaults when diagnosisId changes and no value exists
  const details = useMemo(() => {
    if (value) return value;
    return createDefaultHandInfectionDetails(diagnosisId);
  }, [value, diagnosisId]);

  // Sync defaults to parent on first render
  useEffect(() => {
    if (!value) {
      onChange(createDefaultHandInfectionDetails(diagnosisId));
    }
  }, [diagnosisId]); // eslint-disable-line react-hooks/exhaustive-deps

  const infectionType = details.infectionType;
  const showKanavel = infectionType === "tendon_sheath";
  const showSpacePicker = infectionType === "deep_space";

  // Recommended antibiotics for this diagnosis
  const recommendedAbx = useMemo(
    () => DIAGNOSIS_TO_EMPIRICAL_ANTIBIOTICS[diagnosisId] ?? [],
    [diagnosisId],
  );

  const likelyOrganisms = useMemo(
    () => DIAGNOSIS_TO_LIKELY_ORGANISMS[diagnosisId] ?? [],
    [diagnosisId],
  );

  // Sensitivity panel for selected organism
  const sensitivityPanel = useMemo(() => {
    if (
      !details.organism ||
      details.organism === "no_growth" ||
      details.organism === "pending" ||
      details.organism === "other"
    ) {
      return [];
    }
    return (
      ORGANISM_SENSITIVITY_PANEL[details.organism] ?? GENERIC_SENSITIVITY_PANEL
    );
  }, [details.organism]);

  // ── Update helpers ──────────────────────────────────────────────────────

  const update = useCallback(
    (patch: Partial<HandInfectionDetails>) => {
      onChange({ ...details, ...patch });
    },
    [details, onChange],
  );

  const toggleDigit = useCallback(
    (digit: DigitKey) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const current = details.affectedDigits;
      const next = current.includes(digit)
        ? current.filter((d) => d !== digit)
        : [...current, digit];
      update({ affectedDigits: next });
    },
    [details.affectedDigits, update],
  );

  const toggleKanavel = useCallback(
    (sign: keyof KanavelSigns) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const current = details.kanavelSigns ?? {
        fusiformSwelling: false,
        flexedPosture: false,
        sheathTenderness: false,
        painOnPassiveExtension: false,
      };
      update({ kanavelSigns: { ...current, [sign]: !current[sign] } });
    },
    [details.kanavelSigns, update],
  );

  const toggleImaging = useCallback(
    (img: HandInfectionImaging) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const current = details.imaging ?? [];
      const next = current.includes(img)
        ? current.filter((i) => i !== img)
        : [...current, img];
      update({ imaging: next });
    },
    [details.imaging, update],
  );

  const toggleSection = useCallback(
    (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(SMOOTH_LAYOUT);
      setter((prev) => !prev);
    },
    [],
  );

  // ── Layer 2 summary ─────────────────────────────────────────────────────

  const layer2Summary = useMemo(() => {
    const parts: string[] = [];
    if (details.culturesTaken !== undefined) {
      parts.push(details.culturesTaken ? "Cultures taken" : "No cultures");
    }
    if (details.empiricalAntibiotic) {
      parts.push(HAND_ANTIBIOTIC_LABELS[details.empiricalAntibiotic]);
    }
    if (details.antibioticRoute) {
      parts.push(ANTIBIOTIC_ROUTE_LABELS[details.antibioticRoute]);
    }
    return parts.length > 0
      ? parts.join(" · ")
      : "Tap to add cultures & antibiotics";
  }, [details.culturesTaken, details.empiricalAntibiotic, details.antibioticRoute]);

  // ── Layer 3 summary ─────────────────────────────────────────────────────

  const layer3Summary = useMemo(() => {
    if (!details.organism) return "Tap to add culture results";
    return HAND_ORGANISM_LABELS[details.organism];
  }, [details.organism]);

  // ── Kanavel badge colour ────────────────────────────────────────────────

  const kanavelCount = countKanavelSigns(details.kanavelSigns);
  const kanavelColor =
    kanavelCount >= 4
      ? theme.error
      : kanavelCount >= 2
        ? theme.warning
        : theme.textSecondary;

  // ═══════════════════════════════════════════════════════════════════════════
  // ESCALATED STATE — read-only summary when full module is active
  // ═══════════════════════════════════════════════════════════════════════════

  if (details.escalatedToFullModule) {
    const summary = generateHandInfectionSummary(details);
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
        <View
          style={[
            styles.header,
            { backgroundColor: theme.warning + "15" },
          ]}
        >
          <Feather name="alert-triangle" size={16} color={theme.warning} />
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            Hand Infection Details
          </ThemedText>
          {laterality ? (
            <ThemedText
              style={[styles.headerBadge, { color: theme.textSecondary }]}
            >
              {laterality === "left" ? "Left" : laterality === "right" ? "Right" : laterality}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.section}>
          {summary ? (
            <ThemedText style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>
              {summary}
            </ThemedText>
          ) : null}
          <ThemedText
            style={{
              color: theme.textSecondary,
              fontSize: 13,
              marginTop: Spacing.xs,
            }}
          >
            Managed via full infection module
          </ThemedText>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onEscalate?.();
          }}
          style={[
            styles.escalateButton,
            { borderColor: theme.border, marginHorizontal: Spacing.md, marginBottom: Spacing.md },
          ]}
        >
          <ThemedText
            style={[styles.escalateText, { color: theme.link }]}
          >
            Edit in full module
          </ThemedText>
          <Feather name="arrow-right" size={16} color={theme.link} />
        </Pressable>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — full editable card
  // ═══════════════════════════════════════════════════════════════════════════

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
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.warning + "15" },
        ]}
      >
        <Feather name="alert-triangle" size={16} color={theme.warning} />
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
          Hand Infection Details
        </ThemedText>
        {laterality ? (
          <ThemedText
            style={[styles.headerBadge, { color: theme.textSecondary, marginRight: Spacing.xs }]}
          >
            {laterality === "left" ? "Left" : laterality === "right" ? "Right" : laterality}
          </ThemedText>
        ) : null}
        <ThemedText
          style={[styles.headerBadge, { color: theme.textSecondary }]}
        >
          {HAND_INFECTION_TYPE_LABELS[infectionType]}
        </ThemedText>
      </View>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LAYER 1 — Anatomy (Always Visible)                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Affected digit(s)
        </ThemedText>
        <View style={styles.chipRow}>
          {DIGIT_KEYS.map((digit) => {
            const active = details.affectedDigits.includes(digit);
            return (
              <Pressable
                key={digit}
                onPress={() => toggleDigit(digit)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: active ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: active ? theme.buttonText : theme.textSecondary,
                    },
                  ]}
                >
                  {DIGIT_LABELS[digit]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Space picker — deep space only */}
        {showSpacePicker ? (
          <View style={{ marginTop: Spacing.sm }}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              Affected space
            </ThemedText>
            <View style={styles.chipRow}>
              {ALL_SPACES.map((space) => {
                const active = details.affectedSpace === space;
                return (
                  <Pressable
                    key={space}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({
                        affectedSpace: active ? undefined : space,
                      });
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? theme.link
                          : theme.backgroundTertiary,
                        borderColor: active ? theme.link : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: active
                            ? theme.buttonText
                            : theme.textSecondary,
                          fontSize: 12,
                        },
                      ]}
                    >
                      {HAND_SPACE_LABELS[space]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Kanavel signs — tendon sheath only */}
        {showKanavel ? (
          <View style={{ marginTop: Spacing.sm }}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              Kanavel signs
            </ThemedText>
            <View
              style={[
                styles.kanavelContainer,
                { borderColor: theme.border },
              ]}
            >
              {(
                Object.keys(KANAVEL_SIGN_LABELS) as Array<
                  keyof KanavelSigns
                >
              ).map((sign) => (
                <View key={sign} style={styles.kanavelRow}>
                  <ThemedText
                    style={[styles.kanavelLabel, { color: theme.text }]}
                  >
                    {KANAVEL_SIGN_LABELS[sign]}
                  </ThemedText>
                  <Switch
                    value={details.kanavelSigns?.[sign] ?? false}
                    onValueChange={() => toggleKanavel(sign)}
                    trackColor={{
                      false: theme.backgroundTertiary,
                      true: theme.link,
                    }}
                  />
                </View>
              ))}
              <View style={styles.kanavelSummary}>
                <ThemedText
                  style={[
                    styles.kanavelBadge,
                    { color: kanavelColor },
                  ]}
                >
                  Kanavel {kanavelCount}/4
                </ThemedText>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LAYER 2 — Cultures & Antibiotics (Collapsed)                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <CollapsibleSection
        title="Cultures & Antibiotics"
        summary={layer2Summary}
        expanded={layer2Expanded}
        onToggle={() => toggleSection(setLayer2Expanded)}
        theme={theme}
      >
        {/* Cultures taken */}
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Cultures taken
        </ThemedText>
        <View style={styles.segmentedRow}>
          {([true, false] as const).map((val) => {
            const active = details.culturesTaken === val;
            return (
              <Pressable
                key={String(val)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ culturesTaken: val });
                }}
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor: active
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: active ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color: active ? theme.buttonText : theme.textSecondary,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {val ? "Yes" : "No"}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Empirical antibiotic picker */}
        <ThemedText
          style={[
            styles.sectionLabel,
            { color: theme.textSecondary, marginTop: Spacing.md },
          ]}
        >
          Empirical antibiotic
        </ThemedText>
        <View style={styles.chipRow}>
          {/* Recommended antibiotics first */}
          {recommendedAbx.map((abx) => {
            const active = details.empiricalAntibiotic === abx;
            return (
              <Pressable
                key={abx}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    empiricalAntibiotic: active ? undefined : abx,
                  });
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: active ? theme.link : theme.warning + "60",
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: active ? theme.buttonText : theme.text,
                      fontSize: 13,
                    },
                  ]}
                >
                  {HAND_ANTIBIOTIC_LABELS[abx]}
                </ThemedText>
              </Pressable>
            );
          })}
          {/* Other antibiotics */}
          {ALL_ANTIBIOTICS.filter(
            (abx) => !recommendedAbx.includes(abx),
          ).map((abx) => {
            const active = details.empiricalAntibiotic === abx;
            return (
              <Pressable
                key={abx}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    empiricalAntibiotic: active ? undefined : abx,
                  });
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: active ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: active
                        ? theme.buttonText
                        : theme.textSecondary,
                      fontSize: 13,
                    },
                  ]}
                >
                  {HAND_ANTIBIOTIC_LABELS[abx]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Route */}
        <ThemedText
          style={[
            styles.sectionLabel,
            { color: theme.textSecondary, marginTop: Spacing.md },
          ]}
        >
          Route
        </ThemedText>
        <View style={styles.segmentedRow}>
          {ROUTE_OPTIONS.map((route) => {
            const active = details.antibioticRoute === route;
            return (
              <Pressable
                key={route}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ antibioticRoute: active ? undefined : route });
                }}
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor: active
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: active ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color: active ? theme.buttonText : theme.textSecondary,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {ANTIBIOTIC_ROUTE_LABELS[route]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </CollapsibleSection>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LAYER 3 — Culture Results (Conditional + Collapsed)           */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {details.culturesTaken ? (
        <CollapsibleSection
          title="Culture Results"
          summary={layer3Summary}
          expanded={layer3Expanded}
          onToggle={() => toggleSection(setLayer3Expanded)}
          theme={theme}
        >
          {/* Organism picker */}
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Organism
          </ThemedText>
          <View style={styles.chipRow}>
            {/* Likely organisms first */}
            {likelyOrganisms.map((org) => {
              const active = details.organism === org;
              return (
                <Pressable
                  key={org}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({
                      organism: active ? undefined : org,
                      sensitivities: active ? undefined : details.sensitivities,
                    });
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? theme.link
                        : theme.backgroundTertiary,
                      borderColor: active
                        ? theme.link
                        : theme.warning + "60",
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: active ? theme.buttonText : theme.text,
                        fontSize: 12,
                      },
                    ]}
                  >
                    {HAND_ORGANISM_LABELS[org]}
                  </ThemedText>
                </Pressable>
              );
            })}
            {/* Other organisms */}
            {ALL_ORGANISMS.filter(
              (org) => !likelyOrganisms.includes(org),
            ).map((org) => {
              const active = details.organism === org;
              return (
                <Pressable
                  key={org}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({
                      organism: active ? undefined : org,
                      sensitivities: active ? undefined : details.sensitivities,
                    });
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? theme.link
                        : theme.backgroundTertiary,
                      borderColor: active ? theme.link : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: active
                          ? theme.buttonText
                          : theme.textSecondary,
                        fontSize: 12,
                      },
                    ]}
                  >
                    {HAND_ORGANISM_LABELS[org]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Other organism text input */}
          {details.organism === "other" ? (
            <TextInput
              value={details.organismOther ?? ""}
              onChangeText={(text) => update({ organismOther: text })}
              placeholder="Specify organism"
              placeholderTextColor={theme.textTertiary}
              style={[
                styles.textInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundDefault,
                },
              ]}
            />
          ) : null}

          {/* Sensitivity grid */}
          {sensitivityPanel.length > 0 ? (
            <View style={{ marginTop: Spacing.md }}>
              <ThemedText
                style={[
                  styles.sectionLabel,
                  { color: theme.textSecondary },
                ]}
              >
                Sensitivities
              </ThemedText>
              {/* Header row */}
              <View style={styles.sensitivityHeader}>
                <ThemedText
                  style={[
                    styles.sensitivityHeaderCell,
                    { color: theme.textSecondary, flex: 2 },
                  ]}
                >
                  Antibiotic
                </ThemedText>
                {(["sensitive", "resistant", "intermediate"] as const).map(
                  (result) => (
                    <ThemedText
                      key={result}
                      style={[
                        styles.sensitivityHeaderCell,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {result === "sensitive"
                        ? "S"
                        : result === "resistant"
                          ? "R"
                          : "I"}
                    </ThemedText>
                  ),
                )}
              </View>
              {/* Data rows */}
              {sensitivityPanel.map((abx) => {
                const currentVal = details.sensitivities?.[abx];
                return (
                  <View key={abx} style={styles.sensitivityRow}>
                    <ThemedText
                      style={[
                        styles.sensitivityCell,
                        { color: theme.text, flex: 2, fontSize: 12 },
                      ]}
                    >
                      {HAND_ANTIBIOTIC_LABELS[abx]}
                    </ThemedText>
                    {(
                      ["sensitive", "resistant", "intermediate"] as const
                    ).map((result) => {
                      const active = currentVal === result;
                      return (
                        <Pressable
                          key={result}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            update({
                              sensitivities: {
                                ...details.sensitivities,
                                [abx]: active ? "unknown" : result,
                              },
                            });
                          }}
                          style={[
                            styles.sensitivityRadio,
                            {
                              borderColor: active
                                ? result === "sensitive"
                                  ? theme.success
                                  : result === "resistant"
                                    ? theme.error
                                    : theme.warning
                                : theme.border,
                            },
                          ]}
                        >
                          {active ? (
                            <View
                              style={[
                                styles.sensitivityDot,
                                {
                                  backgroundColor:
                                    result === "sensitive"
                                      ? theme.success
                                      : result === "resistant"
                                        ? theme.error
                                        : theme.warning,
                                },
                              ]}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          ) : null}
        </CollapsibleSection>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LAYER 4 — More Details (Accordion)                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <CollapsibleSection
        title="More details"
        summary=""
        expanded={layer4Expanded}
        onToggle={() => toggleSection(setLayer4Expanded)}
        theme={theme}
      >
        {/* Severity */}
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Severity
        </ThemedText>
        <View style={styles.segmentedRow}>
          {SEVERITY_OPTIONS.map((sev) => {
            const active = details.severity === sev;
            return (
              <Pressable
                key={sev}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ severity: sev });
                }}
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor: active
                      ? sev === "systemic"
                        ? theme.error
                        : theme.link
                      : theme.backgroundTertiary,
                    borderColor: active
                      ? sev === "systemic"
                        ? theme.error
                        : theme.link
                      : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color: active ? theme.buttonText : theme.textSecondary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {SEVERITY_LABELS[sev]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Imaging */}
        <ThemedText
          style={[
            styles.sectionLabel,
            { color: theme.textSecondary, marginTop: Spacing.md },
          ]}
        >
          Imaging
        </ThemedText>
        <View style={styles.chipRow}>
          {ALL_IMAGING.map((img) => {
            const active = details.imaging?.includes(img) ?? false;
            return (
              <Pressable
                key={img}
                onPress={() => toggleImaging(img)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: active ? theme.link : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: active
                        ? theme.buttonText
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {IMAGING_LABELS[img]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* IV duration */}
        {details.antibioticRoute === "iv" ||
        details.antibioticRoute === "iv_then_oral" ? (
          <View style={{ marginTop: Spacing.md }}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              IV duration (days)
            </ThemedText>
            <TextInput
              value={
                details.ivDurationDays !== undefined
                  ? String(details.ivDurationDays)
                  : ""
              }
              onChangeText={(text) => {
                const num = parseInt(text, 10);
                update({
                  ivDurationDays: isNaN(num) ? undefined : num,
                });
              }}
              placeholder="Days"
              placeholderTextColor={theme.textTertiary}
              keyboardType="number-pad"
              style={[
                styles.textInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundDefault,
                  width: 100,
                },
              ]}
            />
          </View>
        ) : null}

        {/* Open full infection module link */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (onEscalate) {
              onEscalate();
            } else {
              update({ escalatedToFullModule: true });
            }
          }}
          style={[
            styles.escalateButton,
            { borderColor: theme.border },
          ]}
        >
          <ThemedText
            style={[styles.escalateText, { color: theme.link }]}
          >
            Open full infection module
          </ThemedText>
          <Feather name="arrow-right" size={16} color={theme.link} />
        </Pressable>
      </CollapsibleSection>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION SUB-COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function CollapsibleSection({
  title,
  summary,
  expanded,
  onToggle,
  theme,
  children,
}: {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  theme: { text: string; textSecondary: string; border: string };
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.collapsibleContainer,
        { borderTopColor: theme.border },
      ]}
    >
      <Pressable onPress={onToggle} style={styles.collapsibleHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText
            style={[styles.collapsibleTitle, { color: theme.text }]}
          >
            {title}
          </ThemedText>
          {!expanded && summary ? (
            <ThemedText
              style={[
                styles.collapsibleSummary,
                { color: theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {summary}
            </ThemedText>
          ) : null}
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.collapsibleContent}>{children}</View>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  headerBadge: {
    fontSize: 12,
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  kanavelContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  kanavelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    minHeight: 48,
  },
  kanavelLabel: {
    fontSize: 14,
    flex: 1,
    marginRight: Spacing.sm,
  },
  kanavelSummary: {
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  kanavelBadge: {
    fontSize: 14,
    fontWeight: "700",
  },
  segmentedRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  collapsibleContainer: {
    borderTopWidth: 1,
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  collapsibleTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  collapsibleSummary: {
    fontSize: 12,
    marginTop: 2,
  },
  collapsibleContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  sensitivityHeader: {
    flexDirection: "row",
    paddingVertical: 4,
    alignItems: "center",
  },
  sensitivityHeaderCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  sensitivityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  sensitivityCell: {
    flex: 1,
  },
  sensitivityRadio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    width: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignSelf: "center",
  },
  sensitivityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  escalateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: 12,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  escalateText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
