import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  FlatList,
  TouchableOpacity,
  InteractionManager,
} from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, palette } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  clampDateToBounds,
  normalizeDateOnlyValue,
  parseDateOnlyValue,
  sanitizeDateBounds,
  toIsoDateValue,
} from "@/lib/dateValues";
import { useFormScrollContext } from "@/contexts/FormScrollContext";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { useCollapsibleFormSectionContext } from "@/components/case-form/CollapsibleFormSection";

// ── Field-level deep-link primitives (Cluster 4) ────────────────────────────

type FocusFn = () => void;

interface FieldRegistrationResult {
  fieldRef: React.RefObject<View | null>;
  handleLayout: () => void;
}

/**
 * Wires a field primitive into the FormScrollContext field registry so the
 * deep-link pipeline (CaseSummaryView Edit → CaseFormScreen) can scroll
 * directly to a specific field, optionally focus it, and fire a brief amber
 * border pulse.
 *
 * - The returned `fieldRef` should be placed on the field's outermost View.
 * - `handleLayout` is wired to the same View's `onLayout` so we re-register
 *   the live measure helper after every layout pass (handles re-mounts and
 *   sibling collapses that shifted Y).
 * - When a focus callback is provided (FormField, the only TextInput-backed
 *   primitive), it's registered alongside the layout so `focusField(fieldId)`
 *   pops the keyboard after the scroll lands.
 *
 * No-op outside a FormScrollProvider.
 */
function useFieldRegistration(
  fieldId: string | undefined,
  focusFn?: FocusFn,
): FieldRegistrationResult {
  const fieldRef = useRef<View | null>(null);
  const formScroll = useFormScrollContext();
  const parentCollapsible = useCollapsibleFormSectionContext();
  const parentCollapsibleId = parentCollapsible?.collapsibleId;

  const handleLayout = useCallback(() => {
    if (!fieldId || !formScroll) return;

    const measure = (cb: (scrollContentY: number) => void) => {
      const node = fieldRef.current;
      if (!node) {
        cb(0);
        return;
      }
      try {
        (
          node as unknown as {
            measure: (
              fn: (
                x: number,
                y: number,
                width: number,
                height: number,
                pageX: number,
                pageY: number,
              ) => void,
            ) => void;
          }
        ).measure((_x, y) => {
          // Mirrors scrollToSection's translation: View.measure returns
          // viewport-relative Y for descendants of the scroll content;
          // adding the current scroll offset produces the scroll-content Y.
          const offset = formScroll.getScrollOffset();
          cb(offset + y);
        });
      } catch {
        cb(0);
      }
    };

    formScroll.setFieldLayout(fieldId, {
      measure,
      parentCollapsibleId,
    });
  }, [fieldId, formScroll, parentCollapsibleId]);

  useEffect(() => {
    if (!fieldId || !formScroll) return;
    return () => formScroll.removeField(fieldId);
  }, [fieldId, formScroll]);

  useEffect(() => {
    if (!fieldId || !formScroll || !focusFn) return;
    formScroll.setFieldFocusable(fieldId, focusFn);
    return () => formScroll.removeFieldFocusable(fieldId);
  }, [fieldId, formScroll, focusFn]);

  return { fieldRef, handleLayout };
}

/**
 * Subscribe to deep-link pulse triggers for `fieldId`. Returns a 0–1 shared
 * value driven by withSequence(300ms→1, 300ms→0). Reduce Motion snaps to 1
 * then immediately back to 0 with no animation.
 *
 * No-op outside a FormScrollProvider or when fieldId is undefined.
 */
function useDeepLinkPulse(fieldId: string | undefined) {
  const formScroll = useFormScrollContext();
  const reduceMotion = useReduceMotion();
  const pulseProgress = useSharedValue(0);
  const lastTsRef = useRef(0);

  const trigger = formScroll?.lastDeepLinkedFieldId;

  useEffect(() => {
    if (!fieldId || !trigger) return;
    if (trigger.id !== fieldId) return;
    if (trigger.ts === lastTsRef.current) return;
    lastTsRef.current = trigger.ts;

    if (reduceMotion) {
      pulseProgress.value = 1;
      pulseProgress.value = withTiming(0, { duration: 0 });
      return;
    }

    pulseProgress.value = withSequence(
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );
  }, [fieldId, trigger, reduceMotion, pulseProgress]);

  return pulseProgress;
}

/**
 * Absolutely-positioned border halo overlay rendered as the last child of a
 * field primitive's outer container. Inactive when `fieldId` is undefined or
 * no pulse has fired for it. The 2px transparent border has zero visual
 * footprint and adds zero layout cost when not pulsing.
 */
function PulseHalo({
  fieldId,
  radius = BorderRadius.sm,
}: {
  fieldId?: string;
  radius?: number;
}) {
  const { theme } = useTheme();
  const pulseProgress = useDeepLinkPulse(fieldId);
  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      pulseProgress.value,
      [0, 1],
      ["transparent", theme.accent],
    ),
  }));
  if (!fieldId) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          borderWidth: 2,
          borderRadius: radius,
        },
        animatedStyle,
      ]}
    />
  );
}

// ── FormField ────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?:
    | "default"
    | "numeric"
    | "decimal-pad"
    | "email-address"
    | "number-pad";
  unit?: string;
  required?: boolean;
  multiline?: boolean;
  error?: string;
  editable?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  onBlur?: () => void;
  textContentType?:
    | "none"
    | "name"
    | "givenName"
    | "familyName"
    | "emailAddress"
    | "telephoneNumber";
  returnKeyType?: "done" | "next" | "go" | "search" | "default";
  testID?: string;
  /**
   * Stable identifier used by the field-level deep-link pipeline. When set,
   * the field registers its layout + focus callback with FormScrollContext
   * so CaseSummaryView Edit warnings can land directly here.
   */
  fieldId?: string;
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  unit,
  required = false,
  multiline = false,
  error,
  editable = true,
  autoCapitalize,
  onBlur,
  textContentType,
  returnKeyType,
  testID,
  fieldId,
}: FormFieldProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);
  const { fieldRef, handleLayout } = useFieldRegistration(fieldId, focusInput);

  return (
    <View
      ref={fieldRef}
      onLayout={handleLayout}
      style={styles.container}
      collapsable={false}
    >
      <View style={styles.labelRow}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
        {required ? (
          <ThemedText style={[styles.required, { color: theme.error }]}>
            *
          </ThemedText>
        ) : null}
      </View>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundRoot,
            borderColor: error ? theme.error : theme.border,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          autoCapitalize={autoCapitalize}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          accessibilityLabel={label}
          style={[
            styles.input,
            {
              color: theme.text,
              minHeight: multiline ? 80 : Spacing.inputHeight,
            },
          ]}
        />
        {unit ? (
          <ThemedText style={[styles.unit, { color: theme.textSecondary }]}>
            {unit}
          </ThemedText>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={14} color={theme.error} />
          <ThemedText style={[styles.error, { color: theme.error }]}>
            {error}
          </ThemedText>
        </View>
      ) : null}
      <PulseHalo fieldId={fieldId} />
    </View>
  );
}

// ── SelectField ──────────────────────────────────────────────────────────────

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  required?: boolean;
  error?: string;
  testID?: string;
  fieldId?: string;
}

export function SelectField({
  label,
  value,
  options,
  onSelect,
  required = false,
  error,
  testID,
  fieldId,
}: SelectFieldProps) {
  const { theme } = useTheme();
  const { fieldRef, handleLayout } = useFieldRegistration(fieldId);

  return (
    <View
      ref={fieldRef}
      onLayout={handleLayout}
      style={styles.container}
      collapsable={false}
    >
      <View style={styles.labelRow}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
        {required ? (
          <ThemedText style={[styles.required, { color: theme.error }]}>
            *
          </ThemedText>
        ) : null}
      </View>
      <View
        testID={testID}
        style={styles.optionsRow}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(option.value);
            }}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: value === option.value }}
            style={[
              styles.optionButton,
              {
                backgroundColor:
                  value === option.value
                    ? theme.link + "15"
                    : theme.backgroundDefault,
                borderColor: value === option.value ? theme.link : theme.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.optionText,
                {
                  color: value === option.value ? theme.link : theme.text,
                  fontWeight: value === option.value ? "600" : "400",
                },
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={14} color={theme.error} />
          <ThemedText style={[styles.error, { color: theme.error }]}>
            {error}
          </ThemedText>
        </View>
      ) : null}
      <PulseHalo fieldId={fieldId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  required: {
    marginLeft: Spacing.xs,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.md,
  },
  unit: {
    fontSize: 14,
    marginLeft: Spacing.sm,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
  },
  error: {
    fontSize: 12,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  optionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: Spacing.touchTarget,
    justifyContent: "center",
  },
  optionText: {
    fontSize: 14,
  },
  // PickerField styles
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    minHeight: Spacing.inputHeight,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pickerButtonText: {
    fontSize: 16,
  },
  pickerPlaceholder: {
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalDoneButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalList: {
    paddingBottom: Spacing.xl,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalOptionText: {
    fontSize: 16,
  },
  // DatePicker styles
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    minHeight: Spacing.inputHeight,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateButtonText: {
    fontSize: 16,
  },
  inlinePickerWrapper: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  inlinePickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  inlinePickerActionText: {
    fontSize: 16,
  },
});

// ── PickerField ──────────────────────────────────────────────────────────────

interface PickerFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  testID?: string;
  fieldId?: string;
}

export function PickerField({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select...",
  required = false,
  error,
  testID,
  fieldId,
}: PickerFieldProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const pendingValueRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { fieldRef, handleLayout } = useFieldRegistration(fieldId);

  const selectedOption = options.find((o) => o.value === value);

  const flushPending = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingValueRef.current !== null) {
      const selected = pendingValueRef.current;
      pendingValueRef.current = null;
      InteractionManager.runAfterInteractions(() => {
        onSelect(selected);
      });
    }
  }, [onSelect]);

  const handleSelect = useCallback(
    (itemValue: string) => {
      Haptics.selectionAsync();
      pendingValueRef.current = itemValue;
      setModalVisible(false);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        flushPending();
      }, 400);
    },
    [flushPending],
  );

  const handleModalDismiss = useCallback(() => {
    flushPending();
  }, [flushPending]);

  const handleClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  return (
    <View
      ref={fieldRef}
      onLayout={handleLayout}
      style={styles.container}
      collapsable={false}
    >
      {label ? (
        <View style={styles.labelRow}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            {label}
          </ThemedText>
          {required ? (
            <ThemedText style={[styles.required, { color: theme.error }]}>
              *
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity
        testID={testID}
        style={[
          styles.pickerButton,
          {
            backgroundColor: theme.backgroundRoot,
            borderColor: error ? theme.error : theme.border,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedOption?.label ?? placeholder}`}
        accessibilityHint="Double tap to open picker"
      >
        {selectedOption ? (
          <ThemedText
            style={[
              styles.pickerButtonText,
              { color: theme.text, fontWeight: "500" },
            ]}
          >
            {selectedOption.label}
          </ThemedText>
        ) : (
          <ThemedText
            style={[styles.pickerPlaceholder, { color: theme.textTertiary }]}
          >
            {placeholder}
          </ThemedText>
        )}
        <Feather name="chevron-down" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      {error ? (
        <ThemedText style={[styles.error, { color: theme.error }]}>
          {error}
        </ThemedText>
      ) : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
        onDismiss={handleModalDismiss}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.backgroundElevated,
                paddingBottom: insets.bottom,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                {label}
              </ThemedText>
              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={handleClose}
              >
                <ThemedText
                  style={[styles.modalDoneText, { color: theme.link }]}
                >
                  Done
                </ThemedText>
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    { borderBottomColor: theme.border },
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <ThemedText
                    style={[
                      styles.modalOptionText,
                      {
                        color: value === item.value ? theme.link : theme.text,
                        fontWeight: value === item.value ? "600" : "400",
                      },
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                  {value === item.value ? (
                    <Feather name="check" size={20} color={theme.link} />
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
      <PulseHalo fieldId={fieldId} />
    </View>
  );
}

// ── DatePickerField ──────────────────────────────────────────────────────────

interface DatePickerFieldProps {
  label: string;
  value?: string | number; // Canonical YYYY-MM-DD, tolerant of legacy ISO/timestamp values
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  clearable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  testID?: string;
  fieldId?: string;
}

const INLINE_PICKER_HEIGHT = 380;
const INLINE_ACTIONS_HEIGHT = 56;
const INLINE_TOTAL_HEIGHT = INLINE_PICKER_HEIGHT + INLINE_ACTIONS_HEIGHT;

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Select date...",
  required = false,
  error,
  disabled = false,
  clearable = false,
  minimumDate,
  maximumDate,
  testID,
  fieldId,
}: DatePickerFieldProps) {
  const { theme, isDark } = useTheme();
  const reduceMotion = useReduceMotion();
  const [showPicker, setShowPicker] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const expandHeight = useSharedValue(0);
  // Shared with the field-level deep-link registry: the same outer View ref
  // serves both the registry's live-measure helper and the inline picker's
  // self-positioning effect below.
  const { fieldRef, handleLayout } = useFieldRegistration(fieldId);
  const scrollContext = useFormScrollContext();
  const { minimumDate: safeMinimumDate, maximumDate: safeMaximumDate } =
    sanitizeDateBounds(minimumDate, maximumDate);

  const formatDisplayDate = (dateStr: string) => {
    const date = parseDateOnlyValue(dateStr);
    if (!date) return "";
    return date.toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const normalizedValue = normalizeDateOnlyValue(value);
  const displayValue = normalizedValue
    ? formatDisplayDate(normalizedValue)
    : "";
  const hasDisplayValue = Boolean(displayValue);
  const hasStoredValue =
    (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value));

  const parsedValue = parseDateOnlyValue(value);
  const dateValue = clampDateToBounds(
    parsedValue ?? new Date(),
    safeMinimumDate,
    safeMaximumDate,
  );
  const [draftDate, setDraftDate] = useState<Date>(dateValue);

  const handleDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        setShowPicker(false);
        if (selectedDate) {
          const boundedDate = clampDateToBounds(
            selectedDate,
            safeMinimumDate,
            safeMaximumDate,
          );
          const isoDate = toIsoDateValue(boundedDate);
          onChange(isoDate);
        }
        return;
      }
      if (selectedDate) {
        setDraftDate(
          clampDateToBounds(selectedDate, safeMinimumDate, safeMaximumDate),
        );
      }
    },
    [onChange, safeMaximumDate, safeMinimumDate],
  );

  const handleUnmount = useCallback(() => {
    setIsMounted(false);
  }, []);

  const closeDatePicker = useCallback(() => {
    setShowPicker(false);
    if (Platform.OS === "ios") {
      expandHeight.value = withTiming(
        0,
        { duration: reduceMotion ? 0 : 200, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(handleUnmount)();
          }
        },
      );
    }
  }, [expandHeight, handleUnmount, reduceMotion]);

  const openDatePicker = useCallback(() => {
    setDraftDate(dateValue);
    setShowPicker(true);
    if (Platform.OS === "ios") {
      setIsMounted(true);
      expandHeight.value = withTiming(INLINE_TOTAL_HEIGHT, {
        duration: reduceMotion ? 0 : 240,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [dateValue, expandHeight, reduceMotion]);

  // When the inline picker opens, ask the surrounding scroll context to keep
  // both the field and the expanded picker visible.
  useEffect(() => {
    if (!showPicker || Platform.OS !== "ios" || !scrollContext) return;
    const handle = requestAnimationFrame(() => {
      const node = fieldRef.current as unknown as {
        measureInWindow?: (
          fn: (x: number, y: number, w: number, h: number) => void,
        ) => void;
      } | null;
      node?.measureInWindow?.((_x, y, _w, h) => {
        scrollContext.ensureVisible(y, h + INLINE_TOTAL_HEIGHT, {
          extraPadding: 32,
        });
      });
    });
    return () => cancelAnimationFrame(handle);
  }, [showPicker, scrollContext, fieldRef]);

  const handleDatePickerDone = useCallback(() => {
    const isoDate = toIsoDateValue(
      clampDateToBounds(draftDate, safeMinimumDate, safeMaximumDate),
    );
    closeDatePicker();
    requestAnimationFrame(() => onChange(isoDate));
  }, [closeDatePicker, draftDate, onChange, safeMaximumDate, safeMinimumDate]);

  const handleDatePickerCancel = useCallback(() => {
    closeDatePicker();
  }, [closeDatePicker]);

  const animatedPickerStyle = useAnimatedStyle(() => ({
    height: expandHeight.value,
    overflow: "hidden" as const,
  }));

  return (
    <View
      ref={fieldRef}
      onLayout={handleLayout}
      style={styles.container}
      collapsable={false}
    >
      <View style={styles.labelRow}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
        {required ? (
          <ThemedText style={[styles.required, { color: theme.error }]}>
            *
          </ThemedText>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable
          testID={testID}
          style={[
            styles.dateButton,
            {
              flex: 1,
              backgroundColor: disabled
                ? theme.backgroundDefault
                : theme.backgroundRoot,
              borderColor: error
                ? theme.error
                : showPicker
                  ? theme.link
                  : theme.border,
              opacity: disabled ? 0.6 : 1,
            },
          ]}
          onPress={() =>
            !disabled &&
            (showPicker ? handleDatePickerCancel() : openDatePicker())
          }
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${hasDisplayValue ? displayValue : "not set"}`}
          accessibilityHint="Double tap to select date"
          accessibilityState={{ disabled, expanded: showPicker }}
        >
          {hasDisplayValue ? (
            <ThemedText style={[styles.dateButtonText, { color: theme.text }]}>
              {displayValue}
            </ThemedText>
          ) : (
            <ThemedText
              style={[styles.dateButtonText, { color: theme.textTertiary }]}
            >
              {placeholder}
            </ThemedText>
          )}
          <Feather
            name={showPicker ? "chevron-up" : "calendar"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
        {clearable && hasStoredValue && !disabled ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange("");
            }}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
            style={{ paddingLeft: 8 }}
          >
            <Feather name="x-circle" size={20} color={theme.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <ThemedText style={[styles.error, { color: theme.error }]}>
          {error}
        </ThemedText>
      ) : null}

      {Platform.OS === "ios" && isMounted ? (
        <Animated.View
          style={[
            animatedPickerStyle,
            styles.inlinePickerWrapper,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
          pointerEvents={showPicker ? "auto" : "none"}
        >
          <DateTimePicker
            value={draftDate}
            mode="date"
            display="inline"
            onChange={handleDateChange}
            minimumDate={safeMinimumDate}
            maximumDate={safeMaximumDate}
            themeVariant={isDark ? "dark" : "light"}
            accentColor={theme.link}
            style={{ height: INLINE_PICKER_HEIGHT }}
          />
          <View
            style={[
              styles.inlinePickerActions,
              { borderTopColor: theme.border },
            ]}
          >
            <TouchableOpacity
              onPress={handleDatePickerCancel}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel date selection"
            >
              <ThemedText
                style={[
                  styles.inlinePickerActionText,
                  { color: theme.textSecondary },
                ]}
              >
                Cancel
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDatePickerDone}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Confirm date selection"
            >
              <ThemedText
                style={[
                  styles.inlinePickerActionText,
                  { color: theme.link, fontWeight: "600" },
                ]}
              >
                Done
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : null}

      {Platform.OS === "android" && showPicker ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={safeMinimumDate}
          maximumDate={safeMaximumDate}
        />
      ) : null}
      <PulseHalo fieldId={fieldId} />
    </View>
  );
}
