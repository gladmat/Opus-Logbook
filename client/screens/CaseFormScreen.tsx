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
import { PatientInfoSection } from "@/components/case-form/PatientInfoSection";
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

function SectionWrapper({
  sectionId,
  onLayout,
  children,
}: {
  sectionId: string;
  onLayout: (sectionId: string, y: number) => void;
  children: React.ReactNode;
}) {
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onLayout(sectionId, e.nativeEvent.layout.y);
    },
    [sectionId, onLayout],
  );

  return <View onLayout={handleLayout}>{children}</View>;
}

// ── CaseFormScreen ────────────────────────────────────────────────────────

export default function CaseFormScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const { facilities, profile } = useAuth();

  const scrollViewRef = useRef<any>(null);
  const scrollPositionRef = useRef(0);
  const sectionLayoutsRef = useRef<Record<string, number>>({});
  const formOpenedAtRef = useRef(new Date().toISOString());

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

      // Scroll to first error section
      const firstErrorSection = errors[0]?.sectionId;
      if (firstErrorSection) {
        const y = sectionLayoutsRef.current[firstErrorSection];
        if (y !== undefined && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: Math.max(0, y - 20),
            animated: true,
          });
        }
      }
      return;
    }
    setValidationErrors([]);
    setReviewMode(true);
  }, [form.state]);

  const handleEditFromSummary = useCallback((sectionId: string) => {
    setReviewMode(false);
    // Wait for form to mount and onLayout to fire
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const y = sectionLayoutsRef.current[sectionId];
        if (y !== undefined && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: Math.max(0, y - 20),
            animated: true,
          });
        }
      });
    });
  }, []);

  const handleBackToEdit = useCallback(() => {
    setReviewMode(false);
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
            >
              <Feather
                name="more-horizontal"
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
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
                      if (!isEditModeRef.current) void clearDraftRef.current();
                      navigation.goBack();
                    }
                  })
              }
              disabled={form.state.saving}
              hitSlop={8}
              style={styles.headerSaveButton}
              accessibilityRole="button"
              accessibilityLabel="Save case"
            >
              <ThemedText
                style={{
                  color: form.state.saving ? theme.textTertiary : theme.link,
                  fontWeight: "600",
                }}
              >
                {form.state.saving
                  ? "Saving..."
                  : form.state.isPlanMode
                    ? "Save Plan"
                    : "Save"}
              </ThemedText>
            </Pressable>
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

  const handleSectionPress = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    const y = sectionLayoutsRef.current[sectionId];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: Math.max(0, y - NAV_BAR_HEIGHT - 10),
        animated: true,
      });
    }
  }, []);

  // ── Scroll tracking ───────────────────────────────────────────────────

  const handleScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
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
    setActiveSection(currentSection);
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
        scrollEventThrottle={16}
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
                    style={[styles.duplicateBannerText, { color: theme.info }]}
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

            <SectionWrapper sectionId="patient" onLayout={handleSectionLayout}>
              <PatientInfoSection />
              {!form.isEditMode ? (
                <EpisodeLinkBanner
                  patientIdentifier={form.state.patientIdentifier}
                  currentEpisodeId={form.state.episodeId}
                  onLinkEpisode={handleLinkEpisode}
                />
              ) : null}
            </SectionWrapper>

            <SectionWrapper sectionId="case" onLayout={handleSectionLayout}>
              <CaseSection
                scrollViewRef={scrollViewRef}
                scrollPositionRef={scrollPositionRef}
              />
            </SectionWrapper>

            <SectionWrapper
              sectionId="operative"
              onLayout={handleSectionLayout}
            >
              <OperativeSection />
            </SectionWrapper>

            <SectionWrapper sectionId="media" onLayout={handleSectionLayout}>
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

            <SectionWrapper sectionId="outcomes" onLayout={handleSectionLayout}>
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
              <Button onPress={handleReviewPress} disabled={form.state.saving}>
                Review Case
              </Button>
            </View>

            {validationErrors.length > 0 ? (
              <View
                style={[
                  styles.validationErrors,
                  {
                    backgroundColor: theme.error + "10",
                    borderColor: theme.error + "40",
                  },
                ]}
              >
                {validationErrors.map((err, i) => (
                  <ThemedText
                    key={i}
                    style={[styles.validationErrorText, { color: theme.error }]}
                  >
                    {err.message}
                  </ThemedText>
                ))}
              </View>
            ) : null}
          </>
        )}
      </KeyboardAwareScrollViewCompat>

      {!reviewMode ? <KeyboardToolbar /> : null}
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
