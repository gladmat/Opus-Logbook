import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ActionSheetIOS,
  Platform,
  Alert,
  LayoutChangeEvent,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { KeyboardToolbar } from "react-native-keyboard-controller";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { SPECIALTY_LABELS, isPlannedCase } from "@/types/case";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/Button";
import { OperativeMediaSection } from "@/components/OperativeMediaSection";

import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import {
  useCaseForm,
  setField,
  validateRequiredFields,
  validateField,
} from "@/hooks/useCaseForm";
import type { ValidationError } from "@/hooks/useCaseForm";
import { useCaseDraft } from "@/hooks/useCaseDraft";
import { CaseFormProvider } from "@/contexts/CaseFormContext";
import {
  FormScrollProvider,
  type FormScrollContextValue,
} from "@/contexts/FormScrollContext";
import { PatientInfoSection } from "@/components/case-form/PatientInfoSection";
import { TeamSection } from "@/components/case-form/TeamSection";
import { CaseSection } from "@/components/case-form/CaseSection";
import { OperativeSection } from "@/components/case-form/OperativeSection";
import { OutcomesSection } from "@/components/case-form/OutcomesSection";
import {
  SectionNavBar,
  NAV_BAR_HEIGHT,
  FORM_SECTIONS,
} from "@/components/case-form/SectionNavBar";
import type { CompletionMap } from "@/components/case-form/SectionNavBar";
import { CaseSummaryView } from "@/components/case-form/CaseSummaryView";
import { PlanModeBanner } from "@/components/case-form/PlanModeBanner";
import { EpisodeLinkBanner } from "@/components/EpisodeLinkBanner";

import { resolveFacilityName } from "@/lib/facilities";
import { useFavouritesRecents } from "@/hooks/useFavouritesRecents";
import type { TreatmentEpisode } from "@/types/episode";
import { HeaderTitleText } from "@/components/HeaderTitleText";
import { buildMediaContext } from "@/lib/mediaContext";
import { LoadingState } from "@/components/LoadingState";
import {
  getReservedInboxIdsFromMedia,
  releaseReservedInboxItems,
} from "@/lib/inboxStorage";

type RouteParams = RouteProp<RootStackParamList, "CaseForm">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const REQUIRED_FIELDS = [
  "patientIdentifier",
  "procedureDate",
  "facility",
  "diagnosisGroups",
];

const SPECIALTY_HEADER_LABELS: Partial<Record<string, string>> = {
  orthoplastic: "Orthoplastic Case",
  peripheral_nerve: "Peripheral Nerve Case",
  cleft_craniofacial: "Cleft & Craniofacial Case",
};

// ── SectionWrapper ────────────────────────────────────────────────────────

interface SectionWrapperRef {
  measure: (callback: (y: number) => void) => void;
}

const SectionWrapper = React.forwardRef<
  SectionWrapperRef,
  {
    sectionId: string;
    onLayout: (sectionId: string, y: number) => void;
    children: React.ReactNode;
  }
>(function SectionWrapper({ sectionId, onLayout, children }, ref) {
  const viewRef = useRef<View>(null);
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onLayout(sectionId, e.nativeEvent.layout.y);
    },
    [sectionId, onLayout],
  );

  React.useImperativeHandle(
    ref,
    () => ({
      // Live-measure the section's Y within its parent ScrollView. Used by
      // scroll-to-section paths to avoid relying on the cached Y, which can
      // go stale after sibling collapses (audit B1.6).
      measure: (cb) => {
        const node = viewRef.current;
        if (!node) {
          cb(0);
          return;
        }
        // Cast to satisfy TS; RN's View ref does have measure().
        const measurable = node as unknown as {
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
        };
        try {
          measurable.measure((_x, y) => cb(y));
        } catch {
          cb(0);
        }
      },
    }),
    [],
  );

  return (
    <View ref={viewRef} onLayout={handleLayout} testID={`section-${sectionId}`}>
      {children}
    </View>
  );
});

// ── CaseFormScreen ────────────────────────────────────────────────────────

export default function CaseFormScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const { facilities, profile } = useAuth();

  const scrollViewRef = useRef<any>(null);
  const scrollPositionRef = useRef(0);
  // Imperative handle to FormScrollProvider's context value. Populated on
  // provider mount; lets `handleEditFromSummary` reach the field-level
  // deep-link API even though CaseFormScreen sits OUTSIDE the provider.
  const formScrollControlsRef = useRef<FormScrollContextValue | null>(null);
  const sectionLayoutsRef = useRef<Record<string, number>>({});
  // Live refs to each SectionWrapper, used to re-measure on demand when the
  // cached Y might be stale after a sibling collapse (audit B1.6).
  const sectionWrapperRefs = useRef<Record<string, SectionWrapperRef | null>>(
    {},
  );
  const formOpenedAtRef = useRef(new Date().toISOString());
  // Snapshot of scroll position taken when entering reviewMode, restored on exit.
  const preReviewScrollRef = useRef(0);
  // Used by the dev-only jump detector — last scroll sample {y, t}.
  const lastScrollSampleRef = useRef({ y: 0, t: 0 });
  // Last touched testID, captured on the root scroll view's onTouchStart. Used
  // by the dev-only jump detector to attribute a jump to the element that was
  // pressed immediately before it.
  const lastTouchedTestIdRef = useRef<string | null>(null);

  const [activeSection, setActiveSection] = useState("patient");
  const [reviewMode, setReviewMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );

  // ── Inline validation state ─────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const touchedFieldsRef = useRef<Set<string>>(new Set());

  const {
    specialty: routeSpecialty,
    caseId,
    duplicateFrom,
    skinCancerFollowUpPrefill,
    episodeId: routeEpisodeId,
    episodePrefill,
    quickPrefill,
  } = route.params;
  const [showDuplicateBanner, setShowDuplicateBanner] =
    useState(!!duplicateFrom);
  const primarySelectedFacility = facilities.find(
    (facility) => facility.isPrimary,
  );
  const primaryFacility =
    (primarySelectedFacility
      ? resolveFacilityName(primarySelectedFacility)
      : null) ||
    (facilities[0] ? resolveFacilityName(facilities[0]) : null) ||
    "";

  const form = useCaseForm({
    specialty: routeSpecialty,
    caseId,
    duplicateFrom,
    skinCancerFollowUpPrefill,
    episodeId: routeEpisodeId,
    episodePrefill,
    quickPrefill,
    primaryFacility,
    profile,
  });
  const formDispatch = form.dispatch;
  const formStateRef = useRef(form.state);
  formStateRef.current = form.state;
  const diagnosisGroupsRef = useRef(form.state.diagnosisGroups);
  diagnosisGroupsRef.current = form.state.diagnosisGroups;
  const operativeMediaRef = useRef(form.state.operativeMedia);
  operativeMediaRef.current = form.state.operativeMedia;

  const isEditModeRef = useRef(form.isEditMode);
  isEditModeRef.current = form.isEditMode;

  const { recordUsage } = useFavouritesRecents(form.specialty);

  const { clearDraft } = useCaseDraft({
    state: form.state,
    specialty: form.specialty,
    isEditMode: form.isEditMode,
    isEpisodePrefill: !!episodePrefill,
    isQuickPrefill: !!quickPrefill,
    draftLoadedRef: form.draftLoadedRef,
    savedRef: form.savedRef,
    dispatch: formDispatch,
    primaryFacility,
  });

  // ── Inline validation handlers ──────────────────────────────────────────

  const onFieldBlur = useCallback((field: string) => {
    touchedFieldsRef.current.add(field);
    const error = validateField(field, formStateRef.current);
    setFieldErrors((prev) => {
      if (error) return { ...prev, [field]: error };
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // Re-validate touched fields on state change (clears errors on keystroke)
  useEffect(() => {
    const touched = touchedFieldsRef.current;
    if (touched.size === 0) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const field of touched) {
        const error = validateField(field, form.state);
        if (error && next[field] !== error) {
          next[field] = error;
          changed = true;
        } else if (!error && field in next) {
          delete next[field];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [form.state]);

  // ── Episode link handler ────────────────────────────────────────────────

  const handleLinkEpisode = useCallback(
    (episode: TreatmentEpisode) => {
      formDispatch({
        type: "BULK_UPDATE",
        updates: {
          episodeId: episode.id,
          episodeSequence: 1, // Placeholder — recomputed at save time
        },
      });
    },
    [formDispatch],
  );

  // ── Completion map ──────────────────────────────────────────────────────

  // ── Media context for protocol detection ───────────────────────────────

  const mediaContext = useMemo(
    () =>
      buildMediaContext({
        specialty: form.specialty,
        procedureDate: form.state.procedureDate,
        diagnosisGroups: form.state.diagnosisGroups,
      }),
    [form.specialty, form.state.diagnosisGroups, form.state.procedureDate],
  );

  const completionMap: CompletionMap = useMemo(() => {
    const s = form.state;
    return {
      patient: {
        filled: [
          s.patientIdentifier.trim(),
          s.procedureDate,
          s.facility.trim(),
        ].filter(Boolean).length,
        total: 3,
      },
      case: {
        filled: s.diagnosisGroups.filter(
          (g) =>
            g.diagnosis && g.procedures.some((p) => p.procedureName.trim()),
        ).length,
        total: s.diagnosisGroups.length,
      },
      operative: {
        filled: [
          s.admissionUrgency,
          s.stayType,
          s.anaestheticType,
          s.surgeryStartTime,
        ].filter(Boolean).length,
        total: 4,
      },
      media: {
        filled: s.operativeMedia.length > 0 ? 1 : 0,
        total: 1,
      },
      outcomes: {
        filled: s.outcome ? 1 : 0,
        total: 1,
      },
    };
  }, [form.state]);

  // ── Section layout tracking ─────────────────────────────────────────────

  const handleSectionLayout = useCallback((sectionId: string, y: number) => {
    sectionLayoutsRef.current[sectionId] = y;
  }, []);

  const registerSectionRef = useCallback(
    (sectionId: string) => (ref: SectionWrapperRef | null) => {
      sectionWrapperRefs.current[sectionId] = ref;
    },
    [],
  );

  /**
   * Scroll-to-section helper that prefers a live `measure()` over the
   * cached Y. The cache stays accurate in most cases via `onLayout`, but a
   * mid-form collapse of a `CollapsibleFormSection` can shift sibling Y
   * values before the cache catches up (audit B1.6). Live measurement
   * removes that race entirely.
   */
  const scrollToSection = useCallback(
    (sectionId: string, opts: { offset?: number; animated?: boolean } = {}) => {
      const offset = opts.offset ?? NAV_BAR_HEIGHT + 10;
      const animated = opts.animated ?? true;
      const wrapper = sectionWrapperRefs.current[sectionId];
      const fallback = () => {
        const cachedY = sectionLayoutsRef.current[sectionId];
        if (cachedY !== undefined && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: Math.max(0, cachedY - offset),
            animated,
          });
        }
      };
      if (!wrapper) {
        fallback();
        return;
      }
      wrapper.measure((liveY) => {
        // `measure` returns Y relative to the section's parent. Translate
        // back to scroll offset by adding the current scroll position
        // (where the section's parent currently sits within the scroll
        // view's content).
        const currentOffset = scrollPositionRef.current ?? 0;
        const targetY = currentOffset + liveY - offset;
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: Math.max(0, targetY),
            animated,
          });
        }
        // Refresh the cache while we have a fresh measurement.
        sectionLayoutsRef.current[sectionId] = currentOffset + liveY;
      });
    },
    [],
  );

  // ── Save orchestration ────────────────────────────────────────────────

  const handleSaveRef = useRef(form.handleSave);
  handleSaveRef.current = form.handleSave;

  const clearDraftRef = useRef(clearDraft);
  clearDraftRef.current = clearDraft;

  const recordUsageRef = useRef(recordUsage);
  recordUsageRef.current = recordUsage;

  const onSave = useCallback(async () => {
    const success = await handleSaveRef.current(formOpenedAtRef.current);
    if (success) {
      // Record favourites/recents usage for all diagnoses and procedures
      for (const group of form.state.diagnosisGroups) {
        if (group.diagnosisPicklistId) {
          recordUsageRef.current("diagnosis", group.diagnosisPicklistId);
        }
        for (const proc of group.procedures) {
          if (proc.picklistEntryId) {
            recordUsageRef.current("procedure", proc.picklistEntryId);
          }
        }
      }

      if (!form.isEditMode) {
        await clearDraftRef.current();
      }
      navigation.goBack();
    }
  }, [form.isEditMode, form.state.diagnosisGroups, navigation]);

  // ── Overflow menu ────────────────────────────────────────────────────

  const resetFormRef = useRef(form.resetForm);
  resetFormRef.current = form.resetForm;

  const revertToSavedRef = useRef(form.revertToSaved);
  revertToSavedRef.current = form.revertToSaved;

  const showOverflowMenu = useCallback(() => {
    const isEdit = form.isEditMode;
    const actionLabel = isEdit ? "Revert Changes" : "Clear Form";

    const execute = async () => {
      const reservedInboxIds = getReservedInboxIdsFromMedia(
        operativeMediaRef.current,
      );
      if (reservedInboxIds.length > 0) {
        releaseReservedInboxItems(reservedInboxIds);
      }

      if (isEdit) {
        revertToSavedRef.current();
      } else {
        resetFormRef.current();
        await clearDraftRef.current();
      }
      // Clear inline validation state on reset
      touchedFieldsRef.current.clear();
      setFieldErrors({});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [actionLabel, "Cancel"],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) execute();
        },
      );
    } else {
      Alert.alert(
        actionLabel,
        `Are you sure you want to ${actionLabel.toLowerCase()}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: actionLabel, style: "destructive", onPress: execute },
        ],
      );
    }
  }, [form.isEditMode]);

  useEffect(() => {
    return () => {
      if (form.savedRef.current) {
        return;
      }

      const reservedInboxIds = getReservedInboxIdsFromMedia(
        operativeMediaRef.current,
      );
      if (reservedInboxIds.length > 0) {
        releaseReservedInboxItems(reservedInboxIds);
      }
    };
  }, [form.savedRef]);

  // ── Review mode ─────────────────────────────────────────────────────────

  const handleReviewPress = useCallback(() => {
    // Mark all required fields as touched so inline errors appear
    for (const field of REQUIRED_FIELDS) {
      touchedFieldsRef.current.add(field);
    }

    const { valid, errors } = validateRequiredFields(form.state);
    if (!valid) {
      setValidationErrors(errors);
      // Update inline field errors
      const newErrors: Record<string, string> = {};
      for (const field of REQUIRED_FIELDS) {
        const err = validateField(field, form.state);
        if (err) newErrors[field] = err;
      }
      setFieldErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Scroll to first error section (live-measured to handle the case
      // where a sibling section just collapsed — audit B1.6).
      const firstErrorSection = errors[0]?.sectionId;
      if (firstErrorSection) {
        scrollToSection(firstErrorSection, { offset: 20, animated: true });
      }
      return;
    }
    setValidationErrors([]);
    preReviewScrollRef.current = scrollPositionRef.current;
    setReviewMode(true);
  }, [form.state, scrollToSection]);

  const handleEditFromSummary = useCallback(
    (sectionId: string, fieldId?: string) => {
      setReviewMode(false);
      // Wait for form to mount and onLayout to fire, then live-measure
      // (audit B1.6 — cache may not yet have refreshed after re-mount).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const controls = formScrollControlsRef.current;
          if (fieldId && controls) {
            // scrollToField handles auto-expand of a collapsed parent
            // internally + live-measures so a sibling collapse doesn't
            // strand us on a stale Y.
            const found = controls.scrollToField(fieldId, {
              topPadding: 100,
              animated: false,
            });
            if (found) {
              // Focus is only registered for TextInput-backed fields; a
              // no-op on SelectField / PickerField / DatePickerField.
              controls.focusField(fieldId);
              // Amber border pulse so non-text targets get a visual cue
              // even when no keyboard pops to confirm landing.
              controls.triggerDeepLinkPulse(fieldId);
              return;
            }
          }
          scrollToSection(sectionId, { offset: 20, animated: false });
        });
      });
    },
    [scrollToSection],
  );

  const handleBackToEdit = useCallback(() => {
    const restoreY = preReviewScrollRef.current;
    setReviewMode(false);
    // Restore where we were when entering review — without this the form
    // re-mounts at scroll 0 on exit.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, restoreY),
          animated: false,
        });
      });
    });
  }, []);

  const isCompletingPlanned =
    form.isEditMode &&
    form.existingCase != null &&
    isPlannedCase(form.existingCase);

  const headerTitle = reviewMode
    ? "Review Case"
    : form.state.isPlanMode
      ? "Plan a Case"
      : isCompletingPlanned
        ? "Complete Case"
        : form.isEditMode
          ? "Edit Case"
          : (SPECIALTY_HEADER_LABELS[form.specialty] ??
            `${SPECIALTY_LABELS[form.specialty]} Case`);

  // ── Navigation header ─────────────────────────────────────────────────

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitleText title={headerTitle} reserveWidth={210} fontSize={15} />
      ),
      headerRight: () =>
        form.loadingExistingCase || form.loadError ? null : (
          <View style={styles.headerActions}>
            <Pressable
              onPress={showOverflowMenu}
              hitSlop={8}
              style={styles.headerIconButton}
              accessibilityRole="button"
              accessibilityLabel={
                form.isEditMode ? "Revert changes" : "Clear form"
              }
              testID="caseForm.header.btn-overflow"
            >
              <Feather
                name="more-horizontal"
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
            {/* Header Save is edit-mode only. New cases and planned cases
                save via Review → Confirm so they get the validation pass
                (audit B2.5 / P2.4 — single save model for new cases). */}
            {form.isEditMode ? (
              <Pressable
                onPress={() =>
                  handleSaveRef
                    .current(formOpenedAtRef.current)
                    .then((success) => {
                      if (success) {
                        for (const group of diagnosisGroupsRef.current) {
                          if (group.diagnosisPicklistId) {
                            recordUsageRef.current(
                              "diagnosis",
                              group.diagnosisPicklistId,
                            );
                          }
                          for (const proc of group.procedures) {
                            if (proc.picklistEntryId) {
                              recordUsageRef.current(
                                "procedure",
                                proc.picklistEntryId,
                              );
                            }
                          }
                        }
                        if (!isEditModeRef.current)
                          void clearDraftRef.current();
                        navigation.goBack();
                      }
                    })
                }
                disabled={form.state.saving}
                hitSlop={8}
                style={styles.headerSaveButton}
                accessibilityRole="button"
                accessibilityLabel="Save case"
                testID="caseForm.header.btn-save"
              >
                <ThemedText
                  style={{
                    color: form.state.saving ? theme.textTertiary : theme.link,
                    fontWeight: "600",
                  }}
                >
                  {form.state.saving ? "Saving..." : "Save"}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ),
    });
  }, [
    form.state.saving,
    form.state.isPlanMode,
    form.isEditMode,
    form.specialty,
    theme.link,
    theme.textSecondary,
    theme.textTertiary,
    form.loadingExistingCase,
    form.loadError,
    headerTitle,
    navigation,
    showOverflowMenu,
  ]);

  // ── Section nav press ─────────────────────────────────────────────────

  const handleSectionPress = useCallback(
    (sectionId: string) => {
      setActiveSection(sectionId);
      scrollToSection(sectionId, {
        offset: NAV_BAR_HEIGHT + 10,
        animated: true,
      });
    },
    [scrollToSection],
  );

  // ── Scroll tracking ───────────────────────────────────────────────────

  const handleScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const t = Date.now();

    // Dev-only jump detector: an abrupt upward delta in a tiny time window is
    // almost certainly an unintentional scroll reset, not a user gesture.
    // Threshold tuned for "obvious" jumps; smooth flicks stay below.
    if (__DEV__) {
      const prev = lastScrollSampleRef.current;
      const dt = t - prev.t;
      const dy = y - prev.y;
      if (dt > 0 && dt < 200 && dy < -250) {
        console.warn(
          `[opus:scroll-jump] Δy=${dy.toFixed(0)}px in ${dt}ms (${prev.y.toFixed(0)} → ${y.toFixed(0)}); lastTouched=${lastTouchedTestIdRef.current ?? "<unknown>"}`,
        );
      }
    }
    lastScrollSampleRef.current = { y, t };

    scrollPositionRef.current = y;

    // Find active section based on scroll position
    const adjustedY = y + NAV_BAR_HEIGHT + 30;
    let currentSection = "patient";
    for (const section of FORM_SECTIONS) {
      const sectionY = sectionLayoutsRef.current[section.id];
      if (sectionY !== undefined && adjustedY >= sectionY) {
        currentSection = section.id;
      }
    }
    // Functional update so React bails out via Object.is when section
    // hasn't actually changed — prevents per-frame re-renders during scroll.
    setActiveSection((prev) =>
      prev === currentSection ? prev : currentSection,
    );
  }, []);

  // Capture the last-touched testID so the jump detector can attribute a
  // scroll-to-top to the element that was just tapped.
  const handleTouchStart = useCallback((event: any) => {
    if (!__DEV__) return;
    try {
      // Walk up the event target's parent chain looking for a testID prop.
      // React Native exposes the actual native tag rather than the testID,
      // so we read it off the event's _targetInst fiber when available.
      const target =
        event?._targetInst ?? event?.nativeEvent?._targetInst ?? event?.target;
      let node: any = target;
      let depth = 0;
      while (node && depth < 12) {
        const testID =
          node.memoizedProps?.testID ??
          node.stateNode?.props?.testID ??
          node.props?.testID;
        if (typeof testID === "string" && testID.length > 0) {
          lastTouchedTestIdRef.current = testID;
          return;
        }
        node = node.return ?? node._owner ?? null;
        depth += 1;
      }
      lastTouchedTestIdRef.current = null;
    } catch {
      lastTouchedTestIdRef.current = null;
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  if (form.isEditMode && form.loadingExistingCase) {
    return <LoadingState message="Loading case..." />;
  }

  if (form.isEditMode && form.loadError) {
    return (
      <View
        style={[
          styles.loadErrorContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ThemedText type="h3">Unable to load case</ThemedText>
        <ThemedText
          style={[styles.loadErrorMessage, { color: theme.textSecondary }]}
        >
          {form.loadError}
        </ThemedText>
        <Button onPress={() => navigation.goBack()} style={styles.loadErrorCta}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <CaseFormProvider
      form={form}
      fieldErrors={fieldErrors}
      onFieldBlur={onFieldBlur}
    >
      <View testID="screen-caseForm" style={styles.container}>
        {!reviewMode && form.state.isPlanMode ? (
          <PlanModeBanner
            onTogglePlanMode={() =>
              form.dispatch(setField("isPlanMode", false))
            }
          />
        ) : null}
        {!reviewMode ? (
          <View
            style={[
              styles.navBarContainer,
              {
                top: 0,
                backgroundColor: theme.backgroundRoot,
              },
            ]}
          >
            <SectionNavBar
              activeSection={activeSection}
              completionMap={completionMap}
              onSectionPress={handleSectionPress}
            />
          </View>
        ) : null}

        <KeyboardAwareScrollViewCompat
          ref={scrollViewRef}
          style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: reviewMode ? Spacing.lg : NAV_BAR_HEIGHT + Spacing.lg,
              paddingBottom: insets.bottom + Spacing["3xl"],
            },
          ]}
          onScroll={handleScroll}
          onTouchStart={__DEV__ ? handleTouchStart : undefined}
          scrollEventThrottle={16}
        >
          <FormScrollProvider
            scrollViewRef={scrollViewRef}
            scrollOffsetRef={scrollPositionRef}
            controlsRef={formScrollControlsRef}
          >
            {reviewMode ? (
              <CaseSummaryView
                onEdit={handleEditFromSummary}
                onConfirmSave={onSave}
                onBackToEdit={handleBackToEdit}
                saving={form.state.saving}
              />
            ) : (
              <>
                {showDuplicateBanner ? (
                  <View
                    style={[
                      styles.duplicateBanner,
                      {
                        backgroundColor: theme.info + "10",
                        borderColor: theme.info + "40",
                      },
                    ]}
                  >
                    <View style={styles.duplicateBannerContent}>
                      <Feather name="copy" size={16} color={theme.info} />
                      <ThemedText
                        style={[
                          styles.duplicateBannerText,
                          { color: theme.info },
                        ]}
                      >
                        {skinCancerFollowUpPrefill
                          ? "Skin cancer follow-up pre-filled from the current case. Verify the carried-forward histology and planned next-step procedure."
                          : `Duplicated from case ${
                              duplicateFrom?.procedureDate
                                ? new Date(
                                    duplicateFrom.procedureDate,
                                  ).toLocaleDateString()
                                : ""
                            }. Verify all fields.`}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => setShowDuplicateBanner(false)}
                      hitSlop={8}
                      style={styles.duplicateBannerClose}
                    >
                      <Feather name="x" size={16} color={theme.info} />
                    </Pressable>
                  </View>
                ) : null}

                <SectionWrapper
                  ref={registerSectionRef("patient")}
                  sectionId="patient"
                  onLayout={handleSectionLayout}
                >
                  <PatientInfoSection />
                  {!form.isEditMode ? (
                    <EpisodeLinkBanner
                      patientIdentifier={form.state.patientIdentifier}
                      currentEpisodeId={form.state.episodeId}
                      onLinkEpisode={handleLinkEpisode}
                    />
                  ) : null}
                </SectionWrapper>

                <SectionWrapper
                  ref={registerSectionRef("team")}
                  sectionId="team"
                  onLayout={handleSectionLayout}
                >
                  <TeamSection />
                </SectionWrapper>

                <SectionWrapper
                  ref={registerSectionRef("case")}
                  sectionId="case"
                  onLayout={handleSectionLayout}
                >
                  <CaseSection
                    scrollViewRef={scrollViewRef}
                    scrollPositionRef={scrollPositionRef}
                  />
                </SectionWrapper>

                <SectionWrapper
                  ref={registerSectionRef("operative")}
                  sectionId="operative"
                  onLayout={handleSectionLayout}
                >
                  <OperativeSection />
                </SectionWrapper>

                <SectionWrapper
                  ref={registerSectionRef("media")}
                  sectionId="media"
                  onLayout={handleSectionLayout}
                >
                  <SectionHeader
                    title="Operative Media"
                    subtitle="Photos, X-rays, and imaging"
                  />
                  <OperativeMediaSection
                    media={form.state.operativeMedia}
                    onMediaChange={(media) =>
                      form.dispatch(setField("operativeMedia", media))
                    }
                    maxItems={15}
                    mediaContext={mediaContext}
                  />
                </SectionWrapper>

                <SectionWrapper
                  ref={registerSectionRef("outcomes")}
                  sectionId="outcomes"
                  onLayout={handleSectionLayout}
                >
                  <OutcomesSection
                    infectionOverlay={form.state.infectionOverlay ?? undefined}
                    onInfectionChange={(v) =>
                      form.dispatch(setField("infectionOverlay", v))
                    }
                    infectionCollapsed={form.state.infectionCollapsed}
                    onInfectionToggle={() =>
                      form.dispatch(
                        setField(
                          "infectionCollapsed",
                          !form.state.infectionCollapsed,
                        ),
                      )
                    }
                  />
                </SectionWrapper>

                <View style={styles.buttonContainer}>
                  <Button
                    onPress={handleReviewPress}
                    disabled={form.state.saving}
                    testID="caseForm.btn-review"
                  >
                    {validationErrors.length > 0
                      ? `Review Case · Fix ${validationErrors.length} issue${
                          validationErrors.length === 1 ? "" : "s"
                        }`
                      : "Review Case"}
                  </Button>
                </View>
                {/* Bottom validation banner removed (audit P2.6) — inline
                    field errors plus the scroll-to-first-error in
                    handleReviewPress give an actionable, non-duplicated
                    signal. The button label itself counts unfixed issues. */}
              </>
            )}
          </FormScrollProvider>
        </KeyboardAwareScrollViewCompat>

        {!reviewMode ? <KeyboardToolbar /> : null}
      </View>
    </CaseFormProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  navBarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSaveButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
  validationErrors: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  validationErrorText: {
    fontSize: 13,
  },
  duplicateBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  duplicateBannerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  duplicateBannerText: {
    fontSize: 13,
    flex: 1,
  },
  duplicateBannerClose: {
    padding: 4,
  },
  loadErrorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["3xl"],
  },
  loadErrorMessage: {
    marginTop: Spacing.sm,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
  loadErrorCta: {
    marginTop: Spacing.xl,
    minWidth: 180,
  },
});
