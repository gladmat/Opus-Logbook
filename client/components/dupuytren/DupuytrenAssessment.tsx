/**
 * DupuytrenAssessment — inline per-ray joint-level contracture assessment.
 *
 * Renders inside HandElectiveAssessment's Classification section when
 * the selected diagnosis has `hasDupuytrenAssessment: true`.
 *
 * Layout:
 *   Finger chip row (multi-select → adds ray cards)
 *   Per-finger cards (MCP/PIP/DIP steppers + auto Tubiana + progress bar)
 *   Summary card (auto-calculated, visible when ≥1 ray)
 *   First web space toggle
 *   Previous treatment (recurrent only, collapsible)
 *   Diathesis features (Tier 3, collapsible)
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Pressable,
  TextInput,
  LayoutAnimation,
  StyleSheet,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  buildRayAssessment,
  updateRayJointDeficit,
  calculateDupuytrenSummary,
  calculateDiathesisScore,
  generateDupuytrenSummaryText,
  FINGER_ORDER,
  COMMON_DUPUYTREN_FINGERS,
  getFingerLabel,
} from "@/lib/dupuytrenHelpers";
import type {
  DupuytrenAssessment as DupuytrenAssessmentType,
  DupuytrenFingerId,
  DupuytrenRayAssessment,
  DupuytrenDiathesis,
  DupuytrenPreviousTreatment,
  TubianaStage,
} from "@/types/dupuytren";
import { PREVIOUS_TREATMENT_LABELS } from "@/types/dupuytren";

// ── Props ────────────────────────────────────────────────────────────────────

interface DupuytrenAssessmentProps {
  value: DupuytrenAssessmentType | undefined;
  onChange: (assessment: DupuytrenAssessmentType) => void;
  laterality: "left" | "right" | undefined;
  isRevision: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PATTERN_LABELS: Record<
  NonNullable<DupuytrenAssessmentType["dominantPattern"]>,
  string
> = {
  mcp_predominant: "MCP-predominant",
  pip_predominant: "PIP-predominant",
  mixed: "Mixed",
};

function tubianaBarColor(
  stage: TubianaStage,
  theme: {
    success: string;
    warning: string;
    error: string;
    textTertiary: string;
  },
): string {
  switch (stage) {
    case "N":
      return theme.textTertiary;
    case "I":
      return theme.success;
    case "II":
      return theme.warning;
    case "III":
      return theme.warning;
    case "IV":
      return theme.error;
  }
}

// ── Stepper Component ────────────────────────────────────────────────────────

function DegreeStepper({
  label,
  value,
  onChange,
  step = 5,
  min = 0,
  max = 180,
  testID,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  testID?: string;
}) {
  const { theme } = useTheme();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickCountRef = useRef(0);
  const valueRef = useRef(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const stopRepeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    tickCountRef.current = 0;
  }, []);

  const startRepeat = useCallback(
    (direction: 1 | -1) => {
      stopRepeat();
      tickCountRef.current = 0;
      const tick = () => {
        tickCountRef.current++;
        const next =
          direction === 1
            ? Math.min(max, valueRef.current + step)
            : Math.max(min, valueRef.current - step);
        if (next !== valueRef.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          valueRef.current = next;
          onChange(next);
        }
        // Accelerate: after 5 ticks switch to faster interval
        if (tickCountRef.current === 5 || tickCountRef.current === 15) {
          stopRepeat();
          const speed = tickCountRef.current >= 15 ? 50 : 100;
          const savedCount = tickCountRef.current;
          intervalRef.current = setInterval(() => {
            tickCountRef.current = savedCount + 1;
            tick();
          }, speed);
        }
      };
      intervalRef.current = setInterval(tick, 200);
    },
    [max, min, step, onChange, stopRepeat],
  );

  useEffect(() => {
    return stopRepeat;
  }, [stopRepeat]);

  const decrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.max(min, value - step));
  };
  const increment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.min(max, value + step));
  };

  const commitDraft = () => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      const rounded = Math.round(clamped / step) * step;
      onChange(rounded);
    }
    setEditing(false);
  };

  return (
    <View style={styles.stepperRow} testID={testID}>
      <ThemedText
        style={[styles.stepperLabel, { color: theme.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={decrement}
          onLongPress={() => startRepeat(-1)}
          onPressOut={stopRepeat}
          delayLongPress={400}
          style={[
            styles.stepperButton,
            { backgroundColor: theme.backgroundTertiary },
          ]}
          disabled={value <= min}
        >
          <ThemedText
            style={{
              color: value <= min ? theme.textTertiary : theme.text,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            −
          </ThemedText>
        </Pressable>
        {editing ? (
          <TextInput
            style={[
              styles.stepperValue,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                fontSize: 15,
                fontWeight: "600",
                textAlign: "center",
                fontVariant: ["tabular-nums"],
              },
            ]}
            value={draft}
            onChangeText={setDraft}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
            maxLength={3}
          />
        ) : (
          <Pressable
            onPress={() => {
              setDraft(String(value));
              setEditing(true);
            }}
            style={[
              styles.stepperValue,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              style={{
                color: theme.text,
                fontSize: 15,
                fontWeight: "600",
                fontVariant: ["tabular-nums"],
              }}
            >
              {value}°
            </ThemedText>
          </Pressable>
        )}
        <Pressable
          onPress={increment}
          onLongPress={() => startRepeat(1)}
          onPressOut={stopRepeat}
          delayLongPress={400}
          style={[
            styles.stepperButton,
            { backgroundColor: theme.backgroundTertiary },
          ]}
          disabled={value >= max}
        >
          <ThemedText
            style={{
              color: value >= max ? theme.textTertiary : theme.text,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            +
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

// ── Tubiana Stage Badge ──────────────────────────────────────────────────────

function TubianaBadge({
  stage,
  total,
}: {
  stage: TubianaStage;
  total: number;
}) {
  const { theme } = useTheme();
  const isZero = stage === "N";
  return (
    <View
      style={[
        styles.tubianaBadge,
        {
          backgroundColor: isZero
            ? theme.backgroundTertiary
            : `${theme.link}18`,
          borderColor: isZero ? theme.border : theme.link,
        },
      ]}
    >
      <ThemedText
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: isZero ? theme.textSecondary : theme.link,
        }}
      >
        Tubiana {stage} ({total}°)
      </ThemedText>
    </View>
  );
}

// ── Ray Card ─────────────────────────────────────────────────────────────────

function RayCard({
  ray,
  onUpdate,
}: {
  ray: DupuytrenRayAssessment;
  onUpdate: (updated: DupuytrenRayAssessment) => void;
}) {
  const { theme } = useTheme();
  const [showDip, setShowDip] = useState(!!ray.dipExtensionDeficit);

  const barColor = tubianaBarColor(ray.tubianaStage, theme);
  const barWidth =
    ray.totalExtensionDeficit > 0
      ? Math.min(1, ray.totalExtensionDeficit / 180)
      : 0;

  return (
    <View
      style={[
        styles.rayCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.rayHeader}>
        <ThemedText style={[styles.rayTitle, { color: theme.text }]}>
          {getFingerLabel(ray.fingerId)}
        </ThemedText>
        <TubianaBadge
          stage={ray.tubianaStage}
          total={ray.totalExtensionDeficit}
        />
      </View>
      <DegreeStepper
        label="MCP deficit"
        value={ray.mcpExtensionDeficit}
        onChange={(v) => onUpdate(updateRayJointDeficit(ray, "mcp", v))}
        testID={`caseForm.dupuytren.input-mcp-${ray.fingerId}`}
      />
      <DegreeStepper
        label="PIP deficit"
        value={ray.pipExtensionDeficit}
        onChange={(v) => onUpdate(updateRayJointDeficit(ray, "pip", v))}
        testID={`caseForm.dupuytren.input-pip-${ray.fingerId}`}
      />
      {/* DIP toggle (rare) */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          if (showDip) {
            setShowDip(false);
            onUpdate(updateRayJointDeficit(ray, "dip", 0));
          } else {
            setShowDip(true);
          }
        }}
        style={styles.toggleRow}
      >
        <Feather
          name={showDip ? "check-square" : "square"}
          size={16}
          color={showDip ? theme.link : theme.textTertiary}
        />
        <ThemedText style={{ fontSize: 12, color: theme.textTertiary }}>
          DIP involved (rare)
        </ThemedText>
      </Pressable>
      {showDip ? (
        <DegreeStepper
          label="DIP deficit"
          value={ray.dipExtensionDeficit ?? 0}
          onChange={(v) => onUpdate(updateRayJointDeficit(ray, "dip", v))}
        />
      ) : null}
      {/* Tubiana progress bar */}
      {ray.tubianaStage !== "N" ? (
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: theme.backgroundTertiary },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: barColor,
                width: `${barWidth * 100}%`,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ assessment }: { assessment: DupuytrenAssessmentType }) {
  const { theme } = useTheme();

  if (assessment.rays.length === 0) return null;

  const summaryText = generateDupuytrenSummaryText(assessment);
  const patternLabel = assessment.dominantPattern
    ? PATTERN_LABELS[assessment.dominantPattern]
    : undefined;

  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: theme.backgroundTertiary },
      ]}
    >
      <ThemedText style={[styles.summaryTitle, { color: theme.textSecondary }]}>
        ASSESSMENT SUMMARY
      </ThemedText>
      <ThemedText style={{ fontSize: 14, color: theme.text }}>
        {summaryText}
      </ThemedText>
      <View style={styles.summaryRow}>
        <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
          Total hand score
        </ThemedText>
        <ThemedText
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: theme.text,
            fontVariant: ["tabular-nums"],
          }}
        >
          {assessment.totalHandScore ?? 0} / 20
        </ThemedText>
      </View>
      {patternLabel ? (
        <View style={styles.summaryRow}>
          <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
            Pattern
          </ThemedText>
          <ThemedText
            style={{ fontSize: 13, fontWeight: "600", color: theme.text }}
          >
            {patternLabel}
          </ThemedText>
        </View>
      ) : null}
      {assessment.firstWebSpace?.isAffected ? (
        <View style={styles.summaryRow}>
          <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
            First web space
          </ThemedText>
          <ThemedText
            style={{ fontSize: 13, fontWeight: "600", color: theme.text }}
          >
            Involved
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

// ── Year Picker ──────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

function YearPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (year: string | undefined) => void;
}) {
  const { theme } = useTheme();
  const [showEarlier, setShowEarlier] = useState(false);
  const startYear = showEarlier ? 1990 : CURRENT_YEAR - 14;
  const years: number[] = [];
  for (let y = CURRENT_YEAR; y >= startYear; y--) {
    years.push(y);
  }

  return (
    <View style={{ gap: Spacing.xs }}>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        Approximate year
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.xs, paddingRight: Spacing.sm }}
      >
        {years.map((y) => {
          const isSelected = value === String(y);
          return (
            <Pressable
              key={y}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(isSelected ? undefined : String(y));
              }}
              style={[
                styles.smallChip,
                {
                  backgroundColor: isSelected
                    ? `${theme.link}18`
                    : theme.backgroundTertiary,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
            >
              <ThemedText
                style={{
                  fontSize: 12,
                  fontWeight: isSelected ? "600" : "400",
                  color: isSelected ? theme.link : theme.text,
                }}
              >
                {y}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
      {!showEarlier ? (
        <Pressable onPress={() => setShowEarlier(true)}>
          <ThemedText style={{ fontSize: 12, color: theme.link }}>
            Show earlier years
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export const DupuytrenAssessment = React.memo(function DupuytrenAssessment({
  value,
  onChange,
  laterality,
  isRevision,
}: DupuytrenAssessmentProps) {
  const { theme } = useTheme();
  const [showPreviousTreatment, setShowPreviousTreatment] = useState(
    !!(
      value?.previousTreatment?.procedureType ||
      value?.previousTreatment?.approximateDate
    ),
  );
  const [showDiathesis, setShowDiathesis] = useState(
    !!(
      value?.diathesis &&
      (value.diathesis.familyHistory ||
        value.diathesis.bilateralDisease ||
        value.diathesis.ectopicLesions ||
        value.diathesis.onsetBeforeAge50)
    ),
  );

  const assessment: DupuytrenAssessmentType = value ?? {
    rays: [],
    isRevision,
  };

  const selectedFingerIds = new Set(assessment.rays.map((r) => r.fingerId));

  const emitChange = useCallback(
    (next: DupuytrenAssessmentType) => {
      const summary = calculateDupuytrenSummary(next);
      onChange({ ...next, ...summary });
    },
    [onChange],
  );

  // ── Finger toggle ──────────────────────────────────────────────────

  const toggleFinger = (fingerId: DupuytrenFingerId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (selectedFingerIds.has(fingerId)) {
      emitChange({
        ...assessment,
        rays: assessment.rays.filter((r) => r.fingerId !== fingerId),
      });
    } else {
      const newRay = buildRayAssessment(fingerId, 0, 0);
      const newRays = [...assessment.rays, newRay].sort(
        (a, b) =>
          FINGER_ORDER.indexOf(a.fingerId) - FINGER_ORDER.indexOf(b.fingerId),
      );
      emitChange({ ...assessment, rays: newRays });
    }
  };

  // ── Ray update ─────────────────────────────────────────────────────

  const updateRay = (updated: DupuytrenRayAssessment) => {
    emitChange({
      ...assessment,
      rays: assessment.rays.map((r) =>
        r.fingerId === updated.fingerId ? updated : r,
      ),
    });
  };

  // ── First web space ────────────────────────────────────────────────

  const toggleWebSpace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isAffected = !assessment.firstWebSpace?.isAffected;
    emitChange({
      ...assessment,
      firstWebSpace: isAffected ? { isAffected: true } : undefined,
    });
  };

  // ── Palm involvement ──────────────────────────────────────────────

  const togglePalmNodule = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = assessment.palmInvolvement;
    const hasNodule = !current?.hasNodule;
    const hasCord = current?.hasCord ?? false;
    emitChange({
      ...assessment,
      palmInvolvement:
        hasNodule || hasCord ? { hasNodule, hasCord } : undefined,
    });
  };

  const togglePalmCord = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = assessment.palmInvolvement;
    const hasNodule = current?.hasNodule ?? false;
    const hasCord = !current?.hasCord;
    emitChange({
      ...assessment,
      palmInvolvement:
        hasNodule || hasCord ? { hasNodule, hasCord } : undefined,
    });
  };

  // ── Previous treatment ─────────────────────────────────────────────

  const updatePreviousTreatment = (pt: DupuytrenPreviousTreatment) => {
    emitChange({ ...assessment, previousTreatment: pt });
  };

  // ── Diathesis ──────────────────────────────────────────────────────

  const updateDiathesis = (d: DupuytrenDiathesis) => {
    emitChange({ ...assessment, diathesis: d });
  };

  const diathesisScore = assessment.diathesis
    ? calculateDiathesisScore(assessment.diathesis)
    : 0;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Finger chips */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          AFFECTED FINGERS
        </ThemedText>
        <ThemedText style={[styles.sectionHint, { color: theme.textTertiary }]}>
          Tap to add rays
        </ThemedText>
        <View style={styles.chipRow}>
          {FINGER_ORDER.map((id) => {
            const isSelected = selectedFingerIds.has(id);
            const isCommon = COMMON_DUPUYTREN_FINGERS.includes(id);
            return (
              <Pressable
                key={id}
                onPress={() => toggleFinger(id)}
                style={[
                  styles.fingerChip,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: isSelected
                      ? theme.link
                      : isCommon
                        ? `${theme.link}40`
                        : theme.border,
                  },
                ]}
                testID={`caseForm.dupuytren.chip-ray-${id}`}
              >
                <ThemedText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isSelected ? theme.buttonText : theme.text,
                  }}
                >
                  {getFingerLabel(id)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Per-finger ray cards */}
      {assessment.rays.map((ray) => (
        <RayCard key={ray.fingerId} ray={ray} onUpdate={updateRay} />
      ))}

      {/* Summary card (visible when ≥1 ray) */}
      <SummaryCard assessment={assessment} />

      {/* First web space toggle */}
      <Pressable
        onPress={toggleWebSpace}
        style={styles.toggleRow}
        testID="caseForm.dupuytren.toggle-firstWebSpace"
      >
        <Feather
          name={
            assessment.firstWebSpace?.isAffected ? "check-square" : "square"
          }
          size={18}
          color={
            assessment.firstWebSpace?.isAffected
              ? theme.link
              : theme.textSecondary
          }
        />
        <ThemedText
          style={{
            fontSize: 14,
            color: assessment.firstWebSpace?.isAffected
              ? theme.text
              : theme.textSecondary,
          }}
        >
          First web space involved
        </ThemedText>
      </Pressable>

      {/* Palm involvement */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          PALM INVOLVEMENT
        </ThemedText>
        <View style={styles.palmToggles}>
          <Pressable onPress={togglePalmNodule} style={styles.toggleRow}>
            <Feather
              name={
                assessment.palmInvolvement?.hasNodule
                  ? "check-square"
                  : "square"
              }
              size={18}
              color={
                assessment.palmInvolvement?.hasNodule
                  ? theme.link
                  : theme.textSecondary
              }
            />
            <ThemedText
              style={{
                fontSize: 14,
                color: assessment.palmInvolvement?.hasNodule
                  ? theme.text
                  : theme.textSecondary,
              }}
            >
              Palmar nodule
            </ThemedText>
          </Pressable>
          <Pressable onPress={togglePalmCord} style={styles.toggleRow}>
            <Feather
              name={
                assessment.palmInvolvement?.hasCord ? "check-square" : "square"
              }
              size={18}
              color={
                assessment.palmInvolvement?.hasCord
                  ? theme.link
                  : theme.textSecondary
              }
            />
            <ThemedText
              style={{
                fontSize: 14,
                color: assessment.palmInvolvement?.hasCord
                  ? theme.text
                  : theme.textSecondary,
              }}
            >
              Palmar cord
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Previous treatment (recurrent only) */}
      {isRevision ? (
        <View style={styles.section}>
          <Pressable
            onPress={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setShowPreviousTreatment((p) => !p);
            }}
            style={styles.collapsibleHeader}
          >
            <ThemedText
              style={[styles.collapsibleTitle, { color: theme.textSecondary }]}
            >
              Previous treatment
            </ThemedText>
            <Feather
              name={showPreviousTreatment ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.textSecondary}
            />
          </Pressable>
          {showPreviousTreatment ? (
            <View style={styles.collapsibleContent}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Procedure type
              </ThemedText>
              <View style={styles.chipRow}>
                {(
                  Object.entries(PREVIOUS_TREATMENT_LABELS) as [
                    NonNullable<DupuytrenPreviousTreatment["procedureType"]>,
                    string,
                  ][]
                ).map(([key, label]) => {
                  const isSelected =
                    assessment.previousTreatment?.procedureType === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updatePreviousTreatment({
                          ...assessment.previousTreatment,
                          procedureType: isSelected ? undefined : key,
                        });
                      }}
                      style={[
                        styles.smallChip,
                        {
                          backgroundColor: isSelected
                            ? `${theme.link}18`
                            : theme.backgroundTertiary,
                          borderColor: isSelected ? theme.link : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? "600" : "400",
                          color: isSelected ? theme.link : theme.text,
                        }}
                      >
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              {/* Approximate year */}
              <YearPicker
                value={assessment.previousTreatment?.approximateDate}
                onChange={(year) =>
                  updatePreviousTreatment({
                    ...assessment.previousTreatment,
                    approximateDate: year,
                  })
                }
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Diathesis features (Tier 3, collapsible) */}
      <View style={styles.section}>
        <Pressable
          onPress={() => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setShowDiathesis((p) => !p);
          }}
          style={styles.collapsibleHeader}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ThemedText
              style={[styles.collapsibleTitle, { color: theme.textSecondary }]}
            >
              Diathesis features
            </ThemedText>
            {diathesisScore > 0 ? (
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: `${theme.link}18` },
                ]}
              >
                <ThemedText
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: theme.link,
                  }}
                >
                  {diathesisScore}/4
                </ThemedText>
              </View>
            ) : null}
          </View>
          <Feather
            name={showDiathesis ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.textSecondary}
          />
        </Pressable>
        {showDiathesis ? (
          <View style={styles.collapsibleContent}>
            {(
              [
                ["familyHistory", "Family history"],
                ["bilateralDisease", "Bilateral disease"],
                [
                  "ectopicLesions",
                  "Ectopic lesions (Garrod / Peyronie / Ledderhose)",
                ],
                ["onsetBeforeAge50", "Onset before age 50"],
              ] as const
            ).map(([key, label]) => {
              const isChecked = !!(assessment.diathesis as any)?.[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateDiathesis({
                      ...(assessment.diathesis ?? {}),
                      [key]: !isChecked,
                    });
                  }}
                  style={styles.toggleRow}
                  testID={`caseForm.dupuytren.chip-diathesis-${key}`}
                >
                  <Feather
                    name={isChecked ? "check-square" : "square"}
                    size={18}
                    color={isChecked ? theme.link : theme.textSecondary}
                  />
                  <ThemedText
                    style={{
                      fontSize: 14,
                      color: isChecked ? theme.text : theme.textSecondary,
                    }}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
});

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: 12,
    marginBottom: 2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  fingerChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  rayCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  rayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  rayTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  tubianaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 36,
  },
  stepperLabel: {
    fontSize: 13,
    flex: 1,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValue: {
    width: 52,
    height: 36,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  summaryCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  palmToggles: {
    gap: Spacing.xs,
  },
  collapsibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  collapsibleTitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  collapsibleContent: {
    gap: Spacing.xs,
    paddingTop: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
});
